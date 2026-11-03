/* Progress persistence — localStorage based save system. */

export interface GameProgress {
  character: string | null;
  muted: boolean;
  /** Ids of magical stars already collected in the Starlight Trail. */
  trailStars: string[];
  trailDone: boolean;
  /** Best balloon fiesta results. */
  balloonPops: number;
  balloonDone: boolean;
  balloonTimeSec: number | null;
  /** Best gift cascade results. */
  giftsCaught: number;
  giftsDone: boolean;
  /** Grand cake ceremony — all candles blown out at least once. */
  cakeDone: boolean;
  /** 3D greeting card has been opened. */
  cardOpened: boolean;
  wished: boolean;
  finaleSeen: boolean;
}

export const DEFAULT_PROGRESS: GameProgress = {
  character: null,
  muted: false,
  trailStars: [],
  trailDone: false,
  balloonPops: 0,
  balloonDone: false,
  balloonTimeSec: null,
  giftsCaught: 0,
  giftsDone: false,
  cakeDone: false,
  cardOpened: false,
  wished: false,
  finaleSeen: false,
};

const STORAGE_KEY = 'bq_save_v1';

export function loadProgress(): GameProgress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<GameProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      trailStars: Array.isArray(parsed.trailStars) ? parsed.trailStars : [],
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(p: GameProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — game still playable this session */
  }
}

export function clearProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
