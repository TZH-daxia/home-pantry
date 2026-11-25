import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

interface UpdateInput { householdId: string; enabled: boolean; mode: 'AUTO' | 'MANUAL'; preferredTime: string }
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(householdId: string, userId: string) {
    const member = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
    if (!member) throw new ForbiddenException('无权修改该家庭通知设置')
  }

  async getSettings(householdId: string, userId: string) {
    await this.assertMember(householdId, userId)
    return this.prisma.notificationSetting.findUnique({ where: { householdId } })
  }

  async updateSettings(input: UpdateInput, userId: string) {
    await this.assertMember(input.householdId, userId)
    return this.prisma.notificationSetting.upsert({
      where: { householdId: input.householdId },
      update: { enabled: input.enabled, mode: input.mode, preferredTime: input.preferredTime },
      create: { householdId: input.householdId, enabled: input.enabled, mode: input.mode, preferredTime: input.preferredTime },
    })
  }
}
