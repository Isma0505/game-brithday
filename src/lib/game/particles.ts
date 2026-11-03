/* =========================================================================
 *  ParticleSystem — sparkles, confetti, dust, smoke and embers.
 *  Shared by every scene to keep the world feeling alive.
 * ========================================================================= */

export type ParticleType = 'sparkle' | 'confetti' | 'dust' | 'smoke' | 'ember' | 'starbit';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  rot: number;
  vr: number;
  gravity: number;
  wobble: number;
  wobbleSpeed: number;
}

export const CONFETTI_COLORS = [
  '#f7c948', '#ff6b9d', '#7ee0c3', '#a78bfa', '#ffd97a', '#ffffff', '#5eead4',
];

function baseParticle(x: number, y: number, type: ParticleType, color: string): Particle {
  return {
    x, y, vx: 0, vy: 0,
    life: 0, maxLife: 1,
    size: 2, color, type,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 6,
    gravity: 0,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 1 + Math.random() * 2,
  };
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private max = 600;

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles.length = 0;
  }

  /** Golden star sparkle burst (item pickup, magic moments). */
  sparkle(x: number, y: number, count = 14, color = '#ffd45e'): void {
    for (let i = 0; i < count; i++) {
      const p = baseParticle(x, y, Math.random() < 0.5 ? 'sparkle' : 'starbit', color);
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 90;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - 30;
      p.maxLife = 0.5 + Math.random() * 0.6;
      p.size = 1 + Math.random() * 2.4;
      p.gravity = 60;
      this.push(p);
    }
  }

  /** Colorful confetti explosion. */
  confetti(x: number, y: number, count = 40, power = 1): void {
    for (let i = 0; i < count; i++) {
      const p = baseParticle(x, y, 'confetti', CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const sp = (90 + Math.random() * 240) * power;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.maxLife = 1.6 + Math.random() * 1.6;
      p.size = 2 + Math.random() * 3;
      p.gravity = 220;
      p.vr = (Math.random() - 0.5) * 14;
      this.push(p);
    }
  }

  /** Single confetti burst upward from bottom of screen (fountains). */
  fountain(width: number, y: number, rate: number, dt: number): void {
    let n = Math.floor(rate * dt);
    if (Math.random() < rate * dt - n) n++;
    for (let i = 0; i < n; i++) {
      const x = width * (0.1 + Math.random() * 0.8);
      const p = baseParticle(x, y, 'confetti', CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const sp = 220 + Math.random() * 260;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.maxLife = 1.8 + Math.random() * 1.4;
      p.size = 2 + Math.random() * 3;
      p.gravity = 260;
      p.vr = (Math.random() - 0.5) * 16;
      this.push(p);
    }
  }

  /** Soft dust puff (landing, running). */
  dust(x: number, y: number, count = 6, color = 'rgba(210,200,235,0.6)'): void {
    for (let i = 0; i < count; i++) {
      const p = baseParticle(x, y, 'dust', color);
      p.vx = (Math.random() - 0.5) * 60;
      p.vy = -Math.random() * 30;
      p.maxLife = 0.4 + Math.random() * 0.4;
      p.size = 1.5 + Math.random() * 2;
      this.push(p);
    }
  }

  /** Candle smoke wisp. */
  smoke(x: number, y: number): void {
    for (let i = 0; i < 7; i++) {
      const p = baseParticle(x, y, 'smoke', 'rgba(200,200,215,0.5)');
      p.vx = (Math.random() - 0.5) * 14;
      p.vy = -22 - Math.random() * 26;
      p.maxLife = 1 + Math.random() * 0.8;
      p.size = 1.6 + Math.random() * 1.8;
      this.push(p);
    }
  }

  /** Rising golden ember / magic dust (ambient). */
  ember(x: number, y: number, color = '#ffd45e'): void {
    const p = baseParticle(x, y, 'ember', color);
    p.vx = (Math.random() - 0.5) * 12;
    p.vy = -12 - Math.random() * 22;
    p.maxLife = 1.4 + Math.random() * 1.6;
    p.size = 1 + Math.random() * 1.8;
    this.push(p);
  }

  private push(p: Particle): void {
    if (this.particles.length >= this.max) this.particles.shift();
    this.particles.push(p);
  }

  update(dt: number): void {
    const arr = this.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        arr.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.wobble += p.wobbleSpeed * dt;
      const wob = p.type === 'confetti' ? Math.sin(p.wobble) * 26 * dt : 0;
      p.x += (p.vx + wob) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'sparkle' || p.type === 'starbit') {
        p.vx *= 1 - 2.2 * dt;
        p.vy *= 1 - 1.4 * dt;
      }
      if (p.type === 'smoke') {
        p.vx *= 1 - 0.6 * dt;
        p.size += 1.6 * dt;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      switch (p.type) {
        case 'confetti': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.72);
          ctx.restore();
          break;
        }
        case 'sparkle': {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size * 1.5, p.size, p.size * 3);
          ctx.fillRect(p.x - p.size * 1.5, p.y - p.size / 2, p.size * 3, p.size);
          break;
        }
        case 'starbit': {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          if (p.size > 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(p.x - p.size / 6, p.y - p.size / 6, p.size / 3, p.size / 3);
          }
          break;
        }
        default: {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
