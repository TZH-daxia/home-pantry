import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { randomInt } from 'crypto'
import { PrismaService } from '../../common/prisma/prisma.service'

const AVATAR_EMOJI: Record<string, string> = { sunflower: '🌻', panda: '🐼', cat: '🐱', bear: '🐻', rabbit: '🐰', fox: '🦊', frog: '🐸', chick: '🐣' }
/** 去掉易混淆字符（0/O/1/I）后的邀请码字符集 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const INVITE_TTL_HOURS = 24

const toAvatar = (key: string) => AVATAR_EMOJI[key] || key || '🌻'
const toRoleDto = (role: string): 'owner' | 'member' => (role === 'MEMBER' ? 'member' : 'owner')

export interface HouseholdSummary {
  id: string
  name: string
  role: 'owner' | 'member'
  memberCount: number
  joinedAt: string
}

export interface HouseholdMemberShape {
  userId: string
  nickname: string
  avatar: string
  role: 'owner' | 'member'
  joinedAt: string
  isSelf: boolean
}

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(householdId: string, userId: string) {
    const member = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
    if (!member) throw new ForbiddenException('无权访问该家庭')
    return member
  }

  private async assertOwner(householdId: string, userId: string) {
    const member = await this.assertMember(householdId, userId)
    if (member.role !== 'OWNER') throw new ForbiddenException('仅家庭管理员可以执行该操作')
    return member
  }

  /** 当前用户所属的全部家庭（用于家庭切换与角色展示） */
  async list(userId: string): Promise<HouseholdSummary[]> {
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId },
      include: { household: { include: { _count: { select: { members: true } } } } },
      orderBy: { joinedAt: 'asc' },
    })
    return memberships.map((membership) => ({
      id: membership.householdId,
      name: membership.household.name,
      role: toRoleDto(membership.role),
      memberCount: membership.household._count.members,
      joinedAt: membership.joinedAt.toISOString(),
    }))
  }

  async members(householdId: string, userId: string): Promise<HouseholdMemberShape[]> {
    await this.assertMember(householdId, userId)
    const members = await this.prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, nickname: true, avatarKey: true } } },
      orderBy: [{ joinedAt: 'asc' }],
    })
    return members.map((member) => ({
      userId: member.user.id,
      nickname: member.user.nickname,
      avatar: toAvatar(member.user.avatarKey),
      role: toRoleDto(member.role),
      joinedAt: member.joinedAt.toISOString(),
      isSelf: member.user.id === userId,
    }))
  }

  /** 生成邀请码（仅管理员），有效期 24 小时 */
  async createInvite(householdId: string, userId: string) {
    await this.assertOwner(householdId, userId)
    let code = ''
    for (let attempt = 0; attempt < 8; attempt += 1) {
      code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
      const exists = await this.prisma.householdInvite.findUnique({ where: { code } })
      if (!exists) break
      code = ''
    }
    if (!code) throw new BadRequestException('邀请码生成失败，请重试')
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000)
    await this.prisma.householdInvite.create({ data: { code, householdId, createdBy: userId, expiresAt } })
    return { code, expiresAt: expiresAt.toISOString() }
  }

  /** 通过邀请码加入家庭（任何已登录用户都可以使用） */
  async join(code: string, userId: string) {
    const normalized = code.trim().toUpperCase()
    if (!normalized) throw new BadRequestException('请输入邀请码')
    const invite = await this.prisma.householdInvite.findUnique({ where: { code: normalized }, include: { household: true } })
    if (!invite || invite.expiresAt.getTime() < Date.now()) throw new BadRequestException('邀请码无效或已过期')

    const existing = await this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId: invite.householdId, userId } },
    })
    if (existing) {
      return { id: invite.householdId, name: invite.household.name, role: toRoleDto(existing.role), alreadyMember: true }
    }
    await this.prisma.householdMember.create({ data: { householdId: invite.householdId, userId, role: 'MEMBER' } })
    await this.prisma.notificationSetting.upsert({
      where: { householdId: invite.householdId },
      update: {},
      create: { householdId: invite.householdId, enabled: true, mode: 'AUTO', preferredTime: '08:00' },
    })
    return { id: invite.householdId, name: invite.household.name, role: 'member' as const, alreadyMember: false }
  }

  /** 移除成员（仅管理员；不能移除管理员本人） */
  async removeMember(householdId: string, targetUserId: string, actorId: string) {
    await this.assertOwner(householdId, actorId)
    if (targetUserId === actorId) throw new BadRequestException('不能移除自己')
    const target = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId: targetUserId } } })
    if (!target) throw new NotFoundException('该成员不在这个家庭中')
    if (target.role === 'OWNER') throw new ForbiddenException('不能移除家庭管理员')
    await this.prisma.householdMember.delete({ where: { householdId_userId: { householdId, userId: targetUserId } } })
    return { success: true }
  }
}
