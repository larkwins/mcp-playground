import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Pencil,
  Check,
  Trash2,
  Loader2,
  KeyRound,
  Inbox,
  Server,
} from 'lucide-react';
import type { TransportKind } from '@mcp-playground/shared';
import { useAppStore } from '../store/appStore.js';
import {
  useConnectionStore,
  displayName,
  type SavedConnection,
} from '../store/connectionStore.js';
import { useConnection } from '../hooks/useConnection.js';
import { cn } from '../lib/cn.js';

const TRANSPORT_SHORT: Record<Exclude<TransportKind, 'auto'>, string> = {
  streamableHttp: 'HTTP',
  sse: 'SSE',
};

/** 连接类型标签：优先展示握手后实际生效的传输（HTTP/SSE），永不展示 Auto。 */
function resolveTransportLabel(conn: SavedConnection): string {
  const resolved = conn.resolvedTransport ?? (conn.transport === 'auto' ? undefined : conn.transport);
  return resolved ? TRANSPORT_SHORT[resolved] : 'HTTP';
}

/**
 * 左侧连接管理：展示所有连接成功过的服务（localStorage），
 * 点击条目即把该连接的 url / transport / headers 载入工作区并自动连上。
 */
export function ConnectionSidebar() {
  const connections = useConnectionStore((s) => s.connections);
  const activeId = useConnectionStore((s) => s.activeId);
  const setActiveId = useConnectionStore((s) => s.setActiveId);
  const removeConnection = useConnectionStore((s) => s.remove);
  const renameConnection = useConnectionStore((s) => s.rename);

  const open = useAppStore((s) => s.connectionsOpen);
  const toggleConnections = useAppStore((s) => s.toggleConnections);
  const status = useAppStore((s) => s.status);
  const setUrl = useAppStore((s) => s.setUrl);
  const setTransport = useAppStore((s) => s.setTransport);
  const setHeaders = useAppStore((s) => s.setHeaders);

  const { connect } = useConnection();

  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // 收起态：悬浮某个连接图标时展示的名称/URL 浮层（fixed 定位，避免被竖栏裁切）
  const [hoverTip, setHoverTip] = useState<{ conn: SavedConnection; top: number; left: number } | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (c) =>
        c.url.toLowerCase().includes(q) ||
        displayName(c).toLowerCase().includes(q) ||
        (c.serverName ?? '').toLowerCase().includes(q),
    );
  }, [connections, query]);

  // 二次点击确认删除，3 秒后自动取消
  useEffect(() => {
    if (!confirmId) return;
    const timer = window.setTimeout(() => setConfirmId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmId]);

  const switchTo = async (c: SavedConnection) => {
    if (pendingId) return;
    setPendingId(c.id);
    setActiveId(c.id);
    setUrl(c.url);
    setTransport(c.transport);
    if (c.headers.length > 0) setHeaders(c.headers);
    await connect({ url: c.url, transport: c.transport, headers: c.headers });
    setPendingId(null);
  };

  const startRename = (c: SavedConnection) => {
    setEditingId(c.id);
    setDraft(c.label ?? c.serverName ?? '');
  };

  const commitRename = () => {
    if (editingId) renameConnection(editingId, draft);
    setEditingId(null);
    setDraft('');
  };

  // 收起状态：窄竖栏 + 展开按钮 + 各连接的首字母快捷入口
  if (!open) {
    return (
      <aside className="w-[56px] flex-none bg-stone-0 border-r border-stone-200 flex flex-col items-center min-h-0">
        <div className="w-full h-[42px] flex-none flex items-center justify-center border-b border-stone-200">
          <button
            type="button"
            onClick={toggleConnections}
            className="flex-none w-[30px] h-[30px] rounded-lg bg-teal-50 border border-teal-100 grid place-items-center text-teal-700 transition hover:bg-teal-100"
            title="Expand connections"
            aria-label="Expand connections"
          >
            <Server className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 w-full overflow-y-auto scroll-slim flex flex-col items-center gap-1.5 py-2">
          {connections.map((c) => {
            const letter = (displayName(c).trim()[0] ?? '?').toUpperCase();
            const isActive = activeId === c.id;
            const isConnected = isActive && status === 'connected';
            const isConnecting = pendingId === c.id || (isActive && status === 'connecting');
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void switchTo(c)}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHoverTip({ conn: c, top: r.top + r.height / 2, left: r.right + 10 });
                }}
                onMouseLeave={() => setHoverTip(null)}
                className={cn(
                  'relative w-9 h-9 flex-none rounded-[10px] grid place-items-center font-display text-[14px] font-bold transition border',
                  isActive
                    ? 'bg-teal-600 text-white border-transparent'
                    : 'bg-stone-50 text-ink-1 border-stone-200 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50',
                )}
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  letter
                )}
                {isConnected && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-green border-2 border-stone-0" />
                )}
              </button>
            );
          })}
        </div>

        {hoverTip && (
          <div
            className="fixed z-50 -translate-y-1/2 pointer-events-none max-w-[280px] rounded-lg bg-ink-0 text-stone-0 shadow-md px-3 py-2"
            style={{ top: hoverTip.top, left: hoverTip.left }}
          >
            <div className="font-display text-[12.5px] font-bold truncate">{displayName(hoverTip.conn)}</div>
            <div className="font-mono text-[10.5px] text-stone-300 truncate mt-0.5">{hoverTip.conn.url}</div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className="w-[290px] flex-none bg-stone-0 border-r border-stone-200 flex flex-col min-h-0">
      {/* Title */}
      <div className="flex items-center gap-2 px-3.5 h-[42px] border-b border-stone-200 flex-none">
        <button
          type="button"
          onClick={toggleConnections}
          className="flex-none w-[30px] h-[30px] rounded-lg bg-teal-50 border border-teal-100 grid place-items-center text-teal-700 transition hover:bg-teal-100"
          title="Collapse connections"
          aria-label="Collapse connections"
        >
          <Server className="w-4 h-4" />
        </button>
        <span className="font-mono text-[12px] font-bold tracking-[0.09em] uppercase text-ink-2">
          Connections
        </span>
        <span className="bg-stone-100 text-ink-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono border border-stone-200">
          {connections.length}
        </span>
      </div>

      {/* Search */}
      <div className="mx-3 mt-2.5 mb-1 flex items-center gap-2 bg-stone-50 border border-stone-300 rounded-[9px] px-2.5 py-2 text-ink-3 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15 focus-within:bg-white">
        <Search className="w-[15px] h-[15px] flex-none" />
        <input
          className="bg-transparent outline-none text-[12px] flex-1 text-ink-0 font-mono placeholder:text-ink-3 min-w-0"
          placeholder="Search connections…"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scroll-slim px-2.5 pt-1.5 pb-4">
        {connections.length === 0 && (
          <EmptyHint text="Successful connections are saved here automatically" />
        )}
        {connections.length > 0 && filtered.length === 0 && <EmptyHint text="No matches" />}

        {filtered.map((c) => (
          <ConnectionItem
            key={c.id}
            conn={c}
            active={activeId === c.id}
            connected={activeId === c.id && status === 'connected'}
            connecting={pendingId === c.id || (activeId === c.id && status === 'connecting')}
            editing={editingId === c.id}
            confirming={confirmId === c.id}
            draft={draft}
            onDraftChange={setDraft}
            onSelect={() => void switchTo(c)}
            onStartRename={() => startRename(c)}
            onCommitRename={commitRename}
            onCancelRename={() => setEditingId(null)}
            onDelete={() => {
              if (confirmId === c.id) {
                removeConnection(c.id);
                setConfirmId(null);
              } else {
                setConfirmId(c.id);
              }
            }}
          />
        ))}
      </div>
    </aside>
  );
}

