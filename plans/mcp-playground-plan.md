# MCP Playground 全栈项目方案

> 一个类 Postman 的 MCP Server 调试工具。用户输入远程 MCP Server 的接口 URL、配置自定义 Header 后建立连接，可浏览该 Server 暴露的 Tools / Resources / Prompts，并对任意 Tool 进行填参调用、查看返回结果。

## 产品概述

一个类 Postman 的 MCP Server 调试工具(MCP Playground)。用户输入远程 MCP Server 的接口 URL、配置自定义 Header 后建立连接，可浏览该 Server 暴露的 Tools / Resources / Prompts，并对任意 Tool 进行填参调用、查看返回结果。

## 核心功能

- **连接配置**：URL 输入框、传输方式选择(自动探测 / Streamable HTTP / SSE)、Header 键值对编辑器、连接/断开按钮、实时连接状态指示。
- **能力浏览**：连接成功后分类展示 Tools、Resources、Prompts 三类列表，显示名称与描述。
- **Tool 详情与调用**：选中某个 Tool，展示其入参 schema(自动生成参数表单)与出参说明；填写参数后发起调用，展示返回结果(结构化 JSON / 文本)、耗时与错误信息。
- **Resources / Prompts 查看**：选中 Resource 可读取其内容；选中 Prompt 可查看参数并获取渲染结果。
- **配置持久化**：连接配置(URL / Header / 传输方式)保存在浏览器 localStorage，刷新后自动恢复；支持多套配置管理。

## 视觉效果

参考 Postman 三栏布局：顶部连接配置栏、左侧能力列表(Tab 分类)、右侧详情与调用/结果面板；现代简洁风格，清晰的状态反馈与交互动效。

## 技术栈选择

- **前端**：React + Vite + TypeScript，Tailwind CSS + shadcn/ui 组件库，TanStack Query 管理请求状态，@rjsf(react-jsonschema-form) 根据 Tool 的 JSON Schema 自动生成入参表单。
- **后端**：Node.js + Express + TypeScript，官方 `@modelcontextprotocol/sdk` 作为 MCP 客户端，充当浏览器与远程 MCP Server 之间的代理层。
- **包管理/结构**：pnpm workspace 单仓 monorepo(packages: `web` / `server` / 可选 `shared` 存放共享类型)。

## 实现思路

前端不直接连接远程 MCP Server(受浏览器 CORS 限制)，而是把连接配置发给本地 Node 后端；后端用 SDK 的 `Client` 建立会话并按会话 id 维护连接池。核心决策：

- **传输自动探测**：先用 `StreamableHTTPClientTransport` 连接，失败则用新的 `Client` 回退到 `SSEClientTransport`；也支持前端显式指定传输方式。自定义 Header 通过 transport 构造参数 `{ requestInit: { headers } }` 透传。
- **会话管理**：后端为每个连接生成 `sessionId`，用 Map 缓存 `Client` 实例；后续 list/call 请求携带 sessionId 复用连接，避免每次调用重新握手(降低延迟)。设置空闲超时清理，防止连接泄漏。
- **能力查询与调用**：封装 `client.listTools()/listResources()/listPrompts()/callTool()/readResource()/getPrompt()`，统一错误捕获与超时控制。
- **版本协商**：`new Client(info, { versionNegotiation: { mode: 'auto' } })` 自动选择协议版本。

## 实现要点

- **性能**：连接复用(会话池)避免重复握手；前端用 TanStack Query 缓存 list 结果，切换 Tab 不重复请求；大结果 JSON 渲染做懒展开。
- **可靠性/错误处理**：后端对 MCP 调用统一 try/catch，将 SDK 错误规范化为 `{ code, message, detail }` 返回；调用带超时；连接断开时清理会话并通知前端。
- **安全**：Header 中可能含 Bearer Token，仅在内存/localStorage 保存，不写日志；后端对目标 URL 做基本校验(仅 http/https)。
- **日志**：后端使用轻量 logger(如 pino)，记录连接/调用的关键事件，避免打印 Header/Token 等敏感值。

## 架构设计

```mermaid
flowchart LR
    UI[React 前端<br/>连接配置/列表/调用面板] -->|REST JSON| API[Express 代理层]
    API -->|@modelcontextprotocol/sdk Client| MCP[远程 MCP Server]
    API --> Pool[(会话连接池<br/>sessionId → Client)]
    UI --> LS[(localStorage<br/>连接配置)]
```

- **表现层**：React 组件(连接栏 / 能力列表 / 详情面板 / 结果面板)。
- **代理层**：Express 路由 → MCP 服务封装 → 会话池。
- **数据流**：连接配置 → POST /connect(建会话) → GET 能力列表 → POST 调用 → 结果返回渲染。

## 目录结构

