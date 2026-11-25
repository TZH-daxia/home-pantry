import { Ingredient, MealRecord, Recipe, RecipeMatch, UserProfile } from '../types'
import { buildRecommendations } from '../utils/recommendation'
import { getHistory, getInventory, getProfile, getRecipes, saveHistory, saveInventory, saveProfile, saveRecipes } from '../utils/storage'
import { api, HouseholdMember, HouseholdSummary, InventoryPayload, InviteCode, RemoteProfile } from './api'
import { isLocalOnly } from './runtime'
import { isGuest, setActiveHousehold } from './session'

export interface DashboardBundle {
  inventory: Ingredient[]
  recipes: Recipe[]
  history: MealRecord[]
  profile: UserProfile
  matches: RecipeMatch[]
  /** true 表示数据来自后端，false 表示本地演示数据（游客模式或后端不可用） */
  remote: boolean
}

const toProfile = (profile: RemoteProfile): UserProfile => ({
  nickname: profile.nickname,
  avatar: profile.avatar,
  autoRecommend: profile.autoRecommend,
  notifyMode: profile.notifyMode,
  recommendTime: profile.recommendTime,
  householdRole: profile.householdRole,
  householdName: profile.household?.name,
})

const localBundle = (): DashboardBundle => {
  const inventory = getInventory()
  const recipes = getRecipes()
  const history = getHistory()
  return {
    inventory,
    recipes,
    history,
    profile: getProfile(),
    matches: buildRecommendations(recipes, inventory, history),
    remote: false,
  }
}

/**
 * 离线期间本地新增的食材，在恢复连接后补推到后端，避免被远端数据覆盖丢失。
 * 目前只合并“新增”，离线删除不做补偿（删除只影响本地缓存，下次同步会以远端为准）。
 */
async function pushLocalOnlyIngredients(remoteInventory: Ingredient[]): Promise<boolean> {
  const remoteNames = new Set(remoteInventory.map((item) => item.name))
  const pending = getInventory().filter((item) => !remoteNames.has(item.name))
  if (!pending.length) return false
  for (const item of pending) {
    try {
      await api.createInventory({ name: item.name, category: item.category })
    } catch (error) {
      console.warn('[home-pantry] 离线食材补推失败', item.name, error)
      return false
    }
  }
  return true
}

/**
 * 拉取首页所需数据：游客模式或后端不可用时使用本地演示数据；
 * 后端可用时先补推离线新增，再以服务端数据为准并回写缓存。
 */
export async function loadDashboard(): Promise<DashboardBundle> {
  if (isLocalOnly() || isGuest()) return localBundle()
  try {
    const [remoteInventory, recipes, history, remoteProfile, remoteMatches] = await Promise.all([
      api.listInventory(),
      api.listRecipes(),
      api.listMeals(),
      api.getProfile(),
      api.todayRecommendations(),
    ])
    let inventory = remoteInventory
    let matches = remoteMatches
    if (await pushLocalOnlyIngredients(remoteInventory)) {
      inventory = await api.listInventory()
      matches = await api.todayRecommendations()
    }
    const profile = toProfile(remoteProfile)
    saveInventory(inventory)
    saveRecipes(recipes)
    saveHistory(history)
    saveProfile(profile)
    return { inventory, recipes, history, profile, matches, remote: true }
  } catch (error) {
    console.warn('[home-pantry] 后端不可用，使用本地演示数据', error)
    return localBundle()
  }
}

/* 以下写操作只调用后端，本地缓存由页面统一维护，避免双写造成重复数据 */

export const createIngredient = async (payload: InventoryPayload): Promise<boolean> => {
  if (isLocalOnly()) return true
  try {
    await api.createInventory(payload)
    return true
  } catch (error) {
    console.warn('[home-pantry] 新增食材同步失败', error)
    return false
  }
}

export const updateIngredient = async (id: string, payload: Partial<InventoryPayload>): Promise<boolean> => {
  if (isLocalOnly()) return true
  try {
    await api.updateInventory(id, payload)
    return true
  } catch (error) {
    console.warn('[home-pantry] 更新食材同步失败', error)
    return false
  }
}

export const deleteIngredient = async (id: string): Promise<boolean> => {
  if (isLocalOnly()) return true
  try {
    await api.deleteInventory(id)
    return true
  } catch (error) {
    console.warn('[home-pantry] 删除食材同步失败', error)
    return false
  }
}

export const recordMeal = async (recipeId: string): Promise<boolean> => {
  if (isLocalOnly()) return true
  try {
    await api.createMeal(recipeId)
    return true
  } catch (error) {
    console.warn('[home-pantry] 制作记录同步失败', error)
    return false
  }
}

const localMeals = (offset: number, limit: number): MealRecord[] => {
  const recipes = getRecipes()
  const profile = getProfile()
  return getHistory()
    .map((record) => ({
      ...record,
      userName: profile.nickname,
      userAvatar: profile.avatar,
      recipeName: recipes.find((recipe) => recipe.id === record.recipeId)?.name || '已删除的菜谱',
    }))
    .slice(offset, offset + limit)
}

/** 做菜记录：后端分页读取，失败或纯本地模式时用本地记录补齐菜名与做菜人后再切片 */
export async function loadMeals(offset = 0, limit = 20): Promise<MealRecord[]> {
  if (isLocalOnly()) return localMeals(offset, limit)
  try {
    return await api.listMeals(offset, limit)
  } catch (error) {
    console.warn('[home-pantry] 做菜记录读取失败，使用本地缓存', error)
    return localMeals(offset, limit)
  }
}

/** 退出登录：先让服务端使旧 token 失效，失败也不阻塞本地退出 */
export async function logout(): Promise<void> {
  if (isLocalOnly()) return
  try {
    await api.logout()
  } catch (error) {
    console.warn('[home-pantry] 服务端注销失败，仅清理本机登录态', error)
  }
}

/* ---------- 家庭协同 ---------- */

export const loadHouseholds = (): Promise<HouseholdSummary[]> => api.listHouseholds()
export const loadHouseholdMembers = (): Promise<HouseholdMember[]> => api.listMembers()
export const createInviteCode = (): Promise<InviteCode> => api.createInvite()
export const removeHouseholdMember = (userId: string): Promise<{ success: boolean }> => api.removeMember(userId)

/** 通过邀请码加入家庭，并自动切换为当前家庭 */
export async function joinHousehold(code: string) {
  const result = await api.joinHousehold(code)
  setActiveHousehold(result.id)
  return result
}

/** 切换当前家庭 */
export function switchHousehold(householdId: string) {
  setActiveHousehold(householdId)
}

/** 个人资料与通知偏好统一走 PATCH /users/me，成功后回写本地缓存 */
export const pushProfile = async (patch: Partial<UserProfile>): Promise<UserProfile | null> => {
  if (isLocalOnly()) return null
  try {
    const remote = await api.updateProfile({
      nickname: patch.nickname,
      avatar: patch.avatar,
      autoRecommend: patch.autoRecommend,
      notifyMode: patch.notifyMode,
      recommendTime: patch.recommendTime,
    })
    const profile = toProfile(remote)
    saveProfile(profile)
    return profile
  } catch (error) {
    console.warn('[home-pantry] 个人资料同步失败', error)
    return null
  }
}
