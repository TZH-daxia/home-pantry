/**
 * 分享用的邀请码暂存。
 * 小程序的 onShareAppMessage 在页面层触发、拿不到弹窗内部状态，
 * 因此邀请码先写到这里，由页面分享回调读取。
 */
let pendingInviteCode = ''

export const setShareInviteCode = (code: string) => { pendingInviteCode = code }
export const getShareInviteCode = () => pendingInviteCode
export const clearShareInviteCode = () => { pendingInviteCode = '' }

export const buildInvitePath = (code: string) => `/pages/home/index?invite=${encodeURIComponent(code)}`
