import { useEffect } from 'react';
import type { TransportKind } from '@mcp-playground/shared';
import { useAppStore, type HeaderPair } from '../store/appStore.js';
import { useConnection, type ConnectOverride } from './useConnection.js';

/** 把外部传入的 type 归一化为内部 TransportKind，无法识别时回退 auto。 */
function normalizeTransport(raw: unknown): TransportKind {
  if (typeof raw !== 'string') return 'auto';
  const v = raw.trim().toLowerCase();
  if (v === 'sse') return 'sse';
  // http / httpStream / streamableHttp / streamable-http 都视为 Streamable HTTP
  if (v === 'http' || v === 'streamablehttp' || v === 'streamable-http' || v === 'httpstream') {
    return 'streamableHttp';
  }
  return 'auto';
}

/**
 * 解析 ?t=<base64> 自动连接参数。
 * t 的内容优先按 JSON 解析：{"url":"...","header":{"K":"V"},"type":"http"}
 * （headers / transport 为等价别名）
 * 兼容直接 base64 一个纯 URL 的写法（此时无自定义 header、transport 为 auto）。
 * 解析失败或 url 非法时返回 null。
 */
export function parseConnectParam(search: string): ConnectOverride | null {
  const raw = new URLSearchParams(search).get('t');
  if (!raw) return null;

  let decoded: string;
  try {
    // 兼容 URL-safe base64（- _）并补齐 padding
    let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    decoded = atob(b64).trim();
  } catch {
    return null;
  }

  let url = decoded;
  let headerRecord: Record<string, string> = {};
  let transport: TransportKind = 'auto';
  try {
    const parsed = JSON.parse(decoded) as Record<string, unknown> | null;
    if (parsed && typeof parsed.url === 'string' && parsed.url.trim()) {
      url = parsed.url.trim();
      const rawHeaders = parsed.header ?? parsed.headers;
      if (rawHeaders && typeof rawHeaders === 'object' && !Array.isArray(rawHeaders)) {
        for (const [k, v] of Object.entries(rawHeaders as Record<string, unknown>)) {
          if (typeof v === 'string') headerRecord[k] = v;
        }
      }
      transport = normalizeTransport(parsed.type ?? parsed.transport);
    }
  } catch {
    // 纯 URL（非 JSON），保持 url = decoded
  }

  if (!/^https?:\/\//i.test(url)) return null;

  const headers: HeaderPair[] = Object.entries(headerRecord).map(([key, value]) => ({
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    key,
    value,
    enabled: true,
  }));

  return { url, transport, headers };
}

/** 模块级标记，防止 StrictMode / 重复挂载导致二次连接。 */
let autoConnectDone = false;

/**
 * 挂载时检测 ?t= 参数：解析成功则填入输入框并自动连接，随后清掉地址栏参数。
 */
export function useAutoConnectFromUrl() {
  const { connect } = useConnection();

  useEffect(() => {
    if (autoConnectDone) return;
    autoConnectDone = true;

    const override = parseConnectParam(window.location.search);
    if (!override) return;

    useAppStore.getState().setUrl(override.url);
    useAppStore.getState().setTransport(override.transport);
    useAppStore.getState().setHeaders(override.headers);
    void connect(override);

    // 清理地址栏，避免刷新时重复自动连接
    window.history.replaceState(null, '', window.location.pathname);
  }, [connect]);
}
