import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'

class WechatLoginDto {
  @IsString()
  @MinLength(1)
  code!: string

  /** 分享卡片携带的邀请码：首次登录时直接加入邀请方家庭 */
  @IsOptional()
  @IsString()
  inviteCode?: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat')
  login(@Body() body: WechatLoginDto) {
    return this.authService.loginWithWechatCode(body.code, body.inviteCode)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.authService.revokeTokens(req.user.sub)
  }
}
