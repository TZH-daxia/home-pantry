export interface IngredientSnapshot {
  name: string
  quantity: number
  unit: string
}
export interface RecipeIngredientSnapshot {
  ingredientName: string
  kind: 'REQUIRED' | 'OPTIONAL'
  amount: number
  unit: string
}
export interface RecipeSnapshot {
  id: string
  name: string
  difficulty: number
  ingredients: RecipeIngredientSnapshot[]
}
export interface RecommendationMatch {
  recipeId: string
  recipeName: string
  ready: boolean
  matchLevel: number
  score: number
  availableRequired: string[]
  missingRequired: string[]
  availableOptional: string[]
  missingOptional: string[]
  requiredCoverage: number
}

export function rankRecipes(inventory: IngredientSnapshot[], recipes: RecipeSnapshot[], recentRecipeIds: string[]): RecommendationMatch[] {
  const recentCount = new Map<string, number>()
  recentRecipeIds.forEach((id) => recentCount.set(id, (recentCount.get(id) || 0) + 1))
  const available = (item: RecipeIngredientSnapshot) => {
    const stock = inventory.find((entry) => entry.name === item.ingredientName)
    return Boolean(stock && stock.unit === item.unit && stock.quantity >= item.amount)
  }
  const recentDifficulties = recentRecipeIds
    .map((id) => recipes.find((recipe) => recipe.id === id)?.difficulty)
    .filter((value): value is number => typeof value === 'number')
  const avgDifficulty = recentDifficulties.length ? recentDifficulties.reduce((a, b) => a + b, 0) / recentDifficulties.length : 2

  return recipes.map((recipe) => {
    const required = recipe.ingredients.filter((item) => item.kind === 'REQUIRED')
    const optional = recipe.ingredients.filter((item) => item.kind === 'OPTIONAL')
    const availableRequired = required.filter(available).map((item) => item.ingredientName)
    const missingRequired = required.filter((item) => !available(item)).map((item) => item.ingredientName)
    const availableOptional = optional.filter(available).map((item) => item.ingredientName)
    const missingOptional = optional.filter((item) => !available(item)).map((item) => item.ingredientName)
    const requiredCoverage = required.length ? availableRequired.length / required.length : 0
    const optionalCoverage = optional.length ? availableOptional.length / optional.length : 0
    const difficultyFit = Math.max(0, 100 - Math.abs(recipe.difficulty - avgDifficulty) * 24)
    const repetitionPenalty = (recentCount.get(recipe.id) || 0) * 22
    const score = requiredCoverage * 50 + difficultyFit * 0.2 + optionalCoverage * 10 - repetitionPenalty
    return {
      recipeId: recipe.id, recipeName: recipe.name, ready: missingRequired.length === 0,
      matchLevel: missingRequired.length, score, availableRequired, missingRequired,
      availableOptional, missingOptional, requiredCoverage,
    }
  }).sort((a, b) => a.matchLevel - b.matchLevel || b.score - a.score)
}
