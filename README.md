# 今天吃啥 · home-pantry

智能家庭食材库存与菜谱推荐微信小程序。当前交付为第一期 MVP 工程：小程序端包含可交互的本地演示数据流程，后端提供可扩展的 NestJS 模块骨架、库存/菜谱/推荐 API 与 Prisma 数据模型。

## 技术栈

- **运行环境**：Node.js `26.13.1` LTS、npm `11.20.0`。
- **小程序**：Taro 4.3.x + React 18 + TypeScript 5.9.3；使用 Taro 原生组件、自定义 shadcn 风格设计 Token 和组件，不直接复用 Web 版 shadcn/ui。
- **后端**：NestJS 12 + TypeScript 6.0.3 + Prisma 7.10.1 + **SQLite**（通过 `@prisma/adapter-better-sqlite3` 驱动适配器，数据文件 `apps/api/prisma/dev.db`）。
- **任务**：NestJS Schedule 预留每日推荐任务；Redis/BullMQ 可在需要异步任务时接入（`docker-compose.yml` 仅保留 redis，可选）。
- **推荐**：确定性库存匹配算法优先，AI 只作为后续的解释/生成能力，不负责伪造库存事实。

## 目录结构

```text
home-pantry/
├── apps/
│   ├── miniprogram/       # Taro 微信小程序
│   └── api/               # NestJS API
├── docs/                  # 需求分析、产品交互、开发与依赖说明
├── docker-compose.yml
├── .env.example
├── .nvmrc
└── package.json
```

## 环境要求

- Node.js `26.13.1`（项目基准版本；Node 26 LTS）。
- npm `11.20.0`（Node.js 26.13.1 官方安装包附带版本）。
- 微信开发者工具（预览小程序）。
- Docker Desktop（可选，仅在需要启动 Redis 时使用；SQLite 无需任何数据库服务）。

可通过 `nvm use 26.13.1` 切换 Node。Windows NVM 如果提示权限不足，请用管理员终端执行。

## Windows 快速启动（CMD）

### 1. 检查运行环境

```bat
node -v
npm -v
```

应分别显示 `v26.13.1` 和 `11.20.0`。如果 Node 版本已切换但 npm 不同，先确认当前终端的 `where node`、`where npm` 指向同一套 NVM 安装目录。

### 2. 配置环境变量

在项目根目录执行：

```bat
copy .env.example .env
```

`.env` 默认值用于本地开发。上线前必须替换数据库密码和 JWT Secret，并配置微信 AppID/AppSecret。

### 3. 安装依赖

```bat
npm install
```

仓库使用 npm Workspaces，API 和小程序分别固定 TypeScript 版本，避免 NestJS Schematics 的 TypeScript 6 peer dependency 与 Taro 工具链的 TypeScript 5.9 冲突：

- API：TypeScript `6.0.3`。
- 小程序：TypeScript `5.9.3`。

不要使用 `--force` 或 `--legacy-peer-deps` 绕过 peer dependency 冲突。

### 4. 数据库（SQLite，无需安装服务）

数据库文件默认创建在 `apps/api/prisma/dev.db`，由 Prisma 迁移自动生成，无需 Docker。
如需改用其他位置，在 `.env` 中设置 `DATABASE_URL="file:./your.db"`（相对路径基于 `apps/api/prisma` 解析）。

### 5. 生成客户端、建表并写入演示数据

```bat
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

Prisma Client 会生成到 `apps/api/src/generated/prisma`（已加入 `.gitignore`，无需手动编辑或提交）。API 开发启动和构建也会自动先执行 `prisma generate`。

### 6. 启动后端

打开一个 CMD：

```bat
npm run dev:api
```

默认 API 地址：`http://localhost:3000/api`；健康检查：`GET http://localhost:3000/api/health`。

### 7. 编译小程序

另开一个 CMD：

```bat
npm run dev:mini
```

使用微信开发者工具导入 `apps/miniprogram/dist`。首次使用请在 `apps/miniprogram/project.config.json` 中填写自己的 AppID；本地预览可按开发者工具提示使用测试配置。

## 纯本地演示版本（不上后端）

需要先上线占位、或只想离线演示时，用本地模式构建：不发起任何网络请求，数据仅存本机 Storage，家庭协同与登录入口自动隐藏。

```bat
:: CMD
set TARO_APP_LOCAL_ONLY=true && npm run build:mini

:: PowerShell
$env:TARO_APP_LOCAL_ONLY="true"; npm run build:mini
```

产物仍在 `apps/miniprogram/dist`，可直接在开发者工具上传。恢复联调版本时不要带该变量重新构建即可（`npm run build:mini`）。

## MVP 演示说明

