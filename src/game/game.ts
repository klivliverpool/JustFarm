/**
 * JUST FARM — game engine.
 * Fixed-timestep simulation + canvas renderer at 60 FPS, with a snapshot
 * published to React for the pixel UI layer.
 */
import {
  CROPS,
  CROP_IDS,
  PESTS,
  PEST_IDS,
  PEST_QUESTIONS,
  PESTICIDES,
  QUESTS,
  MANAGEMENT_OPTIONS,
  MANAGEMENT_CORRECT_INDEX,
  MANAGEMENT_EXPLANATIONS,
  WIN_COINS,
  WIN_TARGETS,
  type CropId,
  type PestId,
  type PestQuestion,
  type PesticideId,
  type QuestId,
  type Weather,
  type Phase,
} from "./data";
import { AudioEngine } from "./audio";
import {
  TILE,
  animalSprite,
  bananaTree,
  building,
  bridgeTile,
  bush,
  character,
  cropSprite,
  dirtTile,
  fence,
  flower,
  grassTile,
  haystack,
  lampPost,
  lilyPad,
  motorbike,
  palmTree,
  pathTile,
  pestSprite,
  planksTile,
  rock,
  sandTile,
  signPost,
  soilTile,
  tallGrass,
  tree,
  villageGate,
  waterTile,
  PLAYER_STYLE,
  type AnimalDir,
  type AnimalId,
  type CharStyle,
  type Dir,
} from "./sprites";
import {
  MAP_H,
  MAP_W,
  T_BRIDGE,
  T_DIRT,
  T_FARM,
  T_PATH,
  T_SAND,
  T_WATER,
  buildWorld,
  assertRoadValidation,
  validateWorldLayout,
  isFarmBufferTile,
  isWalkableTile,
  validateRoadRoute,
  tileAt,
  type RoadWaypoint,
  type World,
  type BuildingKind,
} from "./world";

export const ZOOM = 3;
export const VIEW_W = 1920;
export const VIEW_H = 1080;

export type Tab = "seeds" | "harvest" | "pesticides" | "tools" | "items" | "quest";
export type ToolId = "hoe" | "can" | "sprayer" | "sickle" | "hand";
export type ContextAction = "interact" | "water" | "harvest" | "spray" | null;

export interface Stack {
  type: Tab;
  id: string;
  name: string;
  count: number;
}

export interface Plot {
  tx: number;
  ty: number;
  tilled: boolean;
  water: number;
  crop: {
    id: CropId;
    growth: number;
    health: number;
    pest: PestId | null;
    pestTime: number;
    dead: boolean;
  } | null;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  style: CharStyle;
  x: number;
  y: number;
  hx: number;
  hy: number;
  radius: number;
  dir: Dir;
  frame: number;
  animT: number;
  vx: number;
  vy: number;
  waitT: number;
  lines: string[];
  /** Petak kebun milik warga; mereka rutin pulang mengurusnya. */
  garden: { x: number; y: number } | null;
  /** Kegiatan saat ini: berjalan santai, menuju kebun, atau mencangkul. */
  activity: "wander" | "toGarden" | "tend";
  activityT: number;
  hoeT: number;
}

export type OverlayKind =
  | "none"
  | "pause"
  | "inventory"
  | "shop"
  | "dialogue"
  | "diagnosis"
  | "encyclopedia"
  | "quests"
  | "gameover"
  | "win"
  | "sleep"
  | "title"
  | "map";

export interface ShopEntry {
  key: string;
  name: string;
  desc: string;
  price: number;
  icon: string;
  kind: "buy" | "sell";
}

export interface Snapshot {
  money: number;
  xp: number;
  level: number;
  day: number;
  clock: string;
  phase: Phase;
  weather: Weather;
  tool: ToolId;
  canWater: number;
  health: number;
  prompt: string | null;
  contextAction: ContextAction;
  overlay: OverlayKind;
  inventory: Record<Tab, (Stack | null)[]>;
  selectedSeed: CropId | null;
  selectedPesticide: PesticideId | null;
  quest: { id: QuestId; title: string; desc: string; progress: number; target: number } | null;
  questsDone: QuestId[];
  dialogue: { name: string; role: string; line: string; index: number; total: number } | null;
  shop: { title: string; entries: ShopEntry[] } | null;
  diagnosis: {
    stage: "diagnose" | "question" | "management" | "done";
    cropName: string;
    symptoms: string[];
    options: PestId[];
    revealed: PestId | null;
    correct: boolean | null;
    explain: string;
    question: { category: string; text: string; options: string[] } | null;
    questionAnswered: number | null;
    questionCorrect: boolean | null;
    questionExplain: string;
    managementOptions: string[];
    managementChoiceIndex: number | null;
    managementCorrect: boolean | null;
    managementExplain: string;
    reward: number | null;
  } | null;
  discovered: PestId[];
  harvested: Record<CropId, number>;
  totalHarvest: number;
  toasts: { id: number; text: string; tone: "good" | "bad" | "info" }[];
  muted: boolean;
  questMarker: { x: number; y: number } | null;
}

const NPC_DEFS: {
  id: string;
  name: string;
  role: string;
  style: CharStyle;
  lines: string[];
}[] = [
  {
    id: "chief",
    name: "Pak Warno",
    role: "Kepala Desa",
    style: { key: "chief", skin: "#c98f61", hair: "#4a4a4a", shirt: "#7c5aa8", pants: "#3a3a48", hat: "peci" },
    lines: [
      "Selamat datang di Bandungrejo! Selamat datang, petani muda.",
      "Ladang kami sudah tiga musim terserang hama.",
      "Pelajari setiap hama, obati dengan benar, dan desa kita akan pulih.",
      "Mulai gampang saja: beli benih di Toko Benih, lalu olah tanah dan tanam.",
    ],
  },
  {
    id: "oldfarmer",
    name: "Mbah Karto",
    role: "Petani Tua",
    style: { key: "old", skin: "#bd8354", hair: "#d8d8d8", shirt: "#8a7b4f", pants: "#4b4230", hat: "straw" },
    lines: [
      "Enam puluh kali panen sudah kulihat di lembah ini.",
      "Uret — ulat tanah — bersembunyi di dalam tanah dan memakan akar tebuku.",
      "Tidak bisa disemprot di daun. Itu butuh insektisida tanah.",
      "Siram pagi hari, Nak. Siram siang cuma menguap.",
    ],
  },
  {
    id: "youngfarmer",
    name: "Mas Bagus",
    role: "Petani Muda",
    style: { key: "young", skin: "#d69a68", hair: "#231a14", shirt: "#3f8f5a", pants: "#39485e", hat: "cap", accent: "#c94b3c" },
    lines: [
      "Hai! Kamu yang mengambil alih lahan dekat sungai, kan?",
      "Hati-hati dengan ulat grayak — ulat ini habisi daun jagung semalam.",
      "Aku pakai pestisida hayati. Membunuh ulat tapi aman untuk lebah.",
      "Tahan SHIFT untuk lari. Ladang luas dan hari pendek!",
    ],
  },
  {
    id: "seedseller",
    name: "Bu Sri",
    role: "Penjual Benih",
    style: { key: "seed", skin: "#e0a878", hair: "#3a2a1e", shirt: "#d9846f", pants: "#5a4230" },
    lines: [
      "Benih bersertifikat segar, langsung dari koperasi!",
      "Jagung cepat panen. Tebu lama tapi paling menguntungkan.",
      "Tekan E di pintu tokoku untuk membuka katalog.",
    ],
  },
  {
    id: "pestseller",
    name: "Pak Adi",
    role: "Penjual Pestisida",
    style: { key: "pest", skin: "#c78e5f", hair: "#2a2018", shirt: "#4e6fae", pants: "#33405a", hat: "cap", accent: "#2f4a7a" },
    lines: [
      "Empat botol, empat pekerjaan berbeda. Jangan sembarangan semprot.",
      "Insektisida tanah untuk hama akar. Sistemik untuk pengisap cairan.",
      "Hayati untuk ulat. Semprotan kontak umum untuk pengunyah seperti belalang.",
      "Semprot salah buang uang dan bikin tanaman stres. Diagnosis dulu!",
    ],
  },
  {
    id: "expert",
    name: "Bu Ratna",
    role: "Ahli Pertanian",
    style: { key: "expert", skin: "#e6b489", hair: "#20242e", shirt: "#f0f2f5", pants: "#3d4652" },
    lines: [
      "Saya petugas penyuluh pertanian kecamatan Bantur.",
      "Setiap tanaman sakit menunjukkan gejala: warna, bentuk, lubang, serangga.",
      "Baca gejalanya, sebut namanya, lalu pilih pestisida yang sesuai.",
      "Setelah diagnosis benar, jawab juga pertanyaan lanjutannya sebelum mengobati — supaya kamu paham alasannya, bukan cuma menebak.",
      "Buka Ensiklopedia (K) — setiap hama yang kamu pelajari tuntas tercatat di sana.",
    ],
  },
  {
    id: "villager1",
    name: "Ibu Yanti",
    role: "Warga",
    style: { key: "v1", skin: "#d7a074", hair: "#2c2118", shirt: "#c9739b", pants: "#4a3d55" },
    lines: ["Hujan semalam siram semuanya untukku. Gratis!", "Jual panenmu di Balai Desa, di situ koperasi yang beli."],
  },
  {
    id: "villager2",
    name: "Pak Slamet",
    role: "Warga",
    style: { key: "v2", skin: "#b97f52", hair: "#4b3a2a", shirt: "#6f9a48", pants: "#3f4a38", hat: "straw" },
    lines: ["Belalang datang berkelompok musim kemarau lalu. Kita kehilangan setengah padi.", "Bebek memakannya, tahu kan. Lebih murah dari botol apa pun."],
  },
  {
    id: "villager3",
    name: "Dik Ayu",
    role: "Warga",
    style: { key: "v3", skin: "#e3b189", hair: "#191510", shirt: "#e6c95e", pants: "#5b4a6e" },
    lines: ["Aku ingin jadi ahli pertanian seperti Bu Ratna suatu hari!", "Tahu tidak, cabai juga kena kutu kebul? Bukan cuma tomat."],
  },
];

const TOOL_ORDER: ToolId[] = ["hoe", "hand", "can", "sprayer", "sickle"];
const TOOL_NAMES: Record<ToolId, string> = {
  hoe: "Cangkul",
  hand: "Kantong Benih",
  can: "Kaleng Siram",
  sprayer: "Semprotan",
  sickle: "Sabit",
};

const SAVE_KEY = "justfarm.save.v1";
const SAVE_SCHEMA_VERSION = 2;
const LEGACY_GROWTH_UNIT_SCALE = 16;
const MOTOR_HITBOX = { w: 10, h: 8, ox: 3, oy: 14 };
const GAME_DAY_MINUTES = 24 * 60;
const GAME_DAY_START_MINUTES = 6 * 60;
const GAME_MINUTES_PER_REAL_SECOND = GAME_DAY_MINUTES / 90;
const MAX_FRAME_DELTA_SECONDS = 1;
const MAX_FIXED_STEPS_PER_FRAME = 15;
const RAIN_WATER_RECOVERY_PER_GAME_MINUTE = 0.375;
const CROP_DRY_HEALTH_LOSS_PER_GAME_MINUTE = 0.2;
const CROP_PEST_HEALTH_LOSS_PER_GAME_MINUTE = 0.15;
const CROP_HEALTH_RECOVERY_PER_GAME_MINUTE = 0.075;
const PEST_CHECK_INTERVAL_GAME_MINUTES = 96;
const RAIN_PEST_CHANCE_MULTIPLIER = 1.35;
const emptySlots = (n: number) => Array.from({ length: n }, () => null as Stack | null);
const TAB_IDS: Tab[] = ["seeds", "harvest", "pesticides", "tools", "items", "quest"];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clampNumber = (value: unknown, min: number, max: number, fallback: number) =>
  isFiniteNumber(value) ? Math.max(min, Math.min(max, value)) : fallback;
const isCropId = (value: unknown): value is CropId => typeof value === "string" && CROP_IDS.includes(value as CropId);
const isPestId = (value: unknown): value is PestId => typeof value === "string" && PEST_IDS.includes(value as PestId);
const isPesticideId = (value: unknown): value is PesticideId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(PESTICIDES, value);
const isQuestId = (value: unknown): value is QuestId =>
  typeof value === "string" && QUESTS.some((quest) => quest.id === value);
