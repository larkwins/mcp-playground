# syntax=docker/dockerfile:1

########################################
# 1) 依赖 + 构建阶段
########################################
FROM node:22-alpine AS build
# 开启 corepack，自动使用 package.json 中 packageManager 指定的 pnpm 版本
RUN corepack enable
WORKDIR /repo

# 先只拷贝清单文件，最大化利用 Docker 层缓存
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json

RUN pnpm config set registry https://registry.npmmirror.com
# CI/Docker 无交互环境：允许 esbuild 等依赖执行 install 脚本（postinstall 下载原生二进制）
# 对应 pnpm 10.16+ 的 dangerouslyAllowAllBuilds，用于规避 ERR_PNPM_IGNORED_BUILDS
RUN pnpm config set dangerouslyAllowAllBuilds true
RUN pnpm install --frozen-lockfile

# 拷贝源码并构建 shared + server + web
COPY . .
RUN pnpm build

# 生成仅含生产依赖、可独立运行的 server 目录（含已编译的 dist）
# pnpm 10+ 默认只允许部署已注入依赖的 workspace；此处无需注入，沿用官方推荐的 legacy 模式
RUN pnpm --filter=@mcp-playground/server deploy --prod --legacy /app/server

########################################
# 2) 运行阶段（精简镜像）
########################################
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
# Express 在此目录读取前端静态产物
ENV WEB_ROOT=/app/web

# 后端（含生产 node_modules 与 dist）
COPY --from=build /app/server ./server
# 前端构建产物
COPY --from=build /repo/packages/web/dist ./web

EXPOSE 8787

WORKDIR /app/server
CMD ["node", "dist/index.js"]