- 小程序已接入后端 API：进入应用时通过 `Taro.login` 换取 JWT，随后从 `/inventory`、`/recipes`、`/recommendations/today`、`/history/meals`、`/users/me` 读取数据，写操作实时同步。
- **后端不可用时自动回落到本地演示数据**（Storage 缓存），保证离线或未启动 API 时依然能完整演示。
- 本地未配置 `WECHAT_APP_ID/SECRET` 时，登录会使用与 seed 一致的演示身份（`home-pantry-demo-openid`），便于开发者工具联调；生产环境（`NODE_ENV=production`）会直接拒绝。
- 新增/编辑/删除食材、库存分类筛选、查看菜谱详情、查看今日推荐、标记已制作、修改昵称/头像、切换通知偏好均已打通接口。
- 「我的」页退出登录会**先调用 `POST /auth/logout` 让服务端令牌立即失效**（`User.tokenVersion` 自增，旧 JWT 直接 401），再清除本机登录态并切换为**本地演示模式**（按钮变为“登录并同步数据”），顶部同时显示“本地演示”标识；离线期间新增的食材会在恢复连接后自动补推到后端。
- 菜谱为只读内容：前端不提供新增/删除入口，后续由服务端或数据脚本维护（`POST /api/recipes` 接口保留）。
- 食材库存页提供「刷新」，家庭成员新增食材后其他人可主动拉取最新库存与推荐。
- 「我的」页新增**做菜记录**表格（序号 / 做菜人 / 菜品 / 时间），家庭成员共享，数据来自 `GET /api/history/meals`。
- **家庭协同**：管理员可生成邀请码（24 小时内可多人使用）并分享到微信好友（分享卡片携带邀请码，对方点开自动加入）、移除成员；成员可加入多个家庭并在家庭间切换，查看共享的库存、今日宜吃与最合适的一餐，但不能邀请或移除他人。
- **新用户通过邀请进入时不再创建空家庭**：冷启动携带 `invite` 参数时会把邀请码一并提交给登录接口，后端校验有效后直接以成员身份加入邀请方家庭。
- 微信订阅消息发送需要真实小程序 AppID/Secret、已审核模板及用户授权，服务端目前仅完成偏好存储与发送位置预留，不代表平台审核或真实模板已完成。

## 推荐算法

匹配口径：**库存里存在同名食材即视为满足**（有就算有）；数量与单位不参与判定，是否够用由用户自己掌握。这样用户只需维护“有没有”，无需逐项填数量。

排序采用**硬优先级 + 组内评分**：

1. 必选配料全部满足的菜谱优先。
2. 其后按缺少的必选配料数量升序。
3. 同一匹配等级内，综合必选配料覆盖率、难度适配度、近期重复惩罚、可选配料匹配度排序。
4. 可选配料缺少不会将菜谱判定为不可制作。

## API 概览

> 所有接口（除 `auth`、`health`）都需要 `Authorization: Bearer <token>`；`householdId` 可省略，缺省取自 JWT 中的当前家庭。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/wechat` | 微信 code2session 登录，返回 JWT、用户与默认家庭 |
| GET/PATCH | `/api/users/me` | 资料 + 通知偏好（字段对齐小程序端 `UserProfile`） |
| GET | `/api/inventory` | 库存列表 `{id,name,category,quantity,unit,emoji}` |
| POST | `/api/inventory` | 新增食材（`{name,category,quantity?,unit?,emoji?}`） |
| PATCH | `/api/inventory/:id` | 更新名称/分类/数量/单位 |
| DELETE | `/api/inventory/:id` | 删除库存项 |
| GET | `/api/recipes` | 菜谱列表（配料区分 required/optional） |
| POST | `/api/recipes` | 新增菜谱（前端暂无入口，供后台维护） |
| DELETE | `/api/recipes/:id` | 删除家庭自建菜谱 |
| GET | `/api/recommendations/today` | 今日宜吃（当天批次优先，缺失实时计算） |
| POST | `/api/recommendations/preview` | 实时推荐预览（不落库） |
| POST | `/api/recommendations/generate` | 重新生成当日推荐批次 |
| GET/POST | `/api/history/meals` | 查询/写入做菜记录（返回做菜人、头像、菜品名；`offset`/`limit` 分页，默认 20 条、上限 50） |
| GET/PATCH | `/api/notifications/settings` | 查询/修改家庭通知偏好 |
| GET | `/api/households` | 我所属的家庭列表（含角色、成员数） |
| GET | `/api/households/members` | 当前家庭成员列表 |
| POST | `/api/households/invites` | 管理员生成 6 位邀请码（24 小时有效） |
| POST | `/api/households/join` | 通过邀请码加入家庭（角色为成员） |
| DELETE | `/api/households/members/:userId` | 管理员移除成员 |

> 这是第一期工程底座。家庭协同、生产级订阅消息发送、AI 推荐理由与个性化排序仍属于后续开发工作。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev:mini` | 小程序开发编译 |
| `npm run build:mini` | 小程序生产编译 |
| `npm run dev:api` | 后端热更新开发（自动生成 Prisma Client） |
| `npm run build:api` | 后端构建（自动生成 Prisma Client） |
| `npm run build` | 依次构建 API 和小程序 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:migrate -- --name init` | 创建并应用数据库迁移 |
| `npm run db:seed` | 初始化演示数据 |
| `npm run db:studio` | 打开 Prisma Studio |

## 设计约定

- UI 采用温暖的厨房生活方式视觉：奶油白背景、深墨绿主色、柔和食材色块、较大的圆角和清晰层级。
- 交互优先照顾手机竖屏，首页是纵向模块流；库存支持分类筛选，菜谱和推荐使用卡片与弹层。
- 所有核心实体包含必要的创建/更新时间与家庭归属字段，便于后续协作扩展。

## 文档

- [需求分析报告](docs/需求分析报告.md)
- [产品与交互说明](docs/产品与交互说明.md)
- [开发指南](docs/开发指南.md)
- [依赖基线与 Prisma 7 说明](docs/依赖基线与Prisma7说明.md)
