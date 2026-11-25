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
  /** 以下字段由后端提供，用于家庭共享展示 */
  userName?: string
  userAvatar?: string
  recipeName?: string
}

export interface UserProfile {
  nickname: string
  avatar: string
  autoRecommend: boolean
  notifyMode: 'auto' | 'manual'
  recommendTime: string
  /** 当前家庭角色：owner 表示自己的厨房（管理员），member 表示他人厨房中的成员 */
  householdRole?: 'owner' | 'member'
  /** 当前家庭名称（来自后端 /users/me） */
  householdName?: string
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
