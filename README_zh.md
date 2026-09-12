# MCP Playground

一个类 Postman 的 **MCP Server 调试工具**。填写远程 MCP Server 的 URL 与自定义 Header 后建立连接，浏览其暴露的 **Tools / Resources / Prompts**，对任意 Tool 填参调用并查看结果。

后端使用官方 `@modelcontextprotocol/sdk` 作为客户端代理，规避浏览器 CORS，并支持 **Streamable HTTP / SSE 自动探测**。

![](./screenshots.png)

## 技术栈

- **前端** `packages/web`：React + Vite + TypeScript + Tailwind CSS + TanStack Query + Zustand
- **后端** `packages/server`：Node + Express + TypeScript + `@modelcontextprotocol/sdk` + pino
- **共享类型** `packages/shared`
- 单仓：pnpm workspace monorepo

## 目录结构

```
packages/
├── shared/   前后端共享类型
├── server/   Express 代理层（会话池 + MCP 客户端封装）
└── web/      React 三栏工作台界面（V4 设计）
```

## 快速开始

```bash
pnpm install

# 同时启动前后端（server:8787 / web:5173，web 已代理 /api → server）
pnpm dev

# 或分别启动
pnpm dev:server
pnpm dev:web
```

打开 http://localhost:5173

## 界面（V4 设计）

- **顶部连接栏**：`MCP` 地址栏 + 传输方式（Auto / Streamable HTTP / SSE）+ Header 编辑器（齿轮展开）+ 连接/断开 + 状态灯
- **左栏能力列表**：Tools / Resources / Prompts 可折叠分组 + 搜索
- **中栏请求/响应分屏**：上半 REQUEST（按 JSON Schema 自动生成入参表单 + 运行），下半 RESPONSE（深色结果区，structured/content/raw 切换、耗时/大小、复制）
- **右栏 Schema Inspector**：元信息 + Input/Output Schema 树

配色 teal 青绿 + stone 暖灰；字体 Sora / IBM Plex Sans / IBM Plex Mono。

## 后端接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/mcp/connect` | 建立连接，返回 `sessionId` + `serverInfo` |
| POST | `/api/mcp/disconnect` | 断开并清理会话 |
| GET | `/api/mcp/capabilities` | 一次性拉取 tools/resources/prompts |
| POST | `/api/mcp/call` | 调用 Tool |
| POST | `/api/mcp/read` | 读取 Resource |
| POST | `/api/mcp/prompt` | 获取 Prompt 渲染结果 |
| GET | `/api/health` | 健康检查 |

## 设计要点

- **会话池**：后端按 `sessionId` 复用 `Client` 实例，避免重复握手；空闲超时自动清理。
- **传输自动探测**：`auto` 时先试 Streamable HTTP，失败以全新 Client 回退 SSE。
- **安全**：仅允许 http/https 目标地址；日志对 Header/Token 脱敏。
- **持久化**：连接配置（URL / 传输方式 / Header）保存在浏览器 localStorage。

## 环境变量

- `PORT`：后端端口（默认 8787）
- `SESSION_IDLE_TIMEOUT_MS`：会话空闲超时（默认 30 分钟）
- `VITE_API_TARGET`：前端代理目标（默认 http://localhost:8787）
