/* =========================================================================
 *  Pixel-art asset factory — every visual is drawn procedurally with
 *  fillRect on a low-resolution canvas, giving a crisp indie pixel look.
 * ========================================================================= */

export interface PixelSprite {
  w: number;
  h: number;
  rows: string[];
  palette: Record<string, string>;
}

export interface PixelCharacter {
  id: string;
  name: string;
  title: string;
  trait: string;
  accent: string;
  aura: string;
  idle: PixelSprite;
  blink: PixelSprite;
}

function sprite(rows: string[], palette: Record<string, string>): PixelSprite {
  const w = rows[0].length;
  for (const r of rows) {
    if (r.length !== w) {
      throw new Error(`Sprite row width mismatch: "${r}" (expected ${w})`);
    }
  }
  return { w, h: rows.length, rows, palette };
}

function withBlink(s: PixelSprite, eyeChar: string, blinkChar: string): PixelSprite {
  return {
    ...s,
    rows: s.rows.map((r) => r.split(eyeChar).join(blinkChar)),
  };
}

/* ------------------------------------------------------------ characters */

const ASTRA_ROWS = [
  '....yYYy....',
  '...yYYYYy...',
  '..yYYYYYYy..',
  '.yYYYYYYYYy.',
  '..HHSSSSHH..',
  '..HSSSSSSH..',
  '..HSESSESH..',
  '..HSSssSSH..',
  '...SSSSSS...',
  '....PPPP....',
  '..pPPPPPPp..',
  '.SPpPPPPpPS.',
  '.SPPPPPPPPS.',
  '..pPPPPPPp..',
  '..pPPPPPPp..',
  '..BB....BB..',
];

const BLAZE_ROWS = [
  '.....RR.....',
  '....RRRR....',
  '....rRRr....',
  '...gGGGGg...',
  '..gGGGGGGg..',
  '..GvvvvvvG..',
  '..GvEvvEvG..',
  '..GvvvvvvG..',
  '...wGGGGw...',
  '..gGGGGGGg..',
  '.GGgGGGGgGG.',
  '.GGGGwwGGGG.',
  '..gGGwwGGg..',
  '...gGGGGg...',
  '...GG..GG...',
  '..BB....BB..',
];

const VEGA_ROWS = [
  '....TTTT....',
  '...TTTTTT...',
  '..TTTTTTTT..',
  '..tTSSSSTt..',
  '..tSESSESt..',
  '..tSSssSSt..',
  '...tSSSSt...',
  '...tTTTTt...',
  '..tTTTTTTt..',
  '.tTTTYYTTTt.',
  '.LTTTTTTTTL.',
  '.LTtTTTTtTL.',
  '..tTTTTTTt..',
  '..tTt..tTt..',
  '...tt..tt...',
  '..BB....BB..',
];

const COMET_ROWS = [
  '.O........O.',
  '.OO......OO.',
  '.OOOOOOOOOO.',
  '..OOWWWWOO..',
  '..ONWWWWNO..',
  '..OWWNNWWO..',
  '...OWWWWo...',
  '....ORRO....',
  '..OORRRROO..',
  '..OOWWWOOO..',
  '..OOWWWOOO..',
  '..OOWWWOOO..',
  '..oOOWWOoo..',
  '...OO..OO...',
  '...Oo..oO...',
  '..WW....WW..',
];

function buildCharacter(
  def: Omit<PixelCharacter, 'blink'>,
  eyeChar: string,
  blinkChar: string,
): PixelCharacter {
  return { ...def, blink: withBlink(def.idle, eyeChar, blinkChar) };
}

