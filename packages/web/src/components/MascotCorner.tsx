import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mascot } from 'page-mascot';
import { cn } from '../lib/cn.js';

/** 吉祥物尺寸，与下方 <Mascot size> 保持一致，用于计算锚点。 */
const MASCOT_SIZE = 110;
/** 停靠左下角时的留白。 */
const CORNER_LEFT = 16;
const CORNER_BOTTOM = 12;
/** 拖动后允许贴到视口边缘的最小留白。 */
const EDGE = 8;
/** 超过这个位移才算拖动，否则仍视为点击。 */
const DRAG_THRESHOLD = 4;

type Point = { x: number; y: number };
/** logo：默认停在页面中间盖住空白页 logo；corner：页面有交互后停到左下角。 */
type Dock = 'logo' | 'corner';

const centerAnchor = (): Point => ({
  x: window.innerWidth / 2 - MASCOT_SIZE / 2,
  y: window.innerHeight / 2 - MASCOT_SIZE / 2,
});

const cornerAnchor = (): Point => ({
  x: CORNER_LEFT,
  y: window.innerHeight - CORNER_BOTTOM - MASCOT_SIZE,
});

/**
 * 悬浮吉祥物：通过 portal 挂到 body，position: fixed + 高层级，不参与页面布局，
 * 也不拦截下层交互（只有吉祥物本体可点）。
 *
 * 首次进入停在页面中间、正对空白页的 logo 把它盖住；页面一旦发生交互（点击、
 * 按键、或别处按下），就滑到左下角停靠。支持按住拖动到任意位置（限制在视口内），
 * 位移小于阈值仍按点击交给 Mascot 出表情，双击回到当前停靠位。
 */
export function MascotCorner() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false });
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dock, setDock] = useState<Dock>('logo');
  const [logoRect, setLogoRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [dragging, setDragging] = useState(false);

  // 测量空白页 logo 的位置；窗口变化时重新测量。
  useLayoutEffect(() => {
    const measure = () => {
      const logo = document.querySelector<HTMLElement>('[data-mascot-anchor]');
      setLogoRect(logo ? logo.getBoundingClientRect() : null);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const anchor: Point = useMemo(() => {
    if (dock === 'corner') return cornerAnchor();
    if (!logoRect) return centerAnchor();
    // 正对 logo 居中，即刚好盖住 logo
    return {
      x: logoRect.left + logoRect.width / 2 - MASCOT_SIZE / 2,
      y: logoRect.top + logoRect.height / 2 - MASCOT_SIZE / 2,
    };
    // viewport 参与依赖：窗口尺寸变化后需要按新尺寸重算
  }, [dock, logoRect, viewport]);

  // 页面出现交互就停靠到左下角；吉祥物自身的按下/拖动不算。
  useEffect(() => {
    if (dock !== 'logo') return;
    const onInteract = (e: Event) => {
      const target = e.target as Node | null;
      if (wrapRef.current && target && wrapRef.current.contains(target)) return;
      setDock('corner');
    };
    window.addEventListener('pointerdown', onInteract, true);
    window.addEventListener('keydown', onInteract, true);
    return () => {
      window.removeEventListener('pointerdown', onInteract, true);
      window.removeEventListener('keydown', onInteract, true);
    };
  }, [dock]);

  /** 把偏移量限制在视口范围内，避免拖出屏幕。 */
  const clamp = useCallback(
    (next: Point): Point => {
      const el = wrapRef.current;
      if (!el) return next;
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
    },
    [anchor]
  );

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
    // 拖动也是交互：换成左下角锚点，同时换算偏移量，让吉祥物停在松手的位置不跳。
    if (dock === 'logo') {
      const next = cornerAnchor();
      setOffset((o) => ({ x: o.x + anchor.x - next.x, y: o.y + anchor.y - next.y }));
      setDock('corner');
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
      title="拖动我 · 双击回到停靠位"
      className={cn(
        'fixed z-[9999] pointer-events-auto select-none touch-none',
        dragging ? 'cursor-grabbing' : 'cursor-grab transition-[left,top] duration-500 ease-out'
      )}
      style={{
        left: anchor.x + offset.x,
        top: anchor.y + offset.y,
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
