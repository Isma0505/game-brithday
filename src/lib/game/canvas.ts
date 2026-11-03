/* =========================================================================
 *  Canvas & input hooks shared by every mini-game.
 *  - useGameCanvas: pixel-perfect low-res canvas + RAF loop
 *  - useKeys: keyboard state (arrows / WASD / space / E)
 *  - useIsTouch: coarse-pointer detection for mobile controls
 * ========================================================================= */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface GameCanvasFrame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** delta time in seconds (clamped) */
  dt: number;
  /** total elapsed seconds */
  t: number;
}

export type GameCanvasDraw = (frame: GameCanvasFrame) => void;

/**
 * Renders a low-resolution, upscaled (crisp pixel) canvas that fills its
 * parent. The draw callback runs every animation frame.
 *
 * The internal resolution is CSS-size divided by an integer pixel scale,
 * chosen so the logical width stays roughly 420–560px — a sweet spot for
 * pixel art and performance.
 */
export function useGameCanvas(draw: GameCanvasDraw): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef<GameCanvasDraw>(draw);

  /* keep the latest draw callback without touching refs during render */
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let disposed = false;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const cssW = parent.clientWidth;
      const cssH = parent.clientHeight;
      if (cssW < 2 || cssH < 2) return;
      const scale = Math.max(2, Math.min(4, Math.round(cssW / 480)));
      canvas.width = Math.max(2, Math.floor(cssW / scale));
      canvas.height = Math.max(2, Math.floor(cssH / scale));
      ctx.imageSmoothingEnabled = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const loop = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      elapsed += dt;
      ctx.imageSmoothingEnabled = false;
      drawRef.current({ ctx, w: canvas.width, h: canvas.height, dt, t: elapsed });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return canvasRef;
}

/** Convert a pointer event to logical canvas coordinates. */
export function canvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
  };
}

/* ------------------------------------------------------------- keyboard */

const GAME_KEYS = new Set([
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'e',
]);

export interface KeysState {
  down: Set<string>;
  /** single-press buffer (internal) */
  pressed: Set<string>;
  consumePressed: (key: string) => boolean;
}

/** Lazily-built keyboard state (created via useRef factory, never in render). */
function createKeysState(): KeysState {
  const state: KeysState = {
    down: new Set<string>(),
    pressed: new Set<string>(),
    consumePressed(key) {
      if (state.pressed.has(key)) {
        state.pressed.delete(key);
        return true;
      }
      return false;
    },
  };
  return state;
}

/** Tracks held keys; also buffers single presses (jump etc). */
export function useKeys(): React.RefObject<KeysState> {
  const state = useMemo(() => createKeysState(), []);
  const ref = useRef<KeysState>(state);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (GAME_KEYS.has(k)) e.preventDefault();
      if (!state.down.has(k)) state.pressed.add(k);
      state.down.add(k);
    };
    const onUp = (e: KeyboardEvent) => {
      state.down.delete(e.key.toLowerCase());
    };
    const onBlur = () => {
      state.down.clear();
      state.pressed.clear();
    };
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return ref;
}

/* ------------------------------------------------------------ touch mode */

export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches || 'ontouchstart' in window);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return isTouch;
}
