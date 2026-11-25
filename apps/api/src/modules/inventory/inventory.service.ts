import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

export interface InventoryInput {
  householdId?: string
  name?: string
  ingredientName?: string
  category?: string
  categoryName?: string
  quantity?: number
  unit?: string
  emoji?: string
}

export interface InventoryShape {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  emoji: string
}

const DEFAULT_UNIT = '个'
const DEFAULT_EMOJI = '🥬'

type InventoryRecord = {
  id: string
  quantity: number
  unit: string
  ingredient: { name: string; emoji: string; category: { name: string } }
}

/** 输出结构对齐小程序端 types.Ingredient */
export const toIngredientShape = (item: InventoryRecord): InventoryShape => ({
  id: item.id,
  name: item.ingredient.name,
  category: item.ingredient.category.name,
  quantity: item.quantity,
  unit: item.unit,
  emoji: item.ingredient.emoji,
})

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
    const items = await this.prisma.inventoryItem.findMany({
      where: { householdId },
      include: { ingredient: { include: { category: true } } },
      orderBy: [{ ingredient: { category: { sortOrder: 'asc' } } }, { ingredient: { name: 'asc' } }],
    })
    return items.map(toIngredientShape)
  }

  async create(input: InventoryInput, userId: string) {
    const householdId = input.householdId
    if (!householdId) throw new NotFoundException('请指定 householdId')
    await this.assertMember(householdId, userId)
    const name = (input.name ?? input.ingredientName ?? '').trim()
    const categoryName = (input.category ?? input.categoryName ?? '其他').trim()
    const unit = (input.unit ?? DEFAULT_UNIT).trim()
    const quantity = input.quantity ?? 1
    if (!name) throw new ConflictException('请填写食材名称')

    const category = await this.prisma.ingredientCategory.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } })
    const ingredient = await this.prisma.ingredient.upsert({
      where: { name },
      update: { categoryId: category.id, defaultUnit: unit, ...(input.emoji ? { emoji: input.emoji } : {}) },
      create: { name, categoryId: category.id, defaultUnit: unit, emoji: input.emoji || DEFAULT_EMOJI },
    })
    const item = await this.prisma.inventoryItem.upsert({
      where: { householdId_ingredientId_unit: { householdId, ingredientId: ingredient.id, unit } },
      update: { quantity },
      create: { householdId, ingredientId: ingredient.id, quantity, unit },
      include: { ingredient: { include: { category: true } } },
    })
    return toIngredientShape(item)
  }

  async update(id: string, input: InventoryInput, userId: string) {
    const current = await this.prisma.inventoryItem.findUnique({ where: { id }, include: { ingredient: { include: { category: true } } } })
    if (!current) throw new NotFoundException('库存记录不存在')
    await this.assertMember(current.householdId, userId)

    const name = (input.name ?? input.ingredientName)?.trim()
    const categoryName = (input.category ?? input.categoryName)?.trim()
    const unit = input.unit?.trim()

    let ingredientId = current.ingredientId
    if (name && name !== current.ingredient.name) {
      const category = categoryName
        ? await this.prisma.ingredientCategory.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } })
        : null
      const existing = await this.prisma.ingredient.findUnique({ where: { name } })
      if (existing) {
        ingredientId = existing.id
        if (category) await this.prisma.ingredient.update({ where: { id: existing.id }, data: { categoryId: category.id } })
      } else {
        await this.prisma.ingredient.update({
          where: { id: current.ingredientId },
          data: { name, ...(category ? { categoryId: category.id } : {}) },
        })
      }
    } else if (categoryName && categoryName !== current.ingredient.category.name) {
      const category = await this.prisma.ingredientCategory.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } })
      await this.prisma.ingredient.update({ where: { id: current.ingredientId }, data: { categoryId: category.id } })
    }

    const nextUnit = unit || current.unit
    if (ingredientId !== current.ingredientId || nextUnit !== current.unit) {
      const conflict = await this.prisma.inventoryItem.findUnique({
        where: { householdId_ingredientId_unit: { householdId: current.householdId, ingredientId, unit: nextUnit } },
      })
      if (conflict && conflict.id !== current.id) throw new ConflictException('该食材与单位已存在库存记录')
    }

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ingredientId,
        unit: nextUnit,
        ...(typeof input.quantity === 'number' ? { quantity: input.quantity } : {}),
      },
      include: { ingredient: { include: { category: true } } },
    })
    return toIngredientShape(item)
  }

  async remove(id: string, userId: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException('库存记录不存在')
    await this.assertMember(item.householdId, userId)
    await this.prisma.inventoryItem.delete({ where: { id } })
    return { success: true }
  }
}
