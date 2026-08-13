import { useEffect, useRef, useState } from "react";
import { PixelIcon } from "./PixelIcon";
import { toolIcon } from "@/game/sprites";
import { TOOL_NAMES, TOOL_ORDER, type Game, type Snapshot, type ToolId } from "@/game/game";

type Point = { x: number; y: number };

const ACTION_LABELS = {
  interact: "Interaksi",
  water: "Siram",
  harvest: "Panen",
  spray: "Semprot",
} as const;

function runAction(game: Game, action: Snapshot["contextAction"]) {
  if (action === "interact") game.interact();
  else if (action === "water") game.water();
  else if (action === "harvest") game.harvest();
  else if (action === "spray") game.spray();
}

function Joystick({ game }: { game: Game }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState<Point>({ x: 0, y: 0 });

  const reset = () => {
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    game.setTouchMove(0, 0);
  };

  const update = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const max = rect.width * 0.32;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = clientX - centerX;
    const rawY = clientY - centerY;
    const length = Math.hypot(rawX, rawY) || 1;
    const amount = Math.min(1, max / length);
    const x = rawX * amount;
    const y = rawY * amount;
    const deadZone = max * 0.12;
    game.setTouchMove(Math.abs(x) < deadZone ? 0 : x / max, Math.abs(y) < deadZone ? 0 : y / max);
    setKnob({ x, y });
  };

  useEffect(() => () => game.setTouchMove(0, 0), [game]);

  return (
    <div
      ref={ref}
      className="mobile-joystick"
      role="application"
      aria-label="Joystick gerak"
      onPointerDown={(event) => {
        event.preventDefault();
        pointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (pointerId.current !== event.pointerId) return;
        event.preventDefault();
        update(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (pointerId.current === event.pointerId) reset();
      }}
      onPointerCancel={(event) => {
        if (pointerId.current === event.pointerId) reset();
      }}
      onLostPointerCapture={reset}
    >
      <div className="mobile-joystick-ring" />
      <div className="mobile-joystick-knob" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}

function MobileButton({ label, onClick, ariaLabel }: { label: string; onClick: () => void; ariaLabel: string }) {
  return (
    <button className="mobile-action-button btn-pixel" onClick={onClick} aria-label={ariaLabel}>
      {label}
    </button>
  );
}

export function MobileControls({ game, s }: { game: Game; s: Snapshot }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  useEffect(() => {
    setFullscreenSupported(document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === "function");
    const sync = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  if (s.overlay === "title" || s.overlay === "gameover" || s.overlay === "win") return null;
  const inWorld = s.overlay === "none";
  const action = s.contextAction;

  const toggleFullscreen = () => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <div className="mobile-controls" aria-label="Kontrol sentuh">
      {inWorld && <Joystick game={game} />}

      {inWorld && (
        <div className="mobile-status" aria-label="Status permainan">
          <div className="mobile-status-title">
            HARI {s.day} · {s.clock} · {s.weather === "rain" ? "Hujan" : s.weather === "cloudy" ? "Berawan" : "Cerah"}
          </div>
          <div className="mobile-status-values">
            <span>{s.money}c</span>
            <span>Lv.{s.level}</span>
            <span>Tenaga {Math.round(s.health)}%</span>
            <span>Air {Math.round(s.canWater)}%</span>
          </div>
          {s.quest && (
            <div className="mobile-status-quest">
              {s.quest.title} · {Math.min(s.quest.progress, s.quest.target)}/{s.quest.target}
            </div>
          )}
          <div className="mobile-status-harvest" aria-label="Catatan panen">
            Panen {s.harvested.corn} · {s.harvested.sugarcane} · {s.harvested.rice} · {s.harvested.tomato} · {s.harvested.chili}
          </div>
        </div>
      )}

      <div className="mobile-top-controls">
        {fullscreenSupported && (
          <MobileButton
            label={fullscreen ? "×" : "⛶"}
            ariaLabel={fullscreen ? "Keluar layar penuh" : "Masuk layar penuh"}
            onClick={toggleFullscreen}
          />
        )}
        {s.overlay !== "none" && (
          <MobileButton label="Tutup" ariaLabel="Tutup jendela" onClick={() => game.closeOverlay()} />
        )}
        {inWorld && (
          <>
            <MobileButton
              label="Tas"
              ariaLabel="Buka inventaris"
              onClick={() => game.setOverlay("inventory")}
            />
            <MobileButton label="Misi" ariaLabel="Buka misi" onClick={() => game.setOverlay("quests")} />
            <MobileButton label="Hama" ariaLabel="Buka ensiklopedia hama" onClick={() => game.setOverlay("encyclopedia")} />
            <MobileButton label="Peta" ariaLabel="Buka peta" onClick={() => game.toggleMap()} />
            <MobileButton label="Suara" ariaLabel="Bisukan atau bunyikan suara" onClick={() => game.toggleMute()} />
            <MobileButton label="Menu" ariaLabel="Buka menu" onClick={() => game.setOverlay("pause")} />
          </>
        )}
      </div>

      {inWorld && (
        <>
          {action && (
            <div className="mobile-context-controls">
              <MobileButton
                label={ACTION_LABELS[action]}
                ariaLabel={ACTION_LABELS[action]}
                onClick={() => runAction(game, action)}
              />
              {s.selectedPesticide && (action === "water" || s.prompt?.includes("tanaman sakit")) && (
                <MobileButton label="Semprot" ariaLabel="Semprot pestisida" onClick={() => game.spray()} />
              )}
            </div>
          )}
          <div className="mobile-tool-controls" aria-label="Pilih alat">
            {TOOL_ORDER.map((tool: ToolId) => (
              <button
                key={tool}
                className={`mobile-tool-button ${s.tool === tool ? "active" : ""}`}
                aria-label={TOOL_NAMES[tool]}
                onClick={() => game.selectTool(tool)}
              >
                <PixelIcon make={() => toolIcon(tool)} size={34} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
