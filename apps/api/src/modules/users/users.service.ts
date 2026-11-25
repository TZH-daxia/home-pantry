import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

/** 历史数据里可能存的是资源 key，这里统一转成小程序端使用的 emoji */
const AVATAR_EMOJI: Record<string, string> = { sunflower: '🌻', panda: '🐼', cat: '🐱', bear: '🐻', rabbit: '🐰', fox: '🦊', frog: '🐸', chick: '🐣' }
const toAvatarEmoji = (key: string | null | undefined) => (key && AVATAR_EMOJI[key]) || key || '🌻'

export interface ProfileShape {
  nickname: string
  avatar: string
  autoRecommend: boolean
  notifyMode: 'auto' | 'manual'
  recommendTime: string
  householdRole: 'owner' | 'member'
  household: { id: string; name: string } | null
}

export interface UpdateProfileInput {
  nickname?: string
  avatar?: string
  autoRecommend?: boolean
  notifyMode?: 'auto' | 'manual'
  recommendTime?: string
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveMembership(userId: string, householdId?: string) {
    if (householdId) {
      return this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } }, include: { household: true } })
    }
    return this.prisma.householdMember.findFirst({ where: { userId }, include: { household: true }, orderBy: { joinedAt: 'asc' } })
  }

  /** 输出结构对齐小程序端 types.UserProfile + 家庭角色 */
  async getMe(userId: string, householdId?: string): Promise<ProfileShape> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, avatarKey: true } })
    if (!user) throw new NotFoundException('用户不存在')
    const membership = await this.resolveMembership(userId, householdId)
    const setting = membership
      ? await this.prisma.notificationSetting.findUnique({ where: { householdId: membership.householdId } })
      : null
    return {
      nickname: user.nickname,
      avatar: toAvatarEmoji(user.avatarKey),
      autoRecommend: setting?.enabled ?? true,
      notifyMode: setting?.mode === 'MANUAL' ? 'manual' : 'auto',
      recommendTime: setting?.preferredTime || '08:00',
      householdRole: membership?.role === 'MEMBER' ? 'member' : 'owner',
      household: membership ? { id: membership.household.id, name: membership.household.name } : null,
    }
  }

  async updateProfile(userId: string, input: UpdateProfileInput, householdId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, avatarKey: true } })
    if (!user) throw new NotFoundException('用户不存在')

    const nickname = input.nickname?.trim()
    const avatar = input.avatar?.trim()
    if (nickname || avatar) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { ...(nickname ? { nickname } : {}), ...(avatar ? { avatarKey: avatar } : {}) },
      })
    }

    const membership = await this.resolveMembership(userId, householdId)
    const hasNotificationChange = input.autoRecommend !== undefined || input.notifyMode !== undefined || input.recommendTime !== undefined
    if (membership && hasNotificationChange) {
      const enabled = input.autoRecommend ?? undefined
      const mode = input.notifyMode ? (input.notifyMode === 'manual' ? 'MANUAL' : 'AUTO') : undefined
      const preferredTime = input.recommendTime ?? undefined
      await this.prisma.notificationSetting.upsert({
        where: { householdId: membership.householdId },
        update: {
          ...(enabled !== undefined ? { enabled } : {}),
          ...(mode ? { mode } : {}),
          ...(preferredTime ? { preferredTime } : {}),
        },
        create: { householdId: membership.householdId, enabled: enabled ?? true, mode: mode || 'AUTO', preferredTime: preferredTime || '08:00' },
      })
    }

    return this.getMe(userId, membership?.householdId || householdId)
  }
}
