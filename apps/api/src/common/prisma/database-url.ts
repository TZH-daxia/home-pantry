import { resolve } from 'path'

/**
 * SQLite 数据库地址解析。
 * - 未配置 DATABASE_URL 时，默认使用 apps/api/prisma/dev.db
 * - 相对 file: 路径统一按 apps/api/prisma 解析，避免 CLI（相对 schema 目录）与运行时（相对 cwd）指向不同文件
 * - 支持 :memory:、绝对路径 file:/... 或 file:C:/... 覆盖
 */
const PRISMA_DIR = resolve(__dirname, '../../../prisma')

export function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw) return `file:${resolve(PRISMA_DIR, 'dev.db')}`
  if (raw === ':memory:') return raw
  if (raw.startsWith('file:')) {
    const target = raw.slice('file:'.length)
    if (/^([A-Za-z]:[\\/]|\/)/.test(target)) return raw
    return `file:${resolve(PRISMA_DIR, target)}`
  }
  return raw
}
