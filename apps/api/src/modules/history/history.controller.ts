import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import { IsOptional, IsString } from 'class-validator'
import { resolveHouseholdId } from '../../common/http/household'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { HistoryService } from './history.service'

class CreateMealHistoryDto {
  @IsOptional() @IsString() householdId?: string
  @IsString() recipeId!: string
}

@Controller('history/meals')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  list(
    @Query('householdId') householdId: string | undefined,
    @Query('offset') offset: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: any,
  ) {
    const parsedOffset = Number(offset)
    const parsedLimit = Number(limit)
    return this.history.list(
      resolveHouseholdId(householdId, req.user),
      req.user.sub,
      Number.isFinite(parsedOffset) && parsedOffset > 0 ? Math.floor(parsedOffset) : 0,
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : 20,
    )
  }

  @Post()
  create(@Body() body: CreateMealHistoryDto, @Query('householdId') queryId: string | undefined, @Req() req: any) {
    return this.history.create(resolveHouseholdId(body.householdId, req.user, queryId), body.recipeId, req.user.sub)
  }
}
