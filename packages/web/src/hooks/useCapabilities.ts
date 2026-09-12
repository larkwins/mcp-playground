import { useQuery } from '@tanstack/react-query';
import type { CapabilitiesResult } from '@mcp-playground/shared';
import { api } from '../api/client.js';

/** 拉取并缓存三类能力；仅在已连接（有 sessionId）时启用。 */
export function useCapabilities(sessionId: string | null) {
  return useQuery<CapabilitiesResult>({
    queryKey: ['capabilities', sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => api.capabilities(sessionId as string),
  });
}
