// src/lib/image/processors/shared/canvas-codec.js
// Native decode/draw/encode helpers (no wasm)

import { isLossyMime } from "./format-map.js";

const _encodeSupportCache = new Map();

/**
 * Decode File -> bitmapOrImg (createImageBitmap preferred, <img> fallback)
 */
export async function decodeToBitmap(file) {
  if (!(file instanceof File)) throw new Error("[canvas-codec] input must be a File");

  try {
    const bmp = await createImageBitmap(file);
    return { image: bmp, width: bmp.width, height: bmp.height, revoke: null };
  } catch {
    // fallback to <img>
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("[canvas-codec] failed to load image"));
      im.src = url;
    });
    return {
      image: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      revoke: () => URL.revokeObjectURL(url),
    };
  }
}

export function drawToCanvas(image, w, h, { background = null } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[canvas-codec] canvas 2d not available");

  ctx.imageSmoothingEnabled = true;
  try {
    ctx.imageSmoothingQuality = "high";
  } catch {}

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas, mime, quality01) {
  return new Promise((resolve) => {
    // OffscreenCanvas.convertToBlob 只在 OffscreenCanvas 上；这里统一走 HTMLCanvasElement.toBlob
    canvas.toBlob(
      (b) => resolve(b || null),
      mime,
      isLossyMime(mime) ? quality01 : undefined
    );
  });
}

/**
 * Encode canvas to requested mime.
 * IMPORTANT:
 * - If mime is unsupported, browsers may fall back to image/png.
 * - We treat "type mismatch" as unsupported.
 */
export async function encodeCanvasStrict(canvas, { mime, quality = 85 } = {}) {
  const q01 = Math.max(0, Math.min(1, Number(quality) / 100));
  const blob = await canvasToBlob(canvas, mime, q01);
  if (!blob) throw new Error(`[canvas-codec] encode failed for ${mime}`);

  const actual = String(blob.type || "").toLowerCase();
  const expected = String(mime || "").toLowerCase();

  // 关键：不接受静默回退（避免你之前 Safari/webp -> png 那种坑）
  if (actual !== expected) {
    throw new Error(
      `[canvas-codec] "${expected}" not supported. Browser returned "${actual || "unknown"}".`
    );
  }

  return blob;
}

/**
 * Detect whether this browser can ENCODE a mime from canvas.
 * (Not decode support; encode support is what breaks silently.)
 */
export async function canEncodeMime(mime) {
  const key = String(mime || "").toLowerCase();
  if (_encodeSupportCache.has(key)) return _encodeSupportCache.get(key);

  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1, 1);

    const b = await canvasToBlob(c, key, 0.8);
    const ok = !!b && String(b.type || "").toLowerCase() === key;
    _encodeSupportCache.set(key, ok);
    return ok;
  } catch {
    _encodeSupportCache.set(key, false);
    return false;
  }
}