import { Ingredient, Recipe, RecipeIngredient, RecipeMatch, MealRecord } from '../types'

/**
 * MVP 判定规则：库存中存在同名食材即视为满足（有就算有）。
 * 数量与单位不参与判定——前端不维护精确库存，是否够用由用户自己判断。
 * 后续若开启「精确库存 / 做菜扣减」，再在此处恢复数量与单位换算比较。
 */
const canSatisfy = (recipeItem: RecipeIngredient, inventory: Ingredient[]) =>
  inventory.some((entry) => entry.name.trim() === recipeItem.ingredientName.trim())

export function buildRecommendations(recipes: Recipe[], inventory: Ingredient[], history: MealRecord[]): RecipeMatch[] {
  const now = Date.now()
  const recent = history.filter((record) => now - new Date(record.cookedAt).getTime() <= 7 * 86400000)

  return recipes.map((recipe) => {
    const required = recipe.ingredients.filter((item) => item.kind === 'required')
    const optional = recipe.ingredients.filter((item) => item.kind === 'optional')
    const availableRequired = required.filter((item) => canSatisfy(item, inventory))
    const missingRequired = required.filter((item) => !canSatisfy(item, inventory))
    const availableOptional = optional.filter((item) => canSatisfy(item, inventory))
    const missingOptional = optional.filter((item) => !canSatisfy(item, inventory))
    const requiredCoverage = required.length ? availableRequired.length / required.length : 0
    const optionalCoverage = optional.length ? availableOptional.length / optional.length : 0
    const recentCount = recent.filter((record) => record.recipeId === recipe.id).length
    const recentPenalty = recentCount * 22
    // 以最近做菜难度的平均值作为轻量适配基线；记录不足时优先简单、易完成的菜。
    const recentRecipeIds = recent.slice(0, 5).map((record) => record.recipeId)
    const recentDifficulties = recentRecipeIds
      .map((id) => recipes.find((item) => item.id === id)?.difficulty)
      .filter((value): value is Recipe['difficulty'] => typeof value === 'number')
    const averageDifficulty = recentDifficulties.length
      ? recentDifficulties.reduce((sum, value) => sum + value, 0) / recentDifficulties.length
      : 2
    const difficultyFit = Math.max(0, 100 - Math.abs(recipe.difficulty - averageDifficulty) * 24)
    const score = requiredCoverage * 50 + difficultyFit * 0.2 + optionalCoverage * 10 - recentPenalty
    return {
      recipe,
      availableRequired,
      missingRequired,
      availableOptional,
      missingOptional,
      requiredCoverage,
      ready: missingRequired.length === 0,
      score,
      matchLevel: missingRequired.length === 0 ? 0 : missingRequired.length,
    }
  }).sort((a, b) => {
    if (a.matchLevel !== b.matchLevel) return a.matchLevel - b.matchLevel
    return b.score - a.score
  })
}
