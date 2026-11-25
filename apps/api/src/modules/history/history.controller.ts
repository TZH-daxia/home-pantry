import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import { IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { HistoryService } from './history.service'

class CreateMealHistoryDto {
  @IsString() householdId!: string
  @IsString() recipeId!: string
}

@Controller('history/meals')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  list(@Query('householdId') householdId: string, @Req() req: any) {
    return this.history.list(householdId, req.user.sub)
  }

  @Post()
  create(@Body() body: CreateMealHistoryDto, @Req() req: any) {
    return this.history.create(body.householdId, body.recipeId, req.user.sub)
  }
}
