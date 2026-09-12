/**
 * 前后端共享类型定义。
 * 描述连接配置、能力项、调用请求/响应以及统一错误结构。
 */

/** 传输方式：auto 时后端先试 Streamable HTTP，失败回退 SSE。 */
export type TransportKind = 'auto' | 'streamableHttp' | 'sse';

/** 前端发起连接时提交的配置。 */
export interface ConnectionConfig {
  /** 远程 MCP Server 的接口 URL（仅 http/https）。 */
  url: string;
  /** 传输方式。 */
  transport: TransportKind;
  /** 自定义请求头（可能含鉴权 Token，后端不落日志）。 */
  headers: Record<string, string>;
}

/** 远程 Server 的握手信息。 */
export interface ServerInfo {
  name: string;
  version: string;
  /** 实际协商采用的协议版本（若 SDK 暴露）。 */
  protocolVersion?: string;
  /** 实际生效的传输方式。 */
  transport: Exclude<TransportKind, 'auto'>;
  /** Server 声明的能力开关。 */
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

/** POST /connect 的返回。 */
export interface ConnectResult {
  sessionId: string;
  serverInfo: ServerInfo;
}

/** 一个 Tool 能力项。 */
export interface ToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: Record<string, unknown>;
}

/** 一个 Resource 能力项。 */
export interface ResourceInfo {
  uri: string;
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
}

/** 一个 Prompt 能力项。 */
export interface PromptInfo {
  name: string;
  title?: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

/** 三类能力的聚合列表。 */
export interface CapabilitiesResult {
  tools: ToolInfo[];
  resources: ResourceInfo[];
  prompts: PromptInfo[];
}

/** 调用 Tool 的请求体。 */
export interface CallToolRequest {
  sessionId: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** MCP 内容块（文本/图片/资源等）。 */
export interface ContentBlock {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
  [key: string]: unknown;
}

/** 调用 Tool 的响应体。 */
export interface CallToolResponse {
  content: ContentBlock[];
  structuredContent?: unknown;
  isError?: boolean;
  /** 服务端处理耗时（毫秒）。 */
  elapsedMs: number;
}

/** 读取 Resource 的请求体。 */
export interface ReadResourceRequest {
  sessionId: string;
  uri: string;
}

/** Resource 内容块。 */
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface ReadResourceResponse {
  contents: ResourceContent[];
  elapsedMs: number;
}

/** 获取 Prompt 渲染结果的请求体。 */
export interface GetPromptRequest {
  sessionId: string;
  name: string;
  arguments?: Record<string, string>;
}

export interface PromptMessage {
  role: string;
  content: ContentBlock;
}

export interface GetPromptResponse {
  description?: string;
  messages: PromptMessage[];
  elapsedMs: number;
}

/** 统一错误结构。 */
export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
}

/** 极简 JSON Schema 类型（覆盖入参表单所需字段）。 */
export interface JsonSchema {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  format?: string;
  [key: string]: unknown;
}
