import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Game, VIEW_H, VIEW_W, type Snapshot, type ToolId } from "@/game/game";
import { HUD } from "@/components/game/HUD";
import { Overlays } from "@/components/game/Overlays";
import { MobileControls } from "@/components/game/MobileControls";
import { preloadPestAssets } from "@/game/pestAssets";

type ControlMode = "desktop" | "mobile";

const MOBILE_LOGICAL_SHORT_AXIS = 480;

type StageLayout = {
  width: number;
  height: number;
  scale: number;
};

function detectControlMode(): ControlMode {
  if (typeof window === "undefined") return "desktop";
  const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const compact = window.innerWidth <= 900 || window.innerHeight <= 700;
  return touch && (coarse || compact) ? "mobile" : "desktop";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JUST FARM — Game Edukasi Pertanian Desa Bandungrejo" },
      {
        name: "description",
        content:
          "Mainkan JUST FARM, simulasi bertani pixel art di Desa Bandungrejo: tanam palawija, diagnosis hama pertanian nyata, dan pulihkan panen desa.",
      },
      { property: "og:title", content: "JUST FARM — Game Edukasi Pertanian Desa Bandungrejo" },
      {
        property: "og:description",
        content:
          "Tanam jagung, tebu, padi, tomat, dan cabai, kenali hama seperti uret dan kutu kebul, lalu hidupkan kembali ladang Bandungrejo.",
      },

      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [stage, setStage] = useState<StageLayout>({ width: VIEW_W, height: VIEW_H, scale: 1 });
  const [controlMode, setControlMode] = useState<ControlMode>("desktop");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    preloadPestAssets();
    const game = new Game(canvas);
    gameRef.current = game;
    game.onChange = (s) => setSnap(s);
    game.emit(true);
    game.start();

    const kd = (e: KeyboardEvent) => game.keyDown(e);
    const ku = (e: KeyboardEvent) => game.keyUp(e);
    const bl = () => game.blur();
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", bl);

    const fit = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const mobile = detectControlMode() === "mobile";
      let logicalWidth = VIEW_W;
      let logicalHeight = VIEW_H;
      if (mobile) {
        // Keep a stable pixel density on the short axis, then derive the
        // long axis from the device aspect ratio. This fills portrait and
        // landscape without non-uniformly stretching the world.
        const aspect = Math.max(0.35, Math.min(3.2, width / Math.max(1, height)));
        if (aspect >= 1) {
          logicalHeight = MOBILE_LOGICAL_SHORT_AXIS;
          logicalWidth = Math.round(logicalHeight * aspect);
        } else {
          logicalWidth = MOBILE_LOGICAL_SHORT_AXIS;
          logicalHeight = Math.round(logicalWidth / aspect);
        }
      }
      game.resizeViewport(logicalWidth, logicalHeight);
      setStage({
        width: logicalWidth,
        height: logicalHeight,
        scale: Math.min(width / logicalWidth, height / logicalHeight),
      });
    };
    const updateMode = () => {
      setControlMode(detectControlMode());
      fit();
    };
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    fit();
    updateMode();
    window.addEventListener("resize", fit);
    window.addEventListener("resize", updateMode);
    window.addEventListener("orientationchange", updateMode);
    pointerQuery.addEventListener("change", updateMode);
    window.visualViewport?.addEventListener("resize", fit);

    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", bl);
      window.removeEventListener("resize", fit);
      window.removeEventListener("resize", updateMode);
      window.removeEventListener("orientationchange", updateMode);
      pointerQuery.removeEventListener("change", updateMode);
      window.visualViewport?.removeEventListener("resize", fit);
      game.save();
      game.stop();
    };
  }, []);

  const game = gameRef.current;

  return (
    <main className={`game-shell flex h-screen w-screen items-center justify-center overflow-hidden bg-night ${controlMode === "mobile" ? "mobile-mode" : "desktop-mode"}`}>
      <h1 className="sr-only">JUST FARM — Game Edukasi Pertanian Desa Bandungrejo</h1>
      <div
        ref={wrapRef}
        className="relative origin-center"
        style={{ width: stage.width, height: stage.height, transform: `scale(${stage.scale})` }}
      >
        <canvas
          ref={canvasRef}
          width={stage.width}
          height={stage.height}
          className="block h-full w-full"
          style={{ imageRendering: "pixelated", touchAction: controlMode === "mobile" ? "none" : "auto" }}
        />
        {snap && game && (
          <>
            {snap.overlay !== "title" && (
              <HUD
                s={snap}
                mobile={controlMode === "mobile"}
                onTool={(t: ToolId) => game.selectTool(t)}
                onOpen={(o) => game.setOverlay(o)}
                onMute={() => game.toggleMute()}
              />
            )}
            <Overlays s={snap} game={game} mobile={controlMode === "mobile"} />
          </>
        )}
      </div>
      {snap && game && controlMode === "mobile" && <MobileControls s={snap} game={game} />}
    </main>
  );
}
