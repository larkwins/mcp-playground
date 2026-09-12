import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ServerInfo } from '@mcp-playground/shared';
import { logger } from '../logger.js';

/** 单个会话记录。 */
export interface Session {
  id: string;
  client: Client;
  serverInfo: ServerInfo;
  createdAt: number;
  lastUsedAt: number;
}

/** 空闲超时（毫秒）：超过该时长未使用的会话将被清理。 */
const IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS ?? 30 * 60 * 1000);
/** 清理扫描间隔。 */
const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * 会话连接池：sessionId → Client。
 * 复用连接避免每次调用重新握手；定时清理空闲会话防止连接泄漏。
 */
class SessionStore {
  private sessions = new Map<string, Session>();
  private sweeper: NodeJS.Timeout;

  constructor() {
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    // 不阻止进程退出
    this.sweeper.unref?.();
  }

  add(session: Session): void {
    this.sessions.set(session.id, session);
    logger.info({ sessionId: session.id, total: this.sessions.size }, 'session added');
  }

  get(id: string): Session | undefined {
    const s = this.sessions.get(id);
    if (s) s.lastUsedAt = Date.now();
    return s;
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  async remove(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (!s) return;
    this.sessions.delete(id);
    await this.safeClose(s);
    logger.info({ sessionId: id, total: this.sessions.size }, 'session removed');
  }

  private async safeClose(s: Session): Promise<void> {
    await s.client.close().catch((err) => {
      logger.warn({ sessionId: s.id, err: String(err) }, 'error closing client');
    });
  }

  private sweep(): void {
    const now = Date.now();
    for (const s of this.sessions.values()) {
      if (now - s.lastUsedAt > IDLE_TIMEOUT_MS) {
        logger.info({ sessionId: s.id }, 'session idle timeout, cleaning up');
        void this.remove(s.id);
      }
    }
  }

  async closeAll(): Promise<void> {
    clearInterval(this.sweeper);
    await Promise.all([...this.sessions.values()].map((s) => this.safeClose(s)));
    this.sessions.clear();
  }
}

export const sessionStore = new SessionStore();
