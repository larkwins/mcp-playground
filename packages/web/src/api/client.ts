import type {
  ConnectionConfig,
  ConnectResult,
  CapabilitiesResult,
  CallToolResponse,
  ReadResourceResponse,
  GetPromptResponse,
  ApiError,
} from '@mcp-playground/shared';

const BASE = '/api/mcp';

/** 统一请求封装：非 2xx 时抛出规范化 ApiError。 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err: ApiError = data?.error ?? { code: 'HTTP_ERROR', message: `HTTP ${res.status}` };
    throw err;
  }
  return data as T;
}

export const api = {
  connect(config: ConnectionConfig): Promise<ConnectResult> {
    return request<ConnectResult>('/connect', { method: 'POST', body: JSON.stringify(config) });
  },

  disconnect(sessionId: string): Promise<{ ok: boolean }> {
    return request('/disconnect', { method: 'POST', body: JSON.stringify({ sessionId }) });
  },

  capabilities(sessionId: string): Promise<CapabilitiesResult> {
    return request<CapabilitiesResult>(`/capabilities?sessionId=${encodeURIComponent(sessionId)}`);
  },

  callTool(sessionId: string, name: string, args: Record<string, unknown>): Promise<CallToolResponse> {
    return request<CallToolResponse>('/call', {
      method: 'POST',
      body: JSON.stringify({ sessionId, name, arguments: args }),
    });
  },

  readResource(sessionId: string, uri: string): Promise<ReadResourceResponse> {
    return request<ReadResourceResponse>('/read', {
      method: 'POST',
      body: JSON.stringify({ sessionId, uri }),
    });
  },

  getPrompt(
    sessionId: string,
    name: string,
    args: Record<string, string>,
  ): Promise<GetPromptResponse> {
    return request<GetPromptResponse>('/prompt', {
      method: 'POST',
      body: JSON.stringify({ sessionId, name, arguments: args }),
    });
  },
};
