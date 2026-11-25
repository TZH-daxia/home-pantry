import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RecommendationsService } from './recommendations.service'

class RecommendationPreviewDto {
  @IsString() householdId!: string
}

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Post('preview')
  preview(@Body() body: RecommendationPreviewDto, @Req() req: any) {
    return this.recommendations.preview(body.householdId, req.user.sub)
  }
}
