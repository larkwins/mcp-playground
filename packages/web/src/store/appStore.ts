import { create } from 'zustand';
import type { TransportKind, ServerInfo } from '@mcp-playground/shared';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type CapabilityKind = 'tool' | 'resource' | 'prompt';

export interface HeaderPair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Selection {
  kind: CapabilityKind;
  key: string;
}

const STORAGE_KEY = 'mcp-playground.connection';

/**
 * 生成唯一 ID。
 * crypto.randomUUID 仅在安全上下文（https / localhost）可用，
 * 通过普通 HTTP 域名访问时会缺失，这里做降级兜底。
 */
function safeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `h_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

interface PersistShape {
  url: string;
  transport: TransportKind;
  headers: HeaderPair[];
}

function loadPersisted(): PersistShape {
  const fallback: PersistShape = {
    url: '',
    transport: 'auto',
    headers: [{ id: safeId(), key: 'Authorization', value: 'Bearer ', enabled: true }],
  };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallback;
  const parsed = JSON.parse(raw) as Partial<PersistShape>;
  return {
    url: parsed.url ?? '',
    transport: parsed.transport ?? 'auto',
    headers:
      parsed.headers && parsed.headers.length > 0
        ? parsed.headers
        : fallback.headers,
  };
}

interface AppState {
  // 连接配置（持久化）
  url: string;
  transport: TransportKind;
  headers: HeaderPair[];
  // 运行时状态
  status: ConnStatus;
  sessionId: string | null;
  serverInfo: ServerInfo | null;
  errorMsg: string | null;
  selection: Selection | null;
  headersPanelOpen: boolean;
  /** 连接管理侧边栏是否展开（持久化）。 */
  connectionsOpen: boolean;

  setUrl: (url: string) => void;
  setTransport: (t: TransportKind) => void;
  setHeaders: (h: HeaderPair[]) => void;
  addHeader: () => void;
  updateHeader: (id: string, patch: Partial<HeaderPair>) => void;
  removeHeader: (id: string) => void;
  toggleHeadersPanel: () => void;
  toggleConnections: () => void;
  setConnectionsOpen: (open: boolean) => void;

  setConnecting: () => void;
  setConnected: (sessionId: string, info: ServerInfo) => void;
  setError: (msg: string) => void;
  clearError: () => void;
  reset: () => void;

  select: (sel: Selection | null) => void;
  headersRecord: () => Record<string, string>;
}

/** 把 HeaderPair[] 拍平成实际发送的请求头（仅启用且键名非空）。 */
export function toHeadersRecord(headers: HeaderPair[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const h of headers) {
    if (h.enabled && h.key.trim()) record[h.key.trim()] = h.value;
  }
  return record;
}

function persist(state: Pick<AppState, 'url' | 'transport' | 'headers'>) {
  const shape: PersistShape = { url: state.url, transport: state.transport, headers: state.headers };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
}

const initial = loadPersisted();

export const useAppStore = create<AppState>((set, get) => ({
  url: initial.url,
  transport: initial.transport,
  headers: initial.headers,
  status: 'idle',
  sessionId: null,
  serverInfo: null,
  errorMsg: null,
  selection: null,
  headersPanelOpen: false,
  connectionsOpen: (() => {
    try {
      return localStorage.getItem('mcp-playground.connectionsOpen') !== '0';
    } catch {
      return true;
    }
  })(),

  setUrl: (url) => {
    set({ url });
    persist(get());
  },
  setTransport: (transport) => {
    set({ transport });
    persist(get());
  },
  setHeaders: (headers) => {
    set({ headers });
    persist(get());
  },
  addHeader: () => {
    const headers = [...get().headers, { id: safeId(), key: '', value: '', enabled: true }];
    set({ headers });
    persist(get());
  },
  updateHeader: (id, patch) => {
    const headers = get().headers.map((h) => (h.id === id ? { ...h, ...patch } : h));
    set({ headers });
    persist(get());
  },
  removeHeader: (id) => {
    const remaining = get().headers.filter((h) => h.id !== id);
    const headers =
      remaining.length > 0 ? remaining : [{ id: safeId(), key: '', value: '', enabled: true }];
    set({ headers });
    persist(get());
  },
  toggleHeadersPanel: () => set((s) => ({ headersPanelOpen: !s.headersPanelOpen })),

  toggleConnections: () => {
    const open = !get().connectionsOpen;
    set({ connectionsOpen: open });
    try {
      localStorage.setItem('mcp-playground.connectionsOpen', open ? '1' : '0');
    } catch (err) {
      console.error('persist connectionsOpen failed', err);
    }
  },

  setConnectionsOpen: (open) => {
    if (get().connectionsOpen === open) return;
    set({ connectionsOpen: open });
    try {
      localStorage.setItem('mcp-playground.connectionsOpen', open ? '1' : '0');
    } catch (err) {
      console.error('persist connectionsOpen failed', err);
    }
  },

  setConnecting: () => set({ status: 'connecting', errorMsg: null }),
  setConnected: (sessionId, serverInfo) =>
    set({ status: 'connected', sessionId, serverInfo, errorMsg: null }),
  setError: (errorMsg) => set({ status: 'error', errorMsg, sessionId: null, serverInfo: null }),
  clearError: () => set({ errorMsg: null }),
  reset: () => set({ status: 'idle', sessionId: null, serverInfo: null, errorMsg: null, selection: null }),

  select: (selection) => set({ selection }),

  headersRecord: () => toHeadersRecord(get().headers),
}));
