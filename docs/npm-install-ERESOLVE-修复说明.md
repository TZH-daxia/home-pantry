# npm install ERESOLVE 修复说明（历史记录）

## 原始问题

原始压缩包将 API workspace 的 TypeScript 固定为 `5.9.3`，但 `@nestjs/schematics@12.0.16` 声明 peer dependency `typescript@^6.0.0`，导致 npm 报 `ERESOLVE`。

## 当前交付版处理

当前项目包已经统一采用 Node.js `26.13.1` LTS 与 npm `11.20.0`，并将两个 workspace 的 TypeScript 分开固定：

- API：TypeScript `6.0.3`，匹配 NestJS 12 schematics 的 peer dependency。
- 小程序：TypeScript `5.9.3`，保留 Taro 4.3.x 当前配置。
- 两个 workspace：`@types/node` `26.6.6`。

项目根目录 `package.json` 声明了运行环境范围，`.nvmrc` 与 `.node-version` 指向 `26.13.1`。不需要再将 Node 22 升级到其他 22.x 补丁版本。

## Windows CMD 安装

```bat
nvm use 26.13.1
node -v
npm -v

copy .env.example .env
npm install
```

如果之前安装失败，先关闭开发服务，然后在项目根目录清理：

```bat
rd /s /q node_modules
del /f /q package-lock.json
npm install
```

安装后检查：

```bat
npm ls typescript
```

预期 API workspace 使用 `6.0.3`，小程序 workspace 使用 `5.9.3`。不要使用 `--force` 或 `--legacy-peer-deps` 绕过 peer dependency 检查。
