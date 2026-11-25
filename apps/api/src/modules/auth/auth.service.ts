import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async loginWithWechatCode(code: string) {
    const appId = process.env.WECHAT_APP_ID
    const appSecret = process.env.WECHAT_APP_SECRET
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException('尚未配置微信 AppID / AppSecret，请在服务端 .env 中配置后再启用真实登录')
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
    url.searchParams.set('appid', appId)
    url.searchParams.set('secret', appSecret)
    url.searchParams.set('js_code', code)
    url.searchParams.set('grant_type', 'authorization_code')
    const response = await fetch(url)
    const result = await response.json() as { openid?: string; unionid?: string; errcode?: number; errmsg?: string }
    if (!result.openid) throw new UnauthorizedException(result.errmsg || '微信登录凭证校验失败')

    const user = await this.prisma.user.upsert({
      where: { openid: result.openid },
      update: { unionid: result.unionid },
      create: { openid: result.openid, unionid: result.unionid },
    })
    let membership = await this.prisma.householdMember.findFirst({
      where: { userId: user.id }, include: { household: true }, orderBy: { joinedAt: 'asc' },
    })
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
    const accessToken = await this.jwt.signAsync({ sub: user.id, householdId: membership.householdId })
    return {
      accessToken,
      user: { id: user.id, nickname: user.nickname, avatarKey: user.avatarKey },
      household: { id: membership.household.id, name: membership.household.name, role: membership.role },
    }
  }
}