export const CHARACTERS: PixelCharacter[] = [
  buildCharacter(
    {
      id: 'astra',
      name: 'Astra',
      title: 'The Star Mage',
      trait: 'Wields stardust magic. Luck +20%',
      accent: '#a78bfa',
      aura: 'rgba(167,139,250,0.35)',
      idle: sprite(ASTRA_ROWS, {
        Y: '#f7c948', y: '#c98f1b', H: '#5b4232', S: '#f6cfa2', s: '#e2b088',
        E: '#2a1b3d', P: '#8a63d2', p: '#5f3fa8', B: '#3a2b52',
      }),
    },
    'E', 'S',
  ),
  buildCharacter(
    {
      id: 'blaze',
      name: 'Blaze',
      title: 'The Golden Knight',
      trait: 'Brave and bold. Courage +20%',
      accent: '#f2b64c',
      aura: 'rgba(242,182,76,0.35)',
      idle: sprite(BLAZE_ROWS, {
        R: '#e05252', r: '#a83a3a', G: '#e8b64c', g: '#b9822a',
        v: '#241b3d', E: '#ffd97a', w: '#f5e6c8', B: '#3a2b52',
      }),
    },
    'E', 'v',
  ),
  buildCharacter(
    {
      id: 'vega',
      name: 'Vega',
      title: 'The Moon Ranger',
      trait: 'Swift and silent. Speed +20%',
      accent: '#5eead4',
      aura: 'rgba(94,234,212,0.3)',
      idle: sprite(VEGA_ROWS, {
        T: '#3f8f7a', t: '#2c6b5a', S: '#f6cfa2', s: '#e2b088',
        E: '#241b3d', L: '#8a5a33', Y: '#f7c948', B: '#3a2b52',
      }),
    },
    'E', 'S',
  ),
  buildCharacter(
    {
      id: 'comet',
      name: 'Comet',
      title: 'The Birthday Fox',
      trait: 'Fluffy lucky companion. Joy +100%',
      accent: '#fb923c',
      aura: 'rgba(251,146,60,0.32)',
      idle: sprite(COMET_ROWS, {
        O: '#e8853c', o: '#c2662a', W: '#fbeed7', N: '#2a1b3d', R: '#e05252',
      }),
    },
    'N', 'W',
  ),
];

export function getCharacter(id: string | null): PixelCharacter {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/* --------------------------------------------------------- sprite render */

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  s: PixelSprite,
  x: number,
  y: number,
  scale = 1,
  flip = false,
): void {
  for (let row = 0; row < s.h; row++) {
    const line = s.rows[row];
    for (let col = 0; col < s.w; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      const color = s.palette[ch];
      if (!color) continue;
      const cx = flip ? s.w - 1 - col : col;
      ctx.fillStyle = color;
      ctx.fillRect(x + cx * scale, y + row * scale, scale, scale);
    }
  }
}

/* --------------------------------------------------------------- helpers */

export function spriteScaleFor(h: number): number {
  if (h >= 340) return 4;
  if (h >= 250) return 3;
  return 2;
}

/** Deterministic seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------- mini font */

const FONT: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '#.#', '#.#', '#.#'],
  N: ['#.#', '###', '###', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '..#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['.#.', '#.#', '#.#', '#.#', '.#.'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '.#.', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '.': ['...', '...', '...', '...', '.#.'],
  ',': ['...', '...', '...', '.#.', '#..'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  ' ': ['...', '...', '...', '...', '...'],
};

export function pixelTextWidth(text: string, scale: number): number {
  return Math.max(0, text.length * 4 * scale - scale);
}

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
): void {
  ctx.fillStyle = color;
  let cursor = x;
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const glyph = FONT[upper[i]] ?? FONT['?'];
    for (let gy = 0; gy < 5; gy++) {
      const line = glyph[gy];
      for (let gx = 0; gx < 3; gx++) {
        if (line[gx] === '#') {
          ctx.fillRect(cursor + gx * scale, y + gy * scale, scale, scale);
        }
      }
    }
    cursor += 4 * scale;
  }
}

export function drawPixelTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  scale: number,
  color: string,
): void {
  drawPixelText(ctx, text, cx - pixelTextWidth(text, scale) / 2, y, scale, color);
}

/* ------------------------------------------------------- world prop art  */

