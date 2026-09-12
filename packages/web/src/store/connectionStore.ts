import { create } from 'zustand';
import type { TransportKind, ServerInfo } from '@mcp-playground/shared';
import type { HeaderPair } from './appStore.js';

const STORAGE_KEY = 'mcp-playground.connections';
const ACTIVE_KEY = 'mcp-playground.activeConnection';

/** 一条已保存的连接（连接成功后自动落库到 localStorage）。 */
export interface SavedConnection {
  id: string;
  url: string;
  transport: TransportKind;
  headers: HeaderPair[];
  /** 用户备注名，未设置时回退到 serverInfo.name / hostname。 */
  label?: string;
  serverName?: string;
  serverVersion?: string;
  /** 握手后实际生效的传输方式。 */
  resolvedTransport?: Exclude<TransportKind, 'auto'>;
  /** 最近一次连接成功后拉取到的工具数量。 */
  toolCount?: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  useCount: number;
}

export interface UpsertInput {
  url: string;
  transport: TransportKind;
  headers: HeaderPair[];
  serverInfo?: ServerInfo;
}

/** URL 归一化：用于判定“同一个连接”，忽略大小写与首尾空白。 */
export function normalizeUrl(url: string): string {
  return url.trim().toLowerCase();
}

function safeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeHeaders(input: unknown): HeaderPair[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((h): h is HeaderPair => Boolean(h) && typeof h === 'object')
    .map((h) => ({
      id: typeof h.id === 'string' && h.id ? h.id : safeId(),
      key: typeof h.key === 'string' ? h.key : '',
      value: typeof h.value === 'string' ? h.value : '',
      enabled: h.enabled !== false,
    }));
}

function normalizeEntry(input: unknown): SavedConnection | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<SavedConnection>;
  if (typeof raw.url !== 'string' || !raw.url.trim()) return null;
  const now = Date.now();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : safeId(),
    url: raw.url,
    transport: raw.transport ?? 'auto',
    headers: normalizeHeaders(raw.headers),
    label: typeof raw.label === 'string' ? raw.label : undefined,
    serverName: typeof raw.serverName === 'string' ? raw.serverName : undefined,
    serverVersion: typeof raw.serverVersion === 'string' ? raw.serverVersion : undefined,
    resolvedTransport: raw.resolvedTransport,
    toolCount: typeof raw.toolCount === 'number' ? raw.toolCount : undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    lastUsedAt: typeof raw.lastUsedAt === 'number' ? raw.lastUsedAt : undefined,
    useCount: typeof raw.useCount === 'number' ? raw.useCount : 1,
  };
}

function loadConnections(): SavedConnection[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((c): c is SavedConnection => c !== null);
  } catch {
    return [];
  }
}

function loadActiveId(connections: SavedConnection[]): string | null {
  const id = localStorage.getItem(ACTIVE_KEY);
  if (!id) return null;
  return connections.some((c) => c.id === id) ? id : null;
}

function persistConnections(list: SavedConnection[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('persist connections failed', err);
  }
}

function persistActiveId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch (err) {
    console.error('persist active connection failed', err);
  }
}

interface ConnectionStore {
  connections: SavedConnection[];
  /** 当前工作区正在使用的连接条目。 */
  activeId: string | null;

  /** 新增或按 URL 合并更新一条连接，返回其 id。 */
  upsert: (input: UpsertInput) => string;
  remove: (id: string) => void;
  rename: (id: string, label: string) => void;
  setToolCount: (id: string, count: number) => void;
  setActiveId: (id: string | null) => void;
  clearAll: () => void;
}

const initialConnections = loadConnections();

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: initialConnections,
  activeId: loadActiveId(initialConnections),

  upsert: (input) => {
    const url = input.url.trim();
    if (!url) return '';
    const key = normalizeUrl(url);
    const now = Date.now();
    const list = get().connections;
    const existing = list.find((c) => normalizeUrl(c.url) === key);

    const next: SavedConnection = existing
      ? {
          ...existing,
          url,
          transport: input.transport,
          headers: input.headers,
          serverName: input.serverInfo?.name ?? existing.serverName,
          serverVersion: input.serverInfo?.version ?? existing.serverVersion,
          resolvedTransport: input.serverInfo?.transport ?? existing.resolvedTransport,
          updatedAt: now,
          lastUsedAt: now,
          useCount: existing.useCount + 1,
        }
      : {
          id: safeId(),
          url,
          transport: input.transport,
          headers: input.headers,
          serverName: input.serverInfo?.name,
          serverVersion: input.serverInfo?.version,
          resolvedTransport: input.serverInfo?.transport,
          createdAt: now,
          updatedAt: now,
          lastUsedAt: now,
          useCount: 1,
        };

    // 最近使用的排在最前
    const rest = list.filter((c) => c.id !== next.id);
    const merged = [next, ...rest];
    set({ connections: merged, activeId: next.id });
    persistConnections(merged);
    persistActiveId(next.id);
    return next.id;
  },

  remove: (id) => {
    const merged = get().connections.filter((c) => c.id !== id);
    const activeId = get().activeId === id ? null : get().activeId;
    set({ connections: merged, activeId });
    persistConnections(merged);
    persistActiveId(activeId);
  },

  rename: (id, label) => {
    const merged = get().connections.map((c) =>
      c.id === id ? { ...c, label: label.trim() || undefined, updatedAt: Date.now() } : c,
    );
    set({ connections: merged });
    persistConnections(merged);
  },

  setActiveId: (id) => {
    set({ activeId: id });
    persistActiveId(id);
  },

  setToolCount: (id, count) => {
    const list = get().connections;
    const target = list.find((c) => c.id === id);
    if (!target || target.toolCount === count) return;
    const merged = list.map((c) => (c.id === id ? { ...c, toolCount: count } : c));
    set({ connections: merged });
    persistConnections(merged);
  },

  clearAll: () => {
    set({ connections: [], activeId: null });
    persistConnections([]);
    persistActiveId(null);
  },
}));

/** 统计生效中的请求头数量（启用且键名非空）。 */
export function countActiveHeaders(headers: HeaderPair[]): number {
  return headers.filter((h) => h.enabled && h.key.trim()).length;
}

/** 侧边栏展示名：备注名 > 服务端名称 > URL host。 */
export function displayName(c: SavedConnection): string {
  if (c.label) return c.label;
  if (c.serverName) return c.serverName;
  try {
    return new URL(c.url).host || c.url;
  } catch {
    return c.url;
  }
}
