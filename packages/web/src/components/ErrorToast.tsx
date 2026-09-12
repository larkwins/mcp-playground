import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../store/appStore.js';

/**
 * 连接错误提示 toast：错误信息存在时显示，
 * 点击关闭按钮或点击卡片外部区域即可关闭。
 */
export function ErrorToast() {
  const errorMsg = useAppStore((s) => s.errorMsg);
  const clearError = useAppStore((s) => s.clearError);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) clearError();
    };
    // 延迟到下一帧再监听，避免触发显示的那次点击立即将其关闭
    const id = window.setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [errorMsg, clearError]);

  if (!errorMsg) return null;

  return (
    <div className="absolute inset-x-0 top-8 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        ref={cardRef}
        className="w-[min(560px,100%)] flex items-start gap-3 rounded-xl border border-brand-red/25 bg-stone-0 shadow-md px-4 py-3 animate-fadeDown pointer-events-auto"
      >
        <div className="flex-none w-7 h-7 rounded-lg bg-brand-red/10 text-brand-red grid place-items-center mt-0.5">
          <AlertTriangle className="w-[17px] h-[17px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] font-bold text-ink-0 mb-0.5">Connection failed</div>
          <p className="text-[12.5px] text-ink-1 leading-relaxed break-words">{errorMsg}</p>
        </div>
        <button
          type="button"
          onClick={clearError}
          className="flex-none w-6 h-6 grid place-items-center rounded-md text-ink-3 hover:text-ink-0 hover:bg-stone-100 transition"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
