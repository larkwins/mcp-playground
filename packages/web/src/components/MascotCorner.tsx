import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mascot } from 'page-mascot';
import { cn } from '../lib/cn.js';

/** 吉祥物尺寸，与下方 <Mascot size> 保持一致，用于计算锚点。 */
const MASCOT_SIZE = 110;
/** 拖动后允许贴到视口边缘的最小留白。 */
const EDGE = 8;
/** 超过这个位移才算拖动，否则仍视为点击。 */
const DRAG_THRESHOLD = 4;

type Point = { x: number; y: number };

/**
 * 悬浮吉祥物：通过 portal 挂到 body，position: fixed + 高层级，不参与页面布局，
 * 也不拦截下层交互（只有吉祥物本体可点）。默认停在页面中间、正对空白页的 logo
 * 把它盖住（量 [data-mascot-anchor] 的实际位置，量不到时退回视口中心）。
 * 支持按住拖动到任意位置（限制在视口内），位移小于阈值仍按点击交给 Mascot 出表情。
 */
export function MascotCorner() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false });
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);

  // 只在挂载和窗口尺寸变化时测量：锚点是「默认停靠位」，之后的位置由拖动决定。
  useLayoutEffect(() => {
    const measure = () => {
      const logo = document.querySelector<HTMLElement>('[data-mascot-anchor]');
      if (logo) {
        // 正对 logo 居中，即刚好盖住 logo
        const rect = logo.getBoundingClientRect();
        setAnchor({
          x: rect.left + rect.width / 2 - MASCOT_SIZE / 2,
          y: rect.top + rect.height / 2 - MASCOT_SIZE / 2,
        });
        return;
      }
      setAnchor({
        x: window.innerWidth / 2 - MASCOT_SIZE / 2,
        y: window.innerHeight / 2 - MASCOT_SIZE / 2,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /** 把偏移量限制在视口范围内，避免拖出屏幕。 */
  const clamp = (next: Point): Point => {
    const el = wrapRef.current;
    if (!el || !anchor) return next;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const minX = EDGE - anchor.x;
    const maxX = window.innerWidth - EDGE - w - anchor.x;
    const minY = EDGE - anchor.y;
    const maxY = window.innerHeight - EDGE - h - anchor.y;
    return {
      x: Math.min(Math.max(next.x, Math.min(minX, maxX)), Math.max(minX, maxX)),
      y: Math.min(Math.max(next.y, Math.min(minY, maxY)), Math.max(minY, maxY)),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
      moved: false,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const { startX, startY, baseX, baseY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragRef.current.moved = true;
      // 只在确认是拖动之后才捕获指针：按下即捕获会把 mouseup 也重定向到容器，
      // 导致 click 派发到容器而不是 Mascot 按钮，点击就不出表情了。
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setOffset(clamp({ x: baseX + dx, y: baseY + dy }));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const resetOffset = () => setOffset({ x: 0, y: 0 });

  return createPortal(
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={resetOffset}
      onClickCapture={(e) => {
        if (dragRef.current.moved) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      title="拖动我 · 双击回到默认位置"
      className={cn(
        'fixed z-[9999] pointer-events-auto select-none touch-none',
        'transition-shadow',
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
      style={{
        left: (anchor?.x ?? 0) + offset.x,
        top: (anchor?.y ?? 0) + offset.y,
        // 量到锚点前先不显示，避免闪一下左上角
        visibility: anchor ? 'visible' : 'hidden',
      }}
    >
      <Mascot
        directions="/mascots/crt-directions.webp"
        reactions="/mascots/crt-reactions.webp"
        size={MASCOT_SIZE}
        label="MCP Playground mascot"
        className="pointer-events-auto"
      />
    </div>,
    document.body
  );
}