const STAR_ROWS = [
  '....Y....',
  '...YYY...',
  '...YYY...',
  'YYYYYYYYY',
  '.YYYYYYY.',
  '..YYYYY..',
  '..YY.YY..',
  '.Y.....Y.',
  '.........',
];

const STAR_SPRITE = sprite(STAR_ROWS, { Y: '#ffd45e' });

/** Magical twinkling star with a soft glow. */
export function drawMagicStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  t: number,
  phase = 0,
): void {
  const pulse = 0.75 + 0.25 * Math.sin(t * 3 + phase);
  const size = 9 * scale;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.4);
  glow.addColorStop(0, `rgba(255, 220, 120, ${0.5 * pulse})`);
  glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - size * 1.4, cy - size * 1.4, size * 2.8, size * 2.8);
  drawSprite(ctx, STAR_SPRITE, cx - (size / 2), cy - (size / 2), scale);
  /* sparkle cross */
  const sx = cx + Math.cos(t * 2.2 + phase) * size * 0.7;
  const sy = cy + Math.sin(t * 1.7 + phase) * size * 0.7;
  ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.35 * Math.sin(t * 5 + phase)})`;
  ctx.fillRect(sx - scale / 2, sy - scale * 1.5, scale, scale * 3);
  ctx.fillRect(sx - scale * 1.5, sy - scale / 2, scale * 3, scale);
}

/** Pixel fantasy tree — green or blossom-purple variants. */
export function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  s: number,
  variant: 0 | 1,
  t: number,
): void {
  const canopy = variant === 0 ? ['#1e4d3d', '#2f7a55', '#49a370'] : ['#3d2b63', '#5f3fa8', '#8a63d2'];
  const sway = Math.sin(t * 0.9 + x * 0.05) * s * 0.4;
  /* trunk */
  ctx.fillStyle = '#4a3222';
  ctx.fillRect(x - 1.5 * s, groundY - 9 * s, 3 * s, 9 * s);
  ctx.fillStyle = '#5f4230';
  ctx.fillRect(x - 1.5 * s, groundY - 9 * s, s, 9 * s);
  /* canopy layers */
  const layers: [number, number, number][] = [
    [0, -8, 7], [1, -13, 5.5], [2, -17, 3.5],
  ];
  for (const [i, dy, halfW] of layers) {
    const off = i === 2 ? sway : sway * (i === 0 ? 0.3 : 0.6);
    ctx.fillStyle = canopy[0];
    ctx.fillRect(x - halfW * s + off, groundY + dy * s - 3 * s, halfW * 2 * s, 3.2 * s);
    ctx.fillStyle = canopy[1];
    ctx.fillRect(x - halfW * s + off, groundY + dy * s - 3 * s, halfW * 2 * s, 1.6 * s);
    ctx.fillStyle = canopy[2];
    ctx.fillRect(x - (halfW - 1.2) * s + off, groundY + dy * s - 3 * s, (halfW - 1.2) * 1.2 * s, 0.8 * s);
  }
  /* magic fruits */
  const rnd = mulberry32(Math.floor(x) + variant * 999);
  for (let i = 0; i < 3; i++) {
    const fx = x + (rnd() - 0.5) * 9 * s;
    const fy = groundY - (9 + rnd() * 7) * s;
    ctx.fillStyle = '#ffd45e';
    ctx.fillRect(fx, fy + Math.sin(t * 2 + i) * s * 0.3, s, s);
  }
}

/** Vintage lamp post with warm flickering glow. */
export function drawLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  s: number,
  t: number,
): void {
  const flicker = 0.85 + 0.15 * Math.sin(t * 9 + x);
  const topY = groundY - 26 * s;
  ctx.fillStyle = '#2a2140';
  ctx.fillRect(x - s * 0.7, topY, s * 1.4, 26 * s);
  ctx.fillRect(x - 2 * s, groundY - s, 4 * s, s);
  ctx.fillStyle = '#3a2f55';
  ctx.fillRect(x - s * 0.7, topY, s * 0.6, 26 * s);
  /* lantern */
  ctx.fillStyle = '#2a2140';
  ctx.fillRect(x - 2.2 * s, topY - 5 * s, 4.4 * s, 5.4 * s);
  const glow = ctx.createRadialGradient(x, topY - 2.4 * s, 0, x, topY - 2.4 * s, 9 * s);
  glow.addColorStop(0, `rgba(255, 214, 120, ${0.5 * flicker})`);
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 9 * s, topY - 11 * s, 18 * s, 18 * s);
  ctx.fillStyle = `rgba(255, 222, 140, ${flicker})`;
  ctx.fillRect(x - 1.2 * s, topY - 4 * s, 2.4 * s, 3.4 * s);
  ctx.fillStyle = '#2a2140';
  ctx.fillRect(x - 2.2 * s, topY - 5.8 * s, 4.4 * s, s);
}

/** Festive garland with pennant flags between two points. */
export function drawGarland(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): void {
  const steps = Math.max(6, Math.floor(Math.abs(x2 - x1) / 8));
  const colors = ['#e05252', '#f7c948', '#8a63d2', '#5eead4', '#f2a2c0'];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const x = x1 + (x2 - x1) * p;
    const sag = Math.sin(p * Math.PI) * Math.min(24, Math.abs(x2 - x1) * 0.12);
    const y = y1 + (y2 - y1) * p + sag + Math.sin(t * 2 + i) * 0.8;
    ctx.fillStyle = 'rgba(240,230,255,0.5)';
    ctx.fillRect(x, y, 1.5, 1.5);
    if (i % 2 === 0 && i > 0 && i < steps) {
      ctx.fillStyle = colors[(i / 2) % colors.length];
      const fw = 3;
      ctx.fillRect(x - fw / 2, y, fw, 4);
      ctx.fillRect(x - fw / 2 + 0.5, y + 4, fw - 1, 1.5);
    }
  }
}

/** Wrapped gift box. */
export function drawGiftBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  s: number,
  box: string,
  boxShade: string,
  ribbon: string,
): void {
  const w = 12;
  ctx.fillStyle = box;
  ctx.fillRect(x, baseY - 7 * s, w * s, 7 * s);
  ctx.fillStyle = boxShade;
  ctx.fillRect(x, baseY - 7 * s, w * s, s);
  ctx.fillRect(x + w * s - s, baseY - 7 * s, s, 7 * s);
  /* lid */
  ctx.fillStyle = boxShade;
  ctx.fillRect(x - s, baseY - 10 * s, (w + 2) * s, 3 * s);
  ctx.fillStyle = box;
  ctx.fillRect(x - s, baseY - 10 * s, (w + 2) * s, s);
  /* ribbon */
  ctx.fillStyle = ribbon;
  ctx.fillRect(x + 5 * s, baseY - 10 * s, 2 * s, 10 * s);
  ctx.fillRect(x - s, baseY - 9.5 * s, (w + 2) * s, s);
  /* bow */
  ctx.fillRect(x + 3 * s, baseY - 12 * s, 2.4 * s, 2 * s);
  ctx.fillRect(x + 6.6 * s, baseY - 12 * s, 2.4 * s, 2 * s);
  ctx.fillRect(x + 5.4 * s, baseY - 12.6 * s, 1.4 * s, 1.4 * s);
}

const BALLOON_WIDTHS = [2, 4, 6, 8, 8, 8, 8, 6, 4];

/** Floating balloon with wavy string. */
export function drawBalloon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  color: string,
  shade: string,
  t: number,
  phase: number,
): void {
  const bob = Math.sin(t * 1.6 + phase) * 2.4;
  const topY = cy + bob - BALLOON_WIDTHS.length * s;
  for (let row = 0; row < BALLOON_WIDTHS.length; row++) {
    const w = BALLOON_WIDTHS[row] * s;
    ctx.fillStyle = row < 2 ? shade : color;
    ctx.fillRect(cx - w / 2, topY + row * s, w, s);
  }
  ctx.fillStyle = shade;
  ctx.fillRect(cx - s, topY + BALLOON_WIDTHS.length * s, 2 * s, s);
  /* highlight */
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(cx - 2.4 * s, topY + 2 * s, s, 2.4 * s);
  /* string */
  ctx.fillStyle = 'rgba(235,225,255,0.55)';
  for (let i = 0; i < 14; i++) {
    const sx = cx + Math.sin(t * 3 + phase + i * 0.55) * 1.6;
    ctx.fillRect(sx, topY + BALLOON_WIDTHS.length * s + s + i * 2, 1, 1.6);
  }
}

/** Grand birthday cake with lit candles. lit: array of candle states. */
export function drawCake(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  t: number,
  lit: boolean[],
): void {
  /* golden plate */
  ctx.fillStyle = '#d9a520';
  ctx.fillRect(cx - 26 * s, baseY - 1.6 * s, 52 * s, 1.6 * s);
  ctx.fillStyle = '#b3821a';
  ctx.fillRect(cx - 26 * s, baseY - 0.6 * s, 52 * s, 0.6 * s);

  const tiers: [number, number, string, string][] = [
    [44, 11, '#f2d8b8', '#dcb88a'],
    [31, 9, '#eba7b8', '#d18396'],
    [19, 8, '#c9a7e8', '#a986c9'],
  ];
  let topY = baseY;
  let tierTopY = baseY;
  for (const [w, h, main, shade] of tiers) {
    tierTopY = topY - h * s;
    ctx.fillStyle = main;
    ctx.fillRect(cx - (w / 2) * s, tierTopY, w * s, h * s);
    ctx.fillStyle = shade;
    ctx.fillRect(cx - (w / 2) * s, tierTopY + (h - 2.4) * s, w * s, 2.4 * s);
    /* icing drips */
    ctx.fillStyle = '#fdf3e3';
    ctx.fillRect(cx - (w / 2) * s, tierTopY, w * s, 2 * s);
    const rnd = mulberry32(w * 77);
    const drips = Math.floor(w / 5);
    for (let i = 0; i < drips; i++) {
      const dx = cx - (w / 2) * s + (i + rnd()) * (w * s) / drips;
      const dh = (1.2 + rnd() * 1.6) * s;
      ctx.fillRect(dx, tierTopY + 2 * s, 1.6 * s, dh);
    }
    /* cherry */
    ctx.fillStyle = '#e05252';
    ctx.fillRect(cx + (w / 2 - 3) * s, tierTopY - s, s, s);
    topY = tierTopY;
  }
  /* candles */
  const candleXs = [-6, 0, 6];
  candleXs.forEach((offset, i) => {
    const x = cx + offset * s;
    const y = tierTopY - 5 * s;
    ctx.fillStyle = i % 2 === 0 ? '#fdf3e3' : '#aee3f5';
    ctx.fillRect(x - 0.5 * s, y, s, 5 * s);
    ctx.fillStyle = '#e05252';
    ctx.fillRect(x - 0.5 * s, y + s, s, s);
    if (lit[i]) {
      const flicker = Math.sin(t * 11 + i * 2.4) * 0.5 + 0.5;
      const glow = ctx.createRadialGradient(x, y - 2 * s, 0, x, y - 2 * s, 6 * s);
      glow.addColorStop(0, `rgba(255, 200, 90, ${0.35 + flicker * 0.2})`);
      glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 6 * s, y - 8 * s, 12 * s, 12 * s);
      ctx.fillStyle = flicker > 0.5 ? '#ffd97a' : '#ffb84c';
      ctx.fillRect(x - s, y - 3.4 * s, 2 * s, 2.6 * s);
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(x - s * 0.5, y - 2.4 * s, s, s);
    }
  });
}

/** Distant castle silhouette with lit windows. */
export function drawCastle(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  s: number,
  t: number,
  color = '#241a3d',
): void {
  ctx.fillStyle = color;
  /* main keep */
  ctx.fillRect(x - 14 * s, baseY - 20 * s, 28 * s, 20 * s);
  /* towers */
  const towers: [number, number][] = [[-14, 30], [8, 26], [-4, 36]];
  for (const [tx, th] of towers) {
    ctx.fillRect(x + tx * s, baseY - th * s, 6 * s, th * s);
    /* roof */
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + (tx + i * 0.5) * s - 0, baseY - (th + 3 - i) * s, (6 - i * 1.6) * s, s);
    }
    /* flag */
    const flagWave = Math.sin(t * 3 + tx) > 0 ? 1 : 0.6;
    ctx.fillStyle = 'rgba(224,82,82,0.9)';
    ctx.fillRect(x + (tx + 5.2) * s, baseY - (th + 4) * s, 2.4 * s * flagWave, 1.4 * s);
    ctx.fillStyle = color;
    /* windows */
    const lit = Math.sin(t * 0.7 + tx * 3) > -0.2;
    ctx.fillStyle = lit ? 'rgba(255,214,120,0.85)' : 'rgba(120,100,160,0.4)';
    ctx.fillRect(x + (tx + 2) * s, baseY - (th - 6) * s, 1.6 * s, 2.2 * s);
  }
  /* gate */
  ctx.fillStyle = 'rgba(120,100,160,0.35)';
  ctx.fillRect(x - 3 * s, baseY - 6 * s, 6 * s, 6 * s);
}

/** Pixel mountain silhouette band. */
export function drawMountainRange(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  horizonY: number,
  offset: number,
  color: string,
  seed = 1,
): void {
  ctx.fillStyle = color;
  for (let x = 0; x < viewW; x += 2) {
    const wx = x + offset;
    const h =
      (Math.sin(wx * 0.012 + seed) * 0.5 + 0.5) * 34 +
      (Math.sin(wx * 0.005 + seed * 2.7) * 0.5 + 0.5) * 46 +
      (Math.sin(wx * 0.05 + seed * 5.1) * 0.5 + 0.5) * 6;
    const q = Math.floor(h / 4) * 4;
    ctx.fillRect(x, horizonY - q, 2, q + 2);
  }
}

/** Crescent moon with halo. */
export function drawMoon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
): void {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 3.2);
  halo.addColorStop(0, 'rgba(255, 240, 200, 0.28)');
  halo.addColorStop(0.5, 'rgba(200, 180, 255, 0.10)');
  halo.addColorStop(1, 'rgba(200, 180, 255, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
  for (let y = -r; y <= r; y++) {
    const halfW = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    ctx.fillStyle = '#f5ead0';
    ctx.fillRect(cx - halfW, cy + y, halfW * 2, 1);
  }
  /* crescent shadow */
  const off = Math.floor(r * 0.42);
  for (let y = -r; y <= r; y++) {
    const halfW = Math.floor(Math.sqrt(Math.max(0, (r * 0.92) * (r * 0.92) - y * y)));
    ctx.fillStyle = 'rgba(10, 14, 36, 0.88)';
    ctx.fillRect(cx - halfW + off + Math.floor(r * 0.35), cy + y - Math.floor(r * 0.12), halfW * 2, 1);
  }
  const tw = 0.5 + 0.5 * Math.sin(t * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.5 + tw * 0.4})`;
  ctx.fillRect(cx - r * 0.5, cy - r * 0.55, 2, 2);
}

