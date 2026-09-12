import { useMemo, useState } from 'react';
import { Copy, Check, Loader2, TriangleAlert, ArrowDownToLine } from 'lucide-react';
import { JsonHighlight } from './JsonHighlight.js';
import { cn } from '../lib/cn.js';

export interface ResultTab {
  id: string;
  label: string;
  value: unknown;
}

interface ResultViewerProps {
  loading: boolean;
  error?: string | null;
  isError?: boolean;
  elapsedMs?: number;
  tabs: ResultTab[];
  idleHint?: string;
}

/** 深色响应面板：状态、Tab、耗时/大小、JSON 语法高亮与复制。 */
export function ResultViewer({ loading, error, isError, elapsedMs, tabs, idleHint }: ResultViewerProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeTab = tabs[active] ?? tabs[0];
  const activeText = useMemo(
    () =>
      activeTab
        ? typeof activeTab.value === 'string'
          ? activeTab.value
          : JSON.stringify(activeTab.value, null, 2)
        : '',
    [activeTab],
  );
  const size = useMemo(() => formatBytes(new Blob([activeText]).size), [activeText]);

  const copy = () => {
    navigator.clipboard.writeText(activeText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      (err) => console.error('copy failed', err),
    );
  };

  const hasResult = !loading && !error && tabs.length > 0;

  return (
    <section className="flex-1 flex flex-col min-h-0 bg-ink-code">
      {/* Response bar */}
      <div className="flex-none h-[42px] flex items-center gap-3 px-[18px] border-b border-[#1b3532]">
        <span className="font-mono text-[10.5px] font-bold tracking-[0.12em] text-[#5f8a85]">RESPONSE</span>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#7dd3fc] font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting
          </span>
        )}
        {!loading && error && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-rose-400 font-mono">
            <TriangleAlert className="w-3.5 h-3.5" /> Request failed
          </span>
        )}
        {hasResult && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[12px] font-semibold font-mono',
              isError ? 'text-rose-400' : 'text-emerald-400',
            )}
          >
            <span
              className={cn(
                'w-[7px] h-[7px] rounded-full',
                isError ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
              )}
            />
            {isError ? 'TOOL ERROR' : '200 OK'}
          </span>
        )}

        {hasResult && tabs.length > 1 && (
          <div className="flex gap-0.5 ml-1.5">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                className={cn(
                  'text-[11.5px] font-medium px-2.5 py-1 rounded-md font-mono transition',
                  i === active ? 'text-[#d6f5f0] bg-emerald-400/12' : 'text-[#6b938e] hover:text-[#a9c4c0]',
                )}
                onClick={() => setActive(i)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {hasResult && (
          <div className="ml-auto flex items-center gap-2">
            {typeof elapsedMs === 'number' && (
              <span className="font-mono text-[10.5px] text-[#6b938e] bg-white/[0.04] px-2 py-[3px] rounded-md">
                time <b className="text-[#b9e6df]">{elapsedMs}ms</b>
              </span>
            )}
            <span className="font-mono text-[10.5px] text-[#6b938e] bg-white/[0.04] px-2 py-[3px] rounded-md">
              size <b className="text-[#b9e6df]">{size}</b>
            </span>
            <button
              className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[#6b938e] hover:text-[#b9e6df] bg-white/[0.04] px-2 py-[3px] rounded-md transition"
              onClick={copy}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto scroll-dark px-5 py-4 font-mono text-[12.5px] leading-[1.75] text-[#a9c4c0] whitespace-pre-wrap break-words">
        {loading && <span className="text-[#4b6b67]">// Waiting for response…</span>}
        {!loading && error && <span className="text-rose-300">{error}</span>}
        {!loading && !error && tabs.length === 0 && (
          <span className="text-[#4b6b67] flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" />
            {idleHint ?? '// Run to view the response here'}
          </span>
        )}
        {hasResult && <JsonHighlight value={activeTab.value} />}
      </div>
    </section>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}
