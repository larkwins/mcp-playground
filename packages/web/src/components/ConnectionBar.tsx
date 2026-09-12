import { Zap, Plus, X, Settings2, Loader2, Unplug, PlugZap, Cpu } from 'lucide-react';
import { useAppStore } from '../store/appStore.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { useConnection } from '../hooks/useConnection.js';
import { cn } from '../lib/cn.js';

/** 站点主 logo（public/mcp-logo.webp，透明底）。 */
const mcpLogo = '/mcp-logo.webp';

export function ConnectionBar() {
  const {
    url,
    headers,
    headersPanelOpen,
    status,
    serverInfo,
    setUrl,
    addHeader,
    updateHeader,
    removeHeader,
    toggleHeadersPanel,
  } = useAppStore();
  const connectionsOpen = useAppStore((s) => s.connectionsOpen);
  const activeId = useConnectionStore((s) => s.activeId);
  const setActiveId = useConnectionStore((s) => s.setActiveId);
  const { connect, disconnect } = useConnection();

  const connected = status === 'connected';
  const connecting = status === 'connecting';
  const activeCount = headers.filter((h) => h.enabled && h.key.trim()).length;

  return (
    <header className="flex-none bg-stone-0 border-b border-stone-200 px-4 z-40">
      <div className="flex items-center h-[60px]">
        {/* Brand（宽度随连接管理侧边栏展开/收起变化，保证右缘竖线始终与侧边栏分割线对齐） */}
        <div
          className={cn(
            'flex items-center gap-2.5 flex-none',
            connectionsOpen ? 'w-[274px]' : 'w-[40px]',
          )}
        >
          <img
            src={mcpLogo}
            alt="MCP Playground"
            className="w-9 h-9 flex-none -ml-1 rounded-[10px] object-cover shadow-glow"
          />
          {connectionsOpen && (
            <div className="leading-none">
              <h1 className="font-display text-[15px] font-bold">MCP Playground</h1>
              <span className="font-mono text-[10px] text-ink-2 uppercase tracking-[0.1em] font-semibold">
                Server Inspector
              </span>
            </div>
          )}
          <div className="w-px h-[30px] bg-stone-200 ml-auto" />
        </div>

        {/* Server info（连接成功后上移到此，宽度 274px 与下方能力侧栏列对齐；右缘竖线延续能力侧栏/主内容分割线） */}
        {connected && serverInfo && (
          <div className="flex-none w-[274px] h-full flex items-center gap-2.5 pl-4 min-w-0">
            <span className="w-[30px] h-[30px] flex-none rounded-lg bg-teal-50 border border-teal-100 grid place-items-center text-teal-700">
              <Cpu className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13px] font-bold truncate">{serverInfo.name}</div>
              <div className="font-mono text-[10.5px] text-ink-2 truncate">
                v{serverInfo.version} · {serverInfo.transport}
              </div>
            </div>
            <div className="w-px h-[30px] bg-stone-200 flex-none" />
          </div>
        )}

        {/* Address bar（未连接时带连接图标、位于品牌区之后；连接后 URL 框左缘对齐主内容区分割线） */}
        <div
          className={cn(
            'flex-1 flex items-center gap-2.5 min-w-0',
            connected && serverInfo ? 'pl-3.5' : 'ml-3.5',
          )}
        >
          {!(connected && serverInfo) && (
            <span className="w-[30px] h-[30px] flex-none rounded-lg bg-teal-50 border border-teal-100 grid place-items-center text-teal-700">
              <PlugZap className="w-4 h-4" />
            </span>
          )}
          {/* Address input */}
          <div className="flex-1 flex items-center gap-2.5 bg-stone-50 border border-stone-300 rounded-[10px] py-[5px] pl-3 pr-1.5 min-w-0 transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15 focus-within:bg-white">
            <input
              className="flex-1 bg-transparent outline-none font-mono text-[13px] text-ink-0 min-w-0 placeholder:text-ink-3"
              placeholder="https://your-mcp-server.com/mcp"
              spellCheck={false}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                // 手动改动 URL 后，工作区配置已偏离保存的连接 → 取消高亮
                if (activeId) setActiveId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !connecting) void connect();
              }}
            />
            {url && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="flex-none w-6 h-6 grid place-items-center rounded-md text-ink-3 hover:text-ink-0 hover:bg-stone-200 transition"
                title="Clear"
                aria-label="Clear URL"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Headers toggle（与 URL 输入框同组，落在主内容列一侧） */}
          <button
            className={cn(
              'w-9 h-9 rounded-[9px] grid place-items-center border transition flex-none relative',
              headersPanelOpen
                ? 'bg-teal-50 text-teal-700 border-teal-100'
                : 'bg-stone-100 text-ink-1 border-stone-200 hover:bg-stone-150 hover:text-ink-0 hover:border-stone-300',
            )}
            onClick={toggleHeadersPanel}
            title="Configure Headers"
            aria-label="Configure Headers"
          >
            <Settings2 className="w-[18px] h-[18px]" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-teal-600 text-white text-[9px] font-bold grid place-items-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Actions（固定宽度 274px = Schema Inspector 290px − header 右内边距 16px，左缘与下方主内容/Schema Inspector 分割线对齐；pl-3.5 的间距刚好落在该分割线右侧） */}
        <div className="flex-none w-[274px] flex items-center justify-start gap-3.5 pl-3.5">
        {/* Connect / Disconnect */}
        {connected ? (
          <button
            className="flex-none inline-flex items-center gap-1.5 font-semibold text-[13.5px] px-4 py-2 rounded-[9px] text-brand-red bg-brand-red/10 border border-brand-red/25 hover:bg-brand-red/15 transition active:translate-y-px"
            onClick={() => void disconnect()}
          >
            <Unplug className="w-[15px] h-[15px]" />
            Disconnect
          </button>
        ) : (
          <button
            className="flex-none inline-flex items-center gap-1.5 font-semibold text-[13.5px] px-[18px] py-2.5 rounded-[9px] text-white bg-teal-600 hover:bg-teal-700 transition active:translate-y-px disabled:opacity-60"
            onClick={() => void connect()}
            disabled={connecting}
          >
            {connecting ? (
              <Loader2 className="w-[15px] h-[15px] animate-spin" />
            ) : (
              <Zap className="w-[15px] h-[15px]" strokeWidth={2.4} />
            )}
            {connecting ? 'Connecting' : 'Connect'}
          </button>
        )}

        {/* Status chip */}
        <StatusChip status={status} />
        </div>
      </div>

      {/* Header editor (expandable) */}
      <div
        className={cn(
          'overflow-hidden transition-[max-height] duration-300 border-t',
          headersPanelOpen ? 'max-h-[320px] border-stone-200' : 'max-h-0 border-transparent',
        )}
      >
        <div className="py-3.5 px-0.5 pb-4">
          <div className="font-mono text-[10.5px] font-bold tracking-[0.09em] uppercase text-ink-2 mb-3 flex items-center gap-2">
            Request Headers
            <span className="bg-stone-100 text-ink-1 px-1.5 py-0.5 rounded-md text-[10px] border border-stone-200 normal-case tracking-normal">
              {activeCount} active
            </span>
          </div>

          {headers.map((h) => (
            <div key={h.id} className="flex gap-2.5 mb-2">
              <label className="flex items-center flex-none cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-teal-600 w-4 h-4 cursor-pointer"
                  checked={h.enabled}
                  onChange={(e) => updateHeader(h.id, { enabled: e.target.checked })}
                  aria-label="Enable this header"
                />
              </label>
              <div className="flex items-center bg-stone-50 border border-stone-300 rounded-lg px-3 h-[38px] w-[280px] focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15">
                <input
                  className="bg-transparent outline-none font-mono text-[12.5px] w-full text-teal-700 font-medium placeholder:text-ink-3"
                  placeholder="Header name"
                  spellCheck={false}
                  value={h.key}
                  onChange={(e) => updateHeader(h.id, { key: e.target.value })}
                />
              </div>
              <div className="flex items-center bg-stone-50 border border-stone-300 rounded-lg px-3 h-[38px] flex-1 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15">
                <input
                  className="bg-transparent outline-none font-mono text-[12.5px] w-full text-ink-0 placeholder:text-ink-3"
                  placeholder="Header value"
                  spellCheck={false}
                  value={h.value}
                  onChange={(e) => updateHeader(h.id, { value: e.target.value })}
                />
              </div>
              <button
                className="w-[38px] h-[38px] rounded-lg grid place-items-center text-ink-3 flex-none transition hover:text-brand-red hover:bg-brand-red/10"
                onClick={() => removeHeader(h.id)}
                aria-label="Remove header"
              >
                <X className="w-[15px] h-[15px]" />
              </button>
            </div>
          ))}

          <button
            className="inline-flex items-center gap-1.5 text-teal-700 font-mono text-[12.5px] font-semibold py-1.5 px-1 mt-1 hover:text-teal-600"
            onClick={addHeader}
          >
            <Plus className="w-[15px] h-[15px]" strokeWidth={2.2} />
            Add Header
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string; ping: boolean }> = {
    idle: { label: 'Idle', cls: 'bg-stone-100 text-ink-2 border-stone-200', dot: 'bg-ink-3', ping: false },
    connecting: {
      label: 'Connecting',
      cls: 'bg-brand-amber/10 text-brand-amber border-brand-amber/25',
      dot: 'bg-brand-amber',
      ping: true,
    },
    connected: {
      label: 'Connected',
      cls: 'bg-brand-green/10 text-[#15803D] border-brand-green/25',
      dot: 'bg-brand-green',
      ping: true,
    },
    error: { label: 'Error', cls: 'bg-brand-red/10 text-brand-red border-brand-red/25', dot: 'bg-brand-red', ping: false },
  };
  const s = map[status] ?? map.idle;
  return (
    <div
      className={cn(
        'flex-none inline-flex items-center gap-2 pl-2.5 pr-3 py-[7px] rounded-full text-[12.5px] font-semibold border font-mono',
        s.cls,
      )}
    >
      <span className={cn('w-2 h-2 rounded-full relative', s.dot)}>
        {s.ping && (
          <span className={cn('absolute inset-[-4px] rounded-full border-2 animate-ping2', `border-current`)} />
        )}
      </span>
      {s.label}
    </div>
  );
}
