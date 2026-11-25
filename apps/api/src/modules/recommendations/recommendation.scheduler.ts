import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RecommendationsService } from './recommendations.service'

@Injectable()
export class RecommendationScheduler {
  private readonly logger = new Logger(RecommendationScheduler.name)
  constructor(private readonly prisma: PrismaService, private readonly recommendations: RecommendationsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async generateForHouseholdsAtPreferredTime() {
    const settings = await this.prisma.notificationSetting.findMany({
      where: { enabled: true, mode: 'AUTO' }, include: { household: true },
    })
    for (const setting of settings) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: setting.household.timezone || 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(new Date())
      if (parts !== setting.preferredTime) continue
      try {
        await this.recommendations.generateDaily(setting.householdId)
        this.logger.log(`Daily recommendation generated for household ${setting.householdId}`)
      } catch (error) {
        this.logger.error(`Recommendation failed for household ${setting.householdId}`, error instanceof Error ? error.stack : undefined)
      }
    }
  }
}
