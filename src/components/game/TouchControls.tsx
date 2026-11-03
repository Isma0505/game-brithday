'use client';

/* =========================================================================
 *  TouchControls — virtual joystick + action button for mobile play.
 * ========================================================================= */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface TouchControlsProps {
  mode?: 'joystick' | 'dpad';
  /** Emits normalized direction, x: -1..1, y: -1..1 (y negative = up). */
  onVector?: (x: number, y: number) => void;
  /** Fired when the action button is pressed. */
  onAction?: () => void;
  actionLabel?: string;
}

export function TouchControls({ mode = 'joystick', onVector, onAction, actionLabel = 'A' }: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeId = useRef<number | null>(null);

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = rect.width / 2;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      setKnob({ x: dx, y: dy });
      onVector?.(dx / max, dy / max);
    },
    [onVector],
  );

  const reset = useCallback(() => {
    activeId.current = null;
    setKnob({ x: 0, y: 0 });
    onVector?.(0, 0);
  }, [onVector]);

  if (mode === 'dpad') {
    const btn =
      'flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-[#181233]/80 text-[#ffd97a] shadow-[0_0_14px_rgba(120,90,220,0.35)] backdrop-blur-sm active:scale-95 active:bg-[#2a1b4e] transition-transform select-none touch-none';
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex items-end justify-between px-5 pb-[env(safe-area-inset-bottom)]">
        <div className="pointer-events-auto flex gap-3">
          <button
            aria-label="Move left"
            className={btn}
            onPointerDown={(e) => { e.preventDefault(); onVector?.(-1, 0); }}
            onPointerUp={() => onVector?.(0, 0)}
            onPointerLeave={() => onVector?.(0, 0)}
            onPointerCancel={() => onVector?.(0, 0)}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            aria-label="Move right"
            className={btn}
            onPointerDown={(e) => { e.preventDefault(); onVector?.(1, 0); }}
            onPointerUp={() => onVector?.(0, 0)}
            onPointerLeave={() => onVector?.(0, 0)}
            onPointerCancel={() => onVector?.(0, 0)}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
        {onAction && (
          <button
            aria-label={actionLabel}
            className={`pointer-events-auto h-16 w-16 rounded-full border-2 border-[#ffd97a]/70 bg-[#3a2b12]/85 text-lg font-bold text-[#ffd97a] shadow-[0_0_20px_rgba(247,201,72,0.45)] backdrop-blur-sm active:scale-90 transition-transform select-none touch-none font-pixel text-[10px]`}
            onPointerDown={(e) => { e.preventDefault(); onAction(); }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between px-5 pb-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
      {/* joystick */}
      <div
        ref={padRef}
        className="pointer-events-auto relative h-28 w-28 touch-none rounded-full border border-white/15 bg-[#14102b]/70 shadow-[0_0_24px_rgba(120,90,220,0.35)] backdrop-blur-sm"
        onPointerDown={(e) => {
          e.preventDefault();
          activeId.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          handleMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activeId.current !== e.pointerId) return;
          handleMove(e.clientX, e.clientY);
        }}
        onPointerUp={() => reset()}
        onPointerCancel={() => reset()}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-[#ffd97a]/50 bg-[#2a1b4e]/90 shadow-[0_0_14px_rgba(247,201,72,0.4)]"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
        <span className="pointer-events-none absolute inset-0 m-auto h-1 w-1 rounded-full bg-white/20" />
      </div>
      {onAction && (
        <button
          aria-label={actionLabel}
          className="pointer-events-auto h-20 w-20 touch-none rounded-full border-2 border-[#ffd97a]/70 bg-[#3a2b12]/85 font-pixel text-[11px] text-[#ffd97a] shadow-[0_0_24px_rgba(247,201,72,0.5)] backdrop-blur-sm transition-transform active:scale-90"
          onPointerDown={(e) => { e.preventDefault(); onAction(); }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
