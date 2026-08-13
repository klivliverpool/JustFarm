import { PixelIcon } from "./PixelIcon";
import { coinIcon, toolIcon, produceIcon, seedIcon, bottleIcon } from "@/game/sprites";
import { CROPS, PESTICIDES } from "@/game/data";
import { TOOL_NAMES, TOOL_ORDER, type Snapshot, type ToolId } from "@/game/game";

function Bar({ value, tint, label }: { value: number; tint: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 font-body text-lg text-parchment/80">{label}</span>
      <div className="h-4 w-40 border-2 border-wood-dark bg-wood/60 p-[2px]">
        <div className="h-full transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: tint }} />
      </div>
      <span className="font-body text-lg text-parchment/70">{Math.round(value)}%</span>
    </div>
  );
}

function WeatherGlyph({ weather }: { weather: Snapshot["weather"] }) {
  if (weather === "rain")
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-sky-300">☂</span> Hujan
      </span>
    );
  if (weather === "cloudy")
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-parchment/80">☁</span> Berawan
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-amber-300">☀</span> Cerah
    </span>
  );
}

export function HUD({
  s,
  mobile = false,
  onTool,
  onOpen,
  onMute,
}: {
  s: Snapshot;
  mobile?: boolean;
  onTool: (t: ToolId) => void;
  onOpen: (o: "inventory" | "quests" | "encyclopedia" | "pause" | "map") => void;
  onMute: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* money / level */}
      {!mobile && <div className="panel absolute left-8 top-7 flex items-center gap-6 px-5 py-3">
        <div className="flex items-center gap-2">
          <PixelIcon make={coinIcon} size={28} />
          <span className="font-pixel text-xl text-gold drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">{s.money}</span>
        </div>
        <div className="font-body text-xl text-parchment/85">
          Lv.{s.level} <span className="text-parchment/50">· {s.xp} XP</span>
        </div>
      </div>}

      {/* day / time / weather */}
      {!mobile && <div className="panel absolute left-8 top-[104px] flex flex-col gap-1 px-5 py-3">
        <div className="font-pixel text-sm text-gold">HARI {s.day}</div>
        <div className="font-body text-2xl leading-none text-parchment">
          {s.clock} <span className="text-parchment/60">{s.phase}</span>
        </div>
        <div className="font-body text-xl text-parchment/85">
          <WeatherGlyph weather={s.weather} />
        </div>
      </div>}

      {/* bars */}
      {!mobile && <div className="panel absolute left-8 top-[236px] flex flex-col gap-2 px-5 py-3">
        <Bar value={s.health} tint="linear-gradient(90deg,#e05a5a,#f0a05a)" label="Tenaga" />
        <Bar value={s.canWater} tint="linear-gradient(90deg,#3f7fb5,#9fd4ec)" label="Air" />
      </div>}

      {/* quest tracker */}
      {!mobile && s.quest && (
        <div className="panel absolute left-8 top-[360px] w-[340px] px-5 py-3">
          <div className="font-pixel text-[11px] text-gold">MISI SAAT INI</div>
          <div className="mt-1 font-body text-2xl leading-tight text-parchment">{s.quest.title}</div>
          <div className="font-body text-lg leading-tight text-parchment/70">{s.quest.desc}</div>
          <div className="mt-2 h-3 border-2 border-wood-dark bg-wood/60 p-[2px]">
            <div
              className="h-full bg-leaf"
              style={{ width: `${Math.min(100, (s.quest.progress / s.quest.target) * 100)}%` }}
            />
          </div>
          <div className="font-body text-base text-parchment/60">
            {Math.min(s.quest.progress, s.quest.target)} / {s.quest.target}
          </div>
        </div>
      )}

      {/* toolbar */}
      {!mobile && <div className="pointer-events-auto absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3">
        {TOOL_ORDER.map((t) => (
          <button
            key={t}
            onClick={() => onTool(t)}
            title={TOOL_NAMES[t]}
            className={`slot h-[68px] w-[68px] ${s.tool === t ? "slot-active" : ""}`}
          >
            <PixelIcon make={() => toolIcon(t)} size={44} />
          </button>
        ))}
        <div className="mx-2 w-[2px] bg-wood-dark/70" />
        {s.selectedSeed && (
          <div className="slot h-[68px] w-[68px]" title={`Benih terpilih: ${CROPS[s.selectedSeed].name}`}>
            <PixelIcon make={() => seedIcon(s.selectedSeed!)} size={44} />
          </div>
        )}
        {s.selectedPesticide && (
          <div className="slot h-[68px] w-[68px]" title={`Terpilih: ${PESTICIDES[s.selectedPesticide].name}`}>
            <PixelIcon
              make={() => bottleIcon(PESTICIDES[s.selectedPesticide!].color, s.selectedPesticide!)}
              size={44}
            />
          </div>
        )}
      </div>}

      {/* interaction prompt */}
      {!mobile && s.prompt && (
        <div className="panel absolute bottom-[130px] left-1/2 -translate-x-1/2 px-6 py-2">
          <span className="font-body text-2xl text-parchment">{s.prompt}</span>
        </div>
      )}

      {/* menu buttons */}
      {!mobile && <div className="pointer-events-auto absolute right-8 top-7 flex gap-2">
        <button className="btn-pixel" onClick={() => onOpen("inventory")}>
          Tas <span className="opacity-60">TAB</span>
        </button>
        <button className="btn-pixel" onClick={() => onOpen("quests")}>
          Misi <span className="opacity-60">J</span>
        </button>
        <button className="btn-pixel" onClick={() => onOpen("encyclopedia")}>
          Hama <span className="opacity-60">K</span>
        </button>
        <button className="btn-pixel" onClick={() => onOpen("map")}>
          Peta <span className="opacity-60">M</span>
        </button>
        <button className="btn-pixel" onClick={onMute}>
          {s.muted ? "Bunyikan" : "Bisukan"} <span className="opacity-60">N</span>
        </button>
        <button className="btn-pixel" onClick={() => onOpen("pause")}>
          Menu <span className="opacity-60">ESC</span>
        </button>
      </div>}

      {/* harvest counter */}
      {!mobile && <div className="panel absolute right-8 top-[318px] w-[246px] px-4 py-3">
        <div className="font-pixel text-[11px] text-gold">CATATAN PANEN</div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {(Object.keys(CROPS) as (keyof typeof CROPS)[]).map((c) => (
            <div key={c} className="flex flex-col items-center">
              <PixelIcon make={() => produceIcon(c)} size={28} />
              <span className="font-body text-base text-parchment/80">{s.harvested[c] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>}

      {/* toasts */}
      <div className="absolute bottom-[210px] left-1/2 flex w-[720px] -translate-x-1/2 flex-col items-center gap-2">
        {s.toasts.map((t) => (
          <div
            key={t.id}
            className={`panel animate-in fade-in slide-in-from-bottom-2 px-5 py-2 font-body text-xl ${
              t.tone === "good" ? "text-leaf-light" : t.tone === "bad" ? "text-clay-light" : "text-parchment"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* controls hint */}
      {!mobile && <div className="desktop-key-hint absolute bottom-6 left-8 font-body text-lg leading-tight text-parchment/45">
        WASD gerak · SHIFT lari · E interaksi · R siram · F semprot · SPACE panen · Q ganti alat · TAB tas · M peta
      </div>}
    </div>
  );
}
