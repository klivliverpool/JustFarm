/**
 * World generation for Bandungrejo Village.
 * A single seamless map, hand-laid region by region, with decorations
 * densely scattered so no area feels empty.
 */
import { mulberry32 } from "./pixel";
import { TILE } from "./sprites";

export const MAP_W = 160;
export const MAP_H = 120;

export const T_GRASS = 0;
export const T_PATH = 1;
export const T_DIRT = 2;
export const T_WATER = 3;
export const T_SAND = 4;
export const T_BRIDGE = 5;
export const T_FARM = 6;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DecorKind =
  | "tree"
  | "bush"
  | "flower"
  | "lamp"
  | "fenceH"
  | "fenceV"
  | "rock"
  | "sign"
  | "palm"
  | "banana"
  | "tallgrass"
  | "haystack"
  | "lily";

export interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  variant: number;
  solid: boolean;
}

export type BuildingKind =
  | "hall"
  | "house"
  | "seedshop"
  | "pestshop"
  | "warehouse"
  | "npc";

export interface Building {
  kind: BuildingKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Interaction point (world px, in front of the door). */
  door: { x: number; y: number };
  action: "hall" | "home" | "seedshop" | "pestshop" | "warehouse" | "none";
  wall: string;
  roof: string;
  doorColor: string;
  banner?: string;
}

export interface FarmRegion {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface World {
  ground: Uint8Array;
  decor: Decor[];
  buildings: Building[];
  colliders: Rect[];
  farms: FarmRegion[];
  npcSpawns: { x: number; y: number; r: number }[];
  /** Petak kebun warga yang mereka urus sendiri (piksel dunia). */
  gardens: { x: number; y: number }[];
  gate: { x: number; y: number };
}

const idx = (x: number, y: number) => y * MAP_W + x;

export interface RoadWaypoint {
  x: number;
  y: number;
}

export interface RoadHitbox {
  w: number;
  h: number;
  ox: number;
  oy: number;
}

export interface RoadSegmentValidation {
  valid: boolean;
  reason: string;
}

export interface RoadRouteValidation {
  valid: boolean;
  invalidSegment: number | null;
  reason: string;
}

/** True only for terrain that a motor route is allowed to occupy. */
export function isRoadTile(w: World, tx: number, ty: number) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  const t = w.ground[idx(tx, ty)];
  return t === T_PATH || t === T_BRIDGE;
}

/** Terrain that village actors may use for ordinary navigation. */
export function isWalkableTile(w: World, tx: number, ty: number) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  const t = w.ground[idx(tx, ty)];
  return t === T_GRASS || t === T_PATH || t === T_BRIDGE || t === T_SAND;
}

/** Farm and one-tile boundary buffer, including the authored fence line. */
export function isFarmBufferTile(w: World, tx: number, ty: number, padding = 1) {
  return w.farms.some(
    (farm) => tx >= farm.x - padding && tx < farm.x + farm.w + padding && ty >= farm.y - padding && ty < farm.y + farm.h + padding,
  );
}

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Validates the complete swept footprint of one cardinal waypoint segment.
 * Waypoints are world-pixel positions; the route system places them at tile origins.
 */
export function validateRoadSegment(
  w: World,
  from: RoadWaypoint,
  to: RoadWaypoint,
  hitbox: RoadHitbox,
): RoadSegmentValidation {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0 && dy !== 0) {
    return { valid: false, reason: "segment is diagonal" };
  }

  const fromTx = Math.floor(from.x / TILE);
  const fromTy = Math.floor(from.y / TILE);
  const toTx = Math.floor(to.x / TILE);
  const toTy = Math.floor(to.y / TILE);
  if (fromTx !== toTx && fromTy !== toTy) {
    return { valid: false, reason: "segment crosses multiple tile axes" };
  }

  // Validate the route's centerline tiles explicitly, independent of the
  // hitbox shape, so every authored waypoint edge is checked tile by tile.
  const stepTx = Math.sign(toTx - fromTx);
  const stepTy = Math.sign(toTy - fromTy);
  let tx = fromTx;
  let ty = fromTy;
  for (;;) {
    if (!isRoadTile(w, tx, ty)) {
      return { valid: false, reason: `route touches non-road tile (${tx},${ty})` };
    }
    if (tx === toTx && ty === toTy) break;
    tx += stepTx;
    ty += stepTy;
  }

  const minX = Math.min(from.x, to.x) + hitbox.ox;
  const maxX = Math.max(from.x, to.x) + hitbox.ox + hitbox.w - 1;
  const minY = Math.min(from.y, to.y) + hitbox.oy;
  const maxY = Math.max(from.y, to.y) + hitbox.oy + hitbox.h - 1;

  // This covers every tile touched by the motor hitbox throughout the sweep,
  // including the endpoint and any tile crossed between waypoints.
  for (let ty = Math.floor(minY / TILE); ty <= Math.floor(maxY / TILE); ty++) {
    for (let tx = Math.floor(minX / TILE); tx <= Math.floor(maxX / TILE); tx++) {
      if (!isRoadTile(w, tx, ty)) {
        return { valid: false, reason: `motor footprint touches non-road tile (${tx},${ty})` };
      }
    }
  }

  const swept: Rect = {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
  if (w.colliders.some((collider) => intersects(swept, collider))) {
    return { valid: false, reason: "motor footprint overlaps a collider" };
  }

  return { valid: true, reason: "ok" };
}

