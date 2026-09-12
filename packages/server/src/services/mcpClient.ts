import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type {
  ConnectionConfig,
  ServerInfo,
  TransportKind,
  CallToolResponse,
  ReadResourceResponse,
  GetPromptResponse,
  CapabilitiesResult,
  ToolInfo,
  ResourceInfo,
  PromptInfo,
  ContentBlock,
} from '@mcp-playground/shared';
import { logger } from '../logger.js';
import { AppError } from '../middleware/error.js';

const CLIENT_INFO = { name: 'mcp-playground', version: '0.1.0' } as const;

type ConcreteTransport = Exclude<TransportKind, 'auto'>;

/** 校验目标 URL，仅允许 http/https。 */
function parseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError('INVALID_URL', `无法解析的 URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError('INVALID_URL', '仅支持 http/https 协议的 MCP Server 地址');
  }
  return url;
}

function buildTransport(kind: ConcreteTransport, url: URL, headers: Record<string, string>) {
  const requestInit = { headers };
  if (kind === 'streamableHttp') {
    return new StreamableHTTPClientTransport(url, { requestInit });
  }
  // SSE：requestInit 用于 POST 消息；eventSourceInit 透传给初始 GET 流。
  return new SSEClientTransport(url, {
    requestInit,
    eventSourceInit: {
      fetch: (input: string | URL | Request, init?: RequestInit) =>
        fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string>), ...headers } }),
    },
  } as never);
}

async function tryConnect(
  kind: ConcreteTransport,
  url: URL,
  headers: Record<string, string>,
): Promise<{ client: Client; transport: ConcreteTransport }> {
  const client = new Client(CLIENT_INFO, { versionNegotiation: { mode: 'auto' } } as never);
  const transport = buildTransport(kind, url, headers);
  await client.connect(transport);
  return { client, transport: kind };
}

/**
 * 建立与远程 MCP Server 的连接。
 * transport=auto 时先试 Streamable HTTP，失败回退 SSE（每次回退使用全新 Client）。
 */
export async function connect(
  config: ConnectionConfig,
): Promise<{ client: Client; serverInfo: ServerInfo }> {
  const url = parseUrl(config.url);
  const headers = config.headers ?? {};

  let established: { client: Client; transport: ConcreteTransport };

  if (config.transport === 'auto') {
    try {
      established = await tryConnect('streamableHttp', url, headers);
    } catch (httpErr) {
      logger.warn({ err: String(httpErr) }, 'streamableHttp 连接失败，回退 SSE');
      try {
        established = await tryConnect('sse', url, headers);
      } catch (sseErr) {
        throw new AppError('CONNECT_FAILED', '连接失败：Streamable HTTP 与 SSE 均无法建立连接', {
          streamableHttp: String(httpErr),
          sse: String(sseErr),
        });
      }
    }
  } else {
    established = await tryConnect(config.transport, url, headers).catch((err) => {
      throw new AppError('CONNECT_FAILED', `连接失败（${config.transport}）`, String(err));
    });
  }

  const { client, transport } = established;
  const serverInfo = extractServerInfo(client, transport);
  logger.info({ transport, server: serverInfo.name, version: serverInfo.version }, 'connected');
  return { client, serverInfo };
}

function extractServerInfo(client: Client, transport: ConcreteTransport): ServerInfo {
  const version = (client.getServerVersion?.() ?? {}) as { name?: string; version?: string };
  const caps = (client.getServerCapabilities?.() ?? {}) as Record<string, unknown>;
  return {
    name: version.name ?? '未知 Server',
    version: version.version ?? '未知',
    transport,
    capabilities: {
      tools: Boolean(caps.tools),
      resources: Boolean(caps.resources),
      prompts: Boolean(caps.prompts),
    },
  };
}

/** 拉取三类能力；对不支持的能力静默返回空列表。 */
export async function listCapabilities(client: Client): Promise<CapabilitiesResult> {
  const [tools, resources, prompts] = await Promise.all([
    listTools(client),
    listResources(client),
    listPrompts(client),
  ]);
  return { tools, resources, prompts };
}

async function listTools(client: Client): Promise<ToolInfo[]> {
  const res = await client.listTools().catch((err) => {
    logger.debug({ err: String(err) }, 'listTools 失败/不支持');
    return { tools: [] };
  });
  return (res.tools ?? []).map((t: Record<string, unknown>) => ({
    name: t.name as string,
    title: t.title as string | undefined,
    description: t.description as string | undefined,
    inputSchema: t.inputSchema as ToolInfo['inputSchema'],
    outputSchema: t.outputSchema as ToolInfo['outputSchema'],
    annotations: t.annotations as Record<string, unknown> | undefined,
  }));
}

async function listResources(client: Client): Promise<ResourceInfo[]> {
  const res = await client.listResources().catch((err) => {
    logger.debug({ err: String(err) }, 'listResources 失败/不支持');
    return { resources: [] };
  });
  return (res.resources ?? []).map((r: Record<string, unknown>) => ({
    uri: r.uri as string,
    name: r.name as string | undefined,
    title: r.title as string | undefined,
    description: r.description as string | undefined,
    mimeType: r.mimeType as string | undefined,
  }));
}

async function listPrompts(client: Client): Promise<PromptInfo[]> {
  const res = await client.listPrompts().catch((err) => {
    logger.debug({ err: String(err) }, 'listPrompts 失败/不支持');
    return { prompts: [] };
  });
  return (res.prompts ?? []).map((p: Record<string, unknown>) => ({
    name: p.name as string,
    title: p.title as string | undefined,
    description: p.description as string | undefined,
    arguments: (p.arguments as PromptInfo['arguments']) ?? [],
  }));
}

/** 调用 Tool，统计耗时。 */
export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResponse> {
  const start = Date.now();
  const res = (await client.callTool({ name, arguments: args })) as Record<string, unknown>;
  return {
    content: (res.content as ContentBlock[]) ?? [],
    structuredContent: res.structuredContent,
    isError: Boolean(res.isError),
    elapsedMs: Date.now() - start,
  };
}

/** 读取 Resource。 */
export async function readResource(client: Client, uri: string): Promise<ReadResourceResponse> {
  const start = Date.now();
  const res = (await client.readResource({ uri })) as Record<string, unknown>;
  return {
    contents: (res.contents as ReadResourceResponse['contents']) ?? [],
    elapsedMs: Date.now() - start,
  };
}

/** 获取 Prompt 渲染结果。 */
export async function getPrompt(
  client: Client,
  name: string,
  args: Record<string, string> = {},
): Promise<GetPromptResponse> {
  const start = Date.now();
  const res = (await client.getPrompt({ name, arguments: args })) as Record<string, unknown>;
  return {
    description: res.description as string | undefined,
    messages: (res.messages as GetPromptResponse['messages']) ?? [],
    elapsedMs: Date.now() - start,
  };
}
