import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../common/prisma/prisma.service'

export interface JwtPayload {
  sub: string
  householdId?: string
  /** 令牌版本，与 User.tokenVersion 比对，用于退出登录后立即失效 */
  tv?: number
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authorization = request.headers.authorization as string | undefined
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
    if (!token) throw new UnauthorizedException('缺少登录凭证')

    let payload: JwtPayload
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token)
    } catch {
      throw new UnauthorizedException('登录凭证无效或已过期')
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { status: true, tokenVersion: true } })
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('账号不存在或已停用')
    if ((payload.tv ?? 0) !== user.tokenVersion) throw new UnauthorizedException('登录状态已失效，请重新登录')

    request.user = payload
    return true
  }
}
