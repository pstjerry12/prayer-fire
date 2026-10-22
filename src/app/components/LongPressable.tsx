'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../utils/cn';

interface Props {
  /** A normal tap. */
  onTap?: () => void;
  /** Press and hold (default 1 second). */
  onLongPress: () => void;
  holdMs?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Wraps a verse so a short tap and a press-and-hold do different things.
 * Moving the finger (scrolling) cancels the hold, and the tap that follows a
 * completed hold is swallowed so it doesn't also fire onTap.
 */
export default function LongPressable({ onTap, onLongPress, holdMs = 1000, className, style, children }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn('select-none [-webkit-touch-callout:none] cursor-pointer', className)}
      style={style}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        fired.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        clear();
        timer.current = setTimeout(() => {
          fired.current = true;
          try {
            navigator.vibrate?.(30);
          } catch {
            // not supported
          }
          onLongPress();
        }, holdMs);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 10) clear();
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        onTap?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onTap) onTap();
      }}
    >
      {children}
    </div>
  );
}
