import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authorization = request.headers.authorization as string | undefined
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
    if (!token) throw new UnauthorizedException('缺少登录凭证')
    try {
      request.user = await this.jwt.verifyAsync(token)
      return true
    } catch {
      throw new UnauthorizedException('登录凭证无效或已过期')
    }
  }
}
