import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RecommendationsController } from './recommendations.controller'
import { RecommendationsService } from './recommendations.service'
import { RecommendationScheduler } from './recommendation.scheduler'

@Module({
  imports: [AuthModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationScheduler],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
