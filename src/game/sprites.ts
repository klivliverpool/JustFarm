/**
 * JUST FARM — procedural pixel-art sprite atlas.
 * Native art resolution: 16px tiles. The renderer blits at zoom 3 with
 * image smoothing disabled, giving crisp chunky pixels at 1920x1080.
 */
import { Painter, cached, mulberry32, shade } from "./pixel";
import { CROPS, PESTS, type CropId, type PestId } from "./data";
import { getPestImage } from "./pestAssets";

export const TILE = 16;

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

// Layered natural palette: warm sunlit greens sit above cool forest shadows.
// Variants are deterministic so the world feels organic without per-frame noise.
const GRASS = ["#6fa854", "#649b4c", "#78b45b", "#568d47", "#83b961", "#4b8241", "#709f4b", "#5f9345"];

export function grassTile(variant: number): HTMLCanvasElement {
  return cached(`worldv3-grass${variant}`, () => {
    const p = new Painter(TILE, TILE);
    const rnd = mulberry32(1000 + variant);
    const base = GRASS[variant % GRASS.length] ?? "#4f913d";
    p.rect(0, 0, TILE, TILE, base);
    p.rect(0, 0, TILE, 1, shade(base, 0.08));
    p.rect(0, TILE - 1, TILE, 1, shade(base, -0.2));
    p.rect(0, 2, TILE, 1, shade(base, -0.04));
    // Sparse organic flecks break the tile grid while preserving readable color.
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(rnd() * 15);
      const y = Math.floor(rnd() * 15);
      const tone = i % 3 === 0 ? shade(base, 0.14) : i % 3 === 1 ? shade(base, -0.12) : "#8fc566";
      p.rect(x, y, 1 + (i % 4 === 0 ? 1 : 0), 1, tone);
      if (i % 2 === 0) p.px(x + 1, y - 1, shade(tone, 0.08));
    }
    for (let i = 0; i < 5; i++) {
      const x = 1 + Math.floor(rnd() * 14);
      const y = 5 + Math.floor(rnd() * 9);
      const blade = i % 2 ? "#93c967" : "#79b858";
      p.px(x, y, blade);
      p.px(x + (i % 3 === 0 ? 1 : 0), y - 1, blade);
      p.px(x + (i % 2 ? -1 : 1), y - 2, shade(blade, 0.1));
      p.px(x, y + 1, shade(base, -0.2));
    }
    if (variant % 3 === 0 || variant % 7 === 1) {
      const x = 2 + Math.floor(rnd() * 11);
      const y = 3 + Math.floor(rnd() * 10);
      const flower = variant % 2 ? "#f3d98a" : "#f5e8bc";
      p.px(x, y, flower);
      p.px(x + 1, y + 1, shade(flower, 0.08));
    }
    return p.canvas;
  });
}


export function dirtTile(variant: number): HTMLCanvasElement {
  return cached(`worldv3-dirt${variant}`, () => {
    const p = new Painter(TILE, TILE);
    const rnd = mulberry32(2000 + variant);
    const base = ["#875332", "#965e38", "#7c492e", "#a1663b", "#8c5634", "#74442b"][variant % 6] ?? "#875332";
    p.rect(0, 0, TILE, TILE, base);
    p.rect(0, 0, TILE, 1, shade(base, 0.16));
    p.rect(0, TILE - 1, TILE, 1, shade(base, -0.3));
    for (let y = 3 + (variant % 3); y < TILE; y += 5) {
      const furrow = shade(base, -0.22);
      p.rect(0, y, TILE, 1, furrow);
      p.rect((variant + y) % 4, y + 1, 7, 1, shade(base, 0.08));
      if (variant % 2 === 0) p.px((variant * 3 + y) % 13 + 1, y - 1, shade(base, 0.2));
    }
    for (let i = 0; i < 7; i++) {
      const x = 1 + Math.floor(rnd() * 13);
      const y = 1 + Math.floor(rnd() * 14);
      p.rect(x, y, 1 + (i % 3 === 0 ? 1 : 0), 1, i % 2 ? shade(base, 0.2) : shade(base, -0.3));
    }
    return p.canvas;
  });
}

/** Cobblestone village road — rounded stones set in packed earth. */
export function pathTile(variant: number, wet = false): HTMLCanvasElement {
  return cached(`worldv3-path${variant}-${wet}`, () => {
    const p = new Painter(TILE, TILE);
    const rnd = mulberry32(3000 + variant);
    const dryBase = ["#b07b4d", "#b98351", "#9c6b45", "#c38b55", "#a87349", "#956342"][variant % 6] ?? "#b07b4d";
    const base = wet ? shade(dryBase, -0.08) : dryBase;
    p.rect(0, 0, TILE, TILE, base);
    p.rect(0, 0, TILE, 1, shade(base, 0.18));
    p.rect(0, TILE - 1, TILE, 1, shade(base, -0.28));
    for (let y = 3 + (variant % 2); y < TILE; y += 5) {
      p.rect(0, y, TILE, 1, shade(base, -0.16));
      p.rect((variant + y) % 5, y + 1, 5, 1, shade(base, 0.13));
    }
    for (let i = 0; i < 7; i++) {
      const x = 1 + Math.floor(rnd() * 13);
      const y = 1 + Math.floor(rnd() * 14);
      const stone = i % 3 === 0 ? "#d6a871" : i % 2 ? "#c09263" : "#87573c";
      p.rect(x, y, 2 + (i === 0 ? 1 : 0), 1, stone);
      p.px(x, y - 1, shade(stone, 0.16));
    }
    if (wet) {
      p.rect(2 + (variant % 5), 2 + (variant % 4), 5, 1, "#d6ad7b");
      p.rect(10, 11 - (variant % 3), 3, 1, "#c79767");
    }
    return p.canvas;
  });
}


