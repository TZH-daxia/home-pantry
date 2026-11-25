import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(householdId: string, userId: string) {
    const member = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
    if (!member) throw new ForbiddenException('无权访问该家庭做菜记录')
  }

  async list(householdId: string, userId: string) {
    await this.assertMember(householdId, userId)
    return this.prisma.mealHistory.findMany({
      where: { householdId }, include: { user: { select: { id: true, nickname: true } }, recipe: true },
      orderBy: { cookedAt: 'desc' }, take: 100,
    })
  }

  async create(householdId: string, recipeId: string, userId: string) {
    await this.assertMember(householdId, userId)
    const recipe = await this.prisma.recipe.findFirst({ where: { id: recipeId, OR: [{ householdId }, { isSystem: true, householdId: null }] } })
    if (!recipe) throw new NotFoundException('菜谱不存在或不可访问')
    return this.prisma.mealHistory.create({ data: { householdId, recipeId, userId } })
  }
}