interface ItemProps {
  conn: SavedConnection;
  active: boolean;
  connected: boolean;
  connecting: boolean;
  editing: boolean;
  confirming: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

function ConnectionItem({
  conn,
  active,
  connected,
  connecting,
  editing,
  confirming,
  draft,
  onDraftChange,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
}: ItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const name = displayName(conn);
  const transportLabel = resolveTransportLabel(conn);
  const hasAuth = conn.headers.some(
    (h) => h.enabled && h.key.trim().toLowerCase() === 'authorization' && h.value.trim(),
  );

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  return (
    <div className="relative group mb-1">
      <button
        type="button"
        onClick={onSelect}
        disabled={connecting}
        title={conn.url}
        className={cn(
          'w-full text-left rounded-[11px] border px-2.5 py-2 transition',
          active
            ? 'bg-teal-50/70 border-teal-200 hover:border-teal-300'
            : 'bg-stone-0 border-stone-200 hover:bg-stone-50 hover:border-stone-300',
        )}
      >
        {/* 名称行 */}
        <div className="flex items-center gap-2 pr-12">
          <span className="flex-none w-2 h-2 rounded-full grid place-items-center">
            {connected ? (
              <span className="w-2 h-2 rounded-full bg-brand-green" />
            ) : connecting ? (
              <Loader2 className="w-3 h-3 text-brand-amber animate-spin -ml-0.5" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-stone-300" />
            )}
          </span>
          {editing ? (
            <input
              ref={inputRef}
              className="flex-1 min-w-0 bg-white border border-teal-500 rounded-md px-1.5 py-0.5 font-display text-[12.5px] font-bold text-ink-0 outline-none ring-4 ring-teal-500/15"
              value={draft}
              spellCheck={false}
              onChange={(e) => onDraftChange(e.target.value)}
              onBlur={onCommitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommitRename();
                if (e.key === 'Escape') onCancelRename();
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={cn(
                'flex-1 min-w-0 font-display text-[12.5px] font-bold truncate',
                active ? 'text-teal-700' : 'text-ink-0',
              )}
            >
              {name}
            </span>
          )}
        </div>

        {/* URL */}
        <div className="font-mono text-[10.5px] text-ink-2 truncate mt-1 pl-4">{conn.url}</div>

        {/* 元信息 */}
        <div className="flex items-center gap-1.5 mt-1.5 pl-4">
          <span className="font-mono text-[9.5px] font-semibold h-[17px] px-1.5 rounded-md bg-stone-100 text-ink-1 border border-stone-200 inline-flex items-center">
            {transportLabel}
          </span>
          <span
            className="font-mono h-[17px] px-1.5 rounded-md bg-stone-100 border border-stone-200 inline-flex items-center"
            title={hasAuth ? 'Authorization configured' : 'No Authorization'}
          >
            <KeyRound className={cn('w-2.5 h-2.5', hasAuth ? 'text-teal-600' : 'text-ink-3')} />
          </span>
          <span className="font-mono text-[9.5px] font-semibold h-[17px] px-1.5 rounded-md bg-stone-100 text-ink-1 border border-stone-200 inline-flex items-center">
            {conn.toolCount ?? 0} Tools
          </span>
          <span className="ml-auto font-mono text-[9.5px] text-ink-3 flex-none">
            {formatRelative(conn.lastUsedAt ?? conn.createdAt)}
          </span>
        </div>
      </button>

      {/* 悬停操作（覆盖在卡片右上角，避免按钮嵌套） */}
      {!editing && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 invisible group-hover:visible">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="w-6 h-6 grid place-items-center rounded-md text-ink-2 bg-stone-0/90 hover:text-teal-700 hover:bg-teal-50 transition"
            title="Rename"
            aria-label="Rename connection"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              'w-6 h-6 grid place-items-center rounded-md transition',
              confirming
                ? 'text-white bg-brand-red hover:bg-brand-red/90'
                : 'text-ink-2 bg-stone-0/90 hover:text-brand-red hover:bg-brand-red/10',
            )}
            title={confirming ? 'Click again to remove' : 'Remove connection'}
            aria-label="Remove connection"
          >
            {confirming ? <Check className="w-3.5 h-3.5" strokeWidth={2.6} /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-ink-3 px-4 py-9 text-center">
      <Inbox className="w-6 h-6" />
      <span className="text-[11.5px] leading-relaxed">{text}</span>
    </div>
  );
}

function formatRelative(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diff < min) return 'now';
  if (diff < hour) return `${Math.floor(diff / min)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return new Date(ts).toLocaleDateString();
}
