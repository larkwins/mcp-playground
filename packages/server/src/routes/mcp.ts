import { Router, type Request } from 'express';
import { nanoid } from 'nanoid';
import type {
  ConnectionConfig,
  ConnectResult,
  CallToolRequest,
  ReadResourceRequest,
  GetPromptRequest,
} from '@mcp-playground/shared';
import { sessionStore } from '../services/sessionStore.js';
import * as mcp from '../services/mcpClient.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { logger } from '../logger.js';

export const mcpRouter = Router();

/** 从请求体或 header 中取出 sessionId，并校验会话存在。 */
function requireSession(req: Request) {
  const sessionId =
    (req.body?.sessionId as string | undefined) ??
    (req.query?.sessionId as string | undefined) ??
    (req.header('x-session-id') ?? undefined);
  if (!sessionId) throw new AppError('MISSING_SESSION', '缺少 sessionId', undefined, 400);
  const session = sessionStore.get(sessionId);
  if (!session) throw new AppError('SESSION_NOT_FOUND', '会话不存在或已过期，请重新连接', undefined, 404);
  return session;
}

/** POST /connect —— 建立连接并返回 sessionId + serverInfo。 */
mcpRouter.post(
  '/connect',
  asyncHandler(async (req, res) => {
    const config = req.body as ConnectionConfig;
    if (!config?.url) throw new AppError('MISSING_URL', '缺少 MCP Server URL');

    const { client, serverInfo } = await mcp.connect({
      url: config.url,
      transport: config.transport ?? 'auto',
      headers: config.headers ?? {},
    });

    const id = nanoid();
    const now = Date.now();
    sessionStore.add({ id, client, serverInfo, createdAt: now, lastUsedAt: now });

    const result: ConnectResult = { sessionId: id, serverInfo };
    res.json(result);
  }),
);

/** POST /disconnect —— 断开并清理会话。 */
mcpRouter.post(
  '/disconnect',
  asyncHandler(async (req, res) => {
    const sessionId = req.body?.sessionId as string | undefined;
    if (sessionId) await sessionStore.remove(sessionId);
    res.json({ ok: true });
  }),
);

/** GET /capabilities —— 一次性拉取 tools/resources/prompts。 */
mcpRouter.get(
  '/capabilities',
  asyncHandler(async (req, res) => {
    const session = requireSession(req);
    const caps = await mcp.listCapabilities(session.client);
    res.json(caps);
  }),
);

/** GET /tools */
mcpRouter.get(
  '/tools',
  asyncHandler(async (req, res) => {
    const session = requireSession(req);
    const caps = await mcp.listCapabilities(session.client);
    res.json({ tools: caps.tools });
  }),
);

/** GET /resources */
mcpRouter.get(
  '/resources',
  asyncHandler(async (req, res) => {
    const session = requireSession(req);
    const caps = await mcp.listCapabilities(session.client);
    res.json({ resources: caps.resources });
  }),
);

/** GET /prompts */
mcpRouter.get(
  '/prompts',
  asyncHandler(async (req, res) => {
    const session = requireSession(req);
    const caps = await mcp.listCapabilities(session.client);
    res.json({ prompts: caps.prompts });
  }),
);

/** POST /call —— 调用某个 Tool。 */
mcpRouter.post(
  '/call',
  asyncHandler(async (req, res) => {
    const body = req.body as CallToolRequest;
    const session = requireSession(req);
    if (!body?.name) throw new AppError('MISSING_TOOL_NAME', '缺少 tool 名称');
    logger.info({ sessionId: session.id, tool: body.name }, 'call tool');
    const result = await mcp.callTool(session.client, body.name, body.arguments ?? {});
    res.json(result);
  }),
);

/** POST /read —— 读取某个 Resource。 */
mcpRouter.post(
  '/read',
  asyncHandler(async (req, res) => {
    const body = req.body as ReadResourceRequest;
    const session = requireSession(req);
    if (!body?.uri) throw new AppError('MISSING_URI', '缺少 resource uri');
    const result = await mcp.readResource(session.client, body.uri);
    res.json(result);
  }),
);

/** POST /prompt —— 获取某个 Prompt 的渲染结果。 */
mcpRouter.post(
  '/prompt',
  asyncHandler(async (req, res) => {
    const body = req.body as GetPromptRequest;
    const session = requireSession(req);
    if (!body?.name) throw new AppError('MISSING_PROMPT_NAME', '缺少 prompt 名称');
    const result = await mcp.getPrompt(session.client, body.name, body.arguments ?? {});
    res.json(result);
  }),
);
