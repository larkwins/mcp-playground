import { useCallback, useRef, useState, type ReactNode } from 'react';

interface SplitPaneProps {
  top: ReactNode;
  bottom: ReactNode;
  /** 顶部初始占比 0–1。 */
  initialRatio?: number;
}

/** 上下可拖拽分屏容器（REQUEST / RESPONSE）。 */
export function SplitPane({ top, bottom, initialRatio = 0.46 }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const dragging = useRef(false);

  const onMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let r = (e.clientY - rect.top) / rect.height;
    r = Math.min(0.78, Math.max(0.2, r));
    setRatio(r);
  }, []);

  const stop = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', stop);
  }, [onMove]);

  const start = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
  }, [onMove, stop]);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      <div style={{ flex: `${ratio} 1 0` }} className="flex flex-col min-h-0">
        {top}
      </div>
      <div
        className="flex-none h-2 bg-stone-100 border-y border-stone-200 flex items-center justify-center cursor-row-resize"
        onMouseDown={start}
      >
        <div className="w-[34px] h-[3px] rounded bg-stone-300" />
      </div>
      <div style={{ flex: `${1 - ratio} 1 0` }} className="flex flex-col min-h-0">
        {bottom}
      </div>
    </div>
  );
}
