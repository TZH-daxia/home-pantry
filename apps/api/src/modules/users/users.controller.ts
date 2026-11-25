import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UsersService } from './users.service'

class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(16) nickname?: string
  @IsOptional() @IsString() @MaxLength(64) avatar?: string
  @IsOptional() @IsBoolean() autoRecommend?: boolean
  @IsOptional() @IsIn(['auto', 'manual']) notifyMode?: 'auto' | 'manual'
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) recommendTime?: string
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@Query('householdId') householdId: string | undefined, @Req() req: any) {
    return this.users.getMe(req.user.sub, householdId || req.user.householdId)
  }

  @Patch()
  update(@Body() body: UpdateProfileDto, @Query('householdId') householdId: string | undefined, @Req() req: any) {
    return this.users.updateProfile(req.user.sub, body, householdId || req.user.householdId)
  }
}
