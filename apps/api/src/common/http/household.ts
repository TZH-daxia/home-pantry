import { ForbiddenException } from '@nestjs/common'

export interface AuthUser {
  sub: string
  householdId?: string
}

/**
 * 解析家庭空间 ID：优先级 请求体 > 查询参数 > JWT 中的当前家庭。
 * 成员关系仍由各 service 的 assertMember 校验，客户端不能凭 householdId 越权。
 */
export function resolveHouseholdId(requested: string | undefined, user: AuthUser, queryId?: string): string {
  const householdId = requested || queryId || user.householdId
  if (!householdId) throw new ForbiddenException('缺少家庭空间信息，请先登录')
  return householdId
}
