// src/lib/image/processors/cropper.js
import { resolveOutputMime, buildOutputName } from "./shared/format-map.js";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampInt(n, lo, hi) {
  const x = Math.round(Number(n) || 0);
  return Math.max(lo, Math.min(hi, x));
}

async function decodeBitmap(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function canvasToBlob(canvas, mime, quality01) {
  if (canvas && typeof canvas.convertToBlob === "function") {
    if (mime === "image/png") return await canvas.convertToBlob({ type: mime });
    return await canvas.convertToBlob({ type: mime, quality: quality01 });
  }
  return await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b),
      mime,
      mime === "image/png" ? undefined : quality01
    );
  });
}

export async function process(file, settings = {}) {
  const bitmap = await decodeBitmap(file);
  if (!bitmap) throw new Error("[cropper] decode failed");

  const ow = bitmap.width;
  const oh = bitmap.height;

  // normalized rect
  const rx = clamp01(settings.cropX);
  const ry = clamp01(settings.cropY);
  const rw = clamp01(settings.cropW);
  const rh = clamp01(settings.cropH);

  // convert to pixels + clamp
  let x = clampInt(rx * ow, 0, ow - 1);
  let y = clampInt(ry * oh, 0, oh - 1);
  let cw = clampInt(rw * ow, 1, ow);
  let ch = clampInt(rh * oh, 1, oh);

  if (x + cw > ow) cw = ow - x;
  if (y + ch > oh) ch = oh - y;
  cw = Math.max(1, cw);
  ch = Math.max(1, ch);

  const outMime = resolveOutputMime(file, settings.outputFormat || "keep");

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(cw, ch)
      : Object.assign(document.createElement("canvas"), { width: cw, height: ch });

  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = cw;
    canvas.height = ch;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[cropper] canvas ctx failed");

  // JPEG needs background
  if (String(outMime).toLowerCase() === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
  } else {
    ctx.clearRect(0, 0, cw, ch);
  }

  ctx.drawImage(bitmap, x, y, cw, ch, 0, 0, cw, ch);

  const q = Math.max(0.01, Math.min(1, (Number(settings.quality ?? 85) || 85) / 100));
  const blob = await canvasToBlob(canvas, outMime, q);
  if (!blob) throw new Error("[cropper] encode failed");

  const name = buildOutputName(file.name, outMime, settings.outputFormat || "keep");

  return {
    blob,
    type: outMime,
    name,
    meta: {
      ow, oh,
      x, y, cw, ch,
      rel: { cropX: rx, cropY: ry, cropW: rw, cropH: rh },
      cropAspect: String(settings.cropAspect || "free"),
    },
  };
}