import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

interface CreateInventoryInput {
  householdId: string; ingredientName: string; categoryName: string; quantity: number; unit: string; emoji?: string
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(householdId: string, userId: string) {
    const member = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
    if (!member) throw new ForbiddenException('无权访问该家庭库存')
  }

  async list(householdId: string, userId: string) {
    if (!householdId) throw new NotFoundException('请指定 householdId')
    await this.assertMember(householdId, userId)
    return this.prisma.inventoryItem.findMany({
      where: { householdId }, include: { ingredient: { include: { category: true } } }, orderBy: [{ ingredient: { category: { sortOrder: 'asc' } } }, { ingredient: { name: 'asc' } }],
    })
  }

  async create(input: CreateInventoryInput, userId: string) {
    await this.assertMember(input.householdId, userId)
    const category = await this.prisma.ingredientCategory.upsert({ where: { name: input.categoryName }, update: {}, create: { name: input.categoryName } })
    const ingredient = await this.prisma.ingredient.upsert({
      where: { name: input.ingredientName },
      update: { categoryId: category.id, defaultUnit: input.unit, ...(input.emoji ? { emoji: input.emoji } : {}) },
      create: { name: input.ingredientName, categoryId: category.id, defaultUnit: input.unit, emoji: input.emoji || '🥬' },
    })
    return this.prisma.inventoryItem.upsert({
      where: { householdId_ingredientId_unit: { householdId: input.householdId, ingredientId: ingredient.id, unit: input.unit } },
      update: { quantity: { increment: input.quantity } },
      create: { householdId: input.householdId, ingredientId: ingredient.id, quantity: input.quantity, unit: input.unit },
      include: { ingredient: { include: { category: true } } },
    })
  }

  async remove(id: string, userId: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException('库存记录不存在')
    await this.assertMember(item.householdId, userId)
    await this.prisma.inventoryItem.delete({ where: { id } })
    return { success: true }
  }
}
