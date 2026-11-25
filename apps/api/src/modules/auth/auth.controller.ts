import { Body, Controller, Post } from '@nestjs/common'
import { IsString, MinLength } from 'class-validator'
import { AuthService } from './auth.service'

class WechatLoginDto {
  @IsString()
  @MinLength(1)
  code!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat')
  login(@Body() body: WechatLoginDto) {
    return this.authService.loginWithWechatCode(body.code)
  }
}
