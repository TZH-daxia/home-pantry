/**
 * 运行模式开关（构建期注入）：
 * - 默认 false：连接后端 API，支持家庭共享
 * - `TARO_APP_LOCAL_ONLY=true` 构建：纯本地演示版本，不发起任何网络请求，
 *   家庭共享/邀请码/登录入口隐藏，适合先上线占位或离线演示。
 */
export const isLocalOnly = (): boolean => process.env.TARO_APP_LOCAL_ONLY === 'true'
