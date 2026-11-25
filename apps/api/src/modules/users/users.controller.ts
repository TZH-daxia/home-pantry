import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UsersService } from './users.service'

class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(16) nickname?: string
  @IsOptional() @IsString() @MaxLength(64) avatarKey?: string
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@Req() req: any) { return this.users.getMe(req.user.sub) }

  @Patch()
  update(@Body() body: UpdateProfileDto, @Req() req: any) { return this.users.updateProfile(req.user.sub, body) }
}