/** Validates every cyclic edge used by the existing waypoint interpolator. */
export function validateRoadRoute(
  w: World,
  route: RoadWaypoint[],
  hitbox: RoadHitbox,
): RoadRouteValidation {
  if (route.length < 2) {
    return { valid: false, invalidSegment: 0, reason: "route has fewer than two waypoints" };
  }
  for (let i = 0; i < route.length; i++) {
    const result = validateRoadSegment(w, route[i]!, route[(i + 1) % route.length]!, hitbox);
    if (!result.valid) return { valid: false, invalidSegment: i, reason: result.reason };
  }
  return { valid: true, invalidSegment: null, reason: "ok" };
}

/** Development-only regression checks for the road contract. */
export function assertRoadValidation(w: World) {
  const P = (tx: number, ty: number): RoadWaypoint => ({ x: tx * TILE, y: ty * TILE });
  const hitbox: RoadHitbox = { w: 10, h: 8, ox: 3, oy: 14 };
  const blockedWorld: World = {
    ...w,
    colliders: [...w.colliders, { x: 10 * TILE + 3, y: 58 * TILE + 14, w: 10, h: 8 }],
  };
  const checks: [string, boolean, RoadSegmentValidation][] = [
    [
      "valid horizontal road segment",
      true,
      validateRoadSegment(w, P(10, 58), P(20, 58), hitbox),
    ],
    ["valid vertical road segment", true, validateRoadSegment(w, P(77, 12), P(77, 25), hitbox)],
    ["invalid grass segment", false, validateRoadSegment(w, P(10, 56), P(20, 56), hitbox)],
    ["invalid diagonal segment", false, validateRoadSegment(w, P(10, 58), P(11, 59), hitbox)],
    [
      "segment intersecting building collider",
      false,
      validateRoadSegment(blockedWorld, P(10, 58), P(20, 58), hitbox),
    ],
  ];
  for (const [name, expected, result] of checks) {
    console.assert(
      result.valid === expected,
      `[JUST FARM] Road assertion failed: ${name} (${result.reason})`,
    );
  }
}

