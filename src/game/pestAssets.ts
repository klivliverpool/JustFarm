import type { PestId } from "./data";

/** Maps each pest id to its real pixel-art PNG asset. */
const PEST_ASSET_PATHS: Record<PestId, string> = {
  grasshopper: "/assets/pests/Belalang.png",
  whitefly: "/assets/pests/Kutu_Kebul.png",
  armyworm: "/assets/pests/Ulat_Grayak.png",
  grub: "/assets/pests/Uret.png",
};

interface PestImageEntry {
  img: HTMLImageElement;
  ready: boolean;
}

const cache = new Map<PestId, PestImageEntry>();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function ensureLoading(id: PestId): PestImageEntry {
  let entry = cache.get(id);
  if (entry) return entry;
  const img = new Image();
  entry = { img, ready: false };
  cache.set(id, entry);
  img.onload = () => {
    entry!.ready = img.naturalWidth > 0;
    notify();
  };
  img.onerror = () => {
    entry!.ready = false;
  };
  img.src = PEST_ASSET_PATHS[id];
  return entry;
}

/**
 * Returns the loaded pest artwork image if it is ready, or null while it is
 * still loading (or if it failed to load). Safe to call every frame — the
 * underlying `Image` is only created once per pest id and cached.
 */
export function getPestImage(id: PestId): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  const entry = ensureLoading(id);
  return entry.ready ? entry.img : null;
}

/** Kicks off loading for every pest asset as early as possible. */
export function preloadPestAssets() {
  if (typeof window === "undefined") return;
  for (const id of Object.keys(PEST_ASSET_PATHS) as PestId[]) {
    ensureLoading(id);
  }
}

/** Subscribes to pest asset load events. Returns an unsubscribe function. */
export function subscribePestAssets(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
