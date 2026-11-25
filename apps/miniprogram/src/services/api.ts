import Taro from '@tarojs/taro'
import { Ingredient, MealRecord, Recipe, RecipeMatch, UserProfile } from '../types'
import { API_BASE_URL, clearSession, ensureLogin, getHouseholdId, getToken } from './session'

export interface RemoteProfile extends UserProfile {
  household?: { id: string; name: string } | null
}

export interface InventoryPayload {
  name: string
  category: string
  quantity?: number
  unit?: string
}

export interface HouseholdSummary {
  id: string
  name: string
  role: 'owner' | 'member'
  memberCount: number
  joinedAt: string
}

export interface HouseholdMember {
  userId: string
  nickname: string
  avatar: string
  role: 'owner' | 'member'
  joinedAt: string
  isSelf: boolean
}

export interface InviteCode {
  code: string
  expiresAt: string
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** 家庭维度接口会自动带上当前家庭 ID，切换家庭后无需重签 JWT */
function withHousehold(path: string, data: unknown): { path: string; data: unknown } {
  const householdId = getHouseholdId()
  if (!householdId) return { path, data }
  const nextPath = `${path}${path.includes('?') ? '&' : '?'}householdId=${encodeURIComponent(householdId)}`
  const nextData = data && typeof data === 'object' && !Array.isArray(data)
    ? { ...(data as Record<string, unknown>), householdId }
    : data
  return { path: nextPath, data: nextData }
}

async function request<T>(path: string, method: Method = 'GET', data?: unknown, options: { scoped?: boolean; retry?: boolean } = {}): Promise<T> {
  const scoped = options.scoped !== false
  const payload = scoped ? withHousehold(path, data) : { path, data }
  const token = await ensureLogin()
  const response = await Taro.request<T>({
    url: `${API_BASE_URL}${payload.path}`,
    method,
    data: payload.data,
    header: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
  })
  // 登录态失效时清理并重试一次
  if (response.statusCode === 401 && options.retry !== false) {
    clearSession()
    return request<T>(path, method, data, { ...options, retry: false })
  }
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`API ${path} 请求失败：${response.statusCode}`)
  }
  return response.data
}

export const api = {
  health: () => request<{ status: string }>('/health', 'GET', undefined, { scoped: false }),

  /** 退出登录：服务端递增令牌版本，旧 token 立即失效 */
  logout: () => request<{ success: boolean }>('/auth/logout', 'POST', {}, { scoped: false }),

  getProfile: () => request<RemoteProfile>('/users/me'),
  updateProfile: (payload: Partial<Pick<UserProfile, 'nickname' | 'avatar' | 'autoRecommend' | 'notifyMode' | 'recommendTime'>>) =>
    request<RemoteProfile>('/users/me', 'PATCH', payload),

  listInventory: () => request<Ingredient[]>('/inventory'),
  createInventory: (payload: InventoryPayload) => request<Ingredient>('/inventory', 'POST', payload),
  updateInventory: (id: string, payload: Partial<InventoryPayload>) => request<Ingredient>(`/inventory/${id}`, 'PATCH', payload),
  deleteInventory: (id: string) => request<{ success: boolean }>(`/inventory/${id}`, 'DELETE', undefined, { scoped: false }),

  listRecipes: () => request<Recipe[]>('/recipes'),
  createRecipe: (payload: Record<string, unknown>) => request<Recipe>('/recipes', 'POST', payload),
  deleteRecipe: (id: string) => request<{ success: boolean }>(`/recipes/${id}`, 'DELETE', undefined, { scoped: false }),

  todayRecommendations: () => request<RecipeMatch[]>('/recommendations/today'),
  previewRecommendations: () => request<RecipeMatch[]>('/recommendations/preview', 'POST', {}),
  generateRecommendations: () => request<RecipeMatch[]>('/recommendations/generate', 'POST', {}),

  listMeals: (offset = 0, limit = 20) => request<MealRecord[]>(`/history/meals?offset=${offset}&limit=${limit}`),
  createMeal: (recipeId: string) => request<MealRecord>('/history/meals', 'POST', { recipeId }),

  listHouseholds: () => request<HouseholdSummary[]>('/households', 'GET', undefined, { scoped: false }),
  listMembers: () => request<HouseholdMember[]>('/households/members'),
  createInvite: () => request<InviteCode>('/households/invites', 'POST', {}),
  joinHousehold: (code: string) => request<{ id: string; name: string; role: 'owner' | 'member'; alreadyMember: boolean }>('/households/join', 'POST', { code }, { scoped: false }),
  removeMember: (userId: string) => request<{ success: boolean }>(`/households/members/${userId}`, 'DELETE'),
}

export const hasToken = () => Boolean(getToken())
