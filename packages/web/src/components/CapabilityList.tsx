import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Inbox } from 'lucide-react';
import type { CapabilitiesResult } from '@mcp-playground/shared';
import { useAppStore, type CapabilityKind } from '../store/appStore.js';
import { useCapabilities } from '../hooks/useCapabilities.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { cn } from '../lib/cn.js';

interface RowItem {
  key: string;
  label: string;
  description?: string;
  kind: CapabilityKind;
}

const TABS: { kind: CapabilityKind; title: string; searchWord: string }[] = [
  { kind: 'tool', title: 'Tools', searchWord: 'tools' },
  { kind: 'resource', title: 'Resources', searchWord: 'resources' },
  { kind: 'prompt', title: 'Prompts', searchWord: 'prompts' },
];

export function CapabilityList() {
  const sessionId = useAppStore((s) => s.sessionId);
  const selection = useAppStore((s) => s.selection);
  const select = useAppStore((s) => s.select);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<CapabilityKind>('tool');

  const { data, isLoading, isError, error } = useCapabilities(sessionId);

  const counts = useMemo(
    () => ({
      tool: data?.tools.length ?? 0,
      resource: data?.resources.length ?? 0,
      prompt: data?.prompts.length ?? 0,
    }),
    [data],
  );

  // 能力加载完成后，把工具数量写回当前激活连接（用于连接卡片展示）
  const setToolCount = useConnectionStore((s) => s.setToolCount);
  useEffect(() => {
    if (!sessionId || !data) return;
    const activeId = useConnectionStore.getState().activeId;
    if (activeId) setToolCount(activeId, data.tools.length);
  }, [sessionId, data, setToolCount]);

  const items = useMemo(() => buildItems(data, activeTab, search), [data, activeTab, search]);
  const activeMeta = TABS.find((t) => t.kind === activeTab)!;

  return (
    <aside className="w-[274px] flex-none bg-stone-0 border-r border-stone-200 flex flex-col min-h-0">
      {/* Tabs */}
      <div className="flex items-stretch gap-4 px-4 border-b border-stone-200 h-[42px]">
        {TABS.map((t) => {
          const active = activeTab === t.kind;
          return (
            <button
              key={t.kind}
              className="relative h-full flex items-center gap-1.5 group"
              onClick={() => setActiveTab(t.kind)}
            >
              <span
                className={cn(
                  'font-display text-[13px] font-semibold transition-colors',
                  active ? 'text-teal-700' : 'text-ink-3 group-hover:text-ink-1',
                )}
              >
                {t.title}
              </span>
              <span
                className={cn(
                  'font-mono text-[10px] px-1.5 py-px rounded-full transition-colors',
                  active ? 'bg-teal-50 text-teal-700' : 'bg-stone-100 text-ink-2',
                )}
              >
                {counts[t.kind]}
              </span>
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-[2.5px] rounded-full bg-teal-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mx-3.5 mt-2.5 mb-1 flex items-center gap-2 bg-stone-50 border border-stone-300 rounded-[9px] px-2.5 py-2 text-ink-3 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15 focus-within:bg-white">
        <Search className="w-[15px] h-[15px]" />
        <input
          className="bg-transparent outline-none text-[12.5px] flex-1 text-ink-0 font-mono placeholder:text-ink-3"
          placeholder={`Search ${activeMeta.searchWord}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scroll-slim px-2.5 pt-1.5 pb-4">
        {!sessionId && <EmptyHint text="Connect to view Tools / Resources / Prompts" />}
        {sessionId && isLoading && (
          <div className="flex items-center gap-2 text-ink-2 text-[12.5px] px-3 py-6 font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading capabilities…
          </div>
        )}
        {sessionId && isError && (
          <div className="text-brand-red text-[12px] px-3 py-4 font-mono">
            {(error as { message?: string })?.message ?? 'Failed to load capabilities'}
          </div>
        )}
        {sessionId && !isLoading && !isError && items.length === 0 && (
          <EmptyHint text={search ? 'No matches' : `No ${activeMeta.searchWord}`} />
        )}
        {sessionId &&
          !isLoading &&
          items.map((item) => {
            const active = selection?.kind === item.kind && selection.key === item.key;
            return (
              <button
                key={item.key}
                className={cn(
                  'w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-[11px] transition text-left mb-0.5',
                  active
                    ? 'bg-stone-0 border border-stone-200 shadow-sm'
                    : 'border border-transparent hover:bg-stone-100',
                )}
                onClick={() => select({ kind: item.kind, key: item.key })}
              >
                <KindBadge kind={item.kind} active={active} />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'font-mono text-[12.5px] truncate',
                      active ? 'text-teal-700 font-semibold' : 'text-ink-0 font-medium',
                    )}
                  >
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-[11px] text-ink-2 truncate mt-0.5 leading-snug">
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
      </div>
    </aside>
  );
}

function buildItems(
  data: CapabilitiesResult | undefined,
  kind: CapabilityKind,
  search: string,
): RowItem[] {
  const q = search.trim().toLowerCase();
  const match = (...ss: (string | undefined)[]) =>
    !q || ss.some((s) => (s ?? '').toLowerCase().includes(q));
  if (kind === 'tool') {
    return (data?.tools ?? [])
      .filter((t) => match(t.name, t.title, t.description))
      .map((t) => ({ key: t.name, label: t.name, description: t.description, kind: 'tool' }));
  }
  if (kind === 'resource') {
    return (data?.resources ?? [])
      .filter((r) => match(r.name, r.uri, r.description))
      .map((r) => ({
        key: r.uri,
        label: r.name ?? r.uri,
        description: r.description ?? r.uri,
        kind: 'resource',
      }));
  }
  return (data?.prompts ?? [])
    .filter((p) => match(p.name, p.title, p.description))
    .map((p) => ({ key: p.name, label: p.name, description: p.description, kind: 'prompt' }));
}

function KindBadge({ kind, active }: { kind: CapabilityKind; active: boolean }) {
  const tag = kind === 'tool' ? 'fn' : kind === 'resource' ? 'uri' : 'tpl';
  return (
    <span
      className={cn(
        'flex-none w-8 h-8 rounded-[9px] grid place-items-center font-mono text-[10.5px] font-bold transition',
        active
          ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-glow'
          : 'bg-teal-50 text-teal-700 border border-teal-100',
      )}
    >
      {tag}
    </span>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-ink-3 px-4 py-10 text-center">
      <Inbox className="w-7 h-7" />
      <span className="text-[12px] leading-relaxed">{text}</span>
    </div>
  );
}
