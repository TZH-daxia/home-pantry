import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { rankRecipes } from './recommendation-engine'

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async build(householdId: string, userId?: string) {
    if (userId) {
      const membership = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
      if (!membership) throw new ForbiddenException('无权查看该家庭推荐')
    }
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      include: {
        inventoryItems: { include: { ingredient: true } },
        recipes: { where: { isSystem: false }, include: { ingredients: { include: { ingredient: true } } } },
        mealHistory: { where: { cookedAt: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { cookedAt: 'desc' }, take: 30 },
      },
    })
    if (!household) throw new NotFoundException('家庭空间不存在')
    const systemRecipes = await this.prisma.recipe.findMany({ where: { isSystem: true, householdId: null }, include: { ingredients: { include: { ingredient: true } } } })
    const recipes = [...systemRecipes, ...household.recipes]
    const inventory = household.inventoryItems.map((item) => ({ name: item.ingredient.name, quantity: item.quantity, unit: item.unit }))
    const recipeSnapshots = recipes.map((recipe) => ({
      id: recipe.id, name: recipe.name, difficulty: recipe.difficulty,
      ingredients: recipe.ingredients.map((item) => ({ ingredientName: item.ingredient.name, kind: item.kind, amount: item.amount, unit: item.unit })),
    }))
    const recentIds = household.mealHistory.map((item) => item.recipeId)
    return { household, inventory, recipes, recipeSnapshots, ranked: rankRecipes(inventory, recipeSnapshots, recentIds) }
  }

  async preview(householdId: string, userId: string) {
    const data = await this.build(householdId, userId)
    const recipeById = new Map(data.recipes.map((recipe) => [recipe.id, recipe]))
    return data.ranked.map((match, index) => ({
      rank: index + 1,
      ...match,
      recipe: recipeById.get(match.recipeId),
      recommendationReason: match.ready ? '当前库存满足全部必选配料，可以直接制作。' : `当前库存还缺少 ${match.missingRequired.length} 项必选配料。`,
    }))
  }

  private dateForTimezone(timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`)
  }

  async generateDaily(householdId: string) {
    const data = await this.build(householdId)
    const today = this.dateForTimezone(data.household.timezone || 'Asia/Shanghai')
    return this.prisma.recommendationBatch.upsert({
      where: { householdId_recommendationDate: { householdId, recommendationDate: today } },
      create: {
        householdId, recommendationDate: today, algorithmVersion: 'inventory-v1',
        items: { create: data.ranked.map((match, index) => ({
          recipeId: match.recipeId, rank: index + 1, matchLevel: match.matchLevel, score: match.score,
          matchSnapshot: match as any,
        })) },
      },
      update: {
        generatedAt: new Date(), algorithmVersion: 'inventory-v1',
        items: {
          deleteMany: {},
          create: data.ranked.map((match, index) => ({
            recipeId: match.recipeId, rank: index + 1, matchLevel: match.matchLevel, score: match.score,
            matchSnapshot: match as any,
          })),
        },
      },
      include: { items: { include: { recipe: true }, orderBy: { rank: 'asc' } } },
    })
  }
}