```
mcp-playground/
├── package.json                         # [NEW] pnpm workspace 根配置
├── pnpm-workspace.yaml                  # [NEW] 定义 packages/*
├── packages/
│   ├── shared/
│   │   └── src/types.ts                 # [NEW] 前后端共享类型(连接配置、能力项、调用请求/响应)
│   ├── server/
│   │   ├── src/index.ts                 # [NEW] Express 入口，注册路由、启动端口
│   │   ├── src/routes/mcp.ts            # [NEW] REST 路由: connect/disconnect/tools/resources/prompts/call/read/prompt
│   │   ├── src/services/mcpClient.ts    # [NEW] 封装 SDK Client 连接(自动探测 HTTP→SSE)、list/call/read 方法
│   │   ├── src/services/sessionStore.ts # [NEW] 会话池(sessionId→Client)、空闲超时清理
│   │   ├── src/middleware/error.ts      # [NEW] 统一错误规范化中间件
│   │   └── src/logger.ts                # [NEW] pino 日志实例(脱敏)
│   └── web/
│       ├── index.html / vite.config.ts  # [NEW] Vite 配置(含 /api 代理到 server)
│       ├── src/main.tsx / App.tsx       # [NEW] 应用入口与三栏布局
│       ├── src/api/client.ts            # [NEW] 后端 REST 调用封装
│       ├── src/hooks/useConnection.ts   # [NEW] 连接状态与 localStorage 持久化
│       ├── src/store/                   # [NEW] 连接配置/会话状态管理
│       ├── src/components/
│       │   ├── ConnectionBar.tsx        # [NEW] URL 输入、传输选择、Header 编辑器、连接按钮、状态指示
│       │   ├── CapabilityList.tsx       # [NEW] Tools/Resources/Prompts 分类 Tab 列表
│       │   ├── ToolDetailPanel.tsx      # [NEW] 入参表单(rjsf)+ 出参说明 + 调用按钮
│       │   ├── ResultViewer.tsx         # [NEW] 结果展示(JSON/文本/耗时/错误)
│       │   └── ResourcePromptPanel.tsx  # [NEW] Resource 读取 / Prompt 查看
│       └── src/lib/schemaForm.ts        # [NEW] JSON Schema → 表单适配工具
```

## 关键接口约定

```ts
// shared/src/types.ts
interface ConnectionConfig {
  url: string;
  transport: 'auto' | 'streamableHttp' | 'sse';
  headers: Record<string, string>;
}
interface ConnectResult { sessionId: string; serverInfo: { name: string; version: string }; }
interface CallToolRequest { sessionId: string; name: string; arguments: Record<string, unknown>; }
interface CallToolResponse { content: unknown; structuredContent?: unknown; isError?: boolean; elapsedMs: number; }
```

## 设计风格

参考 Postman/API 调试工具的专业三栏工作台布局，采用现代简洁的开发者工具风格，支持浅色为主、可扩展深色模式。整体强调信息密度与清晰的状态反馈。

## 布局结构

- **顶部连接栏(ConnectionBar)**：全宽，左侧 URL 输入框(大号 monospace)，中部传输方式下拉(auto/http/sse)，右侧连接/断开按钮与彩色状态指示灯(灰=未连、绿=已连、红=错误)；下方可展开 Header 键值对编辑区。
- **左侧能力面板(约 280px)**：顶部 Tabs 切换 Tools/Resources/Prompts，下方为可搜索的列表项(名称 + 描述截断)，选中高亮。
- **右侧主区**：上半部为选中项详情(Tool 显示入参表单与出参 schema)，中部醒目"调用/执行"按钮，下半部为结果查看器(带 JSON 折叠树、耗时标签、错误红色高亮、复制按钮)。

## 交互与动效

- 连接过程按钮 loading 态与状态灯过渡动画。
- 列表项 hover 微交互、选中滑动高亮。
- 结果面板成功/失败用色带区分，JSON 树可懒展开。
- 参数表单依据 JSON Schema 自动渲染，必填校验实时反馈。

## 设计规范(UI)

- **风格关键词**：开发者工具、专业三栏、简洁现代、清晰状态反馈。
- **字体**：Inter；标题 20px/600，副标题 15px/500，正文 14px/400。
- **主色**：`#4F46E5` / `#6366F1` / `#818CF8`
- **背景**：`#FFFFFF` / `#F8FAFC` / `#F1F5F9`
- **文本**：`#0F172A` / `#475569` / `#94A3B8`
- **功能色**：成功 `#22C55E`、错误 `#EF4444`、警告 `#F59E0B`、信息 `#3B82F6`

## Agent Extensions

### MCP

- **context7**
  - Purpose: 在实现后端 MCP 客户端封装时，查询 `@modelcontextprotocol/sdk` 的最新客户端 API(Client 构造、StreamableHTTP/SSE transport 参数、listTools/callTool 等)确保 API 用法准确。
  - Expected outcome: 获得与所用 SDK 版本一致的准确 API 用法，避免接口误用导致返工。

## 任务清单(Todolist)

| # | 任务 | 依赖 |
|---|------|------|
| 1 | 搭建 pnpm workspace monorepo，初始化 server(Express+TS)、web(Vite+React+TS+Tailwind+shadcn)、shared 三个包与共享类型 | - |
| 2 | 核对 SDK API，实现 mcpClient 封装(HTTP→SSE 自动探测、Header 透传)与会话池 sessionStore | 1 |
| 3 | 实现 Express 路由 connect/disconnect/tools/resources/prompts/call/read/prompt，含统一错误规范化与脱敏日志 | 2 |
| 4 | 实现 ConnectionBar 连接配置区(URL/传输选择/Header 编辑/状态指示)与 localStorage 持久化 hook | 1 |
| 5 | 实现 CapabilityList 三分类列表(Tab+搜索)，接入后端能力查询并缓存 | 3, 4 |
| 6 | 实现 ToolDetailPanel(JSON Schema 入参表单+出参说明)与 ResultViewer 调用结果展示 | 5 |
| 7 | 实现 ResourcePromptPanel 完成 Resource 读取与 Prompt 查看/渲染 | 5 |