/** Magical swirling portal. */
export function drawPortal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  s: number,
  appear = 1,
): void {
  const rx = 13 * s * appear;
  const ry = 20 * s * appear;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ry * 1.7);
  glow.addColorStop(0, `rgba(255, 210, 110, ${0.34 * appear})`);
  glow.addColorStop(0.55, `rgba(160, 110, 240, ${0.22 * appear})`);
  glow.addColorStop(1, 'rgba(160, 110, 240, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - ry * 1.7, cy - ry * 1.7, ry * 3.4, ry * 3.4);
  /* swirling dots */
  for (let ring = 0; ring < 3; ring++) {
    const rr = (0.35 + ring * 0.3) * appear;
    const count = 14 + ring * 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + t * (1.6 - ring * 0.4) + ring * 1.3;
      const px = cx + Math.cos(a) * rx * rr;
      const py = cy + Math.sin(a) * ry * rr;
      const shade = (Math.sin(a * 2 + t * 2) + 1) / 2;
      ctx.fillStyle =
        ring === 2
          ? `rgba(255, 214, 120, ${0.5 + shade * 0.5})`
          : `rgba(${140 + shade * 60}, ${100 + shade * 60}, 255, ${0.75})`;
      const d = ring === 2 ? 2.4 : 2;
      ctx.fillRect(px - d / 2, py - d / 2, d, d);
    }
  }
  /* center shimmer */
  const shimmer = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.fillStyle = `rgba(255, 240, 200, ${0.14 + shimmer * 0.12})`;
  ctx.fillRect(cx - rx * 0.42, cy - ry * 0.6, rx * 0.84, ry * 1.2);
}

