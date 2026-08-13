import { useEffect, useRef, useState } from "react";
import titleBg from "@/assets/title-bg.jpg";
import { PixelIcon } from "./PixelIcon";

import {
  bottleIcon,
  coinIcon,
  fertilizerIcon,
  pestSprite,
  produceIcon,
  seedIcon,
  tankIcon,
  toolIcon,
} from "@/game/sprites";
import {
  CROPS,
  PESTICIDES,
  PESTS,
  PEST_IDS,
  QUESTS,
  WIN_COINS,
  WIN_TARGETS,
  type CropId,
  type PestId,
  type PesticideId,
} from "@/game/data";
import type { Game, Snapshot, Stack, Tab, ToolId } from "@/game/game";

const TABS: { id: Tab; label: string }[] = [
  { id: "seeds", label: "Benih" },
  { id: "harvest", label: "Panen" },
  { id: "pesticides", label: "Pestisida" },
  { id: "tools", label: "Alat" },
  { id: "items", label: "Barang" },
  { id: "quest", label: "Item Misi" },
];

function stackIcon(st: Stack) {
  switch (st.type) {
    case "seeds":
      return () => seedIcon(st.id as CropId);
    case "harvest":
      return () => produceIcon(st.id as CropId);
    case "pesticides":
      return () => bottleIcon(PESTICIDES[st.id as PesticideId].color, st.id);
    case "tools":
      return () => toolIcon(st.id as ToolId);
    default:
      return st.id === "watertank" ? () => tankIcon() : () => fertilizerIcon();
  }
}

function shopIcon(icon: string) {
  const [kind, id] = icon.split(":");
  if (kind === "seed") return () => seedIcon(id as CropId);
  if (kind === "prod") return () => produceIcon(id as CropId);
  if (kind === "pest") return () => bottleIcon(PESTICIDES[id as PesticideId].color, id!);
  if (id === "watertank") return () => tankIcon();
  return () => fertilizerIcon();
}

