// src/lib/image/processors/converter.js
// Pure processor: file + settings -> { blob, type, meta? }

import { resolveOutputMime, buildOutputName } from "./shared/format-map.js";
import { decodeToBitmap, drawToCanvas, encodeCanvasStrict } from "./shared/canvas-codec.js";

function clampInt(x, min, max) {
  const n = Math.round(Number(x));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export async function process(file, settings) {
  if (!(file instanceof File)) throw new Error("[converter] input must be a File");

  const s = settings || {};
  const outputFormat = String(s.outputFormat || "keep").toLowerCase();
  const quality = clampInt(s.quality ?? 85, 1, 100);

  // 输出 JPG（或未来 AVIF）时，透明会丢失，所以需要背景色（默认白）
  const backgroundColor = String(s.backgroundColor || "#ffffff");

  const targetMime = resolveOutputMime(file, outputFormat);

  // decode
  const decoded = await decodeToBitmap(file);
  const { image, width, height } = decoded;

  try {
    // draw
    const needsBg =
      targetMime === "image/jpeg" || targetMime === "image"; // avif 先不在 UI 暴露，但逻辑支持
    const canvas = drawToCanvas(image, width, height, {
      background: needsBg ? backgroundColor : null,
    });

    // encode (strict: do NOT accept silent fallback to PNG)
    const outBlob = await encodeCanvasStrict(canvas, { mime: targetMime, quality });

    return {
      blob: outBlob,
      type: targetMime,
      name: buildOutputName(file.name, targetMime, outputFormat),
      meta: {
        inMime: String(file.type || "").toLowerCase(),
        outMime: targetMime,
        width,
        height,
        qualityApplied: targetMime === "image/jpeg" || targetMime === "image/webp" || targetMime === "image",
        backgroundColorUsed: needsBg ? backgroundColor : null,
      },
    };
  } finally {
    decoded.revoke?.();
  }
}