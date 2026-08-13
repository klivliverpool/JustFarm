/**
 * Pixel art painting utilities.
 * All sprites in JUST FARM are drawn procedurally pixel-by-pixel onto
 * offscreen canvases at native pixel resolution, then blitted with
 * image smoothing disabled so they stay crisp at any zoom.
 */

export type Ctx = CanvasRenderingContext2D;

/** Deterministic RNG so generated textures are stable across reloads. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return c;
}

/** Tiny pixel painter — every draw call lands on integer pixel coordinates. */
export class Painter {
  canvas: HTMLCanvasElement;
  ctx: Ctx;
  w: number;
  h: number;

  constructor(w: number, h: number) {
    this.canvas = makeCanvas(w, h);
    this.ctx = this.canvas.getContext("2d")!;
    this.w = w;
    this.h = h;
  }

  px(x: number, y: number, color: string) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0));
  }

  outline(x: number, y: number, w: number, h: number, color: string) {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  /** Filled ellipse rasterised on the pixel grid. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1) <= 1) {
          this.px(cx + x, cy + y, color);
        }
      }
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, color: string) {
    x0 |= 0;
    y0 |= 0;
    x1 |= 0;
    y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Sprinkle pixels of a colour inside a box — used for organic texture. */
  speckle(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    density: number,
    rnd: () => number,
  ) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (rnd() < density) this.px(x + i, y + j, color);
      }
    }
  }

  /** Paint from an ASCII grid: '.' = transparent. */
  rows(rows: string[], pal: Record<string, string>, ox = 0, oy = 0) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y] ?? "";
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (!c || c === "." || c === " ") continue;
        const col = pal[c];
        if (col) this.px(ox + x, oy + y, col);
      }
    }
  }

  blit(src: HTMLCanvasElement, x = 0, y = 0) {
    this.ctx.drawImage(src, x | 0, y | 0);
  }

  /** Soft ground shadow ellipse (semi-transparent). */
  shadow(cx: number, cy: number, rx: number, ry: number) {
    this.ctx.globalAlpha = 0.28;
    this.ellipse(cx, cy, rx, ry, "#101a10");
    this.ctx.globalAlpha = 1;
  }
}

/** Simple cache so each sprite is only rasterised once. */
const cache = new Map<string, HTMLCanvasElement>();
export function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = build();
    cache.set(key, c);
  }
  return c;
}

/** Shift a hex colour's lightness by amt (-1..1). Used to build palettes. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