export function soilTile(watered: boolean, tilled: boolean): HTMLCanvasElement {
  return cached(`worldv3-soil${watered}${tilled}`, () => {
    const p = new Painter(TILE, TILE);
    const rnd = mulberry32(watered ? 41 : 42);
    const base = watered ? "#5f3d30" : "#875131";
    p.rect(0, 0, TILE, TILE, base);
    p.rect(0, 0, TILE, 1, shade(base, 0.18));
    p.rect(0, TILE - 1, TILE, 1, shade(base, -0.24));
    if (tilled) {
      for (let y = 2; y < TILE; y += 4) {
        p.rect(0, y, TILE, 1, shade(base, -0.3));
        p.rect(1, y + 1, TILE - 2, 1, shade(base, 0.14));
        p.px((y * 3) % 13 + 1, y + 2, shade(base, -0.12));
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = 2 + Math.floor(rnd() * 11);
      const y = 1 + Math.floor(rnd() * 13);
      p.rect(x, y, 2, 1, i % 2 ? shade(base, 0.18) : shade(base, -0.18));
    }
    p.outline(0, 0, TILE, TILE, shade(base, -0.2));
    return p.canvas;
  });
}

export function waterTile(frame: number): HTMLCanvasElement {
  return cached(`worldv3-water${frame}`, () => {
    const p = new Painter(TILE, TILE);
    const rnd = mulberry32(500 + frame);
    p.rect(0, 0, TILE, TILE, "#327b87");
    p.rect(0, 0, TILE, 1, "#79c1b0");
    p.rect(0, TILE - 1, TILE, 1, "#235c6b");
    p.speckle(0, 1, TILE, TILE - 2, "#4d9d98", 0.14, rnd);
    p.speckle(0, 1, TILE, TILE - 2, "#286c80", 0.1, rnd);
    for (let i = 0; i < 3; i++) {
      const y = ((frame * 3 + i * 7) % 14) + 1;
      const x = ((frame * 5 + i * 4) % 10) + 1;
      p.rect(x, y, 4 + (i % 2), 1, i === 0 ? "#a6d8c0" : "#80c4b6");
      p.px(x + 4, y - 1, "#a6d8c0");
    }
    return p.canvas;
  });
}

export function sandTile(): HTMLCanvasElement {
  return cached("worldv3-sand", () => {
    const p = new Painter(TILE, TILE);
    const rnd = mulberry32(77);
    p.rect(0, 0, TILE, TILE, "#cdb77b");
    p.rect(0, 0, TILE, 1, "#ead69a");
    p.rect(0, TILE - 1, TILE, 1, "#a98d58");
    p.speckle(0, 1, TILE, TILE - 2, "#e5cc8b", 0.12, rnd);
    p.speckle(0, 1, TILE, TILE - 2, "#9d8050", 0.1, rnd);
    return p.canvas;
  });
}

export function planksTile(): HTMLCanvasElement {
  return cached("worldv3-planks", () => {
    const p = new Painter(TILE, TILE);
    p.rect(0, 0, TILE, TILE, "#a97c4a");
    for (let y = 0; y < TILE; y += 5) {
      p.rect(0, y, TILE, 1, "#7d5a33");
      p.rect(0, y + 1, TILE, 1, "#bd8f5b");
    }
    p.rect(0, 0, 1, TILE, "#6d4d2b");
    p.rect(TILE - 1, 0, 1, TILE, "#6d4d2b");
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Nature props                                                        */
/* ------------------------------------------------------------------ */

export function tree(variant: number): HTMLCanvasElement {
  return cached(`worldv3-tree${variant}`, () => {
    const w = 40;
    const h = 52;
    const p = new Painter(w, h);
    const rnd = mulberry32(900 + variant);
    const dark = ["#24512f", "#1d482c", "#2d5d35"][variant % 3] ?? "#24512f";
    const mid = ["#3e7d42", "#36763d", "#478b48"][variant % 3] ?? "#3e7d42";
    const light = ["#86bd5a", "#78b653", "#96c969"][variant % 3] ?? "#86bd5a";
    const warm = variant % 2 ? "#b5d777" : "#c5dd86";
    const ink = "#183d2b";
    p.shadow(20, 48, 12, 4);
    // trunk
    p.rect(17, 29, 6, 19, ink);
    p.rect(18, 29, 3, 19, "#815735");
    p.rect(21, 30, 2, 17, "#5a3b25");
    p.rect(14, 44, 5, 3, "#5f3d24");
    p.rect(22, 45, 5, 2, "#5f3d24");
    // canopy — clustered blobs
    const blobs: [number, number, number][] = [
      [20, 16, 15],
      [10, 22, 10],
      [30, 22, 10],
      [20, 26, 12],
      [14, 12, 8],
      [27, 12, 8],
    ];
    for (const [cx, cy, r] of blobs) p.ellipse(cx, cy, r, Math.round(r * 0.82), dark);
    // dark, uneven silhouette gives the canopy a deliberate pixel outline
    for (const [cx, cy, r] of blobs) p.ellipse(cx, cy, r + 1, Math.round(r * 0.85), ink);
    for (const [cx, cy, r] of blobs) p.ellipse(cx, cy, r, Math.round(r * 0.82), dark);
    for (const [cx, cy, r] of blobs) p.ellipse(cx - 2, cy - 2, Math.max(2, r - 3), Math.max(2, Math.round(r * 0.58)), mid);
    for (const [cx, cy, r] of blobs.filter((_, i) => i % 2 === 0)) {
      p.ellipse(cx - 3, cy - 4, Math.max(2, r - 5), Math.max(2, Math.round(r * 0.35)), light);
    }
    for (let i = 0; i < 82; i++) {
      const x = Math.floor(rnd() * w);
      const y = Math.floor(rnd() * 34);
      const px = p.ctx.getImageData(x, y, 1, 1).data;
      if (px[3]) p.px(x, y, rnd() > 0.55 ? light : rnd() > 0.3 ? mid : dark);
    }
    p.px(8 + (variant % 3), 13, "#8bc45b");
    p.px(29 - (variant % 3), 20, "#76b653");
    p.px(15 + (variant % 4), 9, warm);
    p.px(24 - (variant % 3), 15, warm);
    return p.canvas;
  });
}

export function bush(variant: number): HTMLCanvasElement {
  return cached(`worldv3-bush${variant}`, () => {
    const p = new Painter(22, 18);
    const rnd = mulberry32(1200 + variant);
    p.shadow(11, 16, 8, 2);
    p.ellipse(11, 10, 11, 7, "#204e30");
    p.ellipse(7, 8, 7, 5, "#397c42");
    p.ellipse(15, 8, 7, 5, "#478d49");
    p.ellipse(11, 7, 5, 3, "#7fba58");
    for (let i = 0; i < 48; i++) {
      const x = Math.floor(rnd() * 22);
      const y = Math.floor(rnd() * 16);
      const d = p.ctx.getImageData(x, y, 1, 1).data;
      if (d[3]) p.px(x, y, rnd() > 0.64 ? "#9aca68" : rnd() > 0.3 ? "#4b914b" : "#214d31");
    }
    if (variant % 2 === 1) {
      p.px(6, 8, "#e35b58");
      p.px(13, 7, "#f0bf55");
      p.px(16, 11, "#e35b58");
    }
    return p.canvas;
  });
}

export function flower(variant: number): HTMLCanvasElement {
  return cached(`worldv3-flower${variant}`, () => {
    const p = new Painter(10, 12);
    const colors = ["#e85b68", "#f2c64f", "#f4e7c2", "#c779b8", "#f29a4d"];
    const c = colors[variant % colors.length] ?? "#e8556d";
    p.rect(4, 6, 1, 5, "#347a35");
    p.px(3, 8, "#4e9a3f");
    p.px(6, 7, "#4e9a3f");
    p.rect(3, 3, 3, 3, c);
    p.px(2, 4, c);
    p.px(6, 4, c);
    p.px(4, 2, c);
    p.px(4, 6, c);
    p.px(4, 4, "#ffe9a8");
    return p.canvas;
  });
}

export function lampPost(lit: boolean): HTMLCanvasElement {
  return cached(`worldv3-lamp${lit}`, () => {
    const p = new Painter(14, 40);
    p.shadow(7, 38, 5, 2);
    p.rect(5, 34, 5, 4, "#5c5045");
    p.rect(6, 10, 3, 26, "#3f3a34");
    p.rect(6, 10, 1, 26, "#565049");
    p.rect(3, 6, 9, 5, lit ? "#ffe9a0" : "#8e9096");
    p.outline(3, 6, 9, 5, "#2e2a26");
    p.rect(4, 3, 7, 3, "#4a423a");
    p.px(7, 1, "#4a423a");
    if (lit) {
      p.rect(5, 7, 5, 3, "#fff6d2");
    }
    return p.canvas;
  });
}

export function fence(vertical: boolean): HTMLCanvasElement {
  return cached(`worldv3-fence${vertical}`, () => {
    const p = new Painter(16, 20);
    p.shadow(8, 18, 6, 2);
    if (vertical) {
      p.rect(6, 2, 4, 16, "#86572f");
      p.rect(6, 2, 1, 16, "#c08a4b");
      p.rect(9, 2, 1, 16, "#5f3c25");
      p.rect(4, 6, 8, 2, "#9b6937");
      p.rect(4, 12, 8, 2, "#7a4c2b");
    } else {
      p.rect(2, 4, 3, 14, "#86572f");
      p.rect(11, 4, 3, 14, "#86572f");
      p.rect(0, 7, 16, 3, "#a56e38");
      p.rect(0, 7, 16, 1, "#d09a55");
      p.rect(0, 13, 16, 3, "#754727");
      p.rect(0, 13, 16, 1, "#a56e38");
    }
    return p.canvas;
  });
}

export function bridgeTile(): HTMLCanvasElement {
  return cached("worldv3-bridge", () => {
    const p = new Painter(16, 16);
    p.rect(0, 0, 16, 16, "#a87543");
    for (let y = 0; y < 16; y += 4) {
      p.rect(0, y, 16, 1, "#704728");
      p.rect(0, y + 1, 16, 1, "#d09a55");
    }
    p.rect(0, 0, 2, 16, "#6d4d2b");
    p.rect(14, 0, 2, 16, "#6d4d2b");
    return p.canvas;
  });
}

export function rock(): HTMLCanvasElement {
  return cached("worldv3-rock", () => {
    const p = new Painter(18, 14);
    p.shadow(9, 12, 7, 2);
    p.ellipse(9, 7, 8, 5, "#747d78");
    p.ellipse(7, 6, 5, 3, "#b0b39a");
    p.ellipse(11, 9, 4, 2, "#596862");
    p.rect(6, 4, 5, 1, "#d0cda9");
    p.px(5, 9, "#48564f");
    return p.canvas;
  });
}

export function signPost(): HTMLCanvasElement {
  return cached("sign", () => {
    const p = new Painter(20, 26);
    p.shadow(10, 24, 6, 2);
    p.rect(9, 12, 3, 12, "#7d5a33");
    p.rect(2, 3, 16, 11, "#b3853f");
    p.rect(3, 4, 14, 9, "#d3a860");
    p.outline(2, 3, 16, 11, "#6d4d2b");
    p.rect(5, 6, 10, 1, "#7a5a30");
    p.rect(5, 8, 8, 1, "#7a5a30");
    p.rect(5, 10, 6, 1, "#7a5a30");
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

export interface BuildingStyle {
  w: number;
  h: number;
  wall: string;
  roof: string;
  door: string;
  banner?: string;
  key: string;
}

export function building(s: BuildingStyle): HTMLCanvasElement {
  return cached(`worldv4-bld${s.key}`, () => {
    const { w, h } = s;
    const p = new Painter(w, h);
    const rnd = mulberry32(w * 31 + h);
    // Authored building styles share a material language but use three
    // deterministic silhouettes: shallow village roofs, standard gables,
    // and steeper rural roofs. The key is stable per world building, so this
    // adds variety without changing dimensions, anchors, or colliders.
    let keyHash = 0;
    for (let i = 0; i < s.key.length; i++) keyHash = (keyHash * 31 + s.key.charCodeAt(i)) | 0;
    const roofVariant = Math.abs(keyHash) % 3;
    const roofH = Math.floor(h * (roofVariant === 0 ? 0.39 : roofVariant === 1 ? 0.44 : 0.5));
    const bodyY = roofH - 2;
    const wallH = h - bodyY - 5;

    p.shadow(Math.floor(w / 2), h - 3, Math.floor(w / 2) - 2, 4);

    /* --- stone foundation --- */
    p.rect(2, h - 7, w - 4, 6, "#827d6f");
    for (let x = 3; x < w - 4; x += 6) {
      p.rect(x, h - 6, 5, 2, "#a69c84");
      p.rect(x + 3, h - 3, 5, 2, "#716d62");
      p.px(x + 1, h - 6, "#c0b596");
    }
    p.rect(2, h - 2, w - 4, 1, "#6d6558");

    /* --- plaster + timber walls --- */
    p.rect(1, bodyY - 2, w - 2, wallH + 4, shade(s.wall, -0.42));
    p.rect(3, bodyY, w - 6, wallH, s.wall);
    // vertical timber studs
    for (let x = 8; x < w - 8; x += 12) p.rect(x, bodyY + 2, 1, wallH - 2, shade(s.wall, -0.14));
    // horizontal beam and plaster grain
    p.rect(3, bodyY + Math.floor(wallH * 0.45), w - 6, 1, shade(s.wall, -0.18));
    p.speckle(3, bodyY, w - 6, wallH, shade(s.wall, -0.08), 0.05, rnd);
    p.speckle(3, bodyY, w - 6, wallH, shade(s.wall, 0.1), 0.05, rnd);
    // corner posts
    p.rect(3, bodyY, 3, wallH, shade(s.wall, -0.26));
    p.rect(w - 6, bodyY, 3, wallH, shade(s.wall, -0.26));
    p.rect(4, bodyY, 1, wallH, shade(s.wall, -0.12));
    // eave shadow cast on the wall, with a warm sunlit plaster band below it
    p.rect(3, bodyY, w - 6, 3, shade(s.wall, -0.3));
    p.rect(6, bodyY + 3, w - 12, 1, shade(s.wall, 0.14));

    /* --- shingled roof with scalloped rows --- */
    for (let y = 0; y < roofH; y++) {
      const inset = Math.floor(((roofH - y) / roofH) * (w / 2 - 6));
      const band = Math.floor(y / 3) % 2;
      const rowCol = y % 3 === 0 ? shade(s.roof, -0.2) : band ? s.roof : shade(s.roof, 0.12);
      p.rect(inset, y, w - inset * 2, 1, rowCol);
      // shingle seams every other row
      if (y % 3 === 2) {
        for (let x = inset + (band ? 2 : 5); x < w - inset - 1; x += 6) {
          p.px(x, y, shade(s.roof, -0.38));
          p.px(x, y - 1, shade(s.roof, -0.26));
        }
      }
    }
    // ridge cap
    p.rect(Math.floor(w / 2) - 5, 0, 10, 2, shade(s.roof, 0.26));
    p.rect(Math.floor(w / 2) - 5, 2, 10, 1, shade(s.roof, -0.2));
    // eaves
    p.rect(0, roofH - 2, w, 2, shade(s.roof, -0.32));
    p.rect(0, roofH, w, 1, shade(s.roof, -0.55));
    p.rect(0, roofH + 1, w, 1, shade(s.roof, -0.44));

    /* --- brick chimney --- */
    const chx = Math.max(6, Math.floor(w * 0.2));
    p.rect(chx, 1, 8, roofH - 4, "#8b5a44");
    p.rect(chx, 1, 8, 2, "#a86c52");
    p.rect(chx + 6, 3, 2, roofH - 6, "#6f4534");
    for (let y = 4; y < roofH - 4; y += 3) p.rect(chx, y, 8, 1, "#7a4c3a");

    /* --- gable / attic window --- */
    const gy = Math.floor(roofH * 0.5);
    p.rect(Math.floor(w / 2) - 4, gy, 8, 7, "#3a2a1a");
    p.rect(Math.floor(w / 2) - 3, gy + 1, 6, 5, "#f2c96b");
    p.rect(Math.floor(w / 2) - 1, gy + 1, 1, 5, "#3a2a1a");

    /* --- door with awning and steps --- */
    const dw = 14;
    const dx = Math.floor(w / 2 - dw / 2);
    const dy = h - 5 - 20;
    // frame
    p.rect(dx - 2, dy - 1, dw + 4, 21, shade(s.door, -0.4));
    p.rect(dx, dy, dw, 20, s.door);
    p.rect(dx + 1, dy + 1, dw - 2, 18, shade(s.door, 0.08));
    for (let y = dy + 2; y < dy + 19; y += 4) p.rect(dx + 1, y, dw - 2, 1, shade(s.door, -0.2));
    p.rect(dx + 3, dy + 2, dw - 6, 5, shade(s.door, -0.28));
    p.px(dx + dw - 3, dy + 11, "#f0d78a");
    // awning above the door
    p.rect(dx - 5, dy - 4, dw + 10, 3, shade(s.roof, -0.1));
    p.rect(dx - 5, dy - 4, dw + 10, 1, shade(s.roof, 0.18));
    p.rect(dx - 5, dy - 1, dw + 10, 1, shade(s.roof, -0.45));
    // stone steps
    p.rect(dx - 1, h - 6, dw + 2, 2, "#a49b8c");
    p.rect(dx - 3, h - 4, dw + 6, 2, "#8e8577");

    // lantern beside the door
    p.rect(dx - 7, dy + 2, 3, 4, "#3c3226");
    p.rect(dx - 6, dy + 3, 1, 2, "#ffd97a");

    /* --- windows with frames and flower boxes --- */
    const winY = dy + 2;
    for (const wx of [dx - 20, dx + dw + 7]) {
      if (wx < 6 || wx + 12 > w - 6) continue;
      p.rect(wx - 1, winY - 1, 13, 12, shade(s.wall, -0.35));
      p.rect(wx, winY, 11, 10, "#3a2a1a");
      p.rect(wx + 1, winY + 1, 9, 8, "#9ecfe4");
      p.rect(wx + 1, winY + 1, 4, 4, "#c9e9f5");
      p.rect(wx + 5, winY + 1, 1, 8, "#3a2a1a");
      p.rect(wx + 1, winY + 5, 9, 1, "#3a2a1a");
      // shutters
      p.rect(wx - 3, winY, 2, 10, shade(s.roof, -0.05));
      p.rect(wx + 12, winY, 2, 10, shade(s.roof, -0.05));
      // sill + flower box
      p.rect(wx - 2, winY + 10, 15, 2, shade(s.wall, -0.28));
      p.rect(wx, winY + 12, 11, 3, "#7d5a33");
      p.rect(wx, winY + 12, 11, 1, "#9a7343");
      for (let i = 1; i < 10; i += 3) {
        p.px(wx + i, winY + 11, "#4f8231");
        p.px(wx + i + 1, winY + 11, rnd() > 0.5 ? "#e2607a" : "#f0c04e");
      }
    }

    // A small side porch on one archetype breaks up the repeated house
    // silhouette while staying inside the existing sprite footprint.
    if (roofVariant === 2 && w >= 56) {
      const porchX = Math.max(4, w - 23);
      p.rect(porchX, h - 16, 18, 3, shade(s.roof, -0.18));
      p.rect(porchX + 2, h - 13, 2, 8, shade(s.wall, -0.28));
      p.rect(porchX + 14, h - 13, 2, 8, shade(s.wall, -0.28));
      p.rect(porchX + 1, h - 6, 16, 2, "#a49b8c");
    }

    /* --- hanging sign banner --- */
    if (s.banner) {
      const bw = Math.min(w - 14, 36);
      const bx = Math.floor(w / 2 - bw / 2);
      const by = roofH + 3;
      // rope
      p.rect(bx + 2, by - 2, 1, 2, "#5c4a30");
      p.rect(bx + bw - 3, by - 2, 1, 2, "#5c4a30");
      p.rect(bx, by, bw, 11, s.banner);
      p.outline(bx, by, bw, 11, shade(s.banner, -0.4));
      p.rect(bx + 2, by + 2, bw - 4, 1, shade(s.banner, 0.32));
      p.rect(bx + 2, by + 8, bw - 4, 1, shade(s.banner, -0.2));
      for (let i = 4; i < bw - 4; i += 4) p.rect(bx + i, by + 4, 2, 3, shade(s.banner, -0.5));
    }
    return p.canvas;
  });
}


export function villageGate(): HTMLCanvasElement {
  return cached("worldv3-gate", () => {
    const p = new Painter(96, 64);
    p.shadow(48, 62, 40, 3);
    // posts
    for (const x of [4, 80]) {
      p.rect(x, 14, 12, 46, "#8d6437");
      p.rect(x, 14, 3, 46, "#a87c48");
      p.rect(x + 9, 14, 3, 46, "#6d4d2b");
      p.rect(x - 2, 10, 16, 5, "#6d4d2b");
    }
    // beam
    p.rect(0, 4, 96, 10, "#a87c48");
    p.rect(0, 4, 96, 2, "#c2955c");
    p.rect(0, 12, 96, 2, "#6d4d2b");
    // roof ornament
    for (let i = 0; i < 96; i += 8) {
      p.rect(i, 0, 6, 4, "#8c4c33");
      p.rect(i, 0, 6, 1, "#a75f42");
    }
    // sign board
    p.rect(24, 16, 48, 18, "#d3a860");
    p.outline(24, 16, 48, 18, "#6d4d2b");
    p.rect(27, 20, 42, 2, "#7a5a30");
    p.rect(27, 24, 34, 2, "#7a5a30");
    p.rect(27, 28, 26, 2, "#7a5a30");
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

export interface CharStyle {
  key: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  hat?: "straw" | "peci" | "cap" | null;
  accent?: string;
}

export type Dir = "down" | "up" | "left" | "right";

/** 16x24 character sprite, 4 directions x 4 animation frames. */
export function character(style: CharStyle, dir: Dir, frame: number): HTMLCanvasElement {
  return cached(`char${style.key}${dir}${frame}`, () => {
    const p = new Painter(16, 24);
    const skinD = shade(style.skin, -0.2);
    const shirtD = shade(style.shirt, -0.22);
    const pantsD = shade(style.pants, -0.25);
    const bob = frame === 1 || frame === 3 ? 1 : 0;
    const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const top = 2 + bob;

    p.shadow(8, 22, 5, 2);

    // subtle outline behind body
    p.rect(3, top + 8, 1, 8, shade(style.shirt, -0.4));
    p.rect(12, top + 8, 1, 8, shade(style.shirt, -0.4));

    // legs
    const lLeg = swing;
    const rLeg = -swing;
    p.rect(5, 17 + Math.max(0, lLeg), 3, 4 - Math.max(0, lLeg), style.pants);
    p.rect(8, 17 + Math.max(0, rLeg), 3, 4 - Math.max(0, rLeg), pantsD);
    p.rect(5, 20, 3, 1, "#4b3a26");
    p.rect(8, 20, 3, 1, "#4b3a26");

    // body
    p.rect(4, top + 8, 8, 8, style.shirt);
    p.rect(4, top + 8, 8, 1, shade(style.shirt, 0.18));
    p.rect(4, top + 14, 8, 2, shirtD);
    if (style.accent) p.rect(4, top + 11, 8, 1, style.accent);

    // arms
    const armY = top + 9;
    p.rect(3, armY + Math.max(0, swing), 2, 6, style.shirt);
    p.rect(11, armY + Math.max(0, -swing), 2, 6, shirtD);
    p.rect(3, armY + 5 + Math.max(0, swing), 2, 2, style.skin);
    p.rect(11, armY + 5 + Math.max(0, -swing), 2, 2, skinD);

    // head with outline
    p.rect(3, top + 1, 1, 7, shade(style.skin, -0.35));
    p.rect(12, top + 1, 1, 7, shade(style.skin, -0.35));
    p.rect(4, top, 8, 1, shade(style.skin, -0.2));
    p.rect(4, top + 1, 8, 7, style.skin);
    p.rect(4, top + 1, 8, 1, shade(style.skin, 0.12));
    p.rect(11, top + 2, 1, 6, skinD);

    if (dir === "down") {
      p.rect(4, top, 8, 3, style.hair);
      p.rect(4, top + 3, 1, 2, style.hair);
      p.rect(11, top + 3, 1, 2, style.hair);
      p.px(6, top + 4, "#2b2118");
      p.px(9, top + 4, "#2b2118");
      p.rect(7, top + 6, 2, 1, shade(style.skin, -0.3));
    } else if (dir === "up") {
      p.rect(4, top, 8, 6, style.hair);
      p.rect(4, top + 6, 8, 1, shade(style.hair, -0.2));
    } else {
      const flip = dir === "left";
      const ex = flip ? 5 : 9;
      p.rect(4, top, 8, 3, style.hair);
      p.rect(flip ? 4 : 11, top + 2, 1, 4, style.hair);
      p.px(ex, top + 4, "#2b2118");
      p.px(flip ? 4 : 11, top + 5, shade(style.skin, -0.25));
    }

    // hats
    if (style.hat === "straw") {
      p.rect(1, top + 1, 14, 2, "#e0b45f");
      p.rect(1, top + 2, 14, 1, "#b98d44");
      p.rect(4, top - 2, 8, 3, "#e8c069");
      p.rect(4, top - 2, 8, 1, "#f3d488");
      p.rect(5, top - 3, 6, 1, "#e8c069");
    } else if (style.hat === "peci") {
      p.rect(4, top - 2, 8, 4, "#22262f");
      p.rect(4, top - 2, 8, 1, "#333a48");
    } else if (style.hat === "cap") {
      p.rect(4, top - 2, 8, 3, style.accent ?? "#3d6fb0");
      p.rect(2, top + 1, 10, 1, shade(style.accent ?? "#3d6fb0", -0.2));
    }
    return p.canvas;
  });
}

export const PLAYER_STYLE: CharStyle = {
  key: "player",
  skin: "#e0a878",
  hair: "#2f2118",
  shirt: "#4b8fd6",
  pants: "#3b4a63",
  hat: "straw",
  accent: "#f0f3f7",
};

/* ------------------------------------------------------------------ */
/* Crops                                                               */
/* ------------------------------------------------------------------ */

/** 16 wide x 28 tall, anchored to bottom of the tile. */
export function cropSprite(id: CropId, stage: number, sick: boolean): HTMLCanvasElement {
  return cached(`worldv3-crop${id}${stage}${sick}`, () => {
    const p = new Painter(16, 30);
    const def = CROPS[id];
    const leaf = sick ? "#a89a3f" : def.leaf;
    const leafD = shade(leaf, -0.28);
    const ink = "#263b24";
    const base = 28;

    if (stage > 0) p.shadow(8, base, 5, 1);

    if (stage === 0) {
      p.ellipse(8, base - 1, 4, 2, "#5e3625");
      p.rect(5, base - 2, 6, 1, "#8e5833");
      p.px(7, base - 3, "#d2a65d");
      p.px(9, base - 3, "#d2a65d");
      return p.canvas;
    }

    const heights = [0, 5, 9, 15, 22, 26];
    const hgt = heights[Math.min(stage, 5)] ?? 5;
    const leafMark = (x: number, y: number, dir: number, length: number) => {
      p.line(x, y, x + dir * length, y - Math.max(1, Math.floor(length / 2)), leafD);
      p.line(x, y - 1, x + dir * (length - 1), y - Math.max(2, Math.floor(length / 2)), leaf);
      p.px(x + dir, y - 1, shade(leaf, 0.12));
      if (length >= 4) p.px(x + dir * (length - 1), y - Math.max(2, Math.floor(length / 2)), shade(leaf, 0.2));
    };

    const ripe = stage === 5;
    switch (id) {
      case "corn": {
        const stems = stage >= 3 ? [4, 8, 11] : [7];
        for (const sx of stems) {
          p.rect(sx - 1, base - hgt, 3, hgt, ink);
          p.rect(sx, base - hgt, 1, hgt, leaf);
          for (let y = base - 4; y > base - hgt + 2; y -= 5) {
            leafMark(sx, y, y % 2 ? -1 : 1, stage >= 4 ? 4 : 3);
          }
        }
        if (stage >= 4) {
          const ear = ripe ? "#e0ac32" : "#a9bd4e";
          p.rect(10, base - hgt + 5, 4, 8, ink);
          p.rect(11, base - hgt + 5, 2, 7, ear);
          p.rect(11, base - hgt + 5, 1, 7, shade(ear, 0.22));
          for (let y = base - hgt + 7; y < base - hgt + 12; y += 2) p.px(12, y, shade(ear, -0.25));
          if (ripe) p.px(12, base - hgt + 3, "#f1d46b");
        }
        break;
      }
      case "sugarcane": {
        const stalks = stage >= 3 ? [4, 7, 10, 13] : [7];
        for (const sx of stalks) {
          p.rect(sx - 1, base - hgt, 3, hgt, ink);
          p.rect(sx, base - hgt, 1, hgt, ripe ? "#bdd663" : "#8fba50");
          for (let y = base - hgt + 3; y < base; y += 5) p.rect(sx - 1, y, 3, 1, "#6d9139");
          if (stage >= 3) leafMark(sx, base - hgt + 3, sx < 8 ? -1 : 1, 4);
        }
        break;
      }
      case "rice": {
        const tuft = stage >= 3 ? [3, 6, 9, 12] : [7];
        for (const sx of tuft) {
          const grain = ripe ? "#e4c85f" : "#a8c45e";
          p.rect(sx, base - 4, 1, 4, ink);
          p.line(sx, base - 3, sx + (sx < 8 ? -2 : 2), base - hgt, leaf);
          p.line(sx, base - 4, sx + (sx < 8 ? -3 : 3), base - hgt + 2, grain);
          p.px(sx + (sx < 8 ? -2 : 2), base - hgt + 1, grain);
          p.px(sx + (sx < 8 ? -1 : 1), base - hgt + 3, grain);
        }
        break;
      }
      case "tomato": {
        const stems = stage >= 3 ? [4, 8, 11] : [8];
        for (const sx of stems) {
          p.rect(sx, base - hgt, 1, hgt, ink);
          leafMark(sx, base - 5, sx < 8 ? 1 : -1, stage >= 3 ? 4 : 3);
          leafMark(sx, base - 9, sx < 8 ? -1 : 1, 3);
        }
        if (stage >= 4) {
          const fruit = ripe ? "#d94732" : "#86ad48";
          for (const [fx, fy] of [[4, base - 7], [11, base - 11], [7, base - 15]] as [number, number][]) {
            p.ellipse(fx, fy, 3, 2, ink);
            p.ellipse(fx, fy, 2, 2, fruit);
            p.px(fx - 1, fy - 1, shade(fruit, 0.28));
            p.px(fx, fy - 3, leaf);
          }
        }
        break;
      }
      case "chili": {
        const stems = stage >= 3 ? [4, 8, 12] : [8];
        for (const sx of stems) {
          p.rect(sx, base - hgt, 1, hgt, ink);
          leafMark(sx, base - 7, sx < 8 ? 1 : -1, 4);
          leafMark(sx, base - 11, sx < 8 ? -1 : 1, 3);
        }
        if (stage >= 4) {
          const fruit = ripe ? "#d92f2f" : "#78aa46";
          for (const [fx, fy] of [[4, base - 7], [11, base - 10], [7, base - 15]] as [number, number][]) {
            p.rect(fx, fy, 2, 5, ink);
            p.rect(fx, fy, 1, 4, fruit);
            p.px(fx, fy + 4, shade(fruit, -0.2));
            p.px(fx, fy - 1, leaf);
          }
        }
        break;
      }
    }

    if (sick) {
      const rnd = mulberry32(id.length * 17 + stage);
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(rnd() * 16);
        const y = base - Math.floor(rnd() * (hgt + 4));
        const d = p.ctx.getImageData(x, Math.max(0, y), 1, 1).data;
        if (d[3]) p.px(x, y, rnd() > 0.5 ? "#e1cf58" : "#80752d");
      }
      p.px(10, base - hgt + 2, "#302319");
      p.px(11, base - hgt + 3, "#302319");
    }
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Pests                                                               */
/* ------------------------------------------------------------------ */

function drawProceduralPest(id: PestId, frame: number): HTMLCanvasElement {
  return cached(`pestproc${id}${frame}`, () => {
    const d = PESTS[id];
    const draw = new Painter(16, 16);
    const wob = frame % 2;
    switch (id) {
      case "grub": {
        // C-shaped white larva with brown head
        draw.ellipse(8, 9 + wob, 5, 4, d.body);
        draw.ellipse(6, 7 + wob, 4, 3, shade(d.body, 0.2));
        for (let i = -3; i <= 3; i++) draw.px(8 + i, 6 + wob + Math.abs(i) * 0.2, shade(d.body, -0.12));
        draw.ellipse(12, 7 + wob, 2, 2, d.accent);
        draw.px(13, 6 + wob, "#5b3a1c");
        draw.px(4, 11 + wob, shade(d.body, -0.18));
        break;
      }
      case "whitefly": {
        draw.ellipse(8, 9, 2, 2, "#e8e4c8");
        draw.ellipse(6 - wob, 6, 3, 2, d.body);
        draw.ellipse(10 + wob, 6, 3, 2, d.body);
        draw.px(7, 8, "#4a4a3a");
        draw.px(9, 8, "#4a4a3a");
        draw.px(6, 12, d.accent);
        draw.px(10, 12, d.accent);
        break;
      }
      case "armyworm": {
        for (let i = 0; i < 5; i++) {
          const y = 9 + (i % 2 === wob ? -1 : 0);
          draw.ellipse(3 + i * 2.4, y, 2, 2, i % 2 ? d.body : shade(d.body, 0.12));
        }
        draw.ellipse(13, 9, 2, 2, d.accent);
        draw.px(14, 8, "#1d2410");
        for (let i = 0; i < 4; i++) draw.px(4 + i * 2, 12, "#4d5a24");
        break;
      }
      case "grasshopper": {
        draw.ellipse(8, 9, 5, 3, d.body);
        draw.ellipse(11, 8, 3, 2, shade(d.body, 0.15));
        draw.px(13, 8, "#1f2f12");
        draw.line(5, 9, 2, 5 - wob, d.accent);
        draw.line(6, 10, 3, 13, d.accent);
        draw.line(9, 10, 7, 13, d.accent);
        draw.line(12, 7, 15, 4, "#d8e8a8");
        break;
      }
    }
    return draw.canvas;
  });
}

function drawPestImage(img: HTMLImageElement, scale: number): HTMLCanvasElement {
  const n = 16 * scale;
  const p = new Painter(n, n);
  p.ctx.imageSmoothingEnabled = false;
  const ratio = Math.min(n / img.width, n / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const dx = (n - w) / 2;
  const dy = (n - h) / 2;
  p.ctx.drawImage(img, dx, dy, w, h);
  return p.canvas;
}

export function pestSprite(id: PestId, frame: number, scale = 1): HTMLCanvasElement {
  const img = getPestImage(id);
  if (img) {
    return cached(`pestart${id}${scale}`, () => drawPestImage(img, scale));
  }
  const draw = drawProceduralPest(id, frame);
  if (scale === 1) return draw;
  return cached(`pestproc${id}${frame}${scale}`, () => {
    const p = new Painter(16 * scale, 16 * scale);
    p.ctx.imageSmoothingEnabled = false;
    p.ctx.drawImage(draw, 0, 0, 16 * scale, 16 * scale);
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Item icons (inventory / shop)                                       */
/* ------------------------------------------------------------------ */

export function seedIcon(id: CropId): HTMLCanvasElement {
  return cached(`seedico${id}`, () => {
    const p = new Painter(16, 16);
    const c = CROPS[id];
    p.rect(3, 2, 10, 12, "#cbb187");
    p.rect(3, 2, 10, 2, "#e0c79c");
    p.outline(3, 2, 10, 12, "#8d7550");
    p.rect(4, 5, 8, 7, shade(c.color, 0.25));
    p.ellipse(8, 8, 2, 3, c.color);
    p.px(7, 6, shade(c.color, 0.4));
    p.rect(3, 2, 10, 1, "#a08a63");
    return p.canvas;
  });
}

export function produceIcon(id: CropId): HTMLCanvasElement {
  return cached(`prodico${id}`, () => {
    const p = new Painter(16, 16);
    const c = CROPS[id];
    switch (id) {
      case "corn":
        p.ellipse(8, 8, 3, 6, c.color);
        p.rect(6, 3, 4, 1, shade(c.color, 0.3));
        for (let y = 4; y < 13; y += 2) {
          p.px(7, y, shade(c.color, -0.25));
          p.px(9, y, shade(c.color, -0.25));
        }
        p.line(11, 4, 14, 2, c.leaf);
        p.line(5, 5, 2, 3, c.leaf);
        break;
      case "sugarcane":
        p.rect(6, 1, 4, 14, c.color);
        p.rect(6, 1, 1, 14, shade(c.color, 0.25));
        for (let y = 3; y < 15; y += 4) p.rect(6, y, 4, 1, shade(c.color, -0.3));
        p.line(6, 3, 2, 1, c.leaf);
        p.line(10, 5, 14, 2, c.leaf);
        break;
      case "rice":
        for (const sx of [4, 8, 12]) {
          p.line(sx, 14, sx, 5, "#a8b463");
          for (let k = 0; k < 4; k++) p.px(sx + (k % 2 ? 1 : -1), 5 + k, c.color);
        }
        p.rect(3, 13, 10, 2, "#b08a5a");
        break;
      case "tomato":
        p.ellipse(8, 9, 5, 5, c.color);
        p.ellipse(6, 7, 2, 2, shade(c.color, 0.35));
        p.rect(7, 3, 2, 2, "#3f7f38");
        p.px(5, 4, "#3f7f38");
        p.px(10, 4, "#3f7f38");
        break;
      case "chili":
        p.rect(7, 4, 3, 9, c.color);
        p.ellipse(8, 12, 2, 2, c.color);
        p.rect(7, 4, 1, 9, shade(c.color, 0.3));
        p.rect(7, 2, 2, 2, "#3f7f38");
        p.px(9, 1, "#3f7f38");
        break;
    }
    return p.canvas;
  });
}

export function bottleIcon(color: string, key: string): HTMLCanvasElement {
  return cached(`bottle${key}`, () => {
    const p = new Painter(16, 16);
    p.rect(6, 1, 4, 3, "#6e6e78");
    p.rect(4, 4, 8, 10, "#c3d6de");
    p.rect(5, 6, 6, 7, color);
    p.rect(5, 6, 2, 7, shade(color, 0.3));
    p.outline(4, 4, 8, 10, "#5c6b73");
    p.rect(5, 8, 6, 3, shade(color, -0.2));
    p.px(6, 5, "#eef6f9");
    return p.canvas;
  });
}

export function toolIcon(kind: "hoe" | "can" | "sprayer" | "sickle" | "hand"): HTMLCanvasElement {
  return cached(`tool${kind}`, () => {
    const p = new Painter(16, 16);
    switch (kind) {
      case "hoe":
        p.line(3, 13, 11, 3, "#a87c48");
        p.line(4, 13, 12, 3, "#8a6238");
        p.rect(10, 1, 5, 2, "#b8bcc4");
        p.rect(12, 3, 3, 2, "#9aa0a8");
        break;
      case "can":
        p.rect(4, 6, 8, 7, "#7f9bb5");
        p.rect(4, 6, 8, 1, "#a5bed4");
        p.rect(3, 5, 10, 1, "#5f7a92");
        p.line(12, 7, 15, 4, "#7f9bb5");
        p.rect(14, 3, 2, 2, "#a5bed4");
        p.rect(5, 3, 5, 2, "#5f7a92");
        for (let i = 0; i < 3; i++) p.px(15, 6 + i, "#9fd4ec");
        break;
      case "sprayer":
        p.rect(5, 5, 6, 9, "#c3d6de");
        p.rect(6, 7, 4, 6, "#4fa860");
        p.rect(6, 2, 3, 3, "#6e6e78");
        p.line(9, 3, 13, 3, "#6e6e78");
        p.px(14, 2, "#9fd4ec");
        p.px(15, 4, "#9fd4ec");
        break;
      case "sickle":
        p.line(4, 13, 8, 9, "#a87c48");
        for (let a = 0; a < 10; a++) {
          const r = 6;
          const ang = (-a / 10) * Math.PI * 0.9 - 0.2;
          p.px(8 + Math.cos(ang) * r, 9 + Math.sin(ang) * r, "#c8ccd4");
        }
        break;
      case "hand":
        p.rect(5, 6, 6, 7, "#e0a878");
        p.rect(4, 7, 1, 4, "#e0a878");
        p.rect(11, 7, 1, 4, "#e0a878");
        p.rect(6, 3, 1, 4, "#e0a878");
        p.rect(8, 2, 1, 5, "#e0a878");
        p.rect(10, 3, 1, 4, "#e0a878");
        p.rect(5, 12, 6, 1, "#c78d5f");
        break;
    }
    return p.canvas;
  });
}

export function coinIcon(): HTMLCanvasElement {
  return cached("coin", () => {
    const p = new Painter(12, 12);
    p.ellipse(6, 6, 5, 5, "#d9a12b");
    p.ellipse(6, 6, 4, 4, "#f2c53d");
    p.ellipse(5, 5, 2, 2, "#ffe693");
    p.rect(5, 3, 2, 6, "#c98d1f");
    return p.canvas;
  });
}

export function fertilizerIcon(): HTMLCanvasElement {
  return cached("fert", () => {
    const p = new Painter(16, 16);
    p.rect(3, 4, 10, 10, "#8a6a42");
    p.rect(3, 4, 10, 2, "#a3805a");
    p.outline(3, 4, 10, 10, "#5f4930");
    p.rect(5, 8, 6, 4, "#4d7327");
    p.px(6, 7, "#6f9c39");
    p.px(9, 7, "#6f9c39");
    return p.canvas;
  });
}

export function tankIcon(): HTMLCanvasElement {
  return cached("tank", () => {
    const p = new Painter(16, 16);
    p.rect(3, 3, 10, 11, "#5f8fb0");
    p.rect(3, 3, 10, 2, "#7fb0cf");
    p.outline(3, 3, 10, 11, "#3c6480");
    p.rect(5, 7, 6, 5, "#9fd4ec");
    p.rect(6, 1, 4, 2, "#3c6480");
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Extra village nature props — kelapa, pisang, rumput, jerami, teratai */
/* ------------------------------------------------------------------ */

/** Coconut palm — tall, swaying silhouette typical of Javanese villages. */
export function palmTree(variant: number): HTMLCanvasElement {
  return cached(`worldv3-palm${variant}`, () => {
    const w = 46;
    const h = 76;
    const p = new Painter(w, h);
    const rnd = mulberry32(1700 + variant);
    const lean = variant % 2 === 0 ? 1 : -1;
    const dark = "#1d4b31";
    const mid = "#397e43";
    const light = "#88bd5c";
    p.shadow(23, 72, 11, 4);
    // curved trunk with ring texture
    for (let i = 0; i < 46; i++) {
      const y = 71 - i;
      const x = 22 + Math.round(Math.sin(i / 26) * 4) * lean;
      p.rect(x, y, 5, 1, i % 4 === 0 ? "#6d4c2c" : "#82603a");
      p.px(x, y, "#5a3d23");
      p.px(x + 4, y, "#5a3d23");
    }
    const tx = 24 + Math.round(Math.sin(46 / 26) * 4) * lean;
    // fronds radiating from the crown
    const angles = [-2.7, -2.1, -1.57, -1.0, -0.45, 0.35, 3.0];
    for (const a of angles) {
      for (let l = 0; l < 20; l++) {
        const droop = (l * l) / 90;
        const fx = tx + Math.round(Math.cos(a) * l);
        const fy = 26 + Math.round(Math.sin(a) * l * 0.55 + droop);
        p.px(fx, fy, l < 12 ? mid : dark);
        p.px(fx, fy - 1, light);
        if (l % 2 === 0) {
          p.px(fx, fy + 1, dark);
          p.px(fx + (a < -1.57 ? -1 : 1), fy + 2, dark);
        }
      }
    }
    // coconuts
    p.ellipse(tx - 3, 29, 2, 2, "#7a5a2f");
    p.ellipse(tx + 3, 30, 2, 2, "#8a6836");
    p.px(tx - 4, 28, "#a2833f");
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rnd() * w);
      const y = Math.floor(rnd() * 46);
      const d = p.ctx.getImageData(x, y, 1, 1).data;
      if (d[3]) p.px(x, y, rnd() > 0.6 ? light : dark);
    }
    return p.canvas;
  });
}

/** Banana clump — broad glossy leaves, common beside village houses. */
export function bananaTree(variant: number): HTMLCanvasElement {
  return cached(`worldv3-banana${variant}`, () => {
    const p = new Painter(38, 52);
    const rnd = mulberry32(1800 + variant);
    const dark = "#1d5533";
    const mid = "#418e49";
    const light = "#8bc25b";
    p.shadow(19, 49, 9, 3);
    p.rect(17, 26, 5, 22, "#4f7a35");
    p.rect(17, 26, 2, 22, "#5f8c3f");
    const leaves: [number, number, number, number][] = [
      [-14, -8, 13, 5],
      [14, -8, 13, 5],
      [-9, -18, 9, 6],
      [10, -18, 9, 6],
      [0, -24, 6, 9],
    ];
    for (const [dx, dy, rx, ry] of leaves) {
      const cx = 19 + dx;
      const cy = 30 + dy;
      p.ellipse(cx, cy, rx, ry, dark);
      p.ellipse(cx, cy - 1, rx - 2, Math.max(1, ry - 2), mid);
      p.line(19, 28, cx, cy, light);
      // torn leaf edges
      for (let i = -rx; i <= rx; i += 3) p.px(cx + i, cy + ry, dark);
    }
    if (variant % 2 === 0) {
      p.ellipse(24, 32, 3, 2, "#d9b13f");
      p.ellipse(23, 35, 3, 2, "#c9a134");
    }
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rnd() * 38);
      const y = Math.floor(rnd() * 40);
      const d = p.ctx.getImageData(x, y, 1, 1).data;
      if (d[3]) p.px(x, y, rnd() > 0.5 ? light : dark);
    }
    return p.canvas;
  });
}

/** Wild grass tuft — scattered densely to make the ground feel alive. */
export function tallGrass(variant: number): HTMLCanvasElement {
  return cached(`worldv3-tallgrass${variant}`, () => {
    const p = new Painter(16, 14);
    const rnd = mulberry32(1900 + variant);
    const tones = ["#3d7f3d", "#63a64b", "#89bf5b"];
    for (let i = 0; i < 9; i++) {
      const x = 1 + Math.floor(rnd() * 14);
      const hgt = 4 + Math.floor(rnd() * 7);
      const c = tones[Math.floor(rnd() * tones.length)] ?? "#5da043";
      const bend = rnd() > 0.5 ? 1 : -1;
      for (let j = 0; j < hgt; j++) {
        p.px(x + (j > hgt - 3 ? bend : 0), 12 - j, j > hgt - 3 ? shade(c, 0.2) : c);
      }
    }
    if (variant % 3 === 0) p.px(8, 4, "#f2e6a8");
    return p.canvas;
  });
}

/** Hay bale stacked at the edge of the fields. */
export function haystack(): HTMLCanvasElement {
  return cached("worldv3-haystack", () => {
    const p = new Painter(26, 22);
    const rnd = mulberry32(2200);
    p.shadow(13, 20, 11, 3);
    p.ellipse(13, 12, 11, 8, "#a47a35");
    p.ellipse(13, 11, 9, 6, "#d2a948");
    p.ellipse(11, 9, 5, 3, "#f0cf6a");
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(rnd() * 26);
      const y = Math.floor(rnd() * 22);
      const d = p.ctx.getImageData(x, y, 1, 1).data;
      if (d[3]) p.px(x, y, rnd() > 0.55 ? "#f1d77b" : "#8b672e");
    }
    p.line(3, 13, 23, 13, "#a8873e");
    return p.canvas;
  });
}

/** Lily pad floating on the river. */
export function lilyPad(variant: number): HTMLCanvasElement {
  return cached(`worldv3-lily${variant}`, () => {
    const p = new Painter(14, 12);
    p.ellipse(7, 6, 6, 4, "#235f3c");
    p.ellipse(6, 5, 4, 3, "#41934e");
    p.rect(7, 6, 4, 1, "#194a31");
    if (variant % 2 === 0) {
      p.ellipse(4, 4, 2, 2, "#e9a6c8");
      p.px(4, 4, "#fff1c9");
    }
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Farm animals — ayam, anak ayam, bebek, sapi                         */
/* ------------------------------------------------------------------ */

export type AnimalId = "chicken" | "chick" | "duck" | "cow";
export type AnimalDir = "left" | "right";

/** Small wandering farm animal. frame 0..3 (walk cycle / peck). */
export function animalSprite(
  id: AnimalId,
  dir: AnimalDir,
  frame: number,
): HTMLCanvasElement {
  return cached(`animal${id}${dir}${frame}`, () => {
    const flip = dir === "left";
    const src = animalBase(id, frame);
    if (!flip) return src;
    const p = new Painter(src.width, src.height);
    p.ctx.save();
    p.ctx.translate(src.width, 0);
    p.ctx.scale(-1, 1);
    p.ctx.imageSmoothingEnabled = false;
    p.ctx.drawImage(src, 0, 0);
    p.ctx.restore();
    return p.canvas;
  });
}

/** Right-facing base art for each animal. */
function animalBase(id: AnimalId, frame: number): HTMLCanvasElement {
  return cached(`animalbase${id}${frame}`, () => {
    const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const peck = frame === 2 ? 1 : 0;

    if (id === "cow") {
      const p = new Painter(26, 20);
      p.shadow(13, 18, 9, 2);
      // body
      p.rect(3, 6, 18, 8, "#f4f0e6");
      p.rect(3, 6, 18, 1, "#ffffff");
      p.rect(3, 13, 18, 1, "#cdc6b6");
      p.outline(3, 6, 18, 8, "#3a352c");
      // black patches
      p.ellipse(8, 9, 3, 2, "#3a352c");
      p.ellipse(15, 11, 3, 2, "#3a352c");
      p.ellipse(18, 7, 2, 1, "#3a352c");
      // udder
      p.rect(9, 13, 4, 2, "#e8b0ab");
      // legs
      p.rect(5, 14 + Math.max(0, step), 2, 4 - Math.max(0, step), "#3a352c");
      p.rect(9, 14 + Math.max(0, -step), 2, 4 - Math.max(0, -step), "#4a453a");
      p.rect(14, 14 + Math.max(0, -step), 2, 4 - Math.max(0, -step), "#3a352c");
      p.rect(18, 14 + Math.max(0, step), 2, 4 - Math.max(0, step), "#4a453a");
      // tail
      p.rect(2, 7, 1, 6 + step, "#3a352c");
      p.rect(2, 12 + step, 2, 2, "#2b271f");
      // head
      const hy = 4 + peck;
      p.rect(19, hy, 7, 7, "#f4f0e6");
      p.outline(19, hy, 7, 7, "#3a352c");
      p.rect(20, hy + 1, 3, 3, "#3a352c");
      p.rect(23, hy + 4, 3, 3, "#e8b0ab");
      p.px(24, hy + 5, "#3a352c");
      p.px(21, hy + 4, "#2b271f"); // eye
      // horns / ears
      p.rect(18, hy, 2, 1, "#cdc6b6");
      p.rect(25, hy - 1, 2, 1, "#cdc6b6");
      return p.canvas;
    }

    // birds (chicken / chick / duck)
    const chick = id === "chick";
    const duck = id === "duck";
    const w = chick ? 10 : 14;
    const h = chick ? 10 : 14;
    const p = new Painter(w, h);
    const body = chick ? "#f6d76b" : duck ? "#f2f2ec" : "#f7f3e8";
    const dark = chick ? "#d9ae42" : duck ? "#cfd0c8" : "#d9d2c0";
    const beak = duck ? "#f0a03a" : "#e9a13c";
    const legs = "#e0913a";
    const outline = "#4a3c28";

    const baseY = chick ? 2 : 3;
    p.shadow(Math.floor(w / 2), h - 2, chick ? 3 : 5, 1);
    // body
    p.ellipse(Math.floor(w / 2) - 1, baseY + 4, chick ? 3 : 4, chick ? 3 : 4, body);
    p.ellipse(Math.floor(w / 2) - 2, baseY + 3, chick ? 2 : 3, chick ? 2 : 3, shade(body, 0.12));
    // wing
    p.ellipse(Math.floor(w / 2) - 1, baseY + 5, chick ? 2 : 3, 2, dark);
    // tail
    if (!chick) {
      p.rect(1, baseY + 2, 3, 2, duck ? dark : "#c9c2b0");
      p.rect(1, baseY + 1, 2, 1, duck ? dark : "#b7ae99");
    }
    // head
    const hx = w - (chick ? 4 : 5);
    const hy = baseY + (peck ? 2 : 0);
    p.ellipse(hx, hy + 1, chick ? 2 : 3, chick ? 2 : 3, body);
    p.px(hx + 1, hy, outline); // eye
    // beak
    p.rect(hx + (chick ? 2 : 3), hy + 1, 2, duck ? 2 : 1, beak);
    // comb / wattle for chicken
    if (!chick && !duck) {
      p.rect(hx - 1, hy - 3, 4, 2, "#d8483f");
      p.px(hx - 1, hy - 4, "#d8483f");
      p.px(hx + 2, hy - 4, "#d8483f");
      p.px(hx + 2, hy + 3, "#d8483f");
    }
    if (duck) {
      p.rect(hx - 2, hy - 2, 5, 2, "#3f8f63");
      p.px(hx - 2, hy, "#3f8f63");
    }
    // legs
    const ly = h - 3;
    p.rect(Math.floor(w / 2) - 2 + Math.max(0, step), ly, 1, 2, legs);
    p.rect(Math.floor(w / 2) + 1 + Math.max(0, -step), ly, 1, 2, legs);
    p.px(Math.floor(w / 2) - 2 + Math.max(0, step), ly + 2, legs);
    p.px(Math.floor(w / 2) + 1 + Math.max(0, -step), ly + 2, legs);
    return p.canvas;
  });
}

/* ------------------------------------------------------------------ */
/* Motor bebek warga desa                                              */
/* ------------------------------------------------------------------ */

/**
 * Motor bebek khas desa. Digambar di bawah sprite pengendara.
 * frame 0..3 dipakai untuk getaran mesin & putaran roda.
 */
export function motorbike(dir: Dir, frame: number): HTMLCanvasElement {
  return cached(`motor${dir}${frame}`, () => {
    const p = new Painter(22, 18);
    const body = "#c2452f";
    const dark = "#8e2f20";
    const metal = "#c9cdd4";
    const tyre = "#2c2a28";
    const rim = "#8e9299";
    const spin = frame % 2;
    p.shadow(11, 15, 8, 2);

    if (dir === "left" || dir === "right") {
      const flip = dir === "left";
      const q = new Painter(22, 18);
      // wheels
      q.ellipse(5, 12, 4, 4, tyre);
      q.ellipse(17, 12, 4, 4, tyre);
      q.ellipse(5, 12, 2, 2, rim);
      q.ellipse(17, 12, 2, 2, rim);
      q.px(5, 12 - (spin ? 2 : 0), "#e6e8ea");
      q.px(17, 12 + (spin ? 2 : 0), "#e6e8ea");
      // frame + body panels
      q.rect(5, 8, 12, 3, body);
      q.rect(5, 8, 12, 1, "#e06a52");
      q.rect(6, 11, 9, 1, dark);
      // seat
      q.rect(6, 6, 6, 2, "#33302c");
      q.rect(6, 6, 6, 1, "#4a453f");
      // front cowl + handlebar
      q.rect(15, 5, 4, 4, body);
      q.rect(15, 5, 4, 1, "#e06a52");
      q.rect(18, 6, 2, 2, "#ffe9a8"); // headlamp
      q.rect(14, 3, 6, 1, metal);
      // exhaust
      q.rect(2, 10, 4, 2, metal);
      q.outline(5, 8, 12, 3, "#3a2f2a");
      if (!flip) return q.canvas;
      p.ctx.save();
      p.ctx.translate(22, 0);
      p.ctx.scale(-1, 1);
      p.ctx.imageSmoothingEnabled = false;
      p.ctx.drawImage(q.canvas, 0, 0);
      p.ctx.restore();
      return p.canvas;
    }

    // front / back view
    const back = dir === "up";
    p.ellipse(11, 13, 3, 4, tyre);
    p.ellipse(11, 13, 1, 2, rim);
    p.rect(7, 6, 8, 6, body);
    p.rect(7, 6, 8, 1, "#e06a52");
    p.rect(8, 11, 6, 1, dark);
    p.outline(7, 6, 8, 6, "#3a2f2a");
    p.rect(5, 5, 12, 1, metal); // handlebar
    p.px(5, 6, metal);
    p.px(16, 6, metal);
    if (!back) {
      p.rect(9, 7, 4, 3, "#ffe9a8");
      p.rect(10, 8, 2, 1, "#fff8dc");
    } else {
      p.rect(9, 7, 4, 2, "#33302c");
      p.rect(9, 10, 4, 1, "#d8483f");
    }
    return p.canvas;
  });
}
