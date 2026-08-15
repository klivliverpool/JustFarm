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
  /** Nama ilmiah singkat, untuk konteks edukasi tambahan. */
  scientificName: string;
  /** Kategori hama secara singkat. */
  kind: string;
  /** Ciri-ciri untuk mengenali hama ini di lapangan. */
  recognize: string[];
  /** Bagian tanaman yang paling sering diserang. */
  partsAttacked: string;
  /** Bagaimana hama ini menyerang / merusak tanaman. */
  mechanism: string;
  /** Dampak serangan terhadap tanaman & hasil panen. */
  impact: string;
  /** Langkah pencegahan sebelum serangan terjadi. */
  prevention: string[];
  /** Cara memantau keberadaan hama di lahan. */
  monitoring: string[];
  /** Ringkasan pendekatan pengendalian yang tepat (gaya PHT). */
  control: string;
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
    scientificName: "Larva Coleoptera (kumbang tanah)",
    kind: "Larva serangga tanah",
    recognize: [
      "Tanaman layu meski disiram cukup",
      "Akar tampak terpotong atau termakan saat dicabut",
      "Tanah di sekitar akar terasa longgar",
    ],
    partsAttacked: "Akar dan bagian bawah batang",
    mechanism: "Larva memakan akar di dalam tanah sehingga tanaman kehilangan kemampuan menyerap air dan hara.",
    impact: "Pertumbuhan terhambat, tanaman mudah roboh, dan pada serangan berat tanaman mati sebelum panen.",
    prevention: [
      "Membajak tanah sebelum tanam untuk mengangkat larva ke permukaan",
      "Rotasi tanaman dengan jenis yang bukan inangnya",
      "Menjaga kebersihan sisa tanaman dan gulma di lahan",
    ],
    monitoring: [
      "Periksa akar tanaman yang layu tanpa sebab jelas",
      "Gali tanah di sekitar tanaman yang lemah untuk memeriksa larva",
      "Amati saat pengolahan tanah — larva sering langsung terlihat",
    ],
    control:
      "Insektisida tanah (butiran) yang dibenamkan di sekitar perakaran adalah cara paling efektif karena larva hidup di bawah permukaan tanah, di luar jangkauan semprotan daun.",
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
    scientificName: "Bemisia tabaci",
    kind: "Serangga penghisap cairan tanaman",
    recognize: [
      "Bintik kuning pada permukaan daun",
      "Daun menggulung ke atas",
      "Lapisan lengket (embun madu) dan jamur hitam di bawah daun",
    ],
    partsAttacked: "Daun, terutama bagian bawah daun",
    mechanism:
      "Mengisap cairan sel daun dengan alat mulut jarum, mengeluarkan embun madu, dan dapat menularkan virus antar tanaman.",
    impact: "Daun menguning, fotosintesis terganggu, dan penularan virus keriting daun menurunkan hasil panen secara drastis.",
    prevention: [
      "Memasang perangkap lengket berwarna kuning di sekitar lahan",
      "Menghindari menanam tomat/cabai terlalu berdekatan",
      "Membersihkan gulma inang di sekitar lahan",
    ],
    monitoring: [
      "Tepuk daun perlahan — kutu kebul dewasa akan beterbangan",
      "Periksa bagian bawah daun secara berkala",
      "Pasang perangkap kuning dan hitung jumlah tertangkap per minggu",
    ],
    control:
      "Insektisida sistemik yang diserap jaringan tanaman efektif membunuh serangga pengisap cairan seperti kutu kebul, termasuk yang bersembunyi di bawah daun.",
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
    scientificName: "Spodoptera spp.",
    kind: "Ulat (larva ngengat) pemakan daun",
    recognize: [
      "Lubang besar tidak beraturan pada daun",
      "Tulang daun tersisa tanpa daging daun",
      "Kotoran ulat (butiran hitam) di sekitar gulungan daun",
    ],
    partsAttacked: "Daun dan kadang pucuk muda",
    mechanism:
      "Berkelompok memakan daun secara cepat pada malam hari, bergerak dari satu tanaman ke tanaman lain seperti gelombang pasukan.",
    impact: "Kehilangan daun mengurangi fotosintesis; serangan berat pada tanaman muda dapat menggagalkan pertumbuhan.",
    prevention: [
      "Memantau ladang pada malam hari saat ulat aktif",
      "Menjaga predator alami seperti burung dan laba-laba",
      "Membersihkan sisa tanaman inang setelah panen",
    ],
    monitoring: [
      "Periksa daun pada pagi hari untuk melihat bekas gigitan baru",
      "Cari kotoran ulat di gulungan daun",
      "Gunakan senter pada malam hari untuk melihat ulat secara langsung",
    ],
    control:
      "Pestisida hayati berbasis Bacillus thuringiensis efektif membunuh ulat tanpa membahayakan lebah dan serangga penyerbuk lain.",
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
    scientificName: "Ordo Orthoptera",
    kind: "Serangga pengunyah daun bersayap",
    recognize: [
      "Tepi daun tampak tergigit tidak rata",
      "Tunas muda terpotong",
      "Belalang melompat menjauh saat didekati",
    ],
    partsAttacked: "Daun dan malai atau tunas muda",
    mechanism:
      "Mengunyah jaringan daun dan malai dengan rahang kuat, dapat berpindah cepat antar petak lahan dalam kelompok besar.",
    impact: "Kerusakan daun mengurangi hasil fotosintesis; pada malai muda dapat menurunkan hasil panen secara langsung.",
    prevention: [
      "Menjaga kebersihan gulma di pematang sawah tempat belalang bertelur",
      "Memanfaatkan predator alami seperti unggas (bebek/ayam)",
      "Menanam serempak agar populasi belalang tidak berpindah terus-menerus",
    ],
    monitoring: [
      "Amati tepi daun untuk bekas gigitan baru",
      "Perhatikan lompatan serangga saat berjalan di ladang",
      "Hitung jumlah belalang per rumpun secara berkala",
    ],
    control:
      "Insektisida kontak umum, digunakan secukupnya sesuai dosis, efektif menurunkan populasi belalang yang mengunyah jaringan daun.",
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

export type PestQuestionCategory =
  | "symptom"
  | "biology"
  | "damage"
  | "prevention"
  | "control"
  | "monitoring"
  | "environment";

export interface PestQuestion {
  id: string;
  pestId: PestId;
  cropIds: CropId[];
  category: PestQuestionCategory;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const PEST_QUESTIONS: PestQuestion[] = [
  {
    id: "grub-biology-1",
    pestId: "grub",
    cropIds: ["sugarcane", "corn"],
    category: "biology",
    question: "Di mana uret (larva kumbang) biasanya hidup dan menyerang tanaman?",
    options: ["Di dalam tanah, memakan akar", "Di permukaan daun", "Di dalam batang atas", "Di udara sekitar tanaman"],
    correctIndex: 0,
    explanation: "Uret adalah larva yang hidup di dalam tanah dan memakan akar, sehingga serangan sulit terlihat dari atas tanah.",
  },
  {
    id: "grub-monitoring-1",
    pestId: "grub",
    cropIds: ["sugarcane", "corn"],
    category: "monitoring",
    question: "Cara terbaik memastikan tanaman terserang uret adalah...",
    options: [
      "Menyemprot daun dan melihat reaksinya",
      "Menggali tanah di sekitar akar tanaman yang layu",
      "Menunggu tanaman berbunga",
      "Mengamati warna batang saja",
    ],
    correctIndex: 1,
    explanation: "Karena uret hidup di dalam tanah, cara paling pasti untuk memastikannya adalah memeriksa akar dan tanah secara langsung.",
  },
  {
    id: "grub-prevention-1",
    pestId: "grub",
    cropIds: ["sugarcane", "corn"],
    category: "prevention",
    question: "Tindakan pencegahan uret yang paling tepat sebelum tanam adalah...",
    options: ["Membajak tanah untuk mengangkat larva ke permukaan", "Menyiram lebih sering", "Menambah pupuk daun", "Memangkas daun tua"],
    correctIndex: 0,
    explanation: "Membajak mengangkat larva ke permukaan tanah sehingga terkena panas matahari atau dimakan predator sebelum sempat merusak akar.",
  },
  {
    id: "whitefly-symptom-1",
    pestId: "whitefly",
    cropIds: ["corn", "tomato", "chili"],
    category: "symptom",
    question: "Tanda khas serangan kutu kebul pada daun adalah...",
    options: ["Daun berbintik kuning dan menggulung", "Daun berlubang besar tidak rata", "Akar membusuk", "Batang patah mendadak"],
    correctIndex: 0,
    explanation: "Kutu kebul mengisap cairan daun sehingga muncul bintik kuning dan daun menggulung ke atas.",
  },
  {
    id: "whitefly-biology-1",
    pestId: "whitefly",
    cropIds: ["corn", "tomato", "chili"],
    category: "biology",
    question: "Bagaimana kutu kebul dapat memperparah kerusakan tanaman selain mengisap cairan?",
    options: ["Menyebarkan virus keriting daun", "Menggali lubang di tanah", "Memakan buah langsung", "Membuat sarang di batang"],
    correctIndex: 0,
    explanation: "Selain mengisap cairan, kutu kebul juga menjadi vektor virus keriting daun yang menular antar tanaman.",
  },
  {
    id: "whitefly-monitoring-1",
    pestId: "whitefly",
    cropIds: ["corn", "tomato", "chili"],
    category: "monitoring",
    question: "Cara sederhana memantau populasi kutu kebul dewasa di lahan adalah...",
    options: ["Memasang perangkap lengket kuning", "Menghitung jumlah bunga", "Mengukur suhu tanah", "Memeriksa akar tanaman"],
    correctIndex: 0,
    explanation: "Perangkap lengket berwarna kuning menarik dan menangkap kutu kebul dewasa, memberi peringatan dini sebelum wabah membesar.",
  },
  {
    id: "whitefly-control-1",
    pestId: "whitefly",
    cropIds: ["corn", "tomato", "chili"],
    category: "control",
    question: "Mengapa insektisida sistemik cocok digunakan untuk kutu kebul?",
    options: [
      "Diserap tanaman sehingga meracuni hama pengisap cairan",
      "Hanya bekerja di dalam tanah",
      "Aman disemprot ke tanah saja",
      "Hanya efektif pada malam hari",
    ],
    correctIndex: 0,
    explanation: "Insektisida sistemik diserap ke seluruh jaringan tanaman, sehingga meracuni hama yang mengisap cairan tanaman seperti kutu kebul, termasuk yang bersembunyi di bawah daun.",
  },
  {
    id: "armyworm-damage-1",
    pestId: "armyworm",
    cropIds: ["corn", "rice", "chili"],
    category: "damage",
    question: "Ciri kerusakan daun akibat ulat grayak adalah...",
    options: ["Lubang besar tidak rata dengan tulang daun tersisa", "Bintik kuning halus", "Daun menggulung rapi", "Batang berlubang kecil"],
    correctIndex: 0,
    explanation: "Ulat grayak memakan daging daun dalam jumlah besar dengan cepat, menyisakan tulang daun dan lubang tidak beraturan.",
  },
  {
    id: "armyworm-environment-1",
    pestId: "armyworm",
    cropIds: ["corn", "rice", "chili"],
    category: "environment",
    question: "Mengapa ulat grayak sering disebut ulat 'tentara'?",
    options: ["Bergerak berkelompok dari ladang ke ladang", "Hanya menyerang satu tanaman seumur hidup", "Hidup sendiri di dalam tanah", "Tidak pernah berpindah tempat"],
    correctIndex: 0,
    explanation: "Ulat grayak bergerak dalam kelompok besar dari satu ladang ke ladang lain seperti gelombang pasukan, itulah asal julukan 'tentara'.",
  },
  {
    id: "armyworm-control-1",
    pestId: "armyworm",
    cropIds: ["corn", "rice", "chili"],
    category: "control",
    question: "Mengapa pestisida hayati (Bacillus thuringiensis) direkomendasikan untuk ulat grayak?",
    options: ["Efektif membunuh ulat tapi aman bagi lebah", "Bekerja hanya di dalam tanah", "Membunuh semua jenis serangga tanpa pilih", "Hanya efektif pada akar"],
    correctIndex: 0,
    explanation: "Bacillus thuringiensis bekerja spesifik pada ulat sehingga efektif membunuhnya tanpa membahayakan lebah dan penyerbuk lain.",
  },
  {
    id: "grasshopper-symptom-1",
    pestId: "grasshopper",
    cropIds: ["rice", "corn", "sugarcane"],
    category: "symptom",
    question: "Tanda serangan belalang pada tanaman biasanya berupa...",
    options: ["Tepi daun tergigit tidak rata dan tunas muda terpotong", "Daun berbintik kuning", "Akar dimakan habis", "Batang berlendir"],
    correctIndex: 0,
    explanation: "Belalang mengunyah tepi daun hingga tidak rata dan dapat memotong tunas muda tanaman.",
  },
  {
    id: "grasshopper-prevention-1",
    pestId: "grasshopper",
    cropIds: ["rice", "corn", "sugarcane"],
    category: "prevention",
    question: "Cara tradisional yang efektif mengendalikan populasi belalang secara alami adalah...",
    options: ["Melepas unggas seperti bebek ke lahan", "Menyiram lebih sering", "Menambah cahaya lampu malam", "Memangkas akar tanaman"],
    correctIndex: 0,
    explanation: "Unggas seperti bebek adalah predator alami belalang dan merupakan cara tradisional Jawa untuk mengendalikannya tanpa pestisida.",
  },
  {
    id: "grasshopper-monitoring-1",
    pestId: "grasshopper",
    cropIds: ["rice", "corn", "sugarcane"],
    category: "monitoring",
    question: "Tanda paling mudah dikenali saat belalang ada di sekitar tanaman adalah...",
    options: ["Serangga melompat menjauh saat didekati", "Daun berubah warna ungu", "Tanah menjadi basah", "Bau menyengat dari batang"],
    correctIndex: 0,
    explanation: "Belalang mudah dikenali dari gerakan melompat menjauh saat didekati, berbeda dari hama lain yang cenderung diam atau bersembunyi.",
  },
];

export const PEST_QUESTION_IDS = PEST_QUESTIONS.map((q) => q.id);

/** Opsi keputusan manajemen hama generik, dipakai setelah menjawab pertanyaan edukasi. */
export const MANAGEMENT_OPTIONS: string[] = [
  "Menyemprotkan pestisida sebanyak mungkin agar hama cepat hilang",
  "Membiarkan saja karena hama akan hilang sendiri",
  "Menggunakan metode pengendalian yang sesuai dengan jenis hama, secukupnya dan tepat waktu",
  "Mengganti tanaman dengan jenis lain tanpa mengatasi hamanya",
];

export const MANAGEMENT_CORRECT_INDEX = 2;

export const MANAGEMENT_EXPLANATIONS: string[] = [
  "Pestisida berlebihan tidak mempercepat penyembuhan — justru dapat merusak tanaman, membunuh serangga menguntungkan, dan menambah biaya tanpa manfaat sebanding.",
  "Membiarkan hama tanpa penanganan membuat serangan makin parah dan dapat menyebar ke tanaman lain di sekitarnya.",
  "Inilah prinsip Pengendalian Hama Terpadu (PHT) — menggunakan cara yang tepat sasaran, dosis secukupnya, dan waktu yang sesuai agar hama teratasi tanpa merusak lingkungan.",
  "Mengganti tanaman tidak menyelesaikan masalah, karena hama yang sama bisa menyerang tanaman inang lain di lahan yang sama.",
];

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
