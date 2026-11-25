import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { toKindDb, toRecipeShape } from './recipe.mapper'

export interface IngredientInput { ingredientName: string; kind: string; amount: number; unit: string; categoryName?: string }
export interface CreateRecipeInput {
  householdId: string; name: string; description?: string; difficulty: number; prepMinutes?: number; cookMinutes?: number
  emoji?: string; theme?: string; ingredients: IngredientInput[]; steps?: { instruction: string }[]
}

const recipeInclude = {
  ingredients: { include: { ingredient: true }, orderBy: { sortOrder: 'asc' } },
  steps: { orderBy: { stepNumber: 'asc' } },
} as const

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(householdId: string, userId: string) {
    const member = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
    if (!member) throw new ForbiddenException('无权访问该家庭菜谱')
  }

  async list(householdId: string, userId: string) {
    await this.assertMember(householdId, userId)
    const recipes = await this.prisma.recipe.findMany({
      where: { OR: [{ householdId }, { isSystem: true, householdId: null }] },
      include: recipeInclude,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })
    return recipes.map(toRecipeShape)
  }

  async create(input: CreateRecipeInput, userId: string) {
    await this.assertMember(input.householdId, userId)
    return this.prisma.$transaction(async (tx) => {
      const linkedIngredients: { ingredientId: string; kind: 'REQUIRED' | 'OPTIONAL'; amount: number; unit: string; sortOrder: number }[] = []
      for (const [index, item] of input.ingredients.entries()) {
        const categoryName = item.categoryName || '其他'
        const category = await tx.ingredientCategory.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } })
        const ingredient = await tx.ingredient.upsert({
          where: { name: item.ingredientName },
          update: {},
          create: { name: item.ingredientName, categoryId: category.id, defaultUnit: item.unit },
        })
        linkedIngredients.push({ ingredientId: ingredient.id, kind: toKindDb(item.kind), amount: item.amount, unit: item.unit, sortOrder: index })
      }
      const recipe = await tx.recipe.create({
        data: {
          householdId: input.householdId, name: input.name, description: input.description || '', difficulty: input.difficulty,
          prepMinutes: input.prepMinutes || 0, cookMinutes: input.cookMinutes || 0, emoji: input.emoji || '🍳', theme: input.theme || 'custom',
          ingredients: { create: linkedIngredients },
          steps: { create: (input.steps || []).map((step, index) => ({ stepNumber: index + 1, instruction: step.instruction })) },
        },
        include: recipeInclude,
      })
      return toRecipeShape(recipe)
    })
  }

  async remove(id: string, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } })
    if (!recipe) throw new NotFoundException('菜谱不存在')
    if (recipe.isSystem || !recipe.householdId) throw new ForbiddenException('系统菜谱不可删除')
    await this.assertMember(recipe.householdId, userId)
    await this.prisma.recipe.delete({ where: { id } })
    return { success: true }
  }
}
