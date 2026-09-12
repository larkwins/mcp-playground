import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { mcpRouter } from './routes/mcp.js';
import { errorHandler } from './middleware/error.js';
import { sessionStore } from './services/sessionStore.js';
import { logger } from './logger.js';

const PORT = Number(process.env.PORT ?? 8787);

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use('/api/mcp', mcpRouter);

// 生产环境：托管前端静态产物，并对非 /api 路由做 SPA 兜底。
const WEB_ROOT = process.env.WEB_ROOT;
if (WEB_ROOT && fs.existsSync(WEB_ROOT)) {
  logger.info({ webRoot: WEB_ROOT }, 'serving static web assets');
  app.use(express.static(WEB_ROOT));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(WEB_ROOT, 'index.html'));
  });
}

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, `MCP Playground server listening on http://localhost:${PORT}`);
});

/** 优雅退出：清理所有会话。 */
async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  await sessionStore.closeAll();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