function Window({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: (() => void) | undefined;
  wide?: boolean | undefined;
}) {
  return (
    <div className="mobile-window absolute inset-0 flex items-center justify-center bg-night/70 p-3 backdrop-blur-[2px]">
      <div className={`mobile-window-panel panel window-in flex max-h-[860px] flex-col ${wide ? "w-[1180px]" : "w-[840px]"} p-8`}>
        <div className="mb-5 flex items-center justify-between border-b-4 border-wood-dark/60 pb-3">
          <h2 className="font-pixel text-xl text-gold drop-shadow-[2px_2px_0_rgba(0,0,0,0.45)]">{title}</h2>
          {onClose && (
            <button className="btn-pixel" onClick={onClose}>
              Tutup <span className="desktop-key-hint">ESC</span>
            </button>
          )}
        </div>
        <div className="overflow-y-auto pr-2">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function InventoryWindow({ s, game }: { s: Snapshot; game: Game }) {
  const [tab, setTab] = useState<Tab>("seeds");
  const [drag, setDrag] = useState<number | null>(null);
  const slots = s.inventory[tab];

  const use = (st: Stack) => {
    if (st.type === "seeds") game.selectSeed(st.id as CropId);
    else if (st.type === "pesticides") game.selectPesticide(st.id as PesticideId);
    else if (st.type === "tools") game.selectTool(st.id as ToolId);
    else if (st.type === "items") game.useItem(st.id);
  };

  return (
    <Window title="INVENTARIS" onClose={() => game.closeOverlay()} wide>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} className={`btn-pixel ${tab === t.id ? "btn-pixel-active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-3">
        {slots.map((st, i) => (
          <div
            key={i}
            draggable={!!st}
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag !== null) game.swapSlots(tab, drag, i);
              setDrag(null);
            }}
            onClick={() => st && use(st)}
            className={`slot relative h-[104px] w-full cursor-pointer flex-col gap-1 ${
              st && ((tab === "seeds" && s.selectedSeed === st.id) ||
                (tab === "pesticides" && s.selectedPesticide === st.id) ||
                (tab === "tools" && s.tool === st.id))
                ? "slot-active"
                : ""
            }`}
          >
            {st ? (
              <>
                <PixelIcon make={stackIcon(st)} size={46} />
                <span className="font-body text-base leading-none text-parchment/85">{st.name}</span>
                {st.count > 1 && (
                  <span className="absolute bottom-1 right-2 font-pixel text-[10px] text-gold">{st.count}</span>
                )}
              </>
            ) : (
              <span className="font-body text-base text-parchment/25">kosong</span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-5 font-body text-xl text-parchment/60">
        Klik item untuk memilih atau menggunakannya. Seret item antar slot untuk mengatur ulang tas.
      </p>
    </Window>
  );
}

function ShopWindow({ s, game }: { s: Snapshot; game: Game }) {
  if (!s.shop) return null;
  const selling = s.shop.entries.some((e) => e.kind === "sell");
  return (
    <Window title={s.shop.title} onClose={() => game.closeOverlay()} wide>
      <div className="mb-4 flex items-center gap-2 font-body text-2xl text-parchment">
        <PixelIcon make={coinIcon} size={26} /> {s.money} koin
      </div>
      <div className="grid grid-cols-2 gap-4">
        {s.shop.entries.map((e) => (
          <div key={e.key} className="panel-inset flex items-center gap-4 p-4">
            <PixelIcon make={shopIcon(e.icon)} size={52} />
            <div className="flex-1">
              <div className="font-body text-2xl leading-tight text-parchment">{e.name}</div>
              <div className="font-body text-lg leading-tight text-parchment/65">{e.desc}</div>
              <div className="mt-1 flex items-center gap-1 font-pixel text-[11px] text-gold">
                <PixelIcon make={coinIcon} size={14} /> {e.price}
              </div>
            </div>
            {e.kind === "buy" ? (
              <button className="btn-pixel" disabled={s.money < e.price} onClick={() => game.buy(e.key)}>
                Beli
              </button>
            ) : (
              <div className="flex flex-col gap-1">
                <button className="btn-pixel" onClick={() => game.sell(e.key)}>
                  Jual 1
                </button>
                <button className="btn-pixel" onClick={() => game.sell(e.key, true)}>
                  Jual semua
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {selling && (
        <p className="mt-5 font-body text-xl text-parchment/60">
          Koperasi membeli semua yang ditanam desa. Tanaman sehat dijual dua kali lipat.
        </p>
      )}
    </Window>
  );
}

function DialogueWindow({ s, game }: { s: Snapshot; game: Game }) {
  if (!s.dialogue) return null;
  const d = s.dialogue;
  return (
    <div className="absolute inset-x-0 bottom-16 flex justify-center">
      <div className="panel window-in w-[1100px] p-7">
        <div className="mb-2 font-pixel text-base text-gold">
          {d.name} <span className="text-parchment/50">· {d.role}</span>
        </div>
        <p className="min-h-[76px] font-body text-3xl leading-snug text-parchment">{d.line}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-body text-lg text-parchment/50">
            {d.index + 1} / {d.total}
          </span>
          <button className="btn-pixel" onClick={() => game.advanceDialogue()}>
            {d.index + 1 >= d.total ? "Selesai" : "Lanjut"} <span className="desktop-key-hint">(E)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function DiagnosisWindow({ s, game }: { s: Snapshot; game: Game }) {
  if (!s.diagnosis) return null;
  const d = s.diagnosis;
  return (
    <Window title="DIAGNOSIS LAPANGAN" onClose={d.revealed ? () => game.closeOverlay() : undefined} wide>
      <div className="grid grid-cols-[280px_1fr] gap-8">
        <div className="panel-inset flex flex-col items-center gap-3 p-5">
          <div className="font-pixel text-[11px] text-gold">CONTOH</div>
          {d.revealed ? (
            <PixelIcon make={() => pestSprite(d.revealed as PestId, 0, 8)} size={180} />
          ) : (
            <div className="flex h-[180px] w-[180px] items-center justify-center border-4 border-dashed border-wood-dark/60 font-pixel text-4xl text-parchment/40">
              ?
            </div>
          )}
          <div className="font-body text-xl text-parchment/70">Tanaman: {d.cropName}</div>
        </div>
        <div>
          <div className="font-pixel text-[11px] text-gold">GEJALA YANG TERAMATI</div>
          <ul className="mt-2 space-y-1">
            {d.symptoms.map((sym) => (
              <li key={sym} className="font-body text-2xl text-parchment">
                • {sym}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-body text-2xl text-parchment">Hama apa yang menyerang tanaman ini?</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {d.options.map((o) => (
              <button
                key={o}
                disabled={!!d.revealed}
                onClick={() => game.answerDiagnosis(o)}
                className={`panel-inset flex items-center gap-3 p-3 text-left transition-colors ${
                  d.revealed
                    ? o === d.revealed
                      ? "ring-4 ring-leaf"
                      : "opacity-50"
                    : "hover:bg-wood/40"
                }`}
              >
                <PixelIcon make={() => pestSprite(o, 0, 3)} size={48} />
                <span className="font-body text-2xl text-parchment">
                  {PESTS[o].name}
                  <span className="block text-lg text-parchment/60">{PESTS[o].nameId}</span>
                </span>
              </button>
            ))}
          </div>
          {d.revealed && (
            <div
              className={`panel-inset mt-5 p-4 font-body text-xl leading-snug ${
                d.correct ? "text-leaf-light" : "text-clay-light"
              }`}
            >
              <div className="font-pixel text-[11px]">{d.correct ? "BENAR — +50 KOIN, +10 XP" : "SALAH — −25 KOIN"}</div>
              <p className="mt-2 text-parchment/90">{d.explain}</p>
              <p className="mt-2 text-parchment/70">
                Pengobatan yang disarankan: {PESTICIDES[PESTS[d.revealed].cure].name}. Fakta: {PESTS[d.revealed].fact}
              </p>
              <button className="btn-pixel mt-3" onClick={() => game.closeOverlay()}>
                Kembali ke ladang
              </button>
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}

function EncyclopediaWindow({ s, game }: { s: Snapshot; game: Game }) {
  const [sel, setSel] = useState<PestId>(PEST_IDS[0]!);
  const known = new Set(s.discovered);
  const p = PESTS[sel];
  const unlocked = known.has(sel);
  return (
    <Window title="ENSIKLOPEDIA HAMA — BANDUNGREJO" onClose={() => game.closeOverlay()} wide>
      <div className="grid grid-cols-[300px_1fr] gap-8">
        <div className="flex flex-col gap-2">
          {PEST_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSel(id)}
              className={`panel-inset flex items-center gap-3 p-3 text-left ${sel === id ? "ring-4 ring-gold" : ""}`}
            >
              <PixelIcon make={() => pestSprite(id, 0, 3)} size={44} />
              <span className="font-body text-xl text-parchment">
                {known.has(id) ? PESTS[id].name : "???"}
                <span className="block text-base text-parchment/55">{known.has(id) ? PESTS[id].nameId : "belum ditemukan"}</span>
              </span>
            </button>
          ))}
          <div className="font-body text-lg text-parchment/55">
            Ditemukan {known.size} / {PEST_IDS.length}
          </div>
        </div>
        <div className="panel-inset p-6">
          {unlocked ? (
            <>
              <div className="flex items-start gap-6">
                <PixelIcon make={() => pestSprite(sel, 0, 8)} size={160} />
                <div>
                  <h3 className="font-pixel text-lg text-gold">{p.name}</h3>
                  <p className="font-body text-2xl text-parchment/80">{p.nameId}</p>
                  <p className="mt-2 font-body text-xl text-parchment">
                    Tanaman inang: {p.hosts.map((h) => `${CROPS[h].name} (${CROPS[h].nameId})`).join(", ")}
                  </p>
                  <p className="font-body text-xl text-leaf-light">Pengobatan: {PESTICIDES[p.cure].name}</p>
                </div>
              </div>
              <div className="mt-5 font-pixel text-[11px] text-gold">GEJALA</div>
              <ul className="mt-1">
                {p.symptoms.map((x) => (
                  <li key={x} className="font-body text-xl text-parchment">
                    • {x}
                  </li>
                ))}
              </ul>
              <div className="mt-4 font-pixel text-[11px] text-gold">BIOLOGI</div>
              <p className="font-body text-xl leading-snug text-parchment/90">{p.info}</p>
              <div className="mt-4 font-pixel text-[11px] text-gold">FAKTA MENARIK</div>
              <p className="font-body text-xl leading-snug text-parchment/90">{p.fact}</p>
            </>
          ) : (
            <p className="desktop-key-hint font-body text-2xl text-parchment/60">
              Anda belum mendiagnosis hama ini. Periksa tanaman sakit di ladang dengan E untuk mencatatnya di sini.
            </p>
          )}
        </div>
      </div>
    </Window>
  );
}

function QuestWindow({ s, game }: { s: Snapshot; game: Game }) {
  const done = new Set(s.questsDone);
  return (
    <Window title="CATATAN MISI" onClose={() => game.closeOverlay()}>
      <ol className="space-y-2">
        {QUESTS.map((q) => {
          const isCurrent = s.quest?.id === q.id;
          return (
            <li
              key={q.id}
              className={`panel-inset flex items-center gap-4 p-3 ${isCurrent ? "ring-4 ring-gold" : ""} ${
                done.has(q.id) ? "opacity-60" : ""
              }`}
            >
              <span className="font-pixel text-base text-gold">{done.has(q.id) ? "✔" : isCurrent ? "▶" : "·"}</span>
              <span className="flex-1">
                <span className="block font-body text-2xl text-parchment">{q.title}</span>
                <span className="block font-body text-lg text-parchment/65">{q.desc}</span>
              </span>
              <span className="font-body text-lg text-gold">+{q.reward}c</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 panel-inset p-4">
        <div className="font-pixel text-[11px] text-gold">TARGET PEMULIHAN DESA</div>
        <div className="mt-2 grid grid-cols-5 gap-3">
          {(Object.keys(WIN_TARGETS) as CropId[]).map((c) => (
            <div key={c} className="flex flex-col items-center">
              <PixelIcon make={() => produceIcon(c)} size={34} />
              <span className="font-body text-lg text-parchment">
                {s.harvested[c] ?? 0}/{WIN_TARGETS[c]}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 font-body text-xl text-parchment/80">
          Koin: {s.money} / {WIN_COINS}
        </div>
      </div>
    </Window>
  );
}

function PauseWindow({ s, game }: { s: Snapshot; game: Game }) {
  return (
    <Window title="DIJEDA" onClose={() => game.closeOverlay()}>
      <div className="flex flex-col items-center gap-3">
        <p className="font-body text-2xl text-parchment/80">
          Hari {s.day} · {s.clock} · {s.money} koin · Level {s.level}
        </p>
        <button className="btn-pixel w-72" onClick={() => game.closeOverlay()}>
          Lanjut
        </button>
        <button
          className="btn-pixel w-72"
          onClick={() => {
            game.save();
            game.toast("Permainan disimpan.", "good");
          }}
        >
          Simpan sekarang
        </button>
        <button className="btn-pixel w-72" onClick={() => game.setOverlay("encyclopedia")}>
          Ensiklopedia
        </button>
        <button className="btn-pixel w-72" onClick={() => game.setOverlay("map")}>
          Peta
        </button>
        <button
          className="btn-pixel w-72"
          onClick={() => {
            if (confirm("Mulai permainan baru? Progres saat ini akan hilang.")) game.reset();
          }}
        >
          Permainan baru
        </button>
          <div className="desktop-key-hint panel-inset mt-3 w-full p-4 font-body text-xl leading-snug text-parchment/75">
          <div className="font-pixel text-[11px] text-gold">KONTROL</div>
          WASD / Panah — gerak · SHIFT — lari · E — interaksi & diagnosis · R — siram · F — semprot pestisida ·
          SPACE — panen · Q — ganti alat · TAB — inventaris · J — misi · K — ensiklopedia · M — peta · N — bisukan ·
          ESC — jeda
        </div>
      </div>
    </Window>
  );
}

function EndWindow({ s, game, win }: { s: Snapshot; game: Game; win: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-night/85">
      <div className="panel window-in w-[900px] p-10 text-center">
        <h2 className="font-pixel text-3xl text-gold">{win ? "BANDUNGREJO PULIH" : "PERMAINAN SELESAI"}</h2>
        <p className="mt-6 font-body text-2xl leading-snug text-parchment">
          {win
            ? "Ladang kembali hijau. Jagung berdiri tegak, tebu bergoyang, dan setiap petani di Bandungrejo kini tahu cara membaca gejala tanaman sakit. Terima kasih, petani."
            : "Dompet koinmu kosong, lumbung tandus, dan tanaman terakhir telah layu. Desa harus menunggu petani lain."}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 font-body text-xl text-parchment/80">
          <div className="panel-inset p-3">Hari dimainkan: {s.day}</div>
          <div className="panel-inset p-3">Koin: {s.money}</div>
          <div className="panel-inset p-3">Total panen: {s.totalHarvest}</div>
          <div className="panel-inset p-3">Level: {s.level}</div>
          <div className="panel-inset p-3">Hama dipelajari: {s.discovered.length}/4</div>
          <div className="panel-inset p-3">Misi: {s.questsDone.length}/{QUESTS.length}</div>
        </div>
        {win && (
          <div className="mt-6 font-body text-xl leading-snug text-parchment/70">
            <div className="font-pixel text-[11px] text-gold">KREDIT</div>
            JUST FARM — Game Edukasi Pertanian Desa Bandungrejo
            <br />
            Kecamatan Bantur, Kabupaten Malang
            <br />
            Desain, pixel art, kode & suara: tim pengembang desa Anda
          </div>
        )}
        <button className="btn-pixel mt-8 w-72" onClick={() => game.reset()}>
          Main lagi
        </button>
      </div>
    </div>
  );
}

function TitleWindow({ game }: { game: Game }) {
  const [hasSave] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("justfarm.save.v1") !== null : false));
  const [guide, setGuide] = useState(false);

  return (
    <div className="title-screen absolute inset-0 overflow-hidden">
      <img
        src={titleBg}
        alt="Ladang jagung Desa Bandungrejo saat matahari terbenam"
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="title-vignette absolute inset-0" />

      {guide ? (
        <div className="mobile-guide absolute inset-0 flex items-center justify-center bg-night/80 p-10">
          <div className="mobile-guide-panel panel window-in flex max-h-[900px] w-[1180px] flex-col p-8">
            <div className="mb-4 flex items-center justify-between border-b-4 border-wood-dark/60 pb-3">
              <h2 className="font-pixel text-xl text-gold">PANDUAN HAMA</h2>
              <button className="btn-pixel" onClick={() => setGuide(false)}>
                Kembali
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2">
              {PEST_IDS.map((id) => {
                const p = PESTS[id];
                return (
                  <div key={id} className="panel-inset flex gap-4 p-4">
                    <PixelIcon make={() => pestSprite(id, 0, 5)} size={92} />
                    <div>
                      <div className="font-pixel text-sm text-gold">{p.name}</div>
                      <div className="font-body text-xl text-parchment/80">
                        Menyerang: {p.hosts.map((h) => CROPS[h].name).join(", ")}
                      </div>
                      <div className="font-body text-xl text-parchment">Gejala: {p.symptoms.join(" · ")}</div>
                      <div className="font-body text-xl text-leaf-light">
                        Pengobatan: {PESTICIDES[p.cure].name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="title-screen-content absolute inset-0 flex flex-col items-center pt-[70px]">
          <h1 className="title-logo text-[112px] leading-none">JUST FARM</h1>
          <p className="title-subtitle-primary mt-8 font-pixel text-lg text-parchment drop-shadow-[3px_3px_0_rgba(0,0,0,0.85)]">
            Game Edukasi Pertanian Desa Bandungrejo
          </p>
          <p className="title-subtitle-secondary mt-3 font-body text-2xl text-parchment/90 drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
            Kecamatan Bantur · Kabupaten Malang
          </p>

          <div className="title-menu mt-[70px] flex w-[520px] flex-col gap-6">
            <button
              className="title-btn"
              onClick={() => {
                game.reset();
                game.beginGame();
              }}
            >
              Mulai Game
            </button>
            {hasSave && (
              <button
                className="title-btn"
                onClick={() => {
                  game.load();
                  game.beginGame();
                }}
              >
                Lanjutkan
              </button>
            )}
            <button className="title-btn" onClick={() => setGuide(true)}>
              Panduan Hama
            </button>
          </div>

          <p className="title-description mt-10 w-[900px] text-center font-body text-2xl leading-snug text-parchment/90 drop-shadow-[2px_2px_0_rgba(0,0,0,0.85)]">
            Tanam jagung, tebu, padi, tomat, dan cabai. Baca gejala tanaman sakit, sebut namanya,
            pilih pengobatan yang tepat, dan hidupkan kembali panen desa.
          </p>
        </div>
      )}

      <div className="title-copyright absolute bottom-6 right-8 font-body text-2xl text-parchment/85 drop-shadow-[2px_2px_0_rgba(0,0,0,0.85)]">
        © 2026 Bandungrejo Games
      </div>
      <div className="desktop-key-hint absolute bottom-6 left-8 font-body text-xl text-parchment/70 drop-shadow-[2px_2px_0_rgba(0,0,0,0.85)]">
        WASD gerak · E interaksi · TAB tas · ESC menu
      </div>
    </div>
  );
}


function MapWindow({ s, game }: { s: Snapshot; game: Game }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (window as unknown as { __justfarm_world?: { ground: Uint8Array; buildings: { kind: string; name: string; door: { x: number; y: number }; x: number; y: number; w: number; h: number }[]; farms: { name: string; x: number; y: number; w: number; h: number }[]; gate: { x: number; y: number } } });
    const world = w.__justfarm_world;
    if (!world) return;
    const MAP_W = 160;
    const MAP_H = 120;
    const scale = 4;
    canvas.width = MAP_W * scale;
    canvas.height = MAP_H * scale;
    ctx.imageSmoothingEnabled = false;
    const colors = ["#6ba644", "#c9b78e", "#b08a5a", "#3f7fb5", "#d8c48d", "#a97c4a", "#8b6136"];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = world.ground[y * MAP_W + x] ?? 0;
        ctx.fillStyle = colors[t] ?? "#6ba644";
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    // buildings
    world.buildings.forEach((b) => {
      ctx.fillStyle = "#d9b98a";
      ctx.fillRect((b.x / 16) * scale, (b.y / 16) * scale, (b.w / 16) * scale, (b.h / 16) * scale);
      ctx.fillStyle = "#8c4c33";
      ctx.fillRect((b.x / 16) * scale, (b.y / 16) * scale, (b.w / 16) * scale, 4);
    });
    // farms
    world.farms.forEach((f) => {
      ctx.strokeStyle = "#e53935";
      ctx.lineWidth = 1;
      ctx.strokeRect(f.x * scale, f.y * scale, f.w * scale, f.h * scale);
    });
    // quest marker
    if (s.questMarker) {
      ctx.fillStyle = "#e53935";
      ctx.beginPath();
      ctx.arc((s.questMarker.x / 16) * scale, (s.questMarker.y / 16) * scale, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("!", (s.questMarker.x / 16) * scale, (s.questMarker.y / 16) * scale + 3);
    }
    // player position
    ctx.fillStyle = "#ffe14d";
    ctx.beginPath();
    ctx.arc((game.player.x / 16) * scale, (game.player.y / 16) * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [s, game]);

  return (
    <Window title="PETA DESA BANDUNGREJO" onClose={() => game.closeOverlay()} wide>
      <div className="flex justify-center">
        <canvas ref={ref} style={{ imageRendering: "pixelated", maxWidth: "100%", border: "4px solid var(--wood-dark)" }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 font-body text-xl text-parchment/80">
        <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-[#ffe14d]" /> Posisi Anda</span>
        <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-[#e53935]" /> Misi saat ini</span>
        <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 border-2 border-[#e53935]" /> Lahan pertanian</span>
      </div>
      {s.quest && (
        <div className="mt-4 panel-inset p-4">
          <div className="font-pixel text-[11px] text-gold">MISI SAAT INI</div>
          <div className="font-body text-2xl text-parchment">{s.quest.title}</div>
          <div className="font-body text-lg text-parchment/70">{s.quest.desc}</div>
        </div>
      )}
    </Window>
  );
}

export function Overlays({ s, game, mobile: _mobile = false }: { s: Snapshot; game: Game; mobile?: boolean }) {
  switch (s.overlay) {
    case "title":
      return <TitleWindow game={game} />;
    case "inventory":
      return <InventoryWindow s={s} game={game} />;
    case "shop":
      return <ShopWindow s={s} game={game} />;
    case "dialogue":
      return <DialogueWindow s={s} game={game} />;
    case "diagnosis":
      return <DiagnosisWindow s={s} game={game} />;
    case "encyclopedia":
      return <EncyclopediaWindow s={s} game={game} />;
    case "quests":
      return <QuestWindow s={s} game={game} />;
    case "pause":
      return <PauseWindow s={s} game={game} />;
    case "gameover":
      return <EndWindow s={s} game={game} win={false} />;
    case "win":
      return <EndWindow s={s} game={game} win />;
    case "map":
      return <MapWindow game={game} s={s} />;
    case "sleep":
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-night">
          <span className="font-pixel text-2xl text-gold">Beristirahat sampai fajar…</span>
        </div>
      );
    default:
      return null;
  }
}
