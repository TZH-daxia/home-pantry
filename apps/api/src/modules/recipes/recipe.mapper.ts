export type IngredientKindDto = 'required' | 'optional'

export interface RecipeIngredientShape {
  ingredientName: string
  kind: IngredientKindDto
  amount: number
  unit: string
}

export interface RecipeShape {
  id: string
  name: string
  description: string
  difficulty: number
  prepMinutes: number
  cookMinutes: number
  emoji: string
  theme: string
  ingredients: RecipeIngredientShape[]
  steps: { id: string; instruction: string }[]
}

export const toKindDto = (kind: string): IngredientKindDto => (kind === 'OPTIONAL' ? 'optional' : 'required')
export const toKindDb = (kind: string): 'REQUIRED' | 'OPTIONAL' => (kind === 'optional' ? 'OPTIONAL' : 'REQUIRED')

interface RecipeRecord {
  id: string
  name: string
  description: string
  difficulty: number
  prepMinutes: number
  cookMinutes: number
  emoji: string
  theme: string
  ingredients: { kind: string; amount: number; unit: string; ingredient: { name: string } }[]
  steps: { id: string; instruction: string; stepNumber: number }[]
}

/** 菜谱输出结构对齐小程序端 types.Recipe，便于前端直接消费 */
export function toRecipeShape(recipe: RecipeRecord): RecipeShape {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    difficulty: recipe.difficulty,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    emoji: recipe.emoji,
    theme: recipe.theme,
    ingredients: recipe.ingredients.map((item) => ({
      ingredientName: item.ingredient.name,
      kind: toKindDto(item.kind),
      amount: item.amount,
      unit: item.unit,
    })),
    steps: [...recipe.steps]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((step) => ({ id: step.id, instruction: step.instruction })),
  }
}
