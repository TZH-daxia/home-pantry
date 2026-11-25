export type IngredientCategory = '蔬菜' | '肉类' | '水产' | '蛋奶' | '主食' | '调味品' | '其他'
export type Unit = 'g' | 'kg' | '个' | '颗' | '根' | 'ml' | 'L' | '包'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  quantity: number
  unit: Unit
  emoji: string
}

export type IngredientKind = 'required' | 'optional'
export interface RecipeIngredient {
  ingredientName: string
  kind: IngredientKind
  amount: number
  unit: Unit
}

export interface RecipeStep {
  id: string
  instruction: string
}

export interface Recipe {
  id: string
  name: string
  description: string
  difficulty: 1 | 2 | 3 | 4
  prepMinutes: number
  cookMinutes: number
  emoji: string
  theme: string
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
}

export interface MealRecord {
  id: string
  recipeId: string
  cookedAt: string
}

export interface UserProfile {
  nickname: string
  avatar: string
  autoRecommend: boolean
  notifyMode: 'auto' | 'manual'
  recommendTime: string
}

export interface RecipeMatch {
  recipe: Recipe
  availableRequired: RecipeIngredient[]
  missingRequired: RecipeIngredient[]
  availableOptional: RecipeIngredient[]
  missingOptional: RecipeIngredient[]
  requiredCoverage: number
  ready: boolean
  score: number
  matchLevel: number
}
