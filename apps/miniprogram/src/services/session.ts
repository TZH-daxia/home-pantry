import Taro from '@tarojs/taro'

export const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://127.0.0.1:3000/api'
const TOKEN_KEY = 'hp_access_token'
const HOUSEHOLD_KEY = 'hp_household_id'
const GUEST_KEY = 'hp_guest_mode'

let loginPromise: Promise<string> | null = null

export const getToken = (): string => Taro.getStorageSync(TOKEN_KEY) || ''
export const getHouseholdId = (): string => Taro.getStorageSync(HOUSEHOLD_KEY) || ''
/** 游客模式：主动退出登录后置为 true，此时不自动登录、只使用本地演示数据 */
export const isGuest = (): boolean => Taro.getStorageSync(GUEST_KEY) === 1
/** 切换当前家庭（后续请求会带上新的 householdId） */
export const setActiveHousehold = (householdId: string) => { Taro.setStorageSync(HOUSEHOLD_KEY, householdId) }

export function clearSession() {
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(HOUSEHOLD_KEY)
}

export function enterGuestMode() {
  clearSession()
  Taro.setStorageSync(GUEST_KEY, 1)
}

export function exitGuestMode() {
  Taro.removeStorageSync(GUEST_KEY)
}

async function doLogin(inviteCode?: string): Promise<string> {
  const login = await Taro.login()
  if (!login.code) throw new Error('获取微信登录凭证失败')
  const response = await Taro.request<{ accessToken: string; household: { id: string } }>({
    url: `${API_BASE_URL}/auth/wechat`,
    method: 'POST',
    data: inviteCode ? { code: login.code, inviteCode } : { code: login.code },
    header: { 'content-type': 'application/json' },
  })
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`登录失败：${response.statusCode}`)
  Taro.setStorageSync(TOKEN_KEY, response.data.accessToken)
  Taro.setStorageSync(HOUSEHOLD_KEY, response.data.household.id)
  return response.data.accessToken
}

/** 保证存在可用的登录态；游客模式下不登录，并发调用共享同一个登录请求 */
export function ensureLogin(inviteCode?: string): Promise<string> {
  if (isGuest()) return Promise.reject(new Error('guest-mode'))
  const token = getToken()
  if (token && getHouseholdId()) return Promise.resolve(token)
  const pending = loginPromise
  if (pending) return pending
  const created = doLogin(inviteCode).then(
    (value) => { loginPromise = null; return value },
    (error) => { loginPromise = null; throw error },
  )
  loginPromise = created
  return created
}