/** Development layout audit for authored roads, doors, bridges and actor starts. */
export function validateWorldLayout(w: World): string[] {
  const issues: string[] = [];
  const roadTiles: [number, number][] = [];
  const roadKey = (tx: number, ty: number) => `${tx},${ty}`;
  const roadSet = new Set<string>();
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (isRoadTile(w, tx, ty)) {
        roadTiles.push([tx, ty]);
        roadSet.add(roadKey(tx, ty));
      }
    }
  }
  const floodRoad = (start: [number, number]) => {
    const visited = new Set<string>();
    const queue: [number, number][] = [start];
    while (queue.length) {
      const [tx, ty] = queue.shift()!;
      const key = roadKey(tx, ty);
      if (visited.has(key) || !roadSet.has(key)) continue;
      visited.add(key);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) queue.push([tx + dx, ty + dy]);
    }
    return visited;
  };
  const roadStart = roadTiles[0];
  const connectedRoad = roadStart ? floodRoad(roadStart) : new Set<string>();
  const isolatedRoadTiles = roadTiles.filter(([tx, ty]) => !connectedRoad.has(roadKey(tx, ty)));
  if (!roadStart) issues.push("no road tiles authored");
  if (isolatedRoadTiles.length) issues.push(`${isolatedRoadTiles.length} road tiles are disconnected from the main graph`);

  // These are the authored road-side destinations, not a new route system.
  // They make accidental one-tile gaps in side streets visible in development.
  const criticalRoadTiles: [number, number][] = [
    [10, 58], [134, 58], [77, 12], [77, 105], [30, 71], [118, 71],
    [60, 24], [52, 33], [88, 33], [106, 45], [125, 67],
    [22, 73], [44, 73], [65, 73], [93, 73], [113, 73],
  ];
  for (const [tx, ty] of criticalRoadTiles) {
    if (!roadSet.has(roadKey(tx, ty))) issues.push(`critical destination is not road (${tx},${ty})`);
    else if (!connectedRoad.has(roadKey(tx, ty))) issues.push(`critical destination is disconnected (${tx},${ty})`);
  }
  const roadRect = (tx: number, ty: number): Rect => ({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE });
  const farmContains = (tx: number, ty: number, padding = 0) =>
    w.farms.some((farm) => tx >= farm.x - padding && tx < farm.x + farm.w + padding && ty >= farm.y - padding && ty < farm.y + farm.h + padding);
  for (const [tx, ty] of roadTiles) {
    const tile = roadRect(tx, ty);
    for (const b of w.buildings) {
      const body = w.colliders.find((c) => c.x === b.x && c.y >= b.y && c.x + c.w === b.x + b.w);
      if (body && intersects(tile, body)) issues.push(`building ${b.name} overlaps road tile (${tx},${ty})`);
    }
    for (const d of w.decor) {
      if (!d.solid) continue;
      const dx = Math.floor(d.x / TILE);
      const dy = Math.floor(d.y / TILE);
      if (dx === tx && dy === ty) issues.push(`${d.kind} blocks road tile (${tx},${ty})`);
    }
  }
  for (const d of w.decor) {
    const tx = Math.floor(d.x / TILE);
    const ty = Math.floor(d.y / TILE);
    if (d.kind === "lamp" && (farmContains(tx, ty) || w.ground[idx(tx, ty)] === T_DIRT)) {
      issues.push(`lamp is inside farmland/soil (${tx},${ty})`);
    }
    if (d.solid && w.ground[idx(tx, ty)] === T_WATER) issues.push(`${d.kind} is placed in water (${tx},${ty})`);
  }
  for (const b of w.buildings) {
    const body = w.colliders.find((c) => c.x === b.x && c.y >= b.y && c.x + c.w === b.x + b.w);
    if (body) {
      for (const farm of w.farms) {
        if (intersects(body, { x: farm.x * TILE, y: farm.y * TILE, w: farm.w * TILE, h: farm.h * TILE })) {
          issues.push(`building ${b.name} overlaps active farmland`);
          break;
        }
      }
    }
  }
  for (const b of w.buildings) {
    const doorTx = Math.floor(b.door.x / TILE);
    const doorTy = Math.floor(b.door.y / TILE);
    if (!isWalkableTile(w, doorTx, doorTy)) issues.push(`door for ${b.name} is not walkable (${doorTx},${doorTy})`);
  }
  for (let i = 0; i < w.npcSpawns.length; i++) {
    const spawn = w.npcSpawns[i]!;
    const tx = Math.floor(spawn.x / TILE);
    const ty = Math.floor(spawn.y / TILE);
    const actorBox = { x: spawn.x + 3, y: spawn.y + 14, w: 10, h: 8 };
    if (
      !isWalkableTile(w, tx, ty) ||
      isFarmBufferTile(w, tx, ty, 0) ||
      w.colliders.some((collider) => intersects(actorBox, collider))
    ) {
      issues.push(`NPC spawn ${i + 1} is blocked (${tx},${ty})`);
    }
  }
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (w.ground[idx(tx, ty)] !== T_BRIDGE) continue;
      // A bridge is authored as a short strip, so the water may be beside
      // the strip's edge rather than directly beside every individual tile.
      // Search a small local radius to validate the crossing without treating
      // the bridge's own replacement tiles as missing water.
      let touchesWater = false;
      for (let dy = -1; dy <= 1 && !touchesWater; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && w.ground[idx(nx, ny)] === T_WATER) {
            touchesWater = true;
            break;
          }
        }
      }
      if (!touchesWater) issues.push(`bridge tile (${tx},${ty}) does not touch water`);
    }
  }
  return issues;
}