const isDir = (value: unknown): value is Dir => value === "up" || value === "down" || value === "left" || value === "right";
const isToolId = (value: unknown): value is ToolId => TOOL_ORDER.includes(value as ToolId);

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  world: World;
  audio = new AudioEngine();
  onChange: (s: Snapshot) => void = () => {};

  /**
   * Logical render viewport. Desktop keeps the authored 1920x1080 surface;
   * the route may provide an aspect-matched mobile surface at runtime.
   */
  private viewportWidth = VIEW_W;
  private viewportHeight = VIEW_H;

  /* --- simulation state --- */
  player = { x: 76 * TILE, y: 50 * TILE, dir: "down" as Dir, frame: 0, animT: 0, moving: false, running: false };
  cam = { x: 0, y: 0 };
  money = 500;
  xp = 0;
  health = 100;
  day = 1;
  minutes = 6 * 60;
  weather: Weather = "sunny";
  canWater = 100;
  tool: ToolId = "hoe";
  plots = new Map<string, Plot>();
  npcs: NPC[] = [];
  discovered = new Set<PestId>();
  harvested: Record<CropId, number> = { corn: 0, sugarcane: 0, rice: 0, tomato: 0, chili: 0 };
  questIndex = 0;
  questProgress = 0;
  questsDone: QuestId[] = [];
  waterCount = 0;
  selectedSeed: CropId | null = null;
  selectedPesticide: PesticideId | null = null;
  overlay: OverlayKind = "title";
  running = false;

  inventory: Record<Tab, (Stack | null)[]> = {
    seeds: emptySlots(12),
    harvest: emptySlots(12),
    pesticides: emptySlots(12),
    tools: emptySlots(12),
    items: emptySlots(12),
    quest: emptySlots(12),
  };

  /* --- transient --- */
  private keys = new Set<string>();
  private raf = 0;
  private last = 0;
  private emitT = 0;
  private waterAnim = 0;
  private pestRollGameMinutes = 0;
  private saveT = 0;
  private prompt: string | null = null;
  private contextAction: ContextAction = null;
  private touchMove = { x: 0, y: 0 };
  private pendingAction: (() => void) | null = null;
  private dialogue: { npc: NPC; index: number } | null = null;
  private shop: { title: string; entries: ShopEntry[] } | null = null;
  private diagnosis: {
    stage: "diagnose" | "question" | "management" | "done";
    plot: Plot;
    pest: PestId;
    options: PestId[];
    revealed: PestId | null;
    correct: boolean | null;
    explain: string;
    question: PestQuestion | null;
    questionAnswered: number | null;
    questionCorrect: boolean | null;
    managementChoiceIndex: number | null;
    managementCorrect: boolean | null;
    reward: number | null;
  } | null = null;
  private lastQuestionByPest = new Map<PestId, string>();
  private toasts: { id: number; text: string; tone: "good" | "bad" | "info"; t: number }[] = [];
  private floaters: { x: number; y: number; text: string; t: number; color: string }[] = [];
  private rainDrops: { x: number; y: number; v: number }[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; t: number; color: string }[] = [];
  /** Ambient critters: kupu-kupu di siang hari, kunang-kunang di malam hari. */
  private critters: { x: number; y: number; a: number; sp: number; ph: number }[] = [];
  /**
   * Hewan ternak yang berkeliaran di sekitar rumah dan ladang. Murni dekoratif:
   * mereka tidak punya collider dan tidak pernah menghalangi pemain.
   */
  private animals: {
    id: AnimalId;
    hx: number;
    hy: number;
    r: number;
    x: number;
    y: number;
    dir: AnimalDir;
    frame: number;
    anim: number;
    tx: number;
    ty: number;
    wait: number;
    sp: number;
  }[] = [];
  /**
   * Warga yang berkendara motor menyusuri jalan desa. Mereka mengikuti
   * jalur waypoint di atas jalan, jadi tidak pernah menembus bangunan.
   */
  private riders: {
    style: CharStyle;
    path: RoadWaypoint[];
    seg: number;
    t: number;
    x: number;
    y: number;
    dir: Dir;
    sp: number;
    frame: number;
    anim: number;
    pauseT: number;
  }[] = [];
  private toastId = 1;


  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.world = buildWorld();
    if (import.meta.env.DEV) {
      assertRoadValidation(this.world);
      const layoutIssues = validateWorldLayout(this.world);
      console.info(`[JUST FARM] World validation: ${layoutIssues.length ? "FAIL" : "PASS"}`);
      for (const issue of layoutIssues) console.warn(`[JUST FARM] World layout: ${issue}`);
    }
    (window as unknown as { __justfarm_world: unknown }).__justfarm_world = this.world;
    this.initializeNewGameState("title");
    for (let i = 0; i < 260; i++) {
      this.rainDrops.push({ x: Math.random() * this.viewportWidth, y: Math.random() * this.viewportHeight, v: 900 + Math.random() * 700 });
    }
  }

  /**
   * Resize the logical canvas without changing world units, collision, or
   * movement. The caller supplies a logical pixel surface that is then
   * uniformly scaled by the route to the available browser viewport.
   */
  resizeViewport(width: number, height: number) {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (nextWidth === this.viewportWidth && nextHeight === this.viewportHeight) return;

    this.viewportWidth = nextWidth;
    this.viewportHeight = nextHeight;
    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    this.ctx.imageSmoothingEnabled = false;

    // Keep the camera valid when a narrower/taller mobile surface is applied.
    this.cam.x = Math.max(0, Math.min(MAP_W * TILE - this.viewportWidth / ZOOM, this.cam.x));
    this.cam.y = Math.max(0, Math.min(MAP_H * TILE - this.viewportHeight / ZOOM, this.cam.y));
    for (const drop of this.rainDrops) {
      drop.x = ((drop.x % this.viewportWidth) + this.viewportWidth) % this.viewportWidth;
      drop.y = ((drop.y % this.viewportHeight) + this.viewportHeight) % this.viewportHeight;
    }
  }

  /* ---------------- setup ---------------- */

  private spawnNPCs() {
    this.npcs = NPC_DEFS.map((d, i) => {
      const sp = this.world.npcSpawns[i] ?? { x: 76 * TILE, y: 60 * TILE, r: 80 };
      return {
        id: d.id,
        name: d.name,
        role: d.role,
        style: d.style,
        lines: d.lines,
        x: sp.x,
        y: sp.y,
        hx: sp.x,
        hy: sp.y,
        radius: sp.r,
        dir: "down" as Dir,
        frame: 0,
        animT: 0,
        vx: 0,
        vy: 0,
        waitT: Math.random() * 3,
        garden: this.world.gardens[i % Math.max(1, this.world.gardens.length)] ?? null,
        activity: "wander" as const,
        activityT: 6 + Math.random() * 14,
        hoeT: 0,
      };
    });
  }

  private giveStartingItems() {
    this.inventory.tools[0] = { type: "tools", id: "hoe", name: "Cangkul", count: 1 };
    this.inventory.tools[1] = { type: "tools", id: "hand", name: "Kantong Benih", count: 1 };
    this.inventory.tools[2] = { type: "tools", id: "can", name: "Kaleng Siram", count: 1 };
    this.inventory.tools[3] = { type: "tools", id: "sprayer", name: "Semprotan", count: 1 };
    this.inventory.tools[4] = { type: "tools", id: "sickle", name: "Sabit", count: 1 };
    this.addItem("seeds", "corn", CROPS.corn.name + " Benih", 3);
    this.addItem("items", "fertilizer", "Pupuk", 1);
    this.selectedSeed = "corn";
  }

  /** Single source of truth for a clean new-game runtime state. */
  private initializeNewGameState(overlay: OverlayKind) {
    this.money = 500;
    this.xp = 0;
    this.health = 100;
    this.day = 1;
    this.minutes = GAME_DAY_START_MINUTES;
    this.weather = "sunny";
    this.canWater = 100;
    this.tool = "hoe";
    this.plots.clear();
    this.discovered.clear();
    this.harvested = { corn: 0, sugarcane: 0, rice: 0, tomato: 0, chili: 0 };
    this.questIndex = 0;
    this.questProgress = 0;
    this.questsDone = [];
    this.waterCount = 0;
    this.selectedSeed = null;
    this.selectedPesticide = null;
    this.inventory = {
      seeds: emptySlots(12),
      harvest: emptySlots(12),
      pesticides: emptySlots(12),
      tools: emptySlots(12),
      items: emptySlots(12),
      quest: emptySlots(12),
    };
    this.player.x = 76 * TILE;
    this.player.y = 50 * TILE;
    this.player.dir = "down";
    this.player.frame = 0;
    this.player.animT = 0;
    this.player.moving = false;
    this.player.running = false;
    this.cam.x = 0;
    this.cam.y = 0;
    this.keys.clear();
    this.emitT = 0;
    this.waterAnim = 0;
    this.pestRollGameMinutes = 0;
    this.saveT = 0;
    this.prompt = null;
    this.contextAction = null;
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.pendingAction = null;
    this.dialogue = null;
    this.shop = null;
    this.diagnosis = null;
    this.lastQuestionByPest.clear();
    this.toasts = [];
    this.floaters = [];
    this.particles = [];
    this.critters = [];
    this.npcs = [];
    this.animals = [];
    this.riders = [];
    this.spawnNPCs();
    this.spawnAnimals();
    this.spawnRiders();
    this.giveStartingItems();
    this.audio.setRain(false);
    this.overlay = overlay;
  }

  /* ---------------- inventory ---------------- */

  addItem(tab: Tab, id: string, name: string, count = 1) {
    const slots = this.inventory[tab];
    for (const s of slots) {
      if (s && s.id === id) {
        s.count += count;
        return true;
      }
    }
    const free = slots.findIndex((s) => s === null);
    if (free < 0) {
      this.toast("Inventaris penuh!", "bad");
      return false;
    }
    slots[free] = { type: tab, id, name, count };
    return true;
  }

  countItem(tab: Tab, id: string) {
    return this.inventory[tab].reduce((n, s) => (s && s.id === id ? n + s.count : n), 0);
  }

  removeItem(tab: Tab, id: string, count = 1) {
    const slots = this.inventory[tab];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.id === id) {
        s.count -= count;
        if (s.count <= 0) slots[i] = null;
        return true;
      }
    }
    return false;
  }

  /** Drag & drop: swap two slots inside the same tab. */
  swapSlots(tab: Tab, a: number, b: number) {
    const slots = this.inventory[tab];
    if (a < 0 || b < 0 || a >= slots.length || b >= slots.length) return;
    const tmp = slots[a] ?? null;
    slots[a] = slots[b] ?? null;
    slots[b] = tmp;
    this.emit(true);
  }

  /* ---------------- lifecycle ---------------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      dt = Math.min(dt, MAX_FRAME_DELTA_SECONDS);
      // Bounded substepping: split each render frame into at most 15 steps.
      // The step size scales for slow frames, so elapsed simulation time is
      // preserved without an unrestricted catch-up loop or runaway backlog.
      const steps = Math.min(MAX_FIXED_STEPS_PER_FRAME, Math.max(1, Math.ceil(dt * 60)));
      const stepDt = dt / steps;
      for (let i = 0; i < steps; i++) this.update(stepDt);
      this.render();
      this.emitT += dt;
      if (this.emitT > 0.1) {
        this.emitT = 0;
        this.emit();
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.audio.dispose();
  }

  beginGame() {
    this.audio.init();
    this.overlay = "none";
    this.emit(true);
  }

  /* ---------------- input ---------------- */

  keyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(k)) e.preventDefault();
    if (this.keys.has(k)) return;
    this.keys.add(k);

    if (this.overlay === "title") {
      if (k === "enter" || k === " ") this.beginGame();
      return;
    }
    if (this.overlay === "dialogue") {
      if (k === "e" || k === " " || k === "enter") this.advanceDialogue();
      if (k === "escape") this.closeOverlay();
      return;
    }
    if (this.overlay !== "none") {
      if (k === "escape" || k === "tab" || (k === "e" && (this.overlay === "shop" || this.overlay === "map")) || (k === "m" && this.overlay === "map")) this.closeOverlay();
      return;
    }

    switch (k) {
      case "e":
        this.interact();
        break;
      case "f":
        this.spray();
        break;
      case "r":
        this.water();
        break;
      case " ":
        this.harvest();
        break;
      case "q":
        this.cycleTool();
        break;
      case "tab":
        this.setOverlay("inventory");
        break;
      case "escape":
        this.setOverlay("pause");
        break;
      case "j":
        this.setOverlay("quests");
        break;
      case "k":
        this.setOverlay("encyclopedia");
        break;
      case "m":
        this.toggleMap();
        break;
      case "n":
        this.toggleMute();
        break;
    }
  }

  toggleMap() {
    if (this.overlay === "map") this.closeOverlay();
    else if (this.overlay === "none") this.setOverlay("map");
  }

  keyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  blur() {
    this.keys.clear();
    this.setTouchMove(0, 0);
  }

  /** Mobile input feeds the same movement vector consumed by updatePlayer(). */
  setTouchMove(x: number, y: number) {
    const length = Math.hypot(x, y);
    if (!Number.isFinite(length) || length < 0.05) {
      this.touchMove.x = 0;
      this.touchMove.y = 0;
      return;
    }
    const scale = Math.min(1, 1 / length);
    this.touchMove.x = Math.max(-1, Math.min(1, x * scale));
    this.touchMove.y = Math.max(-1, Math.min(1, y * scale));
  }

  toggleMute() {
    this.audio.setMuted(!this.audio.muted);
    this.emit(true);
  }

  setOverlay(o: OverlayKind) {
    this.overlay = o;
    this.audio.click();
    this.emit(true);
  }

  closeOverlay() {
    if (this.overlay === "gameover" || this.overlay === "win") return;
    this.overlay = "none";
    this.dialogue = null;
    this.shop = null;
    this.diagnosis = null;
    this.audio.click();
    this.emit(true);
  }

  cycleTool() {
    const i = TOOL_ORDER.indexOf(this.tool);
    this.tool = TOOL_ORDER[(i + 1) % TOOL_ORDER.length] ?? "hoe";
    this.audio.click();
    this.toast(`Alat: ${TOOL_NAMES[this.tool]}`, "info");
    this.emit(true);
  }

  selectTool(t: ToolId) {
    this.tool = t;
    this.audio.click();
    this.emit(true);
  }

  selectSeed(id: CropId) {
    this.selectedSeed = id;
    this.tool = "hand";
    this.audio.click();
    this.emit(true);
  }

  selectPesticide(id: PesticideId) {
    this.selectedPesticide = id;
    this.tool = "sprayer";
    this.audio.click();
    this.emit(true);
  }

  /* ---------------- helpers ---------------- */

  toast(text: string, tone: "good" | "bad" | "info" = "info") {
    this.toasts.push({ id: this.toastId++, text, tone, t: 3.2 });
    if (this.toasts.length > 4) this.toasts.shift();
    this.emit(true);
  }

  private floater(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, t: 1.4, color });
  }

  addMoney(n: number, atPlayer = true) {
    this.money = Math.max(0, this.money + n);
    if (atPlayer) this.floater(this.player.x + 8, this.player.y - 6, `${n > 0 ? "+" : ""}${n}`, n >= 0 ? "#ffe07a" : "#ff8b7a");
    if (n > 0) this.audio.coin();
    if (this.money >= 1000) this.progressQuest("coins1000", this.money, true);
    this.checkWin();
  }

  addXP(n: number) {
    this.xp += n;
  }

  get level() {
    return 1 + Math.floor(this.xp / 100);
  }

  /** Current authoritative clock values used by simulation systems. */
  get gameMinutes() {
    return this.minutes;
  }

  get gameHours() {
    return this.minutes / 60;
  }

  get gameDays() {
    return this.day;
  }

  /** Total simulation minutes since the first day's 06:00 start. */
  get elapsedSimulationMinutes() {
    const sinceStart = (this.minutes - GAME_DAY_START_MINUTES + GAME_DAY_MINUTES) % GAME_DAY_MINUTES;
    return (this.day - 1) * GAME_DAY_MINUTES + sinceStart;
  }

  get phase(): Phase {
    const h = Math.floor(this.minutes / 60);
    if (h < 11) return "Pagi";
    if (h < 16) return "Siang";
    if (h < 19) return "Sore";
    return "Malam";
  }

  get clock() {
    const h = Math.floor(this.minutes / 60) % 24;
    const m = Math.floor(this.minutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  private plotKey(tx: number, ty: number) {
    return `${tx},${ty}`;
  }

  private facingTile() {
    const dx = this.player.dir === "left" ? -1 : this.player.dir === "right" ? 1 : 0;
    const dy = this.player.dir === "up" ? -1 : this.player.dir === "down" ? 1 : 0;
    const cx = this.player.x + 8 + dx * 14;
    const cy = this.player.y + 20 + dy * 14;
    return { tx: Math.floor(cx / TILE), ty: Math.floor(cy / TILE), cx, cy };
  }

  private plotInFront(): Plot | null {
    const { tx, ty } = this.facingTile();
    return this.plots.get(this.plotKey(tx, ty)) ?? null;
  }

  /* ---------------- quests ---------------- */

  get currentQuest() {
    return QUESTS[this.questIndex] ?? null;
  }

  computeQuestMarker(): { x: number; y: number } | null {
    const q = this.currentQuest;
    if (!q) return null;
    const find = (kind: BuildingKind) => this.world.buildings.find((b) => b.kind === kind);
    const findNPC = (id: string) => this.npcs.find((n) => n.id === id);
    switch (q.id) {
      case "chief":
        return findNPC("chief") ? { x: findNPC("chief")!.x, y: findNPC("chief")!.y } : null;
      case "buyseed":
        return find("seedshop") ? { x: find("seedshop")!.door.x, y: find("seedshop")!.door.y } : null;
      case "plantcorn":
      case "watercorn":
      case "harvestcorn": {
        const farm = this.world.farms.find((f) => f.name.includes("Jagung"));
        return farm ? { x: (farm.x + farm.w / 2) * TILE, y: (farm.y + farm.h / 2) * TILE } : null;
      }
      case "sellcorn":
        return find("hall") ? { x: find("hall")!.door.x, y: find("hall")!.door.y } : null;
      case "whitefly":
      case "grub": {
        for (const p of this.plots.values()) {
          if (p.crop?.pest) return { x: p.tx * TILE + 8, y: p.ty * TILE + 8 };
        }
        return null;
      }
      case "plantcane": {
        const farm = this.world.farms.find((f) => f.name.includes("Tebu"));
        return farm ? { x: (farm.x + farm.w / 2) * TILE, y: (farm.y + farm.h / 2) * TILE } : null;
      }
      case "coins1000":
      case "harvest20":
      case "restore":
        return { x: this.player.x, y: this.player.y };
      default:
        return null;
    }
  }

  progressQuest(id: QuestId, amount = 1, absolute = false) {
    const q = this.currentQuest;
    if (!q || q.id !== id) return;
    this.questProgress = absolute ? amount : this.questProgress + amount;
    if (this.questProgress >= q.target) {
      this.questsDone.push(q.id);
      this.money += q.reward;
      this.addXP(q.xp);
      this.audio.success();
      this.toast(`Misi selesai: ${q.title} (+${q.reward}c)`, "good");
      this.questIndex++;
      this.questProgress = 0;
      if (this.questIndex >= QUESTS.length) this.triggerWin();
    }
    this.emit(true);
  }

  private checkWin() {
    const q = this.currentQuest;
    if (!q || q.id !== "restore") return;
    const cropsOk = CROP_IDS.every((c) => (this.harvested[c] ?? 0) >= WIN_TARGETS[c]);
    if (cropsOk && this.money >= WIN_COINS) this.progressQuest("restore", 1);
  }

  private triggerWin() {
    this.overlay = "win";
    this.audio.fanfare();
    this.save();
    this.emit(true);
  }

  private checkGameOver() {
    const noSeeds = CROP_IDS.every((c) => this.countItem("seeds", c) === 0);
    const noProduce = CROP_IDS.every((c) => this.countItem("harvest", c) === 0);
    let alive = 0;
    for (const p of this.plots.values()) if (p.crop && !p.crop.dead) alive++;
    if (this.money <= 0 && noSeeds && noProduce && alive === 0) {
      this.overlay = "gameover";
      this.emit(true);
    }
  }

  /* ---------------- actions ---------------- */

  interact() {
    // 1. NPC in range
    const npc = this.nearestNPC(46);
    if (npc) {
      this.dialogue = { npc, index: 0 };
      this.overlay = "dialogue";
      npc.dir = this.player.y < npc.y ? "up" : "down";
      this.audio.click();
      if (npc.id === "chief") this.progressQuest("chief");
      this.emit(true);
      return;
    }
    // 2. Building door in range
    const b = this.nearestBuilding(52);
    if (b) {
      if (b.action === "seedshop") this.openSeedShop();
      else if (b.action === "pestshop") this.openPesticideShop();
      else if (b.action === "warehouse") this.openWarehouse();
      else if (b.action === "hall") this.openSellShop();
      else if (b.action === "home") this.sleep();
      else this.toast(`${b.name} — pintunya terkunci.`, "info");
      return;
    }
    // 3. Crop / soil in front
    const { tx, ty, cx, cy } = this.facingTile();
    const key = this.plotKey(tx, ty);
    const plot = this.plots.get(key);
    if (plot?.crop?.pest) {
      this.openDiagnosis(plot);
      return;
    }
    if (plot?.crop && !plot.crop.dead) {
      const c = plot.crop;
      const st = this.stageOf(c);
      this.toast(
        `${CROPS[c.id].name} (${CROPS[c.id].nameId}) — tahap ${st + 1}/6, air ${Math.round(plot.water)}%, sehat ${Math.round(c.health)}%`,
        "info",
      );
      return;
    }
    if (plot?.crop?.dead) {
      plot.crop = null;
      this.toast("Tanaman mati dibersihkan.", "info");
      this.audio.till();
      return;
    }
    if (tileAt(this.world, cx, cy) === T_FARM) {
      if (!plot) {
        if (this.tool !== "hoe") {
          this.toast("Tekan Q untuk pilih Cangkul, lalu E untuk mengolah tanah.", "info");
          return;
        }
        this.plots.set(key, { tx, ty, tilled: true, water: 0, crop: null });
        this.audio.till();
        this.spawnDust(tx * TILE + 8, ty * TILE + 12, "#8b6136");
        this.toast("Tanah siap ditanam.", "good");
        return;
      }
      if (plot.tilled && !plot.crop) {
        this.plant(plot);
        return;
      }
    }
    if (tileAt(this.world, cx, cy) === T_WATER || tileAt(this.world, cx, cy) === T_BRIDGE) {
      this.canWater = 100;
      this.audio.water();
      this.toast("Kaleng siram diisi di sungai.", "good");
      return;
    }
    this.toast("Tidak ada yang bisa diinteraksi di sini.", "info");
  }

  private plant(plot: Plot) {
    const seed = this.selectedSeed;
    if (!seed) {
      this.toast("Pilih benih di inventarismu (TAB) dulu.", "bad");
      return;
    }
    if (this.countItem("seeds", seed) <= 0) {
      this.toast(`Benih ${CROPS[seed].name} habis. Beli di Toko Benih.`, "bad");
      return;
    }
    this.removeItem("seeds", seed, 1);
    plot.crop = { id: seed, growth: 0, health: 100, pest: null, pestTime: 0, dead: false };
    this.audio.till();
    this.spawnDust(plot.tx * TILE + 8, plot.ty * TILE + 12, CROPS[seed].leaf);
    this.toast(`Ditanam ${CROPS[seed].name}.`, "good");
    if (seed === "corn") this.progressQuest("plantcorn");
    if (seed === "sugarcane") this.progressQuest("plantcane");
    this.emit(true);
  }

  water() {
    const plot = this.plotInFront();
    if (!plot) {
      const { cx, cy } = this.facingTile();
      if (tileAt(this.world, cx, cy) === T_WATER) {
        this.canWater = 100;
        this.audio.water();
        this.toast("Kaleng siram diisi penuh.", "good");
      } else this.toast("Tidak ada lahan di depanmu.", "info");
      return;
    }
    if (this.canWater < 5) {
      this.toast("Kaleng siram kosong — isi di sungai atau beli Tangki Air.", "bad");
      return;
    }
    this.canWater -= 5;
    plot.water = Math.min(100, plot.water + 45);
    this.waterAnim = 0.4;
    this.audio.water();
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: plot.tx * TILE + 8 + (Math.random() - 0.5) * 12,
        y: plot.ty * TILE + 4,
        vx: (Math.random() - 0.5) * 20,
        vy: 40 + Math.random() * 40,
        t: 0.5,
        color: "#9fd4ec",
      });
    }
    this.waterCount++;
    if (plot.crop) this.progressQuest("watercorn");
    this.emit(true);
  }

  spray() {
    const plot = this.plotInFront();
    if (!plot?.crop) {
      this.toast("Berdiri di depan tanaman untuk menyemprot.", "info");
      return;
    }
    const pid = this.selectedPesticide;
    if (!pid) {
      this.toast("Pilih pestisida di inventarismu (TAB) dulu.", "bad");
      return;
    }
    if (this.countItem("pesticides", pid) <= 0) {
      this.toast(`${PESTICIDES[pid].name} habis.`, "bad");
      return;
    }
    this.removeItem("pesticides", pid, 1);
    this.audio.spray();
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: plot.tx * TILE + 8 + (Math.random() - 0.5) * 16,
        y: plot.ty * TILE + 6 - Math.random() * 10,
        vx: (Math.random() - 0.5) * 30,
        vy: -10 + Math.random() * 30,
        t: 0.6,
        color: PESTICIDES[pid].color,
      });
    }
    const pest = plot.crop.pest;
    if (!pest) {
      this.toast("Tidak ada hama di sini — semprotan terbuang.", "bad");
      plot.crop.health = Math.max(5, plot.crop.health - 5);
      return;
    }
    if (PESTS[pest].cure === pid) {
      this.curePest(plot, pest, 40);
    } else {
      plot.crop.health = Math.max(5, plot.crop.health - 18);
      this.addMoney(-15);
      this.audio.wrong();
      this.toast(`Pestisida salah. ${PESTS[pest].name} tidak terpengaruh oleh ${PESTICIDES[pid].name}.`, "bad");
    }
    this.emit(true);
  }

  private curePest(plot: Plot, pest: PestId, reward: number) {
    if (!plot.crop) return;
    plot.crop.pest = null;
    plot.crop.health = Math.min(100, plot.crop.health + 20);
    this.discovered.add(pest);
    this.addMoney(reward);
    this.addXP(10);
    this.audio.success();
    this.toast(`${PESTS[pest].name} diobati dengan benar! +${reward} koin, +10 XP`, "good");
    if (pest === "whitefly") this.progressQuest("whitefly");
    if (pest === "grub") this.progressQuest("grub");
  }

  harvest() {
    const plot = this.plotInFront();
    if (!plot?.crop) {
      this.toast("Tidak ada yang bisa dipanen di depanmu.", "info");
      return;
    }
    const c = plot.crop;
    if (c.dead) {
      plot.crop = null;
      this.toast("Tanaman mati dibersihkan.", "info");
      return;
    }
    if (this.stageOf(c) < 5) {
      this.toast(`${CROPS[c.id].name} belum siap dipanen.`, "info");
      return;
    }
    if (c.pest) {
      this.toast("Obati hama dulu sebelum panen!", "bad");
      return;
    }
    const def = CROPS[c.id];
    const bonus = c.health >= 90 ? 2 : 1;
    // addItem performs the capacity check and emits the inventory-full toast.
    // Keep the crop and progression untouched when storage is unavailable.
    if (!this.addItem("harvest", c.id, def.name, bonus)) return;
    this.harvested[c.id] = (this.harvested[c.id] ?? 0) + bonus;
    plot.crop = null;
    plot.water = Math.max(0, plot.water - 20);
    this.audio.harvest();
    this.floater(plot.tx * TILE + 8, plot.ty * TILE - 4, `+${bonus} ${def.name}`, "#c8f08a");
    this.addXP(6);
    if (c.id === "corn") this.progressQuest("harvestcorn", bonus);
    this.progressQuest("harvest20", bonus);
    this.checkWin();
    this.emit(true);
  }

  private stageOf(c: { id: CropId; growth: number }) {
    return Math.min(5, Math.floor(c.growth / CROPS[c.id].stageTime));
  }

  /* ---------------- shops ---------------- */

  private openSeedShop() {
    this.shop = {
      title: "Toko Benih — Bu Sri",
      entries: CROP_IDS.map((id) => ({
        key: `seed:${id}`,
        name: `Benih ${CROPS[id].name} (${CROPS[id].nameId})`,
        desc: `Dijual ${CROPS[id].price}c · tumbuh 6 tahap`,
        price: CROPS[id].seedPrice,
        icon: `seed:${id}`,
        kind: "buy" as const,
      })),
    };
    this.setOverlay("shop");
  }

  private openPesticideShop() {
    this.shop = {
      title: "Toko Pestisida — Pak Adi",
      entries: (Object.keys(PESTICIDES) as PesticideId[]).map((id) => ({
        key: `pest:${id}`,
        name: PESTICIDES[id].name,
        desc: PESTICIDES[id].desc,
        price: PESTICIDES[id].price,
        icon: `pest:${id}`,
        kind: "buy" as const,
      })),
    };
    this.setOverlay("shop");
  }

  private openWarehouse() {
    this.shop = {
      title: "Gudang Pupuk",
      entries: [
        { key: "misc:fertilizer", name: "Pupuk", desc: "Langsung memajukan satu tanaman satu tahap penuh.", price: 60, icon: "misc:fertilizer", kind: "buy" },
        { key: "misc:watertank", name: "Tangki Air", desc: "Mengisi penuh kaleng siram Anda.", price: 120, icon: "misc:watertank", kind: "buy" },
      ],
    };
    this.setOverlay("shop");
  }

  private openSellShop() {
    this.shop = {
      title: "Balai Desa — Pembeli Koperasi",
      entries: CROP_IDS.map((id) => ({
        key: `sell:${id}`,
        name: `${CROPS[id].name} (${CROPS[id].nameId})`,
        desc: `Anda punya ${this.countItem("harvest", id)} di gudang`,
        price: CROPS[id].price,
        icon: `prod:${id}`,
        kind: "sell" as const,
      })),
    };
    this.setOverlay("shop");
  }

  buy(key: string) {
    const [kind, id] = key.split(":");
    if (kind === "seed") {
      const cid = id as CropId;
      const price = CROPS[cid].seedPrice;
      if (this.money < price) return this.toast("Koin tidak cukup.", "bad");
      this.addMoney(-price, false);
      this.addItem("seeds", cid, `Benih ${CROPS[cid].name}`, 1);
      this.selectedSeed = cid;
      this.audio.coin();
      this.progressQuest("buyseed");
    } else if (kind === "pest") {
      const pid = id as PesticideId;
      const price = PESTICIDES[pid].price;
      if (this.money < price) return this.toast("Koin tidak cukup.", "bad");
      this.addMoney(-price, false);
      this.addItem("pesticides", pid, PESTICIDES[pid].name, 1);
      this.selectedPesticide = pid;
      this.audio.coin();
    } else if (kind === "misc") {
      const price = id === "fertilizer" ? 60 : 120;
      if (this.money < price) return this.toast("Koin tidak cukup.", "bad");
      this.addMoney(-price, false);
      this.addItem("items", id!, id === "fertilizer" ? "Pupuk" : "Tangki Air", 1);
      this.audio.coin();
    }
    if (this.shop?.title.startsWith("Balai Desa")) this.openSellShop();
    this.emit(true);
  }

  sell(key: string, all = false) {
    const id = (key.split(":")[1] ?? "") as CropId;
    const have = this.countItem("harvest", id);
    if (have <= 0) return this.toast("Anda tidak punya itu untuk dijual.", "bad");
    const n = all ? have : 1;
    this.removeItem("harvest", id, n);
    this.addMoney(CROPS[id].price * n, false);
    this.toast(`Terjual ${n} ${CROPS[id].name} untuk ${CROPS[id].price * n}c`, "good");
    if (id === "corn") this.progressQuest("sellcorn", n);
    this.openSellShop();
  }

  useItem(id: string) {
    if (id === "watertank") {
      if (!this.removeItem("items", "watertank")) return;
      this.canWater = 100;
      this.audio.water();
      this.toast("Kaleng siram diisi penuh.", "good");
    } else if (id === "fertilizer") {
      const plot = this.plotInFront();
      if (!plot?.crop || plot.crop.dead) return this.toast("Berdiri di depan tanaman yang tumbuh dulu.", "bad");
      if (!this.removeItem("items", "fertilizer")) return;
      plot.crop.growth += CROPS[plot.crop.id].stageTime;
      plot.crop.health = Math.min(100, plot.crop.health + 10);
      this.audio.success();
      this.toast("Pupuk diberikan — tanaman tumbuh pesat!", "good");
    }
    this.emit(true);
  }

  /* ---------------- diagnosis ---------------- */

  private rollDiagnosisOptions(pest: PestId): PestId[] {
    const others = PEST_IDS.filter((p) => p !== pest);
    // Fisher-Yates on the distractors, then insert the answer randomly
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = others[i]!;
      others[i] = others[j]!;
      others[j] = a;
    }
    const options = others.slice(0, 3);
    options.splice(Math.floor(Math.random() * 4), 0, pest);
    return options;
  }

  private openDiagnosis(plot: Plot) {
    const pest = plot.crop?.pest;
    if (!pest) return;
    this.diagnosis = {
      stage: "diagnose",
      plot,
      pest,
      options: this.rollDiagnosisOptions(pest),
      revealed: null,
      correct: null,
      explain: "",
      question: null,
      questionAnswered: null,
      questionCorrect: null,
      managementChoiceIndex: null,
      managementCorrect: null,
      reward: null,
    };
    this.overlay = "diagnosis";
    this.audio.pest();
    this.emit(true);
  }

  /** Called from the UI when a wrong diagnosis is revealed, to try again on the same pest. */
  retryDiagnosis() {
    const d = this.diagnosis;
    if (!d || d.stage !== "diagnose" || !d.revealed) return;
    d.options = this.rollDiagnosisOptions(d.pest);
    d.revealed = null;
    d.correct = null;
    d.explain = "";
    this.emit(true);
  }

  answerDiagnosis(choice: PestId) {
    const d = this.diagnosis;
    if (!d || d.stage !== "diagnose" || d.revealed) return;
    const pest = d.pest;
    d.revealed = pest;
    if (choice === pest) {
      d.correct = true;
      d.explain = `Benar! ${PESTS[pest].name} (${PESTS[pest].nameId}). ${PESTS[pest].info}`;
    } else {
      d.correct = false;
      d.explain = `Belum tepat. ${PESTS[choice].name} menyebabkan ${PESTS[choice].symptoms[0]?.toLowerCase()} pada ${PESTS[choice].hosts.map((h) => CROPS[h].name).join(", ")}. Di sini pelaku sebenarnya adalah ${PESTS[pest].name} — ${PESTS[pest].info}`;
      if (d.plot.crop) d.plot.crop.health = Math.max(5, d.plot.crop.health - 20);
      this.addMoney(-25, false);
      this.audio.wrong();
    }
    this.emit(true);
  }

  /** Called from the UI after a correct diagnosis, to move on to the follow-up question. */
  advanceToQuestion() {
    const d = this.diagnosis;
    if (!d || d.stage !== "diagnose" || !d.correct) return;
    const candidates = PEST_QUESTIONS.filter((q) => q.pestId === d.pest);
    const cropId = d.plot.crop?.id;
    const preferred = cropId ? candidates.filter((q) => q.cropIds.includes(cropId)) : candidates;
    const pool = preferred.length > 0 ? preferred : candidates;
    const lastId = this.lastQuestionByPest.get(d.pest);
    const fresh = pool.filter((q) => q.id !== lastId);
    const options = fresh.length > 0 ? fresh : pool;
    const question = options[Math.floor(Math.random() * options.length)] ?? null;
    if (question) this.lastQuestionByPest.set(d.pest, question.id);
    d.stage = "question";
    d.question = question;
    d.questionAnswered = null;
    d.questionCorrect = null;
    this.audio.click();
    this.emit(true);
  }

  answerQuestion(index: number) {
    const d = this.diagnosis;
    if (!d || d.stage !== "question" || !d.question || d.questionAnswered !== null) return;
    d.questionAnswered = index;
    d.questionCorrect = index === d.question.correctIndex;
    if (d.questionCorrect) this.audio.success();
    else this.audio.wrong();
    this.emit(true);
  }

  /** Called from the UI when a follow-up question was answered wrong, to try it again. */
  retryQuestion() {
    const d = this.diagnosis;
    if (!d || d.stage !== "question") return;
    d.questionAnswered = null;
    d.questionCorrect = null;
    this.emit(true);
  }

  /** Called from the UI once the follow-up question is answered correctly. */
  advanceToManagement() {
    const d = this.diagnosis;
    if (!d || d.stage !== "question" || !d.questionCorrect) return;
    d.stage = "management";
    d.managementChoiceIndex = null;
    d.managementCorrect = null;
    this.audio.click();
    this.emit(true);
  }

  answerManagement(index: number) {
    const d = this.diagnosis;
    if (!d || d.stage !== "management" || d.managementChoiceIndex !== null) return;
    d.managementChoiceIndex = index;
    d.managementCorrect = index === MANAGEMENT_CORRECT_INDEX;
    if (d.managementCorrect) this.audio.success();
    else this.audio.wrong();
    this.emit(true);
  }

  /** Called from the UI when a wrong management choice was made, to try it again. */
  retryManagement() {
    const d = this.diagnosis;
    if (!d || d.stage !== "management") return;
    d.managementChoiceIndex = null;
    d.managementCorrect = null;
    this.emit(true);
  }

  /** Called from the UI once management is answered correctly — treats the plant and closes the lesson. */
  finishPestLesson() {
    const d = this.diagnosis;
    if (!d || d.stage !== "management" || !d.managementCorrect) return;
    const reward = 50;
    this.curePest(d.plot, d.pest, reward);
    d.stage = "done";
    d.reward = reward;
    this.emit(true);
  }

  /* ---------------- dialogue ---------------- */

  advanceDialogue() {
    if (!this.dialogue) return;
    this.dialogue.index++;
    if (this.dialogue.index >= this.dialogue.npc.lines.length) {
      this.closeOverlay();
    } else {
      this.audio.click();
      this.emit(true);
    }
  }

  private nearestNPC(range: number): NPC | null {
    let best: NPC | null = null;
    let bd = range * range;
    for (const n of this.npcs) {
      const dx = n.x - this.player.x;
      const dy = n.y - this.player.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  private nearestBuilding(range: number) {
    let best = null as null | (typeof this.world.buildings)[number];
    let bd = range * range;
    for (const b of this.world.buildings) {
      const dx = b.door.x - (this.player.x + 8);
      const dy = b.door.y - (this.player.y + 20);
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  /* ---------------- sleeping / day change ---------------- */

  sleep() {
    this.overlay = "sleep";
    this.emit(true);
    window.setTimeout(() => {
      this.nextDay();
      this.overlay = "none";
      this.emit(true);
    }, 1400);
  }

  private nextDay() {
    this.day++;
    this.minutes = GAME_DAY_START_MINUTES;
    this.health = Math.min(100, this.health + 30);
    this.canWater = 100;
    // Deterministic per-day weather keeps saves and balance reproducible.
    const r = ((this.day * 1664525 + 1013904223) >>> 0) / 0x100000000;
    this.weather = r < 0.5 ? "sunny" : r < 0.78 ? "cloudy" : "rain";
    this.audio.setRain(this.weather === "rain");
    this.toast(`Hari ${this.day} — ${this.weather === "rain" ? "Hujan" : this.weather === "cloudy" ? "Berawan" : "Cerah"}`, "info");
    this.save();
  }

  /* ---------------- simulation ---------------- */

  /**
   * Advances the one authoritative simulation clock.
   * The clock starts at 06:00 and advances 1,440 game minutes every 90 real
   * seconds. A day therefore rolls at the next 06:00, after a complete cycle.
   */
  private advanceGameTime(realSeconds: number) {
    // Normalize around the 06:00 simulation-day boundary while preserving the
    // visible 00:00-23:59 clock wrap.
    const offset =
      (this.minutes - GAME_DAY_START_MINUTES + GAME_DAY_MINUTES) % GAME_DAY_MINUTES;
    const total = offset + realSeconds * GAME_MINUTES_PER_REAL_SECOND;
    const days = Math.floor(total / GAME_DAY_MINUTES);
    const remainder = total - days * GAME_DAY_MINUTES;
    if (days > 0) {
      for (let i = 0; i < days; i++) this.nextDay();
    }
    this.minutes = (GAME_DAY_START_MINUTES + remainder) % GAME_DAY_MINUTES;
    return realSeconds * GAME_MINUTES_PER_REAL_SECOND;
  }

  private update(dt: number) {
    if (this.overlay !== "none" && this.overlay !== "sleep") {
      this.updateToasts(dt);
      return;
    }

    const gameMinuteDelta = this.advanceGameTime(dt);

    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.updateCrops(gameMinuteDelta);
    this.updateCamera(dt);
    this.updateToasts(dt);
    this.updateCritters(dt);
    this.updateAnimals(dt);
    this.updateRiders(dt);

    this.pestRollGameMinutes += gameMinuteDelta;
    while (this.pestRollGameMinutes >= PEST_CHECK_INTERVAL_GAME_MINUTES) {
      this.pestRollGameMinutes -= PEST_CHECK_INTERVAL_GAME_MINUTES;
      this.rollPest();
    }

    this.saveT += dt;
    if (this.saveT > 20) {
      this.saveT = 0;
      this.save();
    }

    // prompt for nearby interactable
    const npc = this.nearestNPC(46);
    const b = this.nearestBuilding(52);
    const plot = this.plotInFront();
    const { cx, cy } = this.facingTile();
    if (npc) {
      this.prompt = `E ��� Bicara dengan ${npc.name} (${npc.role})`;
      this.contextAction = "interact";
    } else if (b && b.action !== "none") {
      this.prompt = `E — Masuk ${b.name}`;
      this.contextAction = "interact";
    } else if (plot?.crop?.pest) {
      this.prompt = "E — Periksa tanaman sakit (diagnosis)";
      this.contextAction = "interact";
    } else if (plot?.crop && this.stageOf(plot.crop) >= 5) {
      this.prompt = "R Siram · SPACE Panen · F Semprot";
      this.contextAction = "harvest";
    } else if (plot?.crop) {
      this.prompt = "R Siram · SPACE Panen · F Semprot";
      this.contextAction = "water";
    } else if (plot) {
      this.prompt = "E — Tanam benih terpilih";
      this.contextAction = "interact";
    } else if (tileAt(this.world, cx, cy) === T_FARM) {
      this.prompt = "E — Olah tanah (Cangkul)";
      this.contextAction = "interact";
    } else if (tileAt(this.world, cx, cy) === T_WATER) {
      this.prompt = "E — Isi kaleng siram";
      this.contextAction = "interact";
    } else {
      this.prompt = null;
      this.contextAction = null;
    }
  }

  private updatePlayer(dt: number) {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.has("w") || k.has("arrowup")) dy -= 1;
    if (k.has("s") || k.has("arrowdown")) dy += 1;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    if (this.touchMove.x || this.touchMove.y) {
      dx = this.touchMove.x;
      dy = this.touchMove.y;
    }
    const running = k.has("shift");
    this.player.running = running;
    const speed = running ? 118 : 66;

    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      this.moveWithCollision(dx * speed * dt, dy * speed * dt);
      this.player.moving = true;
      if (Math.abs(dx) > Math.abs(dy)) this.player.dir = dx < 0 ? "left" : "right";
      else this.player.dir = dy < 0 ? "up" : "down";
      this.player.animT += dt * (running ? 12 : 7.5);
      const prev = this.player.frame;
      this.player.frame = Math.floor(this.player.animT) % 4;
      if (this.player.frame !== prev && this.player.frame % 2 === 1) this.audio.step_();
    } else {
      this.player.moving = false;
      this.player.animT += dt * 2.2;
      this.player.frame = Math.floor(this.player.animT) % 2 === 0 ? 0 : 2;
    }
  }

  /** AABB sweep against world colliders and impassable tiles. */
  private moveWithCollision(dx: number, dy: number) {
    const box = { w: 10, h: 8, ox: 3, oy: 14 };
    const test = (nx: number, ny: number) => {
      const x = nx + box.ox;
      const y = ny + box.oy;
      if (x < 8 || y < 8 || x + box.w > MAP_W * TILE - 8 || y + box.h > MAP_H * TILE - 8) return true;
      for (const c of this.world.colliders) {
        if (x < c.x + c.w && x + box.w > c.x && y < c.y + c.h && y + box.h > c.y) return true;
      }
      for (const px of [x, x + box.w - 1]) {
        for (const py of [y, y + box.h - 1]) {
          const t = tileAt(this.world, px, py);
          if (t === T_WATER) return true;
        }
      }
      return false;
    };
    if (!test(this.player.x + dx, this.player.y)) this.player.x += dx;
    if (!test(this.player.x, this.player.y + dy)) this.player.y += dy;
  }

  private updateNPCs(dt: number) {
    for (const n of this.npcs) {
      /* Rotasi kegiatan: berkeliling desa, lalu pulang mengurus kebun */
      n.activityT -= dt;
      if (n.activityT <= 0) {
        if (n.activity === "wander" && n.garden) {
          n.activity = "toGarden";
          n.activityT = 20;
        } else if (n.activity === "toGarden") {
          n.activity = "tend";
          n.activityT = 10 + Math.random() * 12;
        } else {
          n.activity = "wander";
          n.activityT = 10 + Math.random() * 14;
        }
      }

      if (n.activity === "tend" && n.garden) {
        /* Mencangkul di kebun sendiri: berhenti, ayunkan cangkul, debu tanah */
        n.vx = 0;
        n.vy = 0;
        n.dir = "down";
        n.frame = 0;
        n.hoeT += dt * 3;
        if (Math.sin(n.hoeT) > 0.98 && Math.random() < 0.4) {
          this.particles.push({
            x: n.x + 8 + (Math.random() - 0.5) * 8,
            y: n.y + 22,
            vx: (Math.random() - 0.5) * 24,
            vy: -20 - Math.random() * 20,
            t: 0.5,
            color: "#8a6440",
          });
        }
        continue;
      }

      if (n.activity === "toGarden" && n.garden) {
        const gx = n.garden.x - n.x;
        const gy = n.garden.y - n.y;
        const d = Math.hypot(gx, gy);
        if (d < 8) {
          n.activity = "tend";
          n.activityT = 10 + Math.random() * 12;
          continue;
        }
        n.vx = (gx / d) * 30;
        n.vy = (gy / d) * 30;
      } else {
        n.waitT -= dt;
        if (n.waitT <= 0) {
          n.waitT = 1.5 + Math.random() * 3.5;
          if (Math.random() < 0.65) {
            const a = Math.random() * Math.PI * 2;
            n.vx = Math.cos(a) * 22;
            n.vy = Math.sin(a) * 22;
          } else {
            n.vx = 0;
            n.vy = 0;
          }
        }
        // stay near home point
        const dxh = n.x - n.hx;
        const dyh = n.y - n.hy;
        if (Math.hypot(dxh, dyh) > n.radius) {
          n.vx = -dxh * 0.25;
          n.vy = -dyh * 0.25;
        }
      }

      const nx = n.x + n.vx * dt;
      const ny = n.y + n.vy * dt;
      const allowedFarm = n.id === "oldfarmer" ? this.world.farms.find((farm) => farm.name.includes("Jagung")) ?? null : null;
      let moved = false;
      if (!this.navigationBlocked(nx, n.y, "npc", n.garden, allowedFarm)) {
        n.x = nx;
        moved = true;
      } else {
        n.vx = -n.vx;
      }
      if (!this.navigationBlocked(n.x, ny, "npc", n.garden, allowedFarm)) {
        n.y = ny;
        moved = true;
      } else {
        n.vy = -n.vy;
      }

      // If a diagonal approach is blocked on both axes, try one cardinal step
      // toward the authored garden before giving up this frame.
      if (!moved && n.activity === "toGarden" && n.garden) {
        const step = 30 * dt;
        const sx = Math.sign(n.garden.x - n.x) * step;
        const sy = Math.sign(n.garden.y - n.y) * step;
        if (sx && !this.navigationBlocked(n.x + sx, n.y, "npc", n.garden, allowedFarm)) {
          n.x += sx;
          moved = true;
        } else if (sy && !this.navigationBlocked(n.x, n.y + sy, "npc", n.garden, allowedFarm)) {
          n.y += sy;
          moved = true;
        }
      }
      if (!moved) {
        n.vx = 0;
        n.vy = 0;
      }

      if (n.vx || n.vy) {
        if (Math.abs(n.vx) > Math.abs(n.vy)) n.dir = n.vx < 0 ? "left" : "right";
        else n.dir = n.vy < 0 ? "up" : "down";
        n.animT += dt * 6;
        n.frame = Math.floor(n.animT) % 4;
      } else {
        n.frame = 0;
      }
    }
  }

  /** Warga bermotor yang berkeliling lewat jalan desa. */
  private spawnRiders() {
    const P = (tx: number, ty: number): RoadWaypoint => ({ x: tx * TILE, y: ty * TILE });
    const routes: RoadWaypoint[][] = [
      // jalan utama timur-barat, lalu naik ke jalan perumahan utara
      [P(10, 58), P(74, 58), P(77, 58), P(77, 25), P(118, 25), P(118, 58), P(134, 58)],
      // keliling perumahan tengah dan jalan selatan
      [P(30, 71), P(118, 71), P(118, 58), P(30, 58)],
      // poros utara-selatan
      [P(77, 12), P(77, 105), P(77, 12)],
    ];
    const styles: CharStyle[] = [
      { key: "rider1", skin: "#c98f61", hair: "#2a2018", shirt: "#3f6fae", pants: "#33405a", hat: "cap" },
      { key: "rider2", skin: "#dfa274", hair: "#3a2a1e", shirt: "#d98a4a", pants: "#4b4230", hat: "straw" },
      { key: "rider3", skin: "#bd8354", hair: "#231a14", shirt: "#4f9a63", pants: "#39485e", hat: "peci" },
    ];
    routes.forEach((path, i) => {
      const validation = validateRoadRoute(this.world, path, MOTOR_HITBOX);
      if (!validation.valid) {
        if (import.meta.env.DEV) {
          console.warn(
            `[JUST FARM] Skipping invalid motor route ${i + 1}, segment ${validation.invalidSegment ?? "?"}: ${validation.reason}`,
          );
        }
        return;
      }
      const start = path[0]!;
      this.riders.push({
        style: styles[i % styles.length]!,
        path,
        seg: 0,
        t: 0,
        x: start.x,
        y: start.y,
        dir: "right",
        sp: 62 + i * 14,
        frame: 0,
        anim: 0,
        pauseT: 0,
      });
    });
  }

  private updateRiders(dt: number) {
    for (const r of this.riders) {
      r.anim += dt * 10;
      r.frame = Math.floor(r.anim) % 4;
      if (r.pauseT > 0) {
        r.pauseT -= dt;
        continue;
      }
      const a = r.path[r.seg]!;
      const b = r.path[(r.seg + 1) % r.path.length]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      r.t += (r.sp * dt) / len;
      if (r.t >= 1) {
        r.t = 0;
        r.seg = (r.seg + 1) % r.path.length;
        // berhenti sebentar di persimpangan
        if (Math.random() < 0.4) r.pauseT = 0.6 + Math.random() * 1.2;
      }
      r.x = a.x + dx * r.t;
      r.y = a.y + dy * r.t;
      if (Math.abs(dx) > Math.abs(dy)) r.dir = dx < 0 ? "left" : "right";
      else r.dir = dy < 0 ? "up" : "down";
    }
  }

  private navigationBlocked(
    x: number,
    y: number,
    kind: "npc" | "animal",
    garden: { x: number; y: number } | null = null,
    allowedFarm: { x: number; y: number; w: number; h: number } | null = null,
  ) {
    const box = kind === "npc" ? { w: 10, h: 8, ox: 3, oy: 14 } : { w: 12, h: 8, ox: 2, oy: 10 };
    const bx = x + box.ox;
    const by = y + box.oy;
    if (bx < 8 || by < 8 || bx + box.w > MAP_W * TILE - 8 || by + box.h > MAP_H * TILE - 8) return true;
    for (const c of this.world.colliders) {
      if (bx < c.x + c.w && bx + box.w > c.x && by < c.y + c.h && by + box.h > c.y) return true;
    }

    const points: [number, number][] = [
      [bx, by],
      [bx + box.w - 1, by],
      [bx, by + box.h - 1],
      [bx + box.w - 1, by + box.h - 1],
      [bx + Math.floor(box.w / 2), by + Math.floor(box.h / 2)],
    ];
    for (const [px, py] of points) {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      const tile = tileAt(this.world, px, py);
      const inAllowedFarm =
        allowedFarm !== null &&
        tx >= allowedFarm.x - 1 &&
        tx < allowedFarm.x + allowedFarm.w + 1 &&
        ty >= allowedFarm.y - 1 &&
        ty < allowedFarm.y + allowedFarm.h + 1;
      const inGarden =
        kind === "npc" && garden !== null && Math.hypot(px - garden.x, py - garden.y) < 52 && tile === T_DIRT;
      if ((!isWalkableTile(this.world, tx, ty) && !inAllowedFarm && !inGarden) ||
          (isFarmBufferTile(this.world, tx, ty, 1) && !inAllowedFarm && !inGarden)) return true;
    }
    return false;
  }

  private updateCrops(gameMinutes: number) {
    const rain = this.weather === "rain";
    let died = 0;
    for (const p of this.plots.values()) {
      const c = p.crop;
      if (!c || c.dead) {
        if (c?.dead) died++;
        continue;
      }
      const def = CROPS[c.id];
      if (rain) p.water = Math.min(100, p.water + gameMinutes * RAIN_WATER_RECOVERY_PER_GAME_MINUTE);
      if (p.water > 0) {
        p.water = Math.max(0, p.water - gameMinutes * def.thirst);
        const rate = c.pest ? 0.35 : 1;
        c.growth += gameMinutes * rate * (c.health / 100);
        if (c.health < 100) c.health = Math.min(100, c.health + gameMinutes * CROP_HEALTH_RECOVERY_PER_GAME_MINUTE);
      } else {
        c.health -= gameMinutes * CROP_DRY_HEALTH_LOSS_PER_GAME_MINUTE;
      }
      if (c.pest) {
        c.pestTime += gameMinutes;
        c.health -= gameMinutes * CROP_PEST_HEALTH_LOSS_PER_GAME_MINUTE;
      }
      if (c.health <= 0) {
        c.dead = true;
        c.health = 0;
        this.toast(`Tanaman ${def.name} mati!`, "bad");
      }
    }
    if (died > 0 && died >= this.plots.size && this.plots.size >= 3) this.checkGameOver();
    if (this.money <= 0) this.checkGameOver();
  }

  private rollPest() {
    const candidates: Plot[] = [];
    for (const p of this.plots.values()) {
      if (p.crop && !p.crop.dead && !p.crop.pest && this.stageOf(p.crop) >= 2) candidates.push(p);
    }
    if (!candidates.length) return;
    const plot = candidates[Math.floor(Math.random() * candidates.length)]!;
    const crop = plot.crop!;
    const chance = CROPS[crop.id].pestChance * (this.weather === "rain" ? RAIN_PEST_CHANCE_MULTIPLIER : 1);
    if (Math.random() > chance) return;
    const hosts = PEST_IDS.filter((p) => PESTS[p].hosts.includes(crop.id));
    if (!hosts.length) return;
    const pest = hosts[Math.floor(Math.random() * hosts.length)]!;
    crop.pest = pest;
    crop.pestTime = 0;
    this.audio.pest();
    this.toast(`Hama menyerang ${CROPS[crop.id].name}mu! Periksa dengan E.`, "bad");
  }

  private updateCamera(dt: number) {
    const targetX = this.player.x + 8 - this.viewportWidth / (2 * ZOOM);
    const targetY = this.player.y + 12 - this.viewportHeight / (2 * ZOOM);
    const lerp = 1 - Math.pow(0.0015, dt);
    this.cam.x += (targetX - this.cam.x) * lerp;
    this.cam.y += (targetY - this.cam.y) * lerp;
    this.cam.x = Math.max(0, Math.min(MAP_W * TILE - this.viewportWidth / ZOOM, this.cam.x));
    this.cam.y = Math.max(0, Math.min(MAP_H * TILE - this.viewportHeight / ZOOM, this.cam.y));
  }

  private updateToasts(dt: number) {
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter((t) => t.t > 0);
    for (const f of this.floaters) {
      f.t -= dt;
      f.y -= dt * 16;
    }
    this.floaters = this.floaters.filter((f) => f.t > 0);
    for (const p of this.particles) {
      p.t -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
    this.particles = this.particles.filter((p) => p.t > 0);
    if (this.waterAnim > 0) this.waterAnim -= dt;
  }

  /** Tebar ayam, anak ayam, bebek, dan sapi di titik-titik ramah desa. */
  private spawnAnimals() {
    const add = (id: AnimalId, tx: number, ty: number, count: number, r: number) => {
      for (let i = 0; i < count; i++) {
        const hx = tx * TILE;
        const hy = ty * TILE;
        let x = hx;
        let y = hy;
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidateX = hx + (Math.random() - 0.5) * r;
          const candidateY = hy + (Math.random() - 0.5) * r;
          if (!this.navigationBlocked(candidateX, candidateY, "animal")) {
            x = candidateX;
            y = candidateY;
            break;
          }
        }
        this.animals.push({
          id,
          hx,
          hy,
          r,
          x,
          y,
          dir: Math.random() > 0.5 ? "right" : "left",
          frame: 0,
          anim: Math.random() * 2,
          tx: x,
          ty: y,
          wait: Math.random() * 3,
          sp: id === "cow" ? 8 : 16 + Math.random() * 8,
        });
      }
    };
    add("chicken", 20, 34, 4, 120);
    add("chick", 20, 34, 3, 70);
    add("chicken", 60, 34, 3, 110);
    add("chick", 60, 34, 2, 60);
    add("cow", 44, 40, 2, 150);
    add("cow", 100, 52, 2, 150);
    add("chicken", 98, 42, 3, 120);
    add("duck", 136, 46, 3, 110);
    add("duck", 136, 84, 3, 110);
    add("chicken", 52, 100, 3, 130);
    add("chick", 52, 100, 3, 70);
    add("cow", 96, 100, 2, 150);
    add("chicken", 118, 68, 3, 120);
  }

  /** Gerak acak lembut: jalan sebentar, berhenti mematuk, lalu jalan lagi. */
  private updateAnimals(dt: number) {
    for (const a of this.animals) {
      a.wait -= dt;
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      if (a.wait <= 0 && dist < 3) {
        let targetFound = false;
        for (let attempt = 0; attempt < 12; attempt++) {
          const tx = a.hx + (Math.random() - 0.5) * a.r;
          const ty = a.hy + (Math.random() - 0.5) * a.r;
          if (!this.navigationBlocked(tx, ty, "animal")) {
            a.tx = tx;
            a.ty = ty;
            targetFound = true;
            break;
          }
        }
        a.wait = 1 + Math.random() * 4;
        if (!targetFound) a.wait = 2;
      }
      if (dist > 3) {
        const vx = (dx / dist) * a.sp;
        const vy = (dy / dist) * a.sp;
        const nx = a.x + vx * dt;
        const ny = a.y + vy * dt;
        let moved = false;
        if (!this.navigationBlocked(nx, a.y, "animal")) {
          a.x = nx;
          moved = true;
        }
        if (!this.navigationBlocked(a.x, ny, "animal")) {
          a.y = ny;
          moved = true;
        }
        if (!moved) {
          a.tx = a.x;
          a.ty = a.y;
          a.wait = 0.5;
        }
        if (Math.abs(vx) > 1) a.dir = vx > 0 ? "right" : "left";
        a.anim += dt * (a.id === "cow" ? 4 : 7);
        a.frame = Math.floor(a.anim) % 4;
      } else {
        a.anim += dt * 2;
        // idle: sesekali mematuk / merumput
        a.frame = Math.floor(a.anim) % 6 === 0 ? 2 : 0;
      }
    }
  }

  /**
   * Ambient critters drift lazily around the player: butterflies during the
   * day, fireflies after dusk. They are recycled whenever they stray too far.
   */
  private updateCritters(dt: number) {
    const px = this.player.x;
    const py = this.player.y;
    const respawn = (c: { x: number; y: number; a: number; sp: number; ph: number }) => {
      const ang = Math.random() * Math.PI * 2;
      const r = 220 + Math.random() * 160;
      c.x = px + Math.cos(ang) * r;
      c.y = py + Math.sin(ang) * r;
      c.a = Math.random() * Math.PI * 2;
      c.sp = 12 + Math.random() * 22;
      c.ph = Math.random() * Math.PI * 2;
    };
    while (this.critters.length < 26) {
      const c = { x: 0, y: 0, a: 0, sp: 0, ph: 0 };
      respawn(c);
      this.critters.push(c);
    }
    for (const c of this.critters) {
      c.a += (Math.random() - 0.5) * dt * 4;
      c.ph += dt * 6;
      c.x += Math.cos(c.a) * c.sp * dt;
      c.y += Math.sin(c.a) * c.sp * dt * 0.7;
      if (Math.abs(c.x - px) > 460 || Math.abs(c.y - py) > 320) respawn(c);
    }
  }


  private spawnDust(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 30,
        t: 0.4 + Math.random() * 0.3,
        color,
      });
    }
  }

  /* ---------------- rendering ---------------- */

  private render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#3d6b34";
    ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    ctx.setTransform(ZOOM, 0, 0, ZOOM, -Math.round(this.cam.x * ZOOM), -Math.round(this.cam.y * ZOOM));

    const x0 = Math.floor(this.cam.x / TILE) - 1;
    const y0 = Math.floor(this.cam.y / TILE) - 1;
    const x1 = x0 + Math.ceil(this.viewportWidth / ZOOM / TILE) + 3;
    const y1 = y0 + Math.ceil(this.viewportHeight / ZOOM / TILE) + 3;
    const wframe = Math.floor(performance.now() / 220) % 6;

    /* ground */
    for (let y = Math.max(0, y0); y < Math.min(MAP_H, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(MAP_W, x1); x++) {
        const t = this.world.ground[y * MAP_W + x] ?? 0;
        const v = (x * 17 + y * 29 + x * y) % 8;
        let img: HTMLCanvasElement;
        if (t === T_PATH) img = pathTile(v, this.weather === "rain");
        else if (t === T_DIRT) img = dirtTile(v);
        else if (t === T_WATER) img = waterTile(wframe);
        else if (t === T_SAND) img = sandTile();
        else if (t === T_BRIDGE) img = bridgeTile();
        else if (t === T_FARM) img = dirtTile((v + 2) % 6);
        else img = grassTile(v);
        ctx.drawImage(img, x * TILE, y * TILE);
      }
    }

    /* tilled plots */
    for (const p of this.plots.values()) {
      if (p.tx < x0 || p.tx > x1 || p.ty < y0 || p.ty > y1) continue;
      ctx.drawImage(soilTile(p.water > 15, true), p.tx * TILE, p.ty * TILE);
    }

    /* gate + planks under gate */
    const g = this.world.gate;
    ctx.drawImage(planksTile(), g.x + 32, g.y + 48);
    ctx.drawImage(villageGate(), g.x, g.y);

    /* Directional ground shadows are painted before the y-sorted sprites so
       objects feel planted in the terrain rather than stamped on top of it. */
    this.renderWorldShadows(ctx, x0, x1, y0, y1, this.getSunLight());

    /* y-sorted sprite pass */
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];

    for (const b of this.world.buildings) {
      if (b.x + b.w < x0 * TILE || b.x > x1 * TILE || b.y + b.h < y0 * TILE || b.y > y1 * TILE) continue;
      items.push({
        y: b.y + b.h,
        draw: () => {
          ctx.drawImage(
            building({
              key: `${b.kind}${b.x}${b.y}`,
              w: b.w,
              h: b.h,
              wall: b.wall,
              roof: b.roof,
              door: b.doorColor,
              ...(b.banner ? { banner: b.banner } : {}),
            }),
            b.x,
            b.y,
          );
        },
      });
    }

    const breeze = performance.now() / 900;
    for (const d of this.world.decor) {
      if (d.x < x0 * TILE - 64 || d.x > x1 * TILE || d.y < y0 * TILE - 80 || d.y > y1 * TILE) continue;
      items.push({
        y:
          d.y +
          (d.kind === "tree" ? 48 : d.kind === "palm" ? 70 : d.kind === "banana" ? 46 : d.kind === "lamp" ? 38 : d.kind === "lily" ? 2 : 14),
        draw: () => {
          let img: HTMLCanvasElement;
          /* leafy props sway gently with the breeze so the village feels alive */
          let sway = 0;
          switch (d.kind) {
            case "tree":
              img = tree(d.variant);
              sway = Math.sin(breeze + d.x * 0.05) * 0.8;
              break;
            case "palm":
              img = palmTree(d.variant);
              sway = Math.sin(breeze * 1.15 + d.x * 0.04) * 1.4;
              break;
            case "banana":
              img = bananaTree(d.variant);
              sway = Math.sin(breeze * 1.3 + d.y * 0.05) * 1.1;
              break;
            case "tallgrass":
              img = tallGrass(d.variant);
              sway = Math.sin(breeze * 1.8 + (d.x + d.y) * 0.09) * 0.7;
              break;
            case "haystack":
              img = haystack();
              break;
            case "lily":
              img = lilyPad(d.variant);
              sway = Math.sin(breeze * 0.7 + d.y * 0.08) * 0.6;
              break;
            case "bush":
              img = bush(d.variant);
              sway = Math.sin(breeze * 1.4 + d.x * 0.07) * 0.5;
              break;
            case "flower":
              img = flower(d.variant);
              sway = Math.sin(breeze * 2 + d.x * 0.1) * 0.5;
              break;
            case "lamp":
              img = lampPost(this.isNight());
              break;
            case "fenceH":
              img = fence(false);
              break;
            case "fenceV":
              img = fence(true);
              break;
            case "rock":
              img = rock();
              break;
            default:
              img = signPost();
          }
          ctx.drawImage(img, d.x + sway, d.y);
        },
      });
    }


    for (const p of this.plots.values()) {
      const c = p.crop;
      if (!c) continue;
      if (p.tx < x0 || p.tx > x1 || p.ty < y0 || p.ty > y1) continue;
      const stage = this.stageOf(c);
      items.push({
        y: p.ty * TILE + 16,
        draw: () => {
          ctx.save();
          if (c.dead) ctx.globalAlpha = 0.55;
          ctx.drawImage(cropSprite(c.id, stage, !!c.pest || c.health < 55), p.tx * TILE, p.ty * TILE - 14);
          ctx.restore();
          if (c.pest) {
            const f = Math.floor(performance.now() / 260) % 2;
            const bobY = Math.sin(performance.now() / 260) * 2;
            ctx.drawImage(pestSprite(c.pest, f, 2), p.tx * TILE - 4, p.ty * TILE - 26 + bobY);
            // alert bubble
            ctx.fillStyle = "#ffdf6b";
            ctx.fillRect(p.tx * TILE + 7, p.ty * TILE - 30, 3, 6);
            ctx.fillRect(p.tx * TILE + 7, p.ty * TILE - 22, 3, 2);
          } else if (stage === 5) {
            const bob = Math.sin(performance.now() / 300) * 1.5;
            ctx.fillStyle = "#c8f08a";
            ctx.fillRect(p.tx * TILE + 7, p.ty * TILE - 26 + bob, 2, 5);
            ctx.fillRect(p.tx * TILE + 6, p.ty * TILE - 22 + bob, 4, 2);
          }
        },
      });
    }

    for (const n of this.npcs) {
      if (n.x < x0 * TILE - 32 || n.x > x1 * TILE || n.y < y0 * TILE - 40 || n.y > y1 * TILE) continue;
      items.push({
        y: n.y + 22,
        draw: () => {
          ctx.drawImage(character(n.style, n.dir, n.frame), Math.round(n.x), Math.round(n.y));
          if (n.activity === "tend") {
            // cangkul yang diayunkan naik-turun
            const sw = Math.sin(n.hoeT);
            const hx = Math.round(n.x) + 14;
            const hy = Math.round(n.y) + 10 + Math.round(sw * 3);
            ctx.fillStyle = "#8a5a2f";
            ctx.fillRect(hx, hy, 2, 10);
            ctx.fillStyle = "#b9bec6";
            ctx.fillRect(hx - 3, hy + 9 + (sw > 0 ? 1 : 0), 6, 2);
          }
          // name tag
          ctx.font = "6px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(20,24,18,0.55)";
          const tw = ctx.measureText(n.name).width + 4;
          ctx.fillRect(Math.round(n.x) + 8 - tw / 2, Math.round(n.y) - 8, tw, 8);
          ctx.fillStyle = "#f3f0dd";
          ctx.fillText(n.name, Math.round(n.x) + 8, Math.round(n.y) - 2);
          ctx.textAlign = "left";
        },
      });
    }

    for (const r of this.riders) {
      if (r.x < x0 * TILE - 40 || r.x > x1 * TILE || r.y < y0 * TILE - 48 || r.y > y1 * TILE) continue;
      items.push({
        y: r.y + 22,
        draw: () => {
          const rx = Math.round(r.x);
          const ry = Math.round(r.y);
          const jitter = r.frame % 2;
          if (r.dir === "up") {
            ctx.drawImage(character(r.style, r.dir, 0), rx + 3, ry - 6 + jitter);
            ctx.drawImage(motorbike(r.dir, r.frame), rx, ry + jitter);
          } else {
            ctx.drawImage(motorbike(r.dir, r.frame), rx, ry + jitter);
            ctx.drawImage(character(r.style, r.dir, 0), rx + 3, ry - 6 + jitter);
          }
        },
      });
    }

    for (const a of this.animals) {
      if (a.x < x0 * TILE - 32 || a.x > x1 * TILE || a.y < y0 * TILE - 32 || a.y > y1 * TILE) continue;
      const bob = a.frame === 1 || a.frame === 3 ? -1 : 0;
      items.push({
        y: a.y + (a.id === "cow" ? 20 : 14),
        draw: () => {
          ctx.drawImage(animalSprite(a.id, a.dir, a.frame), Math.round(a.x), Math.round(a.y) + bob);
        },
      });
    }

    items.push({
      y: this.player.y + 22,
      draw: () => {
        ctx.drawImage(
          character(PLAYER_STYLE, this.player.dir, this.player.frame),
          Math.round(this.player.x),
          Math.round(this.player.y),
        );
      },
    });

    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    /* ambient critters — kupu-kupu siang, kunang-kunang malam */
    {
      const night = this.isNight();
      for (const c of this.critters) {
        const bob = Math.sin(c.ph) * 2;
        const x = Math.round(c.x);
        const y = Math.round(c.y + bob);
        if (night) {
          const glow = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(c.ph * 0.7));
          ctx.globalAlpha = glow;
          ctx.fillStyle = "#fff2a8";
          ctx.fillRect(x, y, 1, 1);
          ctx.globalAlpha = glow * 0.35;
          ctx.fillStyle = "#ffe06a";
          ctx.fillRect(x - 1, y - 1, 3, 3);
          ctx.globalAlpha = 1;
        } else {
          const flap = Math.sin(c.ph * 2) > 0 ? 1 : 2;
          ctx.fillStyle = c.sp > 24 ? "#f4d35e" : "#f2f2ef";
          ctx.fillRect(x - flap, y, 1, 1);
          ctx.fillRect(x + flap, y, 1, 1);
          ctx.fillStyle = "#4b3a26";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    /* particles */
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.t * 2));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      ctx.globalAlpha = 1;
    }

    /* floating texts */
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.t);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(f.text, Math.round(f.x) + 1, Math.round(f.y) + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";

    /* interaction highlight on the tile in front */
    const ft = this.facingTile();
    if (tileAt(this.world, ft.cx, ft.cy) === T_FARM) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(ft.tx * TILE + 0.5, ft.ty * TILE + 0.5, TILE - 1, TILE - 1);
    }

    /* quest marker — floating red exclamation */
    const qm = this.computeQuestMarker();
    if (qm) {
      const bob = Math.sin(performance.now() / 250) * 2;
      const mx = Math.round(qm.x);
      const my = Math.round(qm.y - 30 + bob);
      ctx.save();
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText("!", mx + 1, my + 1);
      ctx.fillStyle = "#e53935";
      ctx.fillText("!", mx, my);
      // small shadow circle
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(mx, my + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* World-only post pipeline. React HUD/menus are separate DOM layers and
       are rendered after this canvas, so they never receive these effects. */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.renderLighting(ctx);
    this.renderWaterReflections(ctx);
    if (this.weather === "rain") this.renderRain(ctx);
    this.renderMinimap(ctx);
  }

  private isNight() {
    const h = this.minutes / 60;
    return h >= 18 || h < 6;
  }

  /** Time-derived visual sun state. This is presentation-only and never
   * participates in simulation, crop growth, weather rolls, or gameplay. */
  private getSunLight() {
    const h = ((this.minutes / 60) % 24 + 24) % 24;
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const smooth = (v: number) => {
      const t = clamp01(v);
      return t * t * (3 - 2 * t);
    };
    const daylight = h >= 5 && h < 19 ? Math.sin(clamp01((h - 5) / 14) * Math.PI) : 0;
    const sunrise = h >= 4.5 && h < 8 ? Math.sin(clamp01((h - 4.5) / 3.5) * Math.PI) : 0;
    const sunset = h >= 15.5 && h < 19.5 ? Math.sin(clamp01((h - 15.5) / 4) * Math.PI) : 0;
    const active = h >= 4.5 && h < 19.5;
    const rainFactor = this.weather === "rain" ? 0.42 : this.weather === "cloudy" ? 0.76 : 1;
    const noon = h < 12 ? clamp01((h - 5) / 7) : clamp01((19 - h) / 7);
    const elevation = Math.max(0.12, daylight * 0.92 + 0.08);

    // Light travels from upper-left in the morning, becomes top-down at noon,
    // then moves to upper-right in the afternoon. Shadows use the inverse.
    let lightX: number;
    if (h < 12) {
      const t = clamp01((h - 5) / 7);
      lightX = -0.92 + t * 0.82;
    } else {
      const t = clamp01((h - 12) / 7);
      lightX = -0.1 + t * 1.02;
    }
    const lightY = -0.76 - daylight * 0.16;
    const lightLength = Math.hypot(lightX, lightY) || 1;
    lightX /= lightLength;
    const normalizedY = lightY / lightLength;
    // Keep the cast shadow connected to the caster. The previous pass allowed
    // offsets of 30+ world pixels, which made shadows read as detached shapes.
    const shadowLength = active ? 3 + (1 - elevation) * 10 : 0;

    return {
      h,
      daylight,
      sunrise,
      sunset,
      elevation,
      active,
      night: !active || h >= 19 || h < 4.5,
      strength: active ? (0.42 + daylight * 0.58) * rainFactor : 0,
      warm: Math.max(sunrise, sunset),
      lightX,
      lightY: normalizedY,
      shadowX: -lightX * shadowLength,
      shadowY: -normalizedY * shadowLength,
      shadowLength,
      rainFactor,
    };
  }

  /** Cached sprites already contain contact shading; this pass adds a single
   * inexpensive directional shadow layer for major objects and actors. */
  private renderWorldShadows(
    ctx: CanvasRenderingContext2D,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    sun: ReturnType<Game["getSunLight"]>,
  ) {
    if (!sun.active || sun.strength <= 0) return;
    const mobile = this.viewportWidth < VIEW_W;
    const objectAlpha = (0.105 + sun.warm * 0.06) * (mobile ? 0.82 : 1);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(30, 55, 42, ${objectAlpha})`;

    // All anchors here are world coordinates. This function is called while
    // ctx still has the world transform (ZOOM/camera) from render(), so every
    // shadow follows its object when the camera or actor moves.
    const ellipse = (cx: number, cy: number, rx: number, ry: number, offset = 0.25) => {
      ctx.beginPath();
      ctx.ellipse(cx + sun.shadowX * offset, cy + sun.shadowY * offset, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const cast = (cx: number, cy: number, length: number, width: number) => {
      const dx = sun.shadowX * Math.min(1, length / Math.max(1, sun.shadowLength));
      const dy = sun.shadowY * Math.min(1, length / Math.max(1, sun.shadowLength));
      const distance = Math.hypot(dx, dy) || 1;
      const px = (-dy / distance) * width;
      const py = (dx / distance) * width;
      ctx.beginPath();
      // The first edge touches the exact ground anchor; the tapered tip keeps
      // the shadow soft and visually attached rather than floating away.
      ctx.moveTo(cx - px, cy - py);
      ctx.lineTo(cx + px, cy + py);
      ctx.lineTo(cx + dx + px * 0.38, cy + dy + py * 0.38);
      ctx.lineTo(cx + dx - px * 0.38, cy + dy - py * 0.38);
      ctx.closePath();
      ctx.fill();
    };

    for (const b of this.world.buildings) {
      if (b.x + b.w < x0 * TILE || b.x > x1 * TILE || b.y + b.h < y0 * TILE || b.y > y1 * TILE) continue;
      const baseY = b.y + b.h - 5;
      const dx = sun.shadowX * 0.7;
      const dy = sun.shadowY * 0.7;
      ctx.beginPath();
      ctx.moveTo(b.x + 3, baseY);
      ctx.lineTo(b.x + b.w - 3, baseY);
      ctx.lineTo(b.x + b.w - 3 + dx, baseY + dy);
      ctx.lineTo(b.x + 3 + dx, baseY + dy);
      ctx.closePath();
      ctx.fill();
    }

    const isVisible = (x: number, y: number, pad = 80) =>
      x >= x0 * TILE - pad && x <= x1 * TILE + pad && y >= y0 * TILE - pad && y <= y1 * TILE + pad;
    for (const d of this.world.decor) {
      if (!isVisible(d.x, d.y)) continue;
      switch (d.kind) {
        case "tree":
          cast(d.x + 20, d.y + 48, 9, 5);
          break;
        case "palm":
          cast(d.x + 23, d.y + 72, 8, 4);
          break;
        case "banana":
          cast(d.x + 19, d.y + 48, 7, 4);
          break;
        case "bush":
          ellipse(d.x + 11, d.y + 16, 8, 2, 0.2);
          break;
        case "rock":
          ellipse(d.x + 9, d.y + 12, 7, 2, 0.2);
          break;
        case "haystack":
          ellipse(d.x + 13, d.y + 20, 10, 2, 0.2);
          break;
        case "fenceH":
        case "fenceV":
          ellipse(d.x + 8, d.y + 18, 6, 1, 0.15);
          break;
      }
    }

    for (const p of this.plots.values()) {
      if (p.tx < x0 || p.tx > x1 || p.ty < y0 || p.ty > y1 || !p.crop) continue;
      ellipse(p.tx * TILE + 8, p.ty * TILE + 15, 5, 1.5, 0.18);
    }
    ellipse(this.player.x + 8, this.player.y + 22, 5, 1.5, 0.12);
    for (const n of this.npcs) if (isVisible(n.x, n.y, 32)) ellipse(n.x + 8, n.y + 22, 5, 1.5, 0.12);
    for (const a of this.animals) if (isVisible(a.x, a.y, 30)) ellipse(a.x + 8, a.y + (a.id === "cow" ? 20 : 14), a.id === "cow" ? 8 : 5, 1.5, 0.12);
    ctx.restore();
  }

  /** Two irregular, soft-edged atmospheric beams. These deliberately avoid
   * repeated full-width bands, which previously read as a grid over grass. */
  private renderSunRays(ctx: CanvasRenderingContext2D, sun: ReturnType<Game["getSunLight"]>) {
    if (!sun.active || sun.strength <= 0) return;
    const mobile = this.viewportWidth < VIEW_W;
    const lowAngle = Math.max(sun.sunrise, sun.sunset);
    const alpha = lowAngle * (this.weather === "rain" ? 0.04 : mobile ? 0.13 : 0.16);
    if (alpha < 0.018) return;

    const warm = sun.sunset > sun.sunrise ? [255, 177, 112] : [255, 226, 166];
    const sourceX = sun.lightX < 0 ? this.viewportWidth * 0.08 : this.viewportWidth * 0.92;
    const drift = sun.lightX < 0 ? this.viewportWidth * 0.4 : -this.viewportWidth * 0.4;
    const beams = mobile ? 2 : 3;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 1;
    for (let i = 0; i < beams; i++) {
      const offset = (i - (beams - 1) / 2) * this.viewportWidth * 0.23;
      const topX = sourceX + offset;
      const bottomX = topX + drift;
      const width = this.viewportWidth * (0.18 + i * 0.018);
      const topY = this.viewportHeight * (0.02 + i * 0.05);
      const bottomY = this.viewportHeight * (0.72 + i * 0.08);
      const gradient = ctx.createLinearGradient(topX, topY, bottomX, bottomY);
      gradient.addColorStop(0, `rgba(${warm[0]},${warm[1]},${warm[2]},${alpha * 0.72})`);
      gradient.addColorStop(0.45, `rgba(${warm[0]},${warm[1]},${warm[2]},${alpha * 0.22})`);
      gradient.addColorStop(1, `rgba(${warm[0]},${warm[1]},${warm[2]},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      // Unequal, slightly kinked points keep the silhouette organic instead of
      // reading as a repeated rectangle or tile overlay.
      ctx.moveTo(topX - width * 0.34, topY);
      ctx.lineTo(topX + width * 0.38, topY + this.viewportHeight * 0.015);
      ctx.lineTo(topX + drift * 0.42 + width * 0.56, topY + this.viewportHeight * 0.34);
      ctx.lineTo(bottomX + width * 0.72, bottomY);
      ctx.lineTo(bottomX - width * 0.28, bottomY - this.viewportHeight * 0.025);
      ctx.lineTo(topX + drift * 0.38 - width * 0.58, topY + this.viewportHeight * 0.38);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Stronger clock-based grade than the former single low-alpha tint. */
  private renderAmbientGrade(ctx: CanvasRenderingContext2D, sun: ReturnType<Game["getSunLight"]>) {
    const mobile = this.viewportWidth < VIEW_W;
    const scale = mobile ? 0.78 : 1;
    const h = sun.h;
    ctx.save();

    if (sun.night) {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = (0.28 + (this.weather === "rain" ? 0.06 : 0)) * scale;
      ctx.fillStyle = "#18345c";
      ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.035 * scale;
      ctx.fillStyle = "#2f6e78";
      ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    } else {
      const dawnWash = h >= 4.5 && h < 8 ? Math.sin(Math.min(1, (h - 4.5) / 3.5) * Math.PI) * 0.1 : 0;
      const sunsetWash = h >= 15.5 && h < 19.5 ? Math.sin(Math.min(1, (h - 15.5) / 4) * Math.PI) * 0.13 : 0;
      const rainWash = this.weather === "rain" ? 0.12 : this.weather === "cloudy" ? 0.05 : 0;
      if (dawnWash + sunsetWash > 0.005) {
        ctx.globalCompositeOperation = "soft-light";
        ctx.globalAlpha = Math.max(dawnWash, sunsetWash) * scale;
        ctx.fillStyle = sunsetWash > dawnWash ? "#e87860" : "#f2c278";
        ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
      }
      if (rainWash > 0) {
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = rainWash * scale;
        ctx.fillStyle = "#2d5969";
        ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
      }
    }
    ctx.restore();

    if (this.isNight()) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const d of this.world.decor) {
        if (d.kind !== "lamp") continue;
        const sx = (d.x + 7 - this.cam.x) * ZOOM;
        const sy = (d.y + 10 - this.cam.y) * ZOOM;
        if (sx < -220 || sy < -220 || sx > this.viewportWidth + 220 || sy > this.viewportHeight + 220) continue;
        const grad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 170);
        grad.addColorStop(0, "rgba(255,223,130,0.6)");
        grad.addColorStop(0.35, "rgba(255,184,83,0.2)");
        grad.addColorStop(1, "rgba(255,184,83,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(sx - 170, sy - 170, 340, 340);
      }
      ctx.restore();
    }
  }

  /** Animated water and rain-wet highlights drawn in screen space. */
  private renderWaterReflections(ctx: CanvasRenderingContext2D) {
    const sun = this.getSunLight();
    const mobile = this.viewportWidth < VIEW_W;
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(this.cam.y / TILE) - 1);
    const x1 = Math.min(MAP_W, x0 + Math.ceil(this.viewportWidth / ZOOM / TILE) + 3);
    const y1 = Math.min(MAP_H, y0 + Math.ceil(this.viewportHeight / ZOOM / TILE) + 3);
    const frame = Math.floor(performance.now() / 260);
    const reflectionAlpha = (0.075 + sun.daylight * 0.11 + sun.warm * 0.05) * (mobile ? 0.78 : 1);
    const color = this.weather === "rain" ? "#9ccfc4" : sun.night ? "#86bbcb" : sun.warm > 0.25 ? "#ffd18b" : "#bde8c5";

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = reflectionAlpha * (this.weather === "rain" ? 0.72 : 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = mobile ? 1 : 1.5;
    ctx.beginPath();
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const tile = this.world.ground[ty * MAP_W + tx] ?? 0;
        if (tile !== T_WATER) continue;
        const sx = (tx * TILE - this.cam.x) * ZOOM;
        const sy = (ty * TILE - this.cam.y) * ZOOM;
        const phase = (frame + tx * 3 + ty * 5) % 5;
        if (phase !== 0 && (mobile || phase !== 1)) continue;
        const offset = ((frame + tx * 7) % 14) * ZOOM;
        ctx.moveTo(sx + offset, sy + (3 + phase * 4) * ZOOM);
        ctx.lineTo(sx + offset + (mobile ? 9 : 16) * ZOOM, sy + (3 + phase * 4) * ZOOM);
        if (this.weather === "rain" && phase === 0) {
          ctx.moveTo(sx + offset + 4 * ZOOM, sy + 7 * ZOOM);
          ctx.lineTo(sx + offset + 7 * ZOOM, sy + 5 * ZOOM);
        }
      }
    }
    ctx.stroke();

    // Selective wet-ground glints keep rain visually distinct without filling
    // every tile with noisy highlights.
    if (this.weather === "rain") {
      ctx.globalAlpha = mobile ? 0.1 : 0.14;
      ctx.strokeStyle = "#a8d1be";
      ctx.beginPath();
      for (let ty = y0; ty < y1; ty++) {
        for (let tx = x0; tx < x1; tx++) {
          const tile = this.world.ground[ty * MAP_W + tx] ?? 0;
          if (tile !== T_PATH && tile !== T_DIRT && tile !== T_FARM) continue;
          if ((tx * 11 + ty * 7 + frame) % 7 !== 0) continue;
          const sx = (tx * TILE - this.cam.x) * ZOOM;
          const sy = (ty * TILE - this.cam.y) * ZOOM;
          ctx.moveTo(sx + 7, sy + 11);
          ctx.lineTo(sx + 18, sy + 11);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderLighting(ctx: CanvasRenderingContext2D) {
    const sun = this.getSunLight();
    this.renderSunRays(ctx, sun);
    this.renderAmbientGrade(ctx, sun);
  }

  private renderRain(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "rgba(180,210,240,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const d of this.rainDrops) {
      d.y += d.v / 60;
      d.x += 3;
      if (d.y > this.viewportHeight) {
        d.y = -20;
        d.x = Math.random() * this.viewportWidth;
      }
      if (d.x > this.viewportWidth) d.x = 0;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 6, d.y - 18);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderMinimap(ctx: CanvasRenderingContext2D) {
    const mw = 210;
    const mh = 158;
    const px = this.viewportWidth - mw - 34;
    const py = 132;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#241d14";
    ctx.fillRect(px - 4, py - 4, mw + 8, mh + 8);
    ctx.fillStyle = "#4f7a38";
    ctx.fillRect(px, py, mw, mh);
    const sx = mw / MAP_W;
    const sy = mh / MAP_H;
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        const t = this.world.ground[y * MAP_W + x] ?? 0;
        if (t === 0) continue;
        ctx.fillStyle =
          t === T_PATH ? "#c9b78e" : t === T_WATER ? "#3f7fb5" : t === T_SAND ? "#d8c48d" : t === T_BRIDGE ? "#a97c48" : t === T_FARM ? "#8b6136" : "#a0784c";
        ctx.fillRect(px + x * sx, py + y * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
    ctx.fillStyle = "#c86a4a";
    for (const b of this.world.buildings) {
      ctx.fillRect(px + (b.x / TILE) * sx, py + (b.y / TILE) * sy, (b.w / TILE) * sx, (b.h / TILE) * sy);
    }
    ctx.fillStyle = "#f2e6b8";
    for (const n of this.npcs) ctx.fillRect(px + (n.x / TILE) * sx - 1, py + (n.y / TILE) * sy - 1, 2, 2);
    ctx.fillStyle = "#ffe14d";
    ctx.fillRect(px + (this.player.x / TILE) * sx - 2, py + (this.player.y / TILE) * sy - 2, 5, 5);
    // quest marker on minimap
    const qm = this.computeQuestMarker();
    if (qm) {
      ctx.fillStyle = "#e53935";
      ctx.fillRect(px + (qm.x / TILE) * sx - 2, py + (qm.y / TILE) * sy - 2, 5, 5);
    }
    ctx.strokeStyle = "#8a6a3f";
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 4, py - 4, mw + 8, mh + 8);
    ctx.restore();
  }

  /* ---------------- persistence ---------------- */

  private sanitizeInventory(raw: unknown) {
    const next: Record<Tab, (Stack | null)[]> = {
      seeds: emptySlots(12),
      harvest: emptySlots(12),
      pesticides: emptySlots(12),
      tools: emptySlots(12),
      items: emptySlots(12),
      quest: emptySlots(12),
    };
    if (!isRecord(raw)) return next;
    for (const tab of TAB_IDS) {
      const source = raw[tab];
      if (!Array.isArray(source)) continue;
      for (let i = 0; i < Math.min(12, source.length); i++) {
        const value = source[i];
        if (!isRecord(value)) continue;
        const stack = value as { id?: unknown; count?: unknown; name?: unknown };
        if (typeof stack.id !== "string") continue;
        const count = Math.floor(clampNumber(stack.count, 1, 9999, 0));
        if (count <= 0) continue;
        next[tab][i] = {
          type: tab,
          id: stack.id as string,
          name: typeof stack.name === "string" ? stack.name.slice(0, 120) : (stack.id as string),
          count,
        };
      }
    }
    return next;
  }

  private sanitizePlots(raw: unknown, legacyGrowthUnits: boolean) {
    const plots = new Map<string, Plot>();
    if (!Array.isArray(raw)) return plots;
    for (const value of raw) {
      if (!isRecord(value)) continue;
      const plotValue = value as { tx?: unknown; ty?: unknown; crop?: unknown; tilled?: unknown; water?: unknown };
      const tx = Number.isInteger(plotValue.tx) ? Number(plotValue.tx) : -1;
      const ty = Number.isInteger(plotValue.ty) ? Number(plotValue.ty) : -1;
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || tileAt(this.world, tx * TILE + 1, ty * TILE + 1) !== T_FARM) continue;
      let crop: Plot["crop"] = null;
      const cropValue = isRecord(plotValue.crop) ? (plotValue.crop as {
        id?: unknown;
        growth?: unknown;
        health?: unknown;
        pest?: unknown;
        pestTime?: unknown;
        dead?: unknown;
      }) : null;
      if (cropValue && isCropId(cropValue.id)) {
        const def = CROPS[cropValue.id];
        const scale = legacyGrowthUnits ? LEGACY_GROWTH_UNIT_SCALE : 1;
        const growth = clampNumber(cropValue.growth, 0, def.stageTime * 6, 0) * scale;
        crop = {
          id: cropValue.id,
          growth: Math.min(def.stageTime * 6, growth),
          health: clampNumber(cropValue.health, 0, 100, 100),
          pest: cropValue.pest === null || cropValue.pest === undefined ? null : isPestId(cropValue.pest) ? cropValue.pest : null,
          pestTime: clampNumber(cropValue.pestTime, 0, 100000, 0),
          dead: cropValue.dead === true,
        };
      }
      const plot: Plot = {
        tx,
        ty,
        tilled: plotValue.tilled === true,
        water: clampNumber(plotValue.water, 0, 100, 0),
        crop,
      };
      plots.set(this.plotKey(tx, ty), plot);
    }
    return plots;
  }

  save() {
    try {
      const data = {
        v: SAVE_SCHEMA_VERSION,
        money: this.money,
        xp: this.xp,
        health: this.health,
        day: this.day,
        minutes: this.minutes,
        weather: this.weather,
        canWater: this.canWater,
        tool: this.tool,
        player: { x: this.player.x, y: this.player.y, dir: this.player.dir },
        inventory: this.inventory,
        plots: Array.from(this.plots.values()),
        discovered: Array.from(this.discovered),
        harvested: this.harvested,
        questIndex: this.questIndex,
        questProgress: this.questProgress,
        questsDone: this.questsDone,
        selectedSeed: this.selectedSeed,
        selectedPesticide: this.selectedPesticide,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — game continues in memory */
    }
  }

  static hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as unknown;
      if (!isRecord(data)) return false;
      const save = data as {
        v?: unknown;
        money?: unknown;
        xp?: unknown;
        health?: unknown;
        day?: unknown;
        minutes?: unknown;
        weather?: unknown;
        canWater?: unknown;
        tool?: unknown;
        player?: unknown;
        inventory?: unknown;
        plots?: unknown;
        discovered?: unknown;
        harvested?: unknown;
        questIndex?: unknown;
        questProgress?: unknown;
        questsDone?: unknown;
        selectedSeed?: unknown;
        selectedPesticide?: unknown;
      };
      const version = save.v === undefined ? 0 : typeof save.v === "number" ? save.v : NaN;
      if (!Number.isInteger(version) || version < 0 || version > SAVE_SCHEMA_VERSION) return false;

      // Never merge a save into the current runtime. Start clean, then apply
      // only validated fields from the save payload.
      this.initializeNewGameState("none");
      this.money = clampNumber(save.money, 0, 999999, this.money);
      this.xp = clampNumber(save.xp, 0, 999999, this.xp);
      this.health = clampNumber(save.health, 0, 100, this.health);
      this.day = Math.floor(clampNumber(save.day, 1, 999999, this.day));
      this.minutes = clampNumber(save.minutes, 0, GAME_DAY_MINUTES - Number.EPSILON, this.minutes);
      this.weather = save.weather === "sunny" || save.weather === "cloudy" || save.weather === "rain" ? save.weather : this.weather;
      this.canWater = clampNumber(save.canWater, 0, 100, this.canWater);
      this.tool = isToolId(save.tool) ? save.tool : this.tool;
      if (isRecord(save.player)) {
        const player = save.player as { x?: unknown; y?: unknown; dir?: unknown };
        this.player.x = clampNumber(player.x, 0, MAP_W * TILE - 16, this.player.x);
        this.player.y = clampNumber(player.y, 0, MAP_H * TILE - 24, this.player.y);
        this.player.dir = isDir(player.dir) ? player.dir : this.player.dir;
      }
      // Missing optional fields retain the clean new-game defaults. Present
      // fields are sanitized independently so unknown fields are ignored.
      if (save.inventory !== undefined) this.inventory = this.sanitizeInventory(save.inventory);
      this.plots = this.sanitizePlots(save.plots, version < SAVE_SCHEMA_VERSION);
      this.discovered = new Set(Array.isArray(save.discovered) ? save.discovered.filter(isPestId) : []);
      if (isRecord(save.harvested)) {
        for (const cropId of CROP_IDS) this.harvested[cropId] = Math.floor(clampNumber(save.harvested[cropId], 0, 999999, 0));
      }
      this.questIndex = Math.floor(clampNumber(save.questIndex, 0, QUESTS.length, this.questIndex));
      const currentQuest = QUESTS[this.questIndex];
      this.questProgress = clampNumber(save.questProgress, 0, currentQuest?.target ?? 0, 0);
      this.questsDone = Array.isArray(save.questsDone) ? save.questsDone.filter(isQuestId) : [];
      if (save.selectedSeed !== undefined) {
        this.selectedSeed = save.selectedSeed === null ? null : isCropId(save.selectedSeed) ? save.selectedSeed : null;
      }
      if (save.selectedPesticide !== undefined) {
        this.selectedPesticide = save.selectedPesticide === null ? null : isPesticideId(save.selectedPesticide) ? save.selectedPesticide : null;
      }
      this.cam.x = this.player.x - this.viewportWidth / (2 * ZOOM);
      this.cam.y = this.player.y - this.viewportHeight / (2 * ZOOM);
      this.audio.setRain(this.weather === "rain");
      return true;
    } catch {
      return false;
    }
  }

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.initializeNewGameState("none");
    this.emit(true);
  }

  /* ---------------- snapshot ---------------- */

  snapshot(): Snapshot {
    const q = this.currentQuest;
    return {
      money: Math.round(this.money),
      xp: this.xp,
      level: this.level,
      day: this.day,
      clock: this.clock,
      phase: this.phase,
      weather: this.weather,
      tool: this.tool,
      canWater: Math.round(this.canWater),
      health: Math.round(this.health),
      prompt: this.prompt,
      contextAction: this.contextAction,
      overlay: this.overlay,
      inventory: this.inventory,
      selectedSeed: this.selectedSeed,
      selectedPesticide: this.selectedPesticide,
      quest: q
        ? {
            id: q.id,
            title: q.title,
            desc: q.desc,
            progress: q.id === "coins1000" ? Math.min(this.money, q.target) : this.questProgress,
            target: q.target,
          }
        : null,
      questsDone: this.questsDone,
      dialogue: this.dialogue
        ? {
            name: this.dialogue.npc.name,
            role: this.dialogue.npc.role,
            line: this.dialogue.npc.lines[this.dialogue.index] ?? "",
            index: this.dialogue.index,
            total: this.dialogue.npc.lines.length,
          }
        : null,
      shop: this.shop,
      diagnosis: this.diagnosis
        ? {
            stage: this.diagnosis.stage,
            cropName: this.diagnosis.plot.crop ? CROPS[this.diagnosis.plot.crop.id].name : "",
            symptoms: PESTS[this.diagnosis.pest].symptoms,
            options: this.diagnosis.options,
            revealed: this.diagnosis.revealed,
            correct: this.diagnosis.correct,
            explain: this.diagnosis.explain,
            question: this.diagnosis.question
              ? {
                  category: this.diagnosis.question.category,
                  text: this.diagnosis.question.question,
                  options: this.diagnosis.question.options,
                }
              : null,
            questionAnswered: this.diagnosis.questionAnswered,
            questionCorrect: this.diagnosis.questionCorrect,
            questionExplain:
              this.diagnosis.question && this.diagnosis.questionAnswered !== null ? this.diagnosis.question.explanation : "",
            managementOptions: MANAGEMENT_OPTIONS,
            managementChoiceIndex: this.diagnosis.managementChoiceIndex,
            managementCorrect: this.diagnosis.managementCorrect,
            managementExplain:
              this.diagnosis.managementChoiceIndex !== null
                ? MANAGEMENT_EXPLANATIONS[this.diagnosis.managementChoiceIndex] ?? ""
                : "",
            reward: this.diagnosis.reward,
          }
        : null,
      discovered: Array.from(this.discovered),
      harvested: this.harvested,
      totalHarvest: CROP_IDS.reduce((n, c) => n + (this.harvested[c] ?? 0), 0),
      toasts: this.toasts.map((t) => ({ id: t.id, text: t.text, tone: t.tone })),
      muted: this.audio.muted,
      questMarker: this.computeQuestMarker(),
    };
  }

  emit(force = false) {
    if (force) this.emitT = 0;
    this.onChange(this.snapshot());
  }
}

export { TOOL_NAMES, TOOL_ORDER };
