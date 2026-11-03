'use client';

/* =========================================================================
 *  SkyCanvas — cinematic animated night sky used behind DOM screens:
 *  twinkling stars, nebula glow, shooting stars, moon, magic dust,
 *  distant pixel hills and subtle pointer parallax.
 * ========================================================================= */

import { useEffect, useRef } from 'react';
import { mulberry32 } from '@/lib/game/sprites';

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  hue: number;
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Dust {
  x: number;
  y: number;
  vy: number;
  drift: number;
  phase: number;
  size: number;
  alpha: number;
}

export function SkyCanvas({ hills = true }: { hills?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let disposed = false;
    let last = performance.now();
    let t = 0;

    let stars: Star[] = [];
    let dust: Dust[] = [];
    let shooters: Shooter[] = [];
    let nextShoot = 3;

    const build = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      const rnd = mulberry32(20240614);
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: rnd() * canvas.width,
        y: rnd() * canvas.height * 0.92,
        r: rnd() < 0.85 ? 1 : 2,
        phase: rnd() * Math.PI * 2,
        speed: 0.6 + rnd() * 1.8,
        hue: rnd(),
      }));
      dust = Array.from({ length: 26 }, () => ({
        x: rnd() * canvas.width,
        y: rnd() * canvas.height,
        vy: -(4 + rnd() * 12),
        drift: rnd() * Math.PI * 2,
        phase: rnd() * Math.PI * 2,
        size: 1 + rnd() * 2.2,
        alpha: 0.12 + rnd() * 0.3,
      }));
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      pointer.current.x = e.clientX / window.innerWidth;
      pointer.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const loop = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const W = canvas.width;
      const H = canvas.height;
      const px = (pointer.current.x - 0.5) * W * 0.02;
      const py = (pointer.current.y - 0.5) * H * 0.012;

      /* sky gradient */
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#05060f');
      sky.addColorStop(0.42, '#0b1026');
      sky.addColorStop(0.75, '#1c1440');
      sky.addColorStop(1, '#2a1b4e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      /* nebula glows */
      const neb1 = ctx.createRadialGradient(W * 0.78 + px, H * 0.24 + py, 0, W * 0.78 + px, H * 0.24 + py, W * 0.42);
      neb1.addColorStop(0, 'rgba(138, 99, 210, 0.16)');
      neb1.addColorStop(1, 'rgba(138, 99, 210, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, W, H);
      const neb2 = ctx.createRadialGradient(W * 0.16 + px, H * 0.6 + py, 0, W * 0.16 + px, H * 0.6 + py, W * 0.38);
      neb2.addColorStop(0, 'rgba(94, 130, 220, 0.10)');
      neb2.addColorStop(1, 'rgba(94, 130, 220, 0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);

      /* stars */
      for (const s of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        const color =
          s.hue < 0.12 ? `rgba(255, 214, 140, ${tw})` :
          s.hue < 0.24 ? `rgba(160, 190, 255, ${tw})` :
          `rgba(240, 240, 255, ${tw})`;
        ctx.fillStyle = color;
        const sx = s.x + px * (0.4 + s.r * 0.3);
        const sy = s.y + py * 0.4;
        ctx.fillRect(sx, sy, s.r, s.r);
        if (s.r === 2 && tw > 0.8) {
          ctx.fillStyle = `rgba(255,255,255,${(tw - 0.8) * 2})`;
          ctx.fillRect(sx - 2, sy, 6, 1);
          ctx.fillRect(sx, sy - 2, 1, 6);
        }
      }

      /* shooting stars */
      nextShoot -= dt;
      if (nextShoot <= 0) {
        nextShoot = 4 + Math.random() * 7;
        const fromLeft = Math.random() < 0.5;
        shooters.push({
          x: fromLeft ? Math.random() * W * 0.4 : W * (0.6 + Math.random() * 0.4),
          y: Math.random() * H * 0.35,
          vx: (fromLeft ? 1 : -1) * (W * 0.5 + Math.random() * W * 0.2),
          vy: H * (0.1 + Math.random() * 0.12),
          life: 0,
          maxLife: 0.9 + Math.random() * 0.5,
        });
      }
      shooters = shooters.filter((sh) => sh.life < sh.maxLife);
      for (const sh of shooters) {
        sh.life += dt;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        const a = Math.sin((sh.life / sh.maxLife) * Math.PI);
        const tailX = sh.x - sh.vx * 0.09;
        const tailY = sh.y - sh.vy * 0.09;
        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 244, 214, ${a})`);
        grad.addColorStop(1, 'rgba(255, 244, 214, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }

      /* moon */
      const mx = W * 0.82 + px;
      const my = H * 0.16 + py;
      const mr = Math.min(W, H) * 0.045;
      const halo = ctx.createRadialGradient(mx, my, mr * 0.3, mx, my, mr * 4);
      halo.addColorStop(0, 'rgba(255, 240, 205, 0.3)');
      halo.addColorStop(1, 'rgba(255, 240, 205, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
      ctx.fillStyle = '#f5ead0';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(11, 16, 38, 0.92)';
      ctx.beginPath();
      ctx.arc(mx - mr * 0.38, my - mr * 0.2, mr * 0.86, 0, Math.PI * 2);
      ctx.fill();

      /* rising magic dust */
      for (const d of dust) {
        d.y += d.vy * dt;
        d.drift += dt;
        if (d.y < -6) {
          d.y = H + 6;
          d.x = Math.random() * W;
        }
        const dx = d.x + Math.sin(d.drift + d.phase) * 14;
        ctx.fillStyle = `rgba(255, 222, 150, ${d.alpha * (0.6 + 0.4 * Math.sin(t * 2 + d.phase))})`;
        ctx.fillRect(dx, d.y, d.size, d.size);
      }

      /* distant pixel hills */
      if (hills) {
        const hy = H * 0.9;
        ctx.fillStyle = '#131033';
        for (let x = 0; x < W; x += 3) {
          const wx = x + px * 6;
          const h =
            (Math.sin(wx * 0.004) * 0.5 + 0.5) * H * 0.05 +
            (Math.sin(wx * 0.011 + 2) * 0.5 + 0.5) * H * 0.035;
          const q = Math.floor(h / 4) * 4;
          ctx.fillRect(x, hy - q, 3, q + 4);
        }
        ctx.fillStyle = '#1c1642';
        for (let x = 0; x < W; x += 3) {
          const wx = x + px * 10;
          const h =
            (Math.sin(wx * 0.006 + 5) * 0.5 + 0.5) * H * 0.03 +
            (Math.sin(wx * 0.017 + 1) * 0.5 + 0.5) * H * 0.02;
          const q = Math.floor(h / 4) * 4;
          ctx.fillRect(x, hy + H * 0.04 - q, 3, q + 8);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [hills]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
