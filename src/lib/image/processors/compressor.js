// src/lib/image/processors/compressor.js
// Pure processor: file + settings -> { blob, type, name?, meta? }

// V2 PNG strategy (via shared png-pipeline):
// - Output=PNG + quality < 95  => PNG-8 (lossy, fewer colors) via UPNG.encode(cnum)
// - Output=PNG + quality >=95  => lossless PNG (canvas png) then oxipng optimise
// - Output=KEEP on PNG input   => lossless only (no lossy surprise)

import {
  mapQualityToCnum,
  encodePngWithStrategy,
  optimiseOriginalPngFile,
} from "./shared/png-pipeline.js";

export async function process(file, settings) {
  if (!(file instanceof File)) throw new Error("[compressor] input must be a File");

  const {
    outputFormat = "keep", // keep/jpg/png/webp
    quality = 85,          // 0-100
    keepAspect = true,
    width,
    height,
    maxEdge,
    stripMetadata = true,
  } = settings || {};

  const outMime = resolveOutputMime(file, outputFormat);
  const inMime = String(file.type || "").toLowerCase();
  const inputIsPng =
    inMime.includes("png") || String(file.name || "").toLowerCase().endsWith(".png");

  const wantsPng = outMime === "image/png";
  const outputIsExplicitPng = String(outputFormat || "").toLowerCase() === "png";

  const hasResizeRequest =
    (width !== undefined && width !== null && width !== "") ||
    (height !== undefined && height !== null && height !== "") ||
    (maxEdge !== undefined && maxEdge !== null && maxEdge !== "");

  // ✅ FAST PATH: PNG in -> PNG out, no resize, lossless-only
  // - keep output (PNG) OR explicit PNG but quality>=95
  // - if explicit PNG and quality<95 => must allow PNG-8 lossy => no fast path
  const qInt = clampInt(quality, 1, 100);

  if (
    wantsPng &&
    inputIsPng &&
    !hasResizeRequest &&
    (!outputIsExplicitPng || qInt >= 95)
  ) {
    const { blob: outBlob, meta: m } = await optimiseOriginalPngFile(file, {
      quality100: qInt,
      stripMetadata,
    });

    if (outBlob.size >= file.size) {
      return {
        blob: file,
        type: file.type || "image/png",
        meta: {
          preventedBigger: true,
          inSize: file.size,
          outSize: outBlob.size,
          pngFastPath: true,
          ...(m || {}),
        },
      };
    }

    return {
      blob: outBlob,
      type: "image/png",
      meta: {
        preventedBigger: false,
        inSize: file.size,
        outSize: outBlob.size,
        pngFastPath: true,
        ...(m || {}),
      },
    };
  }

  // decode
  const src = await loadImageBitmap(file);

  // compute target size
  const { targetW, targetH } = deriveTargetSize(src.width, src.height, {
    keepAspect,
    width,
    height,
    maxEdge,
  });

  // draw
  const { canvas, hasAlpha } = drawToCanvas(src, targetW, targetH, { outMime });

  let outBlob = null;
  let usedMime = outMime;

  if (wantsPng) {
    // V2 rule: lossy PNG-8 ONLY when user explicitly selects outputFormat="png" AND quality<95
    const cnum = outputIsExplicitPng ? mapQualityToCnum(qInt) : 0;

    const { blob: pngBlob, meta: pngMeta } = await encodePngWithStrategy(canvas, {
      quality100: qInt,
      stripMetadata,
      lossyCnum: outputIsExplicitPng && cnum > 0 ? cnum : 0,
    });

    outBlob = pngBlob;
    usedMime = "image/png";

    // anti-bloat
    if (outBlob.size >= file.size) {
      return {
        blob: file,
        type: file.type || usedMime,
        meta: {
          preventedBigger: true,
          inSize: file.size,
          outSize: outBlob.size,
          hasAlpha,
          ...(pngMeta || {}),
        },
      };
    }

    return {
      blob: outBlob,
      type: usedMime,
      meta: {
        preventedBigger: false,
        hasAlpha,
        inSize: file.size,
        outSize: outBlob.size,
        ...(pngMeta || {}),
      },
    };
  } else {
    // JPEG/WebP
    const q = clamp01(Number(quality) / 100);
    outBlob = await canvasToBlob(canvas, outMime, q);
    usedMime = outBlob?.type || outMime;
  }

  if (!outBlob) throw new Error("[compressor] encode failed");

  // anti-bloat: if bigger or equal => keep original
  if (outBlob.size >= file.size) {
    return {
      blob: file,
      type: file.type || usedMime,
      meta: { preventedBigger: true, outSize: outBlob.size, inSize: file.size },
    };
  }

  return {
    blob: outBlob,
    type: usedMime,
    meta: {
      preventedBigger: false,
      hasAlpha,
      inSize: file.size,
      outSize: outBlob.size,
      stripMetadata: !!stripMetadata,
    },
  };
}

/* ---------------- helpers ---------------- */

function drawToCanvas(src, w, h, { outMime }) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[compressor] canvas 2d not available");

  if (outMime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(src, 0, 0, w, h);

  let hasAlpha = false;
  try {
    const sampleW = Math.min(64, w);
    const sampleH = Math.min(64, h);
    const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
  } catch {}

  return { canvas, hasAlpha };
}

async function loadImageBitmap(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("[compressor] failed to load image"));
    img.src = url;
  });
}

function deriveTargetSize(srcW, srcH, opts) {
  let targetW = srcW;
  let targetH = srcH;

  const keepAspect = opts.keepAspect !== false;
  const w = toInt(opts.width);
  const h = toInt(opts.height);
  const maxEdge = toInt(opts.maxEdge);

  if (w || h) {
    if (keepAspect) {
      if (w && !h) {
        targetW = w;
        targetH = Math.max(1, Math.round((srcH / srcW) * w));
      } else if (!w && h) {
        targetH = h;
        targetW = Math.max(1, Math.round((srcW / srcH) * h));
      } else if (w && h) {
        const scale = Math.min(w / srcW, h / srcH);
        targetW = Math.max(1, Math.round(srcW * scale));
        targetH = Math.max(1, Math.round(srcH * scale));
      }
    } else {
      targetW = Math.max(1, w || targetW);
      targetH = Math.max(1, h || targetH);
    }
  } else if (maxEdge && Math.max(srcW, srcH) > maxEdge) {
    const scale = maxEdge / Math.max(srcW, srcH);
    targetW = Math.max(1, Math.round(srcW * scale));
    targetH = Math.max(1, Math.round(srcH * scale));
  }

  return { targetW, targetH };
}

function resolveOutputMime(file, outputFormat) {
  const fmt = String(outputFormat || "keep").toLowerCase();

  if (fmt === "keep") {
    const t = (file.type || "").toLowerCase();
    if (t === "image/jpeg" || t === "image/png" || t === "image/webp") return t;
    return "image/png";
  }

  if (fmt === "jpg" || fmt === "jpeg") return "image/jpeg";
  if (fmt === "png") return "image/png";
  if (fmt === "webp") return "image/webp";

  return "image/png";
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("[compressor] canvas.toBlob returned null"));
        resolve(blob);
      },
      mime,
      mime === "image/jpeg" || mime === "image/webp" ? quality : undefined
    );
  });
}

function toInt(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampInt(x, min, max) {
  const n = Math.round(Number(x));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}