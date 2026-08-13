/**
 * JUST FARM — static game database.
 * Crops, pests, shop catalogue, quest chain and educational content.
 */

export type CropId = "corn" | "sugarcane" | "rice" | "tomato" | "chili";
export type PestId = "grub" | "whitefly" | "armyworm" | "grasshopper";
export type PesticideId = "soil" | "systemic" | "bio" | "general";

export interface CropDef {
  id: CropId;
  name: string;
  nameId: string;
  /** Game minutes of growth needed per stage (6 stages total). */
  stageTime: number;
  /** Water drained per in-game minute. */
  thirst: number;
  pestChance: number;
  price: number;
  seedPrice: number;
  color: string;
  leaf: string;
}

export const CROPS: Record<CropId, CropDef> = {
  corn: {
    id: "corn",
    name: "Jagung",
    nameId: "Jagung",
    stageTime: 416,
    thirst: 0.055,
    pestChance: 0.09,
    price: 100,
    seedPrice: 40,
    color: "#f2c53d",
    leaf: "#5aa03c",
  },
  sugarcane: {
    id: "sugarcane",
    name: "Tebu",
    nameId: "Tebu",
    stageTime: 544,
    thirst: 0.05,
    pestChance: 0.1,
    price: 150,
    seedPrice: 65,
    color: "#9ad14b",
    leaf: "#3f8f36",
  },
  rice: {
    id: "rice",
    name: "Padi",
    nameId: "Padi",
    stageTime: 480,
    thirst: 0.075,
    pestChance: 0.08,
    price: 120,
    seedPrice: 50,
    color: "#e3cf6b",
    leaf: "#6fb043",
  },
  tomato: {
    id: "tomato",
    name: "Tomat",
    nameId: "Tomat",
    stageTime: 384,
    thirst: 0.065,
    pestChance: 0.11,
    price: 110,
    seedPrice: 45,
    color: "#d9382c",
    leaf: "#3f8f42",
  },
  chili: {
    id: "chili",
    name: "Cabai",
    nameId: "Cabai",
    stageTime: 352,
    thirst: 0.06,
    pestChance: 0.12,
    price: 130,
    seedPrice: 55,
    color: "#c8202a",
    leaf: "#47903a",
  },
};

export const CROP_IDS = Object.keys(CROPS) as CropId[];

export const STAGE_NAMES = [
  "Biji",
  "Tunas",
  "Tanaman Kecil",
  "Tumbuh",
  "Dewasa",
  "Siap Panen",
];

export interface PestDef {
  id: PestId;
  name: string;
  nameId: string;
  cure: PesticideId;
  hosts: CropId[];
  symptoms: string[];
  fact: string;
  info: string;
  body: string;
  accent: string;
}

export const PESTS: Record<PestId, PestDef> = {
  grub: {
    id: "grub",
    name: "Uret",
    nameId: "Uret",
    cure: "soil",
    hosts: ["sugarcane", "corn"],
    symptoms: ["Daun menguning", "Batang layu", "Akar lemah dan termakan"],
    info: "Larva kumbang hidup di dalam tanah dan memakan akar tanaman, sehingga tanaman perlahan kering meskipun disiram.",
    fact: "Petani di Bandungrejo sering menemukan uret saat membajak — mengumpulkannya dengan tangan sebelum menanam sangat mengurangi kerusakan.",
    body: "#f4ead2",
    accent: "#c98a4b",
  },
  whitefly: {
    id: "whitefly",
    name: "Kutu Kebul",
    nameId: "Kutu Kebul",
    cure: "systemic",
    hosts: ["corn", "tomato", "chili"],
    symptoms: ["Daun berbintik kuning", "Tepi daun menggulung", "Embun madu lengket & penyebaran virus"],
    info: "Serangga putih kecil terbang bersembunyi di bawah daun, mengisap cairan tanaman dan menyebarkan virus keriting daun antar tanaman.",
    fact: "Perangkap lengket kuning menangkap kutu kebul dewasa dengan murah dan memberi tahu Anda wabah dimulai sebelum daun menggulung.",
    body: "#fdfdfa",
    accent: "#d8dbc0",
  },
  armyworm: {
    id: "armyworm",
    name: "Ulat Grayak",
    nameId: "Ulat Grayak",
    cure: "bio",
    hosts: ["corn", "rice", "chili"],
    symptoms: ["Lubang tidak rata di daun", "Tulang daun termakan", "Kotoran di gulungan daun"],
    info: "Ulat memakan daun dalam kelompok pada malam hari dengan cepat. Pestisida hayati dengan Bacillus thuringiensis menghentikan mereka tanpa membahayakan lebah.",
    fact: "Ulat grayak bergerak dari ladang ke ladang dalam gelombang — itulah sebabnya disebut ulat 'tentara'.",
    body: "#7a8c3f",
    accent: "#3d4a1c",
  },
  grasshopper: {
    id: "grasshopper",
    name: "Belalang",
    nameId: "Belalang",
    cure: "general",
    hosts: ["rice", "corn", "sugarcane"],
    symptoms: ["Tepi daun termakan", "Tunas muda terpotong", "Serangga melompat saat Anda lewat"],
    info: "Belalang mengunyah jaringan daun dan malai muda. Pestisida kontak umum, digunakan secukupnya, dapat menurunkan populasi.",
    fact: "Bebek yang dilepas ke sawah yang sudah dipanen adalah cara tradisional Jawa untuk mengendalikan belalang secara alami.",
    body: "#8fbf4a",
    accent: "#4d7327",
  },
};

export const PEST_IDS = Object.keys(PESTS) as PestId[];

export interface PesticideDef {
  id: PesticideId;
  name: string;
  desc: string;
  price: number;
  color: string;
}

export const PESTICIDES: Record<PesticideId, PesticideDef> = {
  soil: {
    id: "soil",
    name: "Insektisida Tanah",
    desc: "Butiran yang dimasukkan ke tanah. Membunuh larva pemakan akar seperti uret.",
    price: 80,
    color: "#a8763f",
  },
  systemic: {
    id: "systemic",
    name: "Insektisida Sistemik",
    desc: "Diserap tanaman, meracuni hama pengisap cairan seperti kutu kebul.",
    price: 95,
    color: "#4a86c9",
  },
  bio: {
    id: "bio",
    name: "Pestisida Hayati",
    desc: "Bacillus thuringiensis. Aman untuk penyerbuk, mematikan bagi ulat.",
    price: 110,
    color: "#4fa860",
  },
  general: {
    id: "general",
    name: "Insektisida Umum",
    desc: "Semprotan kontak luas untuk serangga pengunyah seperti belalang.",
    price: 70,
    color: "#c9564a",
  },
};

export const PESTICIDE_IDS = Object.keys(PESTICIDES) as PesticideId[];

export const MISC_ITEMS = {
  fertilizer: { name: "Pupuk", price: 60, desc: "Mempercepat tumbuh satu tanaman satu tahap." },
  watertank: { name: "Tangki Air", price: 120, desc: "Mengisi penuh kaleng penyiram Anda." },
} as const;

export type QuestId =
  | "chief"
  | "buyseed"
  | "plantcorn"
  | "watercorn"
  | "harvestcorn"
  | "sellcorn"
  | "whitefly"
  | "plantcane"
  | "grub"
  | "coins1000"
  | "harvest20"
  | "restore";

export interface QuestDef {
  id: QuestId;
  title: string;
  desc: string;
  target: number;
  reward: number;
  xp: number;
}

export const QUESTS: QuestDef[] = [
  { id: "chief", title: "Temui Kepala Desa", desc: "Bicara dengan Pak Warno di Balai Desa.", target: 1, reward: 50, xp: 5 },
  { id: "buyseed", title: "Beli Benih", desc: "Beli benih apa saja di Toko Benih.", target: 1, reward: 40, xp: 5 },
  { id: "plantcorn", title: "Tanam Jagung", desc: "Tanam 1 benih jagung di tanah yang sudah diolah.", target: 1, reward: 40, xp: 5 },
  { id: "watercorn", title: "Siram Tanamanmu", desc: "Siram tanaman yang ditanam 3 kali.", target: 3, reward: 50, xp: 8 },
  { id: "harvestcorn", title: "Panen Pertama", desc: "Panen 1 jagung.", target: 1, reward: 80, xp: 10 },
  { id: "sellcorn", title: "Jual di Balai Desa", desc: "Jual 1 jagung dari inventarismu.", target: 1, reward: 60, xp: 8 },
  { id: "whitefly", title: "Atasi Kutu Kebul", desc: "Diagnosis dengan benar & sembuhkan serangan kutu kebul.", target: 1, reward: 120, xp: 15 },
  { id: "plantcane", title: "Tanam Tebu", desc: "Tanam 2 benih tebu.", target: 2, reward: 90, xp: 10 },
  { id: "grub", title: "Atasi Uret", desc: "Diagnosis dengan benar & sembuhkan serangan uret.", target: 1, reward: 150, xp: 18 },
  { id: "coins1000", title: "Tabungan Desa", desc: "Punya 1000 koin sekaligus.", target: 1000, reward: 150, xp: 20 },
  { id: "harvest20", title: "Petani Sejati", desc: "Panen 20 tanaman total.", target: 20, reward: 250, xp: 30 },
  { id: "restore", title: "Pulihkan Bandungrejo", desc: "Panen 20 jagung, 20 tebu, 10 padi, 10 tomat, 10 cabai dan punya 5000 koin.", target: 1, reward: 1000, xp: 100 },
];

export const WIN_TARGETS: Record<CropId, number> = {
  corn: 20,
  sugarcane: 20,
  rice: 10,
  tomato: 10,
  chili: 10,
};
export const WIN_COINS = 5000;

export type Weather = "sunny" | "cloudy" | "rain";
export type Phase = "Pagi" | "Siang" | "Sore" | "Malam";
