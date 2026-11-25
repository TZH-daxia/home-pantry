import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

const AVATAR_EMOJI: Record<string, string> = { sunflower: '🌻', panda: '🐼', cat: '🐱', bear: '🐻', rabbit: '🐰', fox: '🦊', frog: '🐸', chick: '🐣' }

export interface MealRecordShape {
  id: string
  recipeId: string
  cookedAt: string
  /** 做菜人（家庭成员共享记录时用于展示） */
  userName: string
  userAvatar: string
  recipeName: string
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(householdId: string, userId: string) {
    const member = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
    if (!member) throw new ForbiddenException('无权访问该家庭做菜记录')
  }

  /** 输出结构对齐小程序端 types.MealRecord，并带上做菜人与菜名，便于家庭共享展示 */
  async list(householdId: string, userId: string, offset = 0, limit = 20): Promise<MealRecordShape[]> {
    await this.assertMember(householdId, userId)
    const safeLimit = Math.min(Math.max(limit, 1), 50)
    const safeOffset = Math.max(offset, 0)
    const records = await this.prisma.mealHistory.findMany({
      where: { householdId },
      include: { user: { select: { nickname: true, avatarKey: true } }, recipe: { select: { name: true } } },
      orderBy: { cookedAt: 'desc' },
      skip: safeOffset,
      take: safeLimit,
    })
    return records.map((record) => ({
      id: record.id,
      recipeId: record.recipeId,
      cookedAt: record.cookedAt.toISOString(),
      userName: record.user?.nickname || '家庭成员',
      userAvatar: AVATAR_EMOJI[record.user?.avatarKey || ''] || record.user?.avatarKey || '🌻',
      recipeName: record.recipe.name,
    }))
  }

  async create(householdId: string, recipeId: string, userId: string): Promise<MealRecordShape> {
    await this.assertMember(householdId, userId)
    const recipe = await this.prisma.recipe.findFirst({ where: { id: recipeId, OR: [{ householdId }, { isSystem: true, householdId: null }] } })
    if (!recipe) throw new NotFoundException('菜谱不存在或不可访问')
    const record = await this.prisma.mealHistory.create({
      data: { householdId, recipeId, userId },
      include: { user: { select: { nickname: true, avatarKey: true } }, recipe: { select: { name: true } } },
    })
    return {
      id: record.id,
      recipeId: record.recipeId,
      cookedAt: record.cookedAt.toISOString(),
      userName: record.user?.nickname || '家庭成员',
      userAvatar: AVATAR_EMOJI[record.user?.avatarKey || ''] || record.user?.avatarKey || '🌻',
      recipeName: record.recipe.name,
    }
  }
}