/** Golden gift box with glowing seam (for the finale). */
export function drawGoldenGift(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  t: number,
  openAmount: number,
): void {
  const w = 26;
  const h = 18;
  const glowPulse = 0.6 + 0.4 * Math.sin(t * 3);
  const glow = ctx.createRadialGradient(cx, baseY - h * s * 0.5, 0, cx, baseY - h * s * 0.5, 60 * s);
  glow.addColorStop(0, `rgba(255, 214, 120, ${0.4 * glowPulse + openAmount * 0.3})`);
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 60 * s, baseY - h * s - 60 * s, 120 * s, 120 * s);

  const lidLift = openAmount * 26 * s;
  /* box body */
  ctx.fillStyle = '#c98f1b';
  ctx.fillRect(cx - (w / 2) * s, baseY - h * s, w * s, h * s);
  ctx.fillStyle = '#e8b64c';
  ctx.fillRect(cx - (w / 2) * s, baseY - h * s, w * s, 2 * s);
  ctx.fillStyle = '#a8741a';
  ctx.fillRect(cx - (w / 2) * s, baseY - 2.4 * s, w * s, 2.4 * s);
  /* ribbon */
  ctx.fillStyle = '#fff1c4';
  ctx.fillRect(cx - 1.6 * s, baseY - h * s, 3.2 * s, h * s);
  /* lid */
  const lidY = baseY - h * s - lidLift;
  ctx.fillStyle = '#e8b64c';
  ctx.fillRect(cx - (w / 2 + 2) * s, lidY - 5 * s, (w + 4) * s, 5 * s);
  ctx.fillStyle = '#fff1c4';
  ctx.fillRect(cx - (w / 2 + 2) * s, lidY - 5 * s, (w + 4) * s, 1.6 * s);
  ctx.fillRect(cx - 1.6 * s, lidY - 5 * s, 3.2 * s, 5 * s);
  /* bow */
  ctx.fillStyle = '#fff1c4';
  ctx.fillRect(cx - 6 * s, lidY - 8 * s, 4.6 * s, 2.6 * s);
  ctx.fillRect(cx + 1.4 * s, lidY - 8 * s, 4.6 * s, 2.6 * s);
  ctx.fillRect(cx - 1.4 * s, lidY - 9 * s, 2.8 * s, 2 * s);
  /* light seam */
  if (openAmount < 0.9) {
    ctx.fillStyle = `rgba(255, 244, 200, ${0.75 + glowPulse * 0.25})`;
    ctx.fillRect(cx - (w / 2) * s, baseY - h * s - 1, w * s, 2);
  }
}
