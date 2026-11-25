import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../common/prisma/prisma.service'

const DEMO_OPENID = 'home-pantry-demo-openid'
const AVATAR_EMOJI: Record<string, string> = { sunflower: '🌻', panda: '🐼', cat: '🐱', bear: '🐻', rabbit: '🐰', fox: '🦊', frog: '🐸', chick: '🐣' }

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private async exchangeCode(code: string): Promise<{ openid: string; unionid?: string }> {
    // 本地调试：dev:xxx 可模拟不同用户（仅非生产环境），便于验证家庭协同
    if (process.env.NODE_ENV !== 'production' && code.startsWith('dev:')) {
      return { openid: `dev-${code.slice(4)}` }
    }

    const appId = process.env.WECHAT_APP_ID
    const appSecret = process.env.WECHAT_APP_SECRET
    if (!appId || !appSecret) {
      // 未配置密钥时退回演示身份，生产环境直接拒绝
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('尚未配置微信 AppID / AppSecret，请在服务端 .env 中配置后再启用真实登录')
      }
      return { openid: DEMO_OPENID }
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
    url.searchParams.set('appid', appId)
    url.searchParams.set('secret', appSecret)
    url.searchParams.set('js_code', code)
    url.searchParams.set('grant_type', 'authorization_code')
    const response = await fetch(url)
    const result = await response.json() as { openid?: string; unionid?: string; errcode?: number; errmsg?: string }
    if (!result.openid) throw new UnauthorizedException(result.errmsg || '微信登录凭证校验失败')
    return { openid: result.openid, unionid: result.unionid }
  }

  /** 首次登录且携带有效邀请码时，直接加入邀请方家庭，不再创建空家庭 */
  private async joinByInvite(inviteCode: string, userId: string) {
    const code = inviteCode.trim().toUpperCase()
    if (!code) return null
    const invite = await this.prisma.householdInvite.findUnique({ where: { code }, include: { household: true } })
    if (!invite || invite.expiresAt.getTime() < Date.now()) return null
    await this.prisma.householdMember.create({ data: { householdId: invite.householdId, userId, role: 'MEMBER' } })
    await this.prisma.notificationSetting.upsert({
      where: { householdId: invite.householdId },
      update: {},
      create: { householdId: invite.householdId, enabled: true, mode: 'AUTO', preferredTime: '08:00' },
    })
    return invite.householdId
  }

  async loginWithWechatCode(code: string, inviteCode?: string) {
    const identity = await this.exchangeCode(code)

    const user = await this.prisma.user.upsert({
      where: { openid: identity.openid },
      update: { unionid: identity.unionid },
      create: { openid: identity.openid, unionid: identity.unionid },
    })

    let membership = await this.prisma.householdMember.findFirst({
      where: { userId: user.id }, include: { household: true }, orderBy: { joinedAt: 'asc' },
    })

    let joinedByInvite = false
    if (!membership && inviteCode) {
      const joinedHouseholdId = await this.joinByInvite(inviteCode, user.id)
      if (joinedHouseholdId) {
        joinedByInvite = true
        membership = await this.prisma.householdMember.findFirst({ where: { householdId: joinedHouseholdId, userId: user.id }, include: { household: true } })
      }
    }

    if (!membership) {
      const household = await this.prisma.household.create({
        data: {
          name: '我的家', createdBy: user.id,
          members: { create: { userId: user.id, role: 'OWNER' } },
          notificationSettings: { create: { enabled: true, mode: 'AUTO', preferredTime: '08:00' } },
        },
      })
      membership = await this.prisma.householdMember.findFirst({ where: { householdId: household.id, userId: user.id }, include: { household: true } })
    }
    if (!membership) throw new ServiceUnavailableException('创建默认家庭空间失败')

    const accessToken = await this.jwt.signAsync({ sub: user.id, householdId: membership.householdId, tv: user.tokenVersion })
    return {
      accessToken,
      joinedByInvite,
      user: { id: user.id, nickname: user.nickname, avatar: AVATAR_EMOJI[user.avatarKey] || user.avatarKey },
      household: { id: membership.household.id, name: membership.household.name, role: membership.role === 'MEMBER' ? 'member' : 'owner' },
    }
  }

  /** 退出登录：递增令牌版本，已签发的 JWT 立即失效 */
  async revokeTokens(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } })
    return { success: true }
  }
}
