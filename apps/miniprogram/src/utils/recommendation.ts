import { Ingredient, Recipe, RecipeIngredient, RecipeMatch, MealRecord } from '../types'

const canSatisfy = (recipeItem: RecipeIngredient, inventory: Ingredient[]) => {
  const item = inventory.find((entry) => entry.name.trim() === recipeItem.ingredientName.trim())
  if (!item) return false
  // MVP 使用相同单位的数量比较；单位不同不冒险推断充足。后续统一接入服务端单位换算表。
  if (item.unit !== recipeItem.unit) return false
  return item.quantity >= recipeItem.amount
}

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
