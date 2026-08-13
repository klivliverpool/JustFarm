import { useEffect, useRef } from "react";

/**
 * Renders a procedurally generated pixel-art canvas at an integer upscale
 * with nearest-neighbour filtering.
 */
export function PixelIcon({
  make,
  size = 32,
  className = "",
}: {
  make: () => HTMLCanvasElement;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dest = ref.current;
    if (!dest) return;
    const src = make();
    dest.width = src.width;
    dest.height = src.height;
    const ctx = dest.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, dest.width, dest.height);
    ctx.drawImage(src, 0, 0);
  }, [make]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}
