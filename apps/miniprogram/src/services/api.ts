import Taro from '@tarojs/taro'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://127.0.0.1:3000/api'
const TOKEN_KEY = 'hp_access_token'

async function request<T>(path: string, options: { method?: 'GET' | 'POST' | 'DELETE' | 'PATCH'; data?: any; header?: Record<string, string> } = {}): Promise<T> {
  const response = await Taro.request<T>({
    url: `${API_BASE_URL}${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: { 'content-type': 'application/json', ...(Taro.getStorageSync(TOKEN_KEY) ? { Authorization: `Bearer ${Taro.getStorageSync(TOKEN_KEY)}` } : {}), ...(options.header || {}) },
  })
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`API 请求失败：${response.statusCode}`)
  }
  return response.data
}

export async function loginWithWechat() {
  const login = await Taro.login()
  if (!login.code) throw new Error('获取微信登录凭证失败')
  const response = await Taro.request<{ accessToken: string; user: unknown; household: unknown }>({
    url: `${API_BASE_URL}/auth/wechat`, method: 'POST', data: { code: login.code }, header: { 'content-type': 'application/json' },
  })
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error('微信登录失败')
  Taro.setStorageSync(TOKEN_KEY, response.data.accessToken)
  return response.data
}

export function clearApiSession() { Taro.removeStorageSync(TOKEN_KEY) }

export const api = {
  getMyProfile: () => request<{ id: string; nickname: string; avatarKey: string }>('/users/me'),
  updateMyProfile: (payload: Record<string, unknown>) => request('/users/me', { method: 'PATCH', data: payload }),
  health: () => request<{ status: string }>('/health'),
  listInventory: (householdId: string) => request<any[]>(`/inventory?householdId=${encodeURIComponent(householdId)}`),
  createInventory: (payload: Record<string, unknown>) => request('/inventory', { method: 'POST', data: payload }),
  deleteInventory: (id: string) => request(`/inventory/${id}`, { method: 'DELETE' }),
  listRecipes: (householdId: string) => request<any[]>(`/recipes?householdId=${encodeURIComponent(householdId)}`),
  createRecipe: (payload: Record<string, unknown>) => request('/recipes', { method: 'POST', data: payload }),
  deleteRecipe: (id: string) => request(`/recipes/${id}`, { method: 'DELETE' }),
  previewRecommendations: (payload: Record<string, unknown>) => request<any[]>('/recommendations/preview', { method: 'POST', data: payload }),
  listMealHistory: (householdId: string) => request<any[]>(`/history/meals?householdId=${encodeURIComponent(householdId)}`),
  createMealHistory: (payload: Record<string, unknown>) => request('/history/meals', { method: 'POST', data: payload }),
  getNotificationSettings: (householdId: string) => request(`/notifications/settings?householdId=${encodeURIComponent(householdId)}`),
  updateNotificationSettings: (payload: Record<string, unknown>) => request('/notifications/settings', { method: 'PATCH', data: payload }),
}

// API_BASE_URL 部署时应替换为 HTTPS 合法域名；默认演示端使用本地数据仓库。