export function buildWorld(): World {
  const rnd = mulberry32(20240607);
  const ground = new Uint8Array(MAP_W * MAP_H).fill(T_GRASS);
  const decor: Decor[] = [];
  const colliders: Rect[] = [];
  const buildings: Building[] = [];

  const fill = (x: number, y: number, w: number, h: number, t: number) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && j >= 0 && i < MAP_W && j < MAP_H) ground[idx(i, j)] = t;
  };

  /* East stream: a narrow, gently bending watercourse with a readable bank. */
  fill(136, 0, 12, MAP_H, T_SAND);
  for (let y = 0; y < MAP_H; y++) {
    const center = 142 + Math.round(Math.sin(y / 11) * 2 + Math.sin(y / 23));
    const width = y % 17 < 5 ? 5 : 6;
    fill(center - Math.floor(width / 2), y, width, 1, T_WATER);
  }
  /* Two small crossings: the established motor bridge plus a lower village bridge. */
  fill(138, 57, 10, 4, T_BRIDGE);
  fill(138, 70, 10, 4, T_BRIDGE);
  // Short landing paths make both crossings read as connected routes rather
  // than decorative planks that end at the far bank.
  fill(148, 57, 6, 4, T_PATH);
  fill(148, 70, 6, 4, T_PATH);

  /* Main village structure: central spine, civic cross-road, and farm loop. */
  fill(6, 57, 134, 4, T_PATH);
  fill(76, 8, 4, 104, T_PATH);
  fill(20, 24, 100, 3, T_PATH);
  fill(28, 70, 110, 3, T_PATH);
  /* Short side streets keep doors and farm gates reachable without clutter. */
  fill(60, 16, 3, 9, T_PATH);
  fill(56, 24, 3, 10, T_PATH);
  // Home door approach: wrap around the house footprint and join the side
  // street at row 33 instead of leaving a diagonal one-tile gap.
  fill(52, 33, 7, 5, T_PATH);
  fill(92, 24, 3, 10, T_PATH);
  // Seed shop door approach joins the vertical street beneath the building.
  fill(88, 33, 7, 5, T_PATH);
  fill(112, 24, 3, 22, T_PATH);
  // Pest shop door approach joins its side street at row 45.
  fill(106, 45, 9, 6, T_PATH);
  fill(118, 27, 3, 44, T_PATH);
  fill(130, 64, 3, 8, T_PATH);
  fill(124, 67, 3, 4, T_PATH);
  fill(138, 70, 1, 4, T_BRIDGE);
  /* Farm access lanes terminate at the authored central fence gates. */
  // These are the authored farm gate centers. They match the two skipped
  // fence posts below, so every field has a real opening from the lower road.
  for (const [gx, gy] of [[22, 70], [44, 70], [65, 70], [93, 70], [113, 70]] as const) {
    fill(gx, gy, 2, 6, T_PATH);
  }

  /* Farm regions */
  const farms: FarmRegion[] = [
    { name: "Ladang Jagung", x: 14, y: 76, w: 16, h: 12 },
    { name: "Ladang Tebu", x: 36, y: 76, w: 16, h: 12 },
    { name: "Sawah Padi", x: 58, y: 76, w: 14, h: 12 },
    { name: "Kebun Tomat", x: 86, y: 76, w: 14, h: 10 },
    { name: "Kebun Cabai", x: 106, y: 76, w: 14, h: 10 },
    { name: "Lahan Rumah", x: 62, y: 38, w: 10, h: 8 },
  ];
  for (const f of farms) {
    fill(f.x - 1, f.y - 1, f.w + 2, f.h + 2, T_DIRT);
    fill(f.x, f.y, f.w, f.h, T_FARM);
  }

  /* Buildings */
  const push = (b: Building) => {
    buildings.push(b);
    // solid body (leave the bottom 6px walkable so the door is reachable)
    colliders.push({ x: b.x, y: b.y + b.h * 0.35, w: b.w, h: b.h * 0.6 });
  };

  push({
    kind: "hall",
    name: "Balai Desa",
    x: 58 * TILE,
    y: 10 * TILE,
    w: 112,
    h: 88,
    door: { x: 58 * TILE + 56, y: 10 * TILE + 96 },
    action: "hall",
    wall: "#e0cfa8",
    roof: "#8c4c33",
    doorColor: "#6d4526",
    banner: "#c9a24a",
  });
  push({
    kind: "house",
    name: "Rumah Anda",
    x: 50 * TILE,
    y: 28 * TILE,
    w: 80,
    h: 72,
    door: { x: 50 * TILE + 40, y: 28 * TILE + 80 },
    action: "home",
    wall: "#d8b98a",
    roof: "#a8563f",
    doorColor: "#7a4b28",
  });
  push({
    kind: "seedshop",
    name: "Toko Benih",
    x: 86 * TILE,
    y: 28 * TILE,
    w: 88,
    h: 76,
    door: { x: 86 * TILE + 44, y: 28 * TILE + 84 },
    action: "seedshop",
    wall: "#cfe0b0",
    roof: "#3f7f57",
    doorColor: "#5d4326",
    banner: "#6fae5c",
  });
  push({
    kind: "pestshop",
    name: "Toko Pestisida",
    x: 104 * TILE,
    y: 40 * TILE,
    w: 84,
    h: 74,
    door: { x: 104 * TILE + 42, y: 40 * TILE + 82 },
    action: "pestshop",
    wall: "#c8cfe0",
    roof: "#415f96",
    doorColor: "#4f4632",
    banner: "#5b7fc4",
  });
  push({
    kind: "warehouse",
    name: "Gudang Pupuk",
    x: 122 * TILE,
    y: 62 * TILE,
    w: 100,
    h: 74,
    door: { x: 122 * TILE + 50, y: 62 * TILE + 82 },
    action: "warehouse",
    wall: "#bda27a",
    roof: "#6a5a44",
    doorColor: "#5d4326",
    banner: "#a8813f",
  });
  /**
   * Perumahan warga ditata rapi dalam dua deret yang menghadap jalan desa.
   * Setiap rumah punya jalan setapak yang menyambung ke jalan utama,
   * pagar halaman, dan petak kebun kecil yang diurus pemiliknya.
   */
  const npcHouses: { tx: number; ty: number; wall: string; roof: string; row: "north" | "mid" }[] = [
    { tx: 28, ty: 12, wall: "#d9c39a", roof: "#95533c", row: "north" },
    { tx: 40, ty: 12, wall: "#cdb894", roof: "#7d6a4a", row: "north" },
    { tx: 48, ty: 12, wall: "#dcc7a1", roof: "#9a6040", row: "north" },
    { tx: 88, ty: 12, wall: "#d3bd95", roof: "#8a5340", row: "north" },
    { tx: 100, ty: 12, wall: "#cfc0a0", roof: "#7f5b45", row: "north" },
    { tx: 28, ty: 62, wall: "#d6c1a0", roof: "#8f5b45", row: "mid" },
    { tx: 40, ty: 62, wall: "#cbb693", roof: "#7a5c46", row: "mid" },
    { tx: 90, ty: 62, wall: "#d9c39a", roof: "#8a5340", row: "mid" },
    { tx: 102, ty: 62, wall: "#cdb894", roof: "#95533c", row: "mid" },
  ];
  /** Petak kebun milik warga (pusat, dalam piksel dunia). */
  const gardens: { x: number; y: number }[] = [];

  npcHouses.forEach(({ tx, ty, wall, roof, row }, i) => {
    push({
      kind: "npc",
      name: `Rumah Warga ${i + 1}`,
      x: tx * TILE,
      y: ty * TILE,
      w: 64,
      h: 58,
      door: { x: tx * TILE + 32, y: ty * TILE + 66 },
      action: "none",
      wall,
      roof,
      doorColor: "#6b4728",
    });

    /* Jalan setapak dari pintu rumah ke jalan desa terdekat */
    const cx = tx + 1;
    if (row === "north") {
      fill(cx, ty + 4, 2, 24 - (ty + 4), T_PATH); // turun ke jalan y=24
    } else {
      // The house body occupies the direct centerline. Route around its
      // sides, then meet the front-door path below the footprint.
      fill(tx - 1, 60, 1, 7, T_PATH);
      fill(tx + 4, 60, 1, 7, T_PATH);
      fill(tx - 1, 66, 6, 1, T_PATH);
      fill(cx, ty + 4, 2, 70 - (ty + 4), T_PATH); // turun ke jalan y=70
    }
    /* Trotoar kecil di depan rumah supaya deretannya terasa tertata */
    fill(tx - 1, ty + 4, 6, 1, T_PATH);

    /* Kebun kecil di samping rumah */
    const gx = tx + 5;
    const gy = ty + 1;
    fill(gx - 1, gy - 1, 6, 5, T_DIRT);
    for (let i2 = -1; i2 <= 4; i2++) {
      decor.push({ kind: "fenceH", x: (gx + i2) * TILE, y: (gy - 2) * TILE, variant: 0, solid: false });
      decor.push({ kind: "fenceH", x: (gx + i2) * TILE, y: (gy + 3) * TILE, variant: 0, solid: false });
    }
    gardens.push({ x: (gx + 1.5) * TILE, y: (gy + 1) * TILE });

    /* Pagar halaman depan (dekoratif, tidak menghalangi) */
    for (let i2 = -1; i2 <= 4; i2++) {
      if (i2 === 0 || i2 === 1) continue;
      decor.push({ kind: "fenceH", x: (tx + i2) * TILE, y: (ty + 4) * TILE + 6, variant: 0, solid: false });
    }
  });


  /* Village gate at the north entrance */
  const gate = { x: 74 * TILE, y: 6 * TILE };
  colliders.push({ x: gate.x, y: gate.y + 40, w: 20, h: 22 });
  colliders.push({ x: gate.x + 76, y: gate.y + 40, w: 20, h: 22 });

  /* Fences around every farm region */
  for (const f of farms) {
    for (let i = -1; i <= f.w; i++) {
      if (i === Math.floor(f.w / 2) || i === Math.floor(f.w / 2) + 1) continue;
      decor.push({ kind: "fenceH", x: (f.x + i) * TILE, y: (f.y - 2) * TILE, variant: 0, solid: true });
      decor.push({ kind: "fenceH", x: (f.x + i) * TILE, y: (f.y + f.h) * TILE, variant: 0, solid: true });
    }
    for (let j = 0; j < f.h; j++) {
      decor.push({ kind: "fenceV", x: (f.x - 2) * TILE, y: (f.y + j) * TILE, variant: 0, solid: true });
      decor.push({ kind: "fenceV", x: (f.x + f.w + 1) * TILE, y: (f.y + j) * TILE, variant: 0, solid: true });
    }
    decor.push({ kind: "sign", x: (f.x + Math.floor(f.w / 2)) * TILE - 24, y: (f.y - 3) * TILE, variant: 0, solid: true });
  }

  /* Authored woodland clusters plus restrained scatter. Roads and farm gates
     are already marked occupied, so props never land on critical routes. */
  const occupied = (x: number, y: number) => {
    const t = ground[idx(Math.floor(x / TILE), Math.floor(y / TILE))];
    if (t === T_PATH || t === T_WATER || t === T_BRIDGE || t === T_FARM || t === T_DIRT) return true;
    for (const c of colliders)
      if (x > c.x - 40 && x < c.x + c.w + 40 && y > c.y - 60 && y < c.y + c.h + 40) return true;
    return false;
  };

  // Decorative sprites have a larger visual footprint than their placement
  // point. Keep their actual solid base off authored roads as well, so a prop
  // cannot silently become an invisible navigation blocker.
  const blocksRoad = (rect: Rect) => {
    const minTx = Math.floor(rect.x / TILE) - 1;
    const maxTx = Math.floor((rect.x + rect.w - 1) / TILE) + 1;
    const minTy = Math.floor(rect.y / TILE) - 1;
    const maxTy = Math.floor((rect.y + rect.h - 1) / TILE) + 1;
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const terrain = tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H ? ground[idx(tx, ty)] : -1;
        if ((terrain === T_PATH || terrain === T_BRIDGE) && intersects(rect, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE })) {
          return true;
        }
      }
    }
    return false;
  };

  const wFarmsContain = (tx: number, ty: number) =>
    farms.some((farm) => tx >= farm.x - 1 && tx < farm.x + farm.w + 1 && ty >= farm.y - 1 && ty < farm.y + farm.h + 1);

  const lampTileIsClear = (tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    const terrain = ground[idx(tx, ty)];
    if (terrain === T_PATH || terrain === T_BRIDGE || terrain === T_WATER || terrain === T_FARM || terrain === T_DIRT) return false;
    if (wFarmsContain(tx, ty)) return false;
    const base = { x: tx * TILE + 5, y: ty * TILE + 34, w: 5, h: 4 };
    if (colliders.some((collider) => intersects(base, collider))) return false;
    return !decor.some((d) => d.kind === "lamp" && Math.floor(d.x / TILE) === tx && Math.floor(d.y / TILE) === ty);
  };

  const placeLampBesideRoad = (roadTx: number, roadTy: number, axis: "horizontal" | "vertical") => {
    const candidates =
      axis === "horizontal"
        ? [[roadTx, roadTy - 3], [roadTx, roadTy + 4], [roadTx - 2, roadTy - 3], [roadTx + 2, roadTy + 4]]
        : [[roadTx - 3, roadTy], [roadTx + 4, roadTy], [roadTx - 3, roadTy - 2], [roadTx + 4, roadTy + 2]];
    const candidate = candidates.find(([tx, ty]) => lampTileIsClear(tx!, ty!));
    if (!candidate) return;
    decor.push({ kind: "lamp", x: candidate[0]! * TILE, y: candidate[1]! * TILE, variant: 0, solid: false });
  };

  const plantTree = (x: number, y: number) => {
    if (x < 0 || y < 0 || x > MAP_W * TILE - 40 || y > MAP_H * TILE - 52) return;
    if (occupied(x + 20, y + 40)) return;
    if (blocksRoad({ x: x + 14, y: y + 38, w: 12, h: 10 })) return;
    decor.push({ kind: "tree", x, y, variant: Math.floor(rnd() * 3), solid: true });
    colliders.push({ x: x + 14, y: y + 38, w: 12, h: 10 });
  };

  for (let i = 0; i < 100; i++) {
    plantTree(4 * TILE + rnd() * 26 * TILE, 90 * TILE + rnd() * 25 * TILE);
  }
  for (let i = 0; i < 55; i++) {
    plantTree(2 * TILE + rnd() * 24 * TILE, 4 * TILE + rnd() * 30 * TILE);
    plantTree(126 * TILE + rnd() * 8 * TILE, 4 * TILE + rnd() * 105 * TILE);
  }
  for (let i = 0; i < 42; i++) {
    plantTree(132 * TILE + rnd() * 10 * TILE, 2 * TILE + rnd() * 112 * TILE);
  }
  // tree line along the map border
  for (let x = 0; x < MAP_W * TILE; x += 44) {
    plantTree(x, 8);
    plantTree(x, (MAP_H - 4) * TILE);
  }
  for (let y = 0; y < MAP_H * TILE; y += 46) {
    plantTree(8, y);
  }

  /* Bushes, flowers, rocks */
  for (let i = 0; i < 210; i++) {
    const x = rnd() * (MAP_W - 2) * TILE;
    const y = rnd() * (MAP_H - 2) * TILE;
    if (occupied(x + 8, y + 12)) continue;
    const r = rnd();
    if (r < 0.34) {
      decor.push({ kind: "bush", x, y, variant: Math.floor(rnd() * 4), solid: false });
    } else if (r < 0.9) {
      decor.push({ kind: "flower", x, y, variant: Math.floor(rnd() * 5), solid: false });
    } else {
      decor.push({ kind: "rock", x, y, variant: 0, solid: false });
    }
  }

  /* Lush pass — rumput liar, kelapa, pisang, jerami, teratai */

  // wild grass tufts everywhere the ground is plain grass
  for (let i = 0; i < 920; i++) {
    const x = rnd() * (MAP_W - 2) * TILE;
    const y = rnd() * (MAP_H - 2) * TILE;
    if (occupied(x + 8, y + 12)) continue;
    decor.push({ kind: "tallgrass", x, y, variant: Math.floor(rnd() * 4), solid: false });
  }

  // extra flowers so the village reads warm and colourful
  for (let i = 0; i < 180; i++) {
    const x = rnd() * (MAP_W - 2) * TILE;
    const y = rnd() * (MAP_H - 2) * TILE;
    if (occupied(x + 5, y + 10)) continue;
    decor.push({ kind: "flower", x, y, variant: Math.floor(rnd() * 5), solid: false });
  }

  // Coconut palms line the stream banks; keep the main roads visually open.
  const plantProp = (kind: DecorKind, x: number, y: number, variant: number, cw: number, ch: number) => {
    if (x < 0 || y < 0 || x > (MAP_W - 3) * TILE || y > (MAP_H - 3) * TILE) return;
    if (occupied(x + cw / 2, y + ch)) return;
    const base = { x: x + cw / 2 - 5, y: y + ch - 6, w: 10, h: 8 };
    if (blocksRoad(base)) return;
    decor.push({ kind, x, y, variant, solid: true });
    colliders.push(base);
  };
  for (let y = 4; y < MAP_H - 6; y += 5) {
    plantProp("palm", 130 * TILE + rnd() * 8, y * TILE, Math.floor(rnd() * 2), 46, 72);
    plantProp("palm", 148 * TILE + rnd() * 8, y * TILE, Math.floor(rnd() * 2), 46, 72);
  }
  for (let i = 0; i < 20; i++) {
    plantProp("palm", 128 * TILE + rnd() * 24 * TILE, 8 * TILE + rnd() * 100 * TILE, Math.floor(rnd() * 2), 46, 72);
  }

  const plantCluster = (kind: DecorKind, cx: number, cy: number, count: number, radius: number) => {
    for (let i = 0; i < count; i++) {
      const x = cx * TILE + (rnd() - 0.5) * radius * TILE;
      const y = cy * TILE + (rnd() - 0.5) * radius * TILE;
      if (occupied(x + 8, y + 12)) continue;
      decor.push({ kind, x, y, variant: Math.floor(rnd() * (kind === "flower" ? 5 : 4)), solid: false });
    }
  };
  // Small authored clearings make the village feel composed instead of uniformly seeded.
  plantCluster("bush", 14, 18, 12, 10);
  plantCluster("flower", 18, 20, 18, 12);
  plantCluster("bush", 132, 34, 10, 8);
  plantCluster("flower", 132, 48, 16, 10);
  plantCluster("bush", 130, 84, 14, 12);
  plantCluster("flower", 126, 92, 20, 14);
  plantCluster("flower", 34, 34, 12, 10);
  plantCluster("flower", 78, 42, 14, 8);

  // banana clumps hugging the houses
  for (const b of buildings) {
    for (let i = 0; i < 3; i++) {
      plantProp("banana", b.x - 40 + i * 8 + rnd() * 10, b.y + b.h - 10 + rnd() * 20, i % 2, 38, 48);
      plantProp("banana", b.x + b.w + 8 + rnd() * 18, b.y + b.h - 14 + rnd() * 24, (i + 1) % 2, 38, 48);
    }
  }

  // haystacks resting beside every field
  for (const f of farms) {
    decor.push({ kind: "haystack", x: (f.x - 4) * TILE, y: (f.y + 1) * TILE, variant: 0, solid: true });
    colliders.push({ x: (f.x - 4) * TILE + 3, y: (f.y + 1) * TILE + 10, w: 20, h: 10 });
    decor.push({ kind: "haystack", x: (f.x + f.w + 2) * TILE, y: (f.y + f.h - 3) * TILE, variant: 0, solid: true });
    colliders.push({ x: (f.x + f.w + 2) * TILE + 3, y: (f.y + f.h - 3) * TILE + 10, w: 20, h: 10 });
  }

  // lily pads drifting on the river
  for (let i = 0; i < 90; i++) {
    const tx = 138 + Math.floor(rnd() * 10);
    const ty = Math.floor(rnd() * MAP_H);
    if (ground[idx(tx, ty)] !== T_WATER) continue;
    decor.push({ kind: "lily", x: tx * TILE + rnd() * 4, y: ty * TILE + rnd() * 4, variant: Math.floor(rnd() * 2), solid: false });
  }

  /* Lamp posts are placed from road-edge candidates, never by raw coordinates. */
  for (let x = 12; x < 136; x += 12) placeLampBesideRoad(x, 58, "horizontal");
  for (let y = 14; y < 108; y += 12) {
    if (y > 54 && y < 62) continue;
    placeLampBesideRoad(77, y, "vertical");
  }

  /* Roadside fences framing the main street */
  for (let x = 10; x < 70; x += 1) {
    if (x % 2) continue;
    decor.push({ kind: "fenceH", x: x * TILE, y: 55 * TILE - 6, variant: 0, solid: false });
  }
  for (let x = 84; x < 132; x += 2) {
    decor.push({ kind: "fenceH", x: x * TILE, y: 62 * TILE, variant: 0, solid: false });
  }

  const npcSpawns = [
    { x: 62 * TILE, y: 20 * TILE, r: 90 }, // chief near civic center
    { x: 10 * TILE, y: 84 * TILE, r: 160 }, // old farmer beside the corn fields
    { x: 54 * TILE, y: 84 * TILE, r: 160 }, // young farmer beside the cane fields
    { x: 92 * TILE, y: 38 * TILE, r: 60 }, // seed seller
    { x: 110 * TILE, y: 50 * TILE, r: 60 }, // pesticide seller
    { x: 66 * TILE, y: 56 * TILE, r: 110 }, // agriculture expert
    { x: 30 * TILE, y: 20 * TILE, r: 160 }, // villager
    { x: 92 * TILE, y: 20 * TILE, r: 160 }, // villager
    { x: 108 * TILE, y: 68 * TILE, r: 150 }, // villager
  ];

  return { ground, decor, buildings, colliders, farms, npcSpawns, gardens, gate };
}

export function tileAt(w: World, px: number, py: number): number {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return T_WATER;
  return w.ground[y * MAP_W + x] ?? T_GRASS;
}
