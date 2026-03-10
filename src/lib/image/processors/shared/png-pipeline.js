// src/lib/image/processors/shared/png-pipeline.js
// Shared PNG pipeline for compressor / converter
// - PNG-8 (lossy) via UPNG.encode(cnum)
// - lossless PNG via canvas->png then oxipng
// - fast-path: PNG bytes -> oxipng (no decode) for lossless-only

let _upngPromise = null;
async function getUPNG() {
  if (!_upngPromise) _upngPromise = import("https://esm.sh/upng-js@2.1.0");
  const mod = await _upngPromise;
  return mod?.default || mod;
}

let _oxipngPromise = null;
async function getOxiPngOptimise() {
  if (!_oxipngPromise) _oxipngPromise = import("https://esm.sh/@jsquash/oxipng@2.3.0");
  const mod = await _oxipngPromise;
  const optimise = mod?.optimise || mod?.default;
  if (!optimise) throw new Error("[png-pipeline] oxipng optimise export not found");
  return optimise;
}

function clampInt(x, min, max) {
  const n = Math.round(Number(x));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function mapQualityToCnum(q100) {
  const q = clampInt(q100, 1, 100);
  // 95+ => lossless
  if (q >= 95) return 0;
  if (q >= 90) return 256;
  if (q >= 80) return 128;
  if (q >= 70) return 96;
  if (q >= 60) return 64;
  if (q >= 50) return 48;
  return 32;
}

export function mapQualityToOxiLevel(q100) {
  // oxipng level 1..6 (higher => more work)
  const q = clampInt(q100, 1, 100);
  const lvl = Math.round(2 + ((100 - q) / 100) * 4); // 2..6
  return clampInt(lvl, 1, 6);
}

function toU8(buf) {
  if (buf instanceof Uint8Array) return buf;
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  // Blob/other
  return new Uint8Array(buf);
}

export async function oxipngOptimise(buffer, { quality100 = 85, stripMetadata = true } = {}) {
  const optimise = await getOxiPngOptimise();
  const level = mapQualityToOxiLevel(quality100);
  const u8 = toU8(buffer);

  try {
    const out = await optimise(u8, {
      level,
      interlace: 0,
      optimiseAlpha: true,
      strip: stripMetadata ? "all" : "safe",
    });
    // jsquash may return Uint8Array
    return out instanceof Uint8Array ? out : toU8(out);
  } catch {
    return u8;
  }
}

async function canvasToBlob(canvas, mime) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("[png-pipeline] canvas.toBlob returned null"));
        resolve(blob);
      },
      mime
    );
  });
}

export async function encodePng8WithUPNG(canvas, cnum) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[png-pipeline] canvas 2d not available");

  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const rgba = imageData.data; // Uint8ClampedArray
  const UPNG = await getUPNG();

  const pngBuf = UPNG.encode([rgba.buffer], w, h, cnum);
  return new Blob([pngBuf], { type: "image/png" });
}

/**
 * Lossless encode: canvas->png then oxipng
 */
export async function encodePngLossless(canvas, { quality100 = 85, stripMetadata = true } = {}) {
  const basePng = await canvasToBlob(canvas, "image/png");
  const baseBuf = await basePng.arrayBuffer();
  const optU8 = await oxipngOptimise(baseBuf, { quality100, stripMetadata });
  return new Blob([optU8], { type: "image/png" });
}

/**
 * PNG strategy:
 * - lossyCnum > 0 => PNG-8 (lossy) via UPNG then oxipng
 * - else => lossless png then oxipng
 */
export async function encodePngWithStrategy(
  canvas,
  { quality100 = 85, stripMetadata = true, lossyCnum = 0 } = {}
) {
  const q = clampInt(quality100, 1, 100);

  if (lossyCnum && Number(lossyCnum) > 0) {
    const lossyBlob = await encodePng8WithUPNG(canvas, Number(lossyCnum));
    const lossyBuf = await lossyBlob.arrayBuffer();
    const optU8 = await oxipngOptimise(lossyBuf, { quality100: q, stripMetadata });
    return {
      blob: new Blob([optU8], { type: "image/png" }),
      meta: { pngMode: "png8-lossy", cnum: Number(lossyCnum), stripMetadata: !!stripMetadata },
    };
  }

  const losslessBlob = await encodePngLossless(canvas, { quality100: q, stripMetadata });
  return {
    blob: losslessBlob,
    meta: { pngMode: "png-lossless", cnum: 0, stripMetadata: !!stripMetadata },
  };
}

/**
 * Fast-path: optimise original PNG bytes (lossless only, no decode).
 * Returns { blob, meta } and does NOT do anti-bloat decision (caller decides).
 */
export async function optimiseOriginalPngFile(file, { quality100 = 85, stripMetadata = true } = {}) {
  if (!(file instanceof File)) throw new Error("[png-pipeline] optimiseOriginalPngFile expects File");
  const origBuf = await file.arrayBuffer();
  const optU8 = await oxipngOptimise(origBuf, { quality100, stripMetadata });
  return {
    blob: new Blob([optU8], { type: "image/png" }),
    meta: { pngFastPath: true, stripMetadata: !!stripMetadata },
  };
}