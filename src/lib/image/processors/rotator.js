// src/lib/image/processors/rotator.js
import { resolveOutputMime, buildOutputName } from "./shared/format-map.js";

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0.85;
  return Math.max(0.01, Math.min(1, n));
}

function normDeg(deg) {
  const d = ((toInt(deg, 0) % 360) + 360) % 360;
  // only allow 0/90/180/270
  if (d === 0 || d === 90 || d === 180 || d === 270) return d;
  return 0;
}

async function decodeBitmap(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    // fallback via <img>
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function canvasToBlob(canvas, mime, quality01) {
  // OffscreenCanvas
  if (canvas && typeof canvas.convertToBlob === "function") {
    if (mime === "image/png") return await canvas.convertToBlob({ type: mime });
    return await canvas.convertToBlob({ type: mime, quality: quality01 });
  }

  // HTMLCanvasElement
  return await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b),
      mime,
      mime === "image/png" ? undefined : quality01
    );
  });
}

/**
 * Pure processor: File + settings -> {blob,type,name,meta}
 */
export async function process(file, settings = {}) {
  if (!file) throw new Error("[rotator] missing file");

  const rotateDeg = normDeg(settings.rotateDeg);
  const flipX = !!settings.flipX;
  const flipY = !!settings.flipY;

  const outMime = resolveOutputMime(file, settings.outputFormat || "keep");
  const q = clamp01((toInt(settings.quality, 85) ?? 85) / 100);

  const bitmap = await decodeBitmap(file);
  if (!bitmap) throw new Error("[rotator] decode failed");

  const ow = bitmap.width;
  const oh = bitmap.height;

  const swap = rotateDeg === 90 || rotateDeg === 270;
  const cw = swap ? oh : ow;
  const ch = swap ? ow : oh;

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(cw, ch)
      : Object.assign(document.createElement("canvas"), { width: cw, height: ch });

  // Ensure dimensions for HTMLCanvas
  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = cw;
    canvas.height = ch;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[rotator] canvas ctx failed");

  // If output is JPEG, fill white background (JPEG has no alpha)
  if (String(outMime).toLowerCase() === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
  } else {
    ctx.clearRect(0, 0, cw, ch);
  }

  // Transform: translate -> rotate -> flip -> draw
  ctx.save();
  ctx.translate(cw / 2, ch / 2);

  const rad = (rotateDeg * Math.PI) / 180;
  ctx.rotate(rad);

  // flip relative to final orientation (after rotate)
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

  ctx.drawImage(bitmap, -ow / 2, -oh / 2, ow, oh);
  ctx.restore();

  const blob = await canvasToBlob(canvas, outMime, q);
  if (!blob) throw new Error("[rotator] encode failed");

  const name = buildOutputName(file.name, outMime, settings.outputFormat || "keep");

  return {
    blob,
    type: outMime,
    name,
    meta: { ow, oh, cw, ch, rotateDeg, flipX, flipY },
  };
}