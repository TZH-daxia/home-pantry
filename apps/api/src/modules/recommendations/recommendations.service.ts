import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { toRecipeShape } from '../recipes/recipe.mapper'
import { rankRecipes, RecommendationMatch } from './recommendation-engine'

const recipeInclude = {
  ingredients: { include: { ingredient: true }, orderBy: { sortOrder: 'asc' } },
  steps: { orderBy: { stepNumber: 'asc' } },
} as const

type RecipeRecord = Parameters<typeof toRecipeShape>[0]

export interface MatchShape {
  rank: number
  recipe: ReturnType<typeof toRecipeShape>
  availableRequired: ReturnType<typeof toRecipeShape>['ingredients']
  missingRequired: ReturnType<typeof toRecipeShape>['ingredients']
  availableOptional: ReturnType<typeof toRecipeShape>['ingredients']
  missingOptional: ReturnType<typeof toRecipeShape>['ingredients']
  requiredCoverage: number
  ready: boolean
  score: number
  matchLevel: number
  recommendationReason: string
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(householdId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } })
    if (!membership) throw new ForbiddenException('无权查看该家庭推荐')
  }

  private async build(householdId: string) {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      include: {
        inventoryItems: { include: { ingredient: true } },
        recipes: { where: { isSystem: false }, include: recipeInclude },
        mealHistory: { where: { cookedAt: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { cookedAt: 'desc' }, take: 30 },
      },
    })
    if (!household) throw new NotFoundException('家庭空间不存在')
    const systemRecipes = await this.prisma.recipe.findMany({ where: { isSystem: true, householdId: null }, include: recipeInclude })
    const recipes = [...systemRecipes, ...household.recipes]
    const inventory = household.inventoryItems.map((item) => ({ name: item.ingredient.name, quantity: item.quantity, unit: item.unit }))
    const recipeSnapshots = recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients.map((item) => ({
        ingredientName: item.ingredient.name,
        kind: item.kind === 'OPTIONAL' ? ('OPTIONAL' as const) : ('REQUIRED' as const),
        amount: item.amount,
        unit: item.unit,
      })),
    }))
    const recentIds = household.mealHistory.map((item) => item.recipeId)
    return { household, recipes, ranked: rankRecipes(inventory, recipeSnapshots, recentIds) }
  }

  /** 把算法结果与菜谱实体拼成小程序端可直接消费的 RecipeMatch 结构 */
  private toMatch(recipe: RecipeRecord, match: RecommendationMatch | (RecommendationMatch & Record<string, unknown>), rank: number): MatchShape {
    const shape = toRecipeShape(recipe)
    const required = shape.ingredients.filter((item) => item.kind === 'required')
    const optional = shape.ingredients.filter((item) => item.kind === 'optional')
    const pick = (list: typeof shape.ingredients, names: string[]) => list.filter((item) => names.includes(item.ingredientName))
    const missingCount = match.missingRequired.length
    return {
      rank,
      recipe: shape,
      availableRequired: pick(required, match.availableRequired),
      missingRequired: pick(required, match.missingRequired),
      availableOptional: pick(optional, match.availableOptional),
      missingOptional: pick(optional, match.missingOptional),
      requiredCoverage: match.requiredCoverage,
      ready: match.ready,
      score: match.score,
      matchLevel: match.matchLevel,
      recommendationReason: match.ready ? '当前库存满足全部必选配料，可以直接制作。' : `当前库存还缺少 ${missingCount} 项必选配料。`,
    }
  }

  async preview(householdId: string, userId: string) {
    await this.assertMember(householdId, userId)
    const data = await this.build(householdId)
    const recipeById = new Map(data.recipes.map((recipe) => [recipe.id, recipe]))
    return data.ranked
      .map((match, index) => {
        const recipe = recipeById.get(match.recipeId)
        return recipe ? this.toMatch(recipe, match, index + 1) : null
      })
      .filter((item): item is MatchShape => Boolean(item))
  }

  private dateForTimezone(timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`)
  }

  /** 今日宜吃：优先返回当天已生成的推荐批次，没有则实时计算（不落库） */
  async today(householdId: string, userId: string) {
    await this.assertMember(householdId, userId)
    const household = await this.prisma.household.findUnique({ where: { id: householdId }, select: { timezone: true } })
    if (!household) throw new NotFoundException('家庭空间不存在')
    const batch = await this.prisma.recommendationBatch.findUnique({
      where: { householdId_recommendationDate: { householdId, recommendationDate: this.dateForTimezone(household.timezone || 'Asia/Shanghai') } },
      include: { items: { include: { recipe: { include: recipeInclude } }, orderBy: { rank: 'asc' } } },
    })
    if (batch) {
      return batch.items.map((item) => this.toMatch(item.recipe, item.matchSnapshot as unknown as RecommendationMatch, item.rank))
    }
    return this.preview(householdId, userId)
  }

  /** 重新生成当日推荐批次（定时任务与后续 AI 推荐共用入口） */
  async generate(householdId: string, userId: string) {
    await this.assertMember(householdId, userId)
    await this.generateDaily(householdId)
    return this.today(householdId, userId)
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
