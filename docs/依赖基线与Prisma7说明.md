# 依赖基线与 Prisma 7 说明

## Node / npm 基线

项目针对 Windows 开发环境固定：

- Node.js `26.13.1` LTS
- npm `11.20.0`

Node.js 官方 v26.13.1 下载归档列明其捆绑 npm 版本为 11.20.0。项目根 `package.json` 已声明 Node `>=26.13.1 <27`、npm `>=11.20.0 <12`，并通过 `packageManager` 固定 npm 版本。`.nvmrc` 和 `.node-version` 也都指向 `26.13.1`。

## TypeScript workspace 分离

这是 npm Workspaces 项目，前后端工具链的 TypeScript 版本不同：

| Workspace | TypeScript | 原因 |
|---|---:|---|
| `apps/api` | 6.0.3 | NestJS 12 的 schematics 要求 TypeScript 6 peer dependency |
| `apps/miniprogram` | 5.9.3 | 保持 Taro 4.3.x 当前工程配置 |

两个 workspace 的 `@types/node` 使用 26.6.6。不要把不同 workspace 的 TypeScript 强行统一，也不要用 npm peer-dependency 绕过参数安装。

## Prisma 7 generator

Prisma 7 推荐使用 `prisma-client` generator，并要求显式指定 `output`。项目配置为：

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```

生成路径相对于 `apps/api/prisma/schema.prisma`，因此结果为 `apps/api/src/generated/prisma`。由于 API 项目使用 CommonJS 编译，`moduleFormat = "cjs"` 与后端模块格式对齐。

服务端和 seed 文件分别从生成目录导入：

```ts
// apps/api/src/common/prisma/prisma.service.ts
import { PrismaClient } from '../../generated/prisma/client'

// apps/api/prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma/client'
```

Prisma 7 使用 PostgreSQL driver adapter，项目保留 `@prisma/adapter-pg` 和 `pg`。数据库 URL 在 `apps/api/prisma.config.ts` 中从根目录 `.env` 的 `DATABASE_URL` 读取。

## 初始化流程

```bat
copy .env.example .env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

修改 `schema.prisma` 后，重新执行 `npm run db:generate`，然后创建新迁移。不要手动修改 `src/generated/prisma` 中的生成代码。

## 说明

源代码交付包不包含 `node_modules`、数据库文件或生成的 Prisma Client。依赖安装与客户端生成由项目命令完成。实际安装和构建需要在本机 Node.js 26.13.1、npm 11.20.0 及可访问 npm registry 的环境运行。
