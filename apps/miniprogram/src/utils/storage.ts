import Taro from '@tarojs/taro'
import { INITIAL_HISTORY, INITIAL_INVENTORY, INITIAL_PROFILE, INITIAL_RECIPES } from '../constants/mock-data'
import { Ingredient, MealRecord, Recipe, UserProfile } from '../types'

const KEYS = {
  inventory: 'hp_inventory_v1',
  recipes: 'hp_recipes_v1',
  profile: 'hp_profile_v1',
  history: 'hp_history_v1',
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = Taro.getStorageSync(key)
    return value ? (value as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, value: T) {
  Taro.setStorageSync(key, value)
}

export function ensureDemoData() {
  if (!Taro.getStorageSync(KEYS.inventory)) write(KEYS.inventory, INITIAL_INVENTORY)
  if (!Taro.getStorageSync(KEYS.recipes)) write(KEYS.recipes, INITIAL_RECIPES)
  if (!Taro.getStorageSync(KEYS.profile)) write(KEYS.profile, INITIAL_PROFILE)
  if (!Taro.getStorageSync(KEYS.history)) write(KEYS.history, INITIAL_HISTORY)
}

export const getInventory = () => read<Ingredient[]>(KEYS.inventory, INITIAL_INVENTORY)
export const saveInventory = (value: Ingredient[]) => write(KEYS.inventory, value)
export const getRecipes = () => read<Recipe[]>(KEYS.recipes, INITIAL_RECIPES)
export const saveRecipes = (value: Recipe[]) => write(KEYS.recipes, value)
export const getProfile = () => read<UserProfile>(KEYS.profile, INITIAL_PROFILE)
export const saveProfile = (value: UserProfile) => write(KEYS.profile, value)
export const getHistory = () => read<MealRecord[]>(KEYS.history, INITIAL_HISTORY)
export const saveHistory = (value: MealRecord[]) => write(KEYS.history, value)

export function resetDemoData() {
  Object.values(KEYS).forEach((key) => Taro.removeStorageSync(key))
  ensureDemoData()
}
