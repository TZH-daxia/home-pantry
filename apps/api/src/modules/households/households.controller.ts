import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { IsOptional, IsString, Length } from 'class-validator'
import { resolveHouseholdId } from '../../common/http/household'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { HouseholdsService } from './households.service'

class InviteDto {
  @IsOptional() @IsString() householdId?: string
}
class JoinDto {
  @IsString() @Length(4, 12) code!: string
}

@Controller('households')
@UseGuards(JwtAuthGuard)
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  /** 我所属的家庭列表（含角色、成员数） */
  @Get()
  list(@Req() req: any) {
    return this.households.list(req.user.sub)
  }

  /** 家庭管理员：生成邀请码 */
  @Post('invites')
  createInvite(@Body() body: InviteDto, @Query('householdId') queryId: string | undefined, @Req() req: any) {
    return this.households.createInvite(resolveHouseholdId(body.householdId, req.user, queryId), req.user.sub)
  }

  /** 通过邀请码加入家庭 */
  @Post('join')
  join(@Body() body: JoinDto, @Req() req: any) {
    return this.households.join(body.code, req.user.sub)
  }

  /** 家庭成员列表 */
  @Get('members')
  members(@Query('householdId') householdId: string | undefined, @Req() req: any) {
    return this.households.members(resolveHouseholdId(householdId, req.user), req.user.sub)
  }

  /** 家庭管理员：移除成员 */
  @Delete('members/:userId')
  removeMember(@Param('userId') targetUserId: string, @Query('householdId') householdId: string | undefined, @Req() req: any) {
    return this.households.removeMember(resolveHouseholdId(householdId, req.user), targetUserId, req.user.sub)
  }
}
