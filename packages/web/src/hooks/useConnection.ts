import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TransportKind, ApiError } from '@mcp-playground/shared';
import { api } from '../api/client.js';
import { useAppStore, toHeadersRecord, type HeaderPair } from '../store/appStore.js';
import { useConnectionStore } from '../store/connectionStore.js';

/** 直接指定配置发起连接（用于从连接管理侧边栏切换连接）。 */
export interface ConnectOverride {
  url: string;
  transport: TransportKind;
  headers: HeaderPair[];
}

/**
 * 连接管理：封装 connect / disconnect。
 * 连接成功后会把 url + transport + headers 自动写入连接管理（localStorage）。
 */
export function useConnection() {
  const queryClient = useQueryClient();
  const url = useAppStore((s) => s.url);
  const transport = useAppStore((s) => s.transport);
  const headers = useAppStore((s) => s.headers);
  const status = useAppStore((s) => s.status);
  const sessionId = useAppStore((s) => s.sessionId);
  const serverInfo = useAppStore((s) => s.serverInfo);
  const errorMsg = useAppStore((s) => s.errorMsg);
  const setConnecting = useAppStore((s) => s.setConnecting);
  const setConnected = useAppStore((s) => s.setConnected);
  const setError = useAppStore((s) => s.setError);
  const reset = useAppStore((s) => s.reset);
  const select = useAppStore((s) => s.select);

  const connect = useCallback(
    async (override?: ConnectOverride) => {
      const targetUrl = (override?.url ?? url).trim();
      if (!targetUrl) {
        setError('Please enter the MCP Server URL first');
        return;
      }
      const targetTransport = override?.transport ?? transport;
      const targetHeaders = override?.headers ?? headers;
      const config = {
        url: targetUrl,
        transport: targetTransport,
        headers: toHeadersRecord(targetHeaders),
      };

      // 切换连接前先释放已有会话
      const currentSession = useAppStore.getState().sessionId;
      if (currentSession) {
        await api.disconnect(currentSession).catch(() => undefined);
        useAppStore.getState().reset();
      }

      setConnecting();
      const result = await api.connect(config).catch((err: ApiError) => {
        console.error('connect failed', err);
        setError(err?.message ?? 'Connection failed');
        return null;
      });
      if (!result) return;

      setConnected(result.sessionId, result.serverInfo);
      // 连接成功 → 自动写入连接管理
      const savedId = useConnectionStore.getState().upsert({
        url: targetUrl,
        transport: targetTransport,
        headers: targetHeaders,
        serverInfo: result.serverInfo,
      });
      if (savedId) useConnectionStore.getState().setActiveId(savedId);
      // 连接成功 → 自动收起连接管理侧边栏
      useAppStore.getState().setConnectionsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['capabilities'] });
    },
    [url, transport, headers, setConnecting, setConnected, setError, queryClient],
  );

  const disconnect = useCallback(async () => {
    const current = useAppStore.getState().sessionId;
    if (current) {
      await api.disconnect(current).catch((err) => console.error('disconnect failed', err));
    }
    select(null);
    reset();
    queryClient.removeQueries({ queryKey: ['capabilities'] });
  }, [reset, select, queryClient]);

  return { url, transport, status, sessionId, serverInfo, errorMsg, connect, disconnect };
}
