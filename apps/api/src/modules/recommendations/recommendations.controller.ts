import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import { IsOptional, IsString } from 'class-validator'
import { resolveHouseholdId } from '../../common/http/household'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RecommendationsService } from './recommendations.service'

class HouseholdDto {
  @IsOptional() @IsString() householdId?: string
}

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  /** 今日宜吃：当天批次优先，缺失时实时计算 */
  @Get('today')
  today(@Query('householdId') householdId: string | undefined, @Req() req: any) {
    return this.recommendations.today(resolveHouseholdId(householdId, req.user), req.user.sub)
  }

  /** 实时推荐预览（不落库） */
  @Post('preview')
  preview(@Body() body: HouseholdDto, @Query('householdId') queryId: string | undefined, @Req() req: any) {
    return this.recommendations.preview(resolveHouseholdId(body.householdId, req.user, queryId), req.user.sub)
  }

  /** 强制重新生成当天批次（定时任务 / 后续 AI 推荐共用） */
  @Post('generate')
  generate(@Body() body: HouseholdDto, @Query('householdId') queryId: string | undefined, @Req() req: any) {
    return this.recommendations.generate(resolveHouseholdId(body.householdId, req.user, queryId), req.user.sub)
  }
}
