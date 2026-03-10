// src/lib/image/processors/resizer.js
// Pure processor: file + settings -> { blob, type, name?, meta? }

const MAX_CANVAS_EDGE = 16384;

export async function process(file, settings) {
  if (!(file instanceof File)) throw new Error("[resizer] input must be a File");

  const s = settings || {};

  const resizeTab = normTab(s.resizeTab); // size|percent|preset
  const resizeMode = normMode(s.resizeMode); // fit|fill|exact
  const keepAspect = s.keepAspect !== false;
  const allowUpscale = !!s.allowUpscale;

  const backgroundFill = !!s.backgroundFill;
  const backgroundColor = String(s.backgroundColor || "#ffffff");

  const scalePercent = clampNum(s.scalePercent, 1, 200, 100);

  // ---- decode ----
  const src = await loadImageBitmap(file);
  const ow = src.width;
  const oh = src.height;

  const isGif = isGifFile(file);

  // ---- target box (tw, th) from tab ----
  let tw = undefined;
  let th = undefined;

  if (resizeTab === "percent") {
    const k = scalePercent / 100;
    tw = Math.max(1, Math.round(ow * k));
    th = Math.max(1, Math.round(oh * k));
  } else {
    // size / preset both map to width & height
    const w = toInt(s.width);
    const h = toInt(s.height);

    if (w || h) {
      if (keepAspect) {
        if (w && !h) {
          tw = w;
          th = Math.max(1, Math.round((oh / ow) * w));
        } else if (!w && h) {
          th = h;
          tw = Math.max(1, Math.round((ow / oh) * h));
        } else if (w && h) {
          // both given: keepAspect means "contain" math for fit, but box is still w×h for fill/exact/bgFill
          tw = w;
          th = h;
        }
      } else {
        tw = w || ow;
        th = h || oh;
      }
    } else {
      // nothing set => keep original
      tw = ow;
      th = oh;
    }
  }

  tw = Math.max(1, Math.round(Number(tw) || ow));
  th = Math.max(1, Math.round(Number(th) || oh));

  // ---- Upscale clamp (Auto protect) ----
  // If allowUpscale=false, the target box cannot exceed original dimensions.
  // We clamp the requested box down, keeping its aspect ratio.
  let clampedUpscale = false;
  if (!allowUpscale) {
    if (tw > ow || th > oh) {
      clampedUpscale = true;
      const k = Math.min(ow / tw, oh / th, 1);
      tw = Math.max(1, Math.floor(tw * k));
      th = Math.max(1, Math.floor(th * k));
    }
  }

  // ---- Effective mode (backgroundFill forces fit behavior) ----
  const effectiveMode = backgroundFill ? "fit" : resizeMode;

  // ---- Container Strategy (canvas size) ----
  // - if backgroundFill: container = target box tw×th
  // - else:
  //   - fit: container = scaled image size (no blank)
  //   - fill/exact: container = target box tw×th
  let cw = tw;
  let ch = th;

  if (!backgroundFill && effectiveMode === "fit") {
    // contain into box; if keepAspect and both tw/th were provided, output should be the contained size
    if (keepAspect && tw && th) {
      const { dw, dh } = containSize(ow, oh, tw, th);
      cw = dw;
      ch = dh;
    } else {
      // already a single-dimension-derived size, keep as is
      cw = tw;
      ch = th;
    }
  } else {
    cw = tw;
    ch = th;
  }

  // ---- MAX_CANVAS clamp ----
  if (cw > MAX_CANVAS_EDGE || ch > MAX_CANVAS_EDGE) {
    const k = Math.min(MAX_CANVAS_EDGE / cw, MAX_CANVAS_EDGE / ch);
    cw = Math.max(1, Math.floor(cw * k));
    ch = Math.max(1, Math.floor(ch * k));

    // also shrink box accordingly (important for crop math)
    tw = cw;
    th = ch;
  }

  // ---- Output mime = keep format (GIF -> PNG static) ----
  const outMime = resolveKeepMime(file);
  const gifStatic = isGif && outMime !== "image/gif"; // we will output png for gif

  // ---- draw ----
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[resizer] canvas 2d not available");

  ctx.imageSmoothingEnabled = true;
  try {
    ctx.imageSmoothingQuality = "high";
  } catch {}

  // JPEG must not have transparency: force white background
  const bg = outMime === "image/jpeg" ? "#ffffff" : backgroundColor;

  // background fill only when:
  // - backgroundFill === true (fit+fixed box)
  // - OR jpeg always (already handled)
  if (backgroundFill || outMime === "image/jpeg") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);
  } else {
    ctx.clearRect(0, 0, cw, ch);
  }

  // ---- Composition Strategy ----
  if (effectiveMode === "exact") {
    // stretch to fill container (tw×th == cw×ch)
    ctx.drawImage(src, 0, 0, cw, ch);
  } else if (effectiveMode === "fill") {
    // cover/crop to fill container
    // source rect based on cover scale
    const scale = Math.max(cw / ow, ch / oh);
    const sw = Math.max(1, Math.round(cw / scale));
    const sh = Math.max(1, Math.round(ch / scale));
    const sx = Math.max(0, Math.round((ow - sw) / 2));
    const sy = Math.max(0, Math.round((oh - sh) / 2));
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, cw, ch);
  } else {
    // fit/contain
    if (backgroundFill) {
      // container is fixed box tw×th (== cw×ch), draw contained centered
      const { dw, dh } = containSize(ow, oh, cw, ch);
      const dx = Math.round((cw - dw) / 2);
      const dy = Math.round((ch - dh) / 2);
      ctx.drawImage(src, 0, 0, ow, oh, dx, dy, dw, dh);
    } else {
      // no blank: canvas already equals contained size
      ctx.drawImage(src, 0, 0, cw, ch);
    }
  }

  // ---- encode (keep mime; no quality slider) ----
  const outBlob = await canvasToBlob(canvas, outMime);
  if (!outBlob) throw new Error("[resizer] encode failed");

  // ---- percent change (area-based, for -43% style) ----
  const inArea = ow * oh;
  const outArea = cw * ch;
  const ratio = inArea > 0 ? outArea / inArea : 1;
  const pct = Math.round((ratio - 1) * 100); // negative => smaller
  const scaleChangePct = pct > 0 ? `+${pct}%` : `${pct}%`;

  return {
    blob: outBlob,
    type: outMime,
    meta: {
      ow,
      oh,
      cw,
      ch,
      scaleChangePct,
      clampedUpscale,
      gifStatic,
      used: {
        resizeTab,
        resizeMode,
        effectiveMode,
        backgroundFill,
      },
    },
  };
}

/* ---------------- helpers ---------------- */

function normTab(v) {
  const s = String(v || "").toLowerCase();
  if (s === "percent") return "percent";
  if (s === "preset") return "preset";
  return "size";
}

function normMode(v) {
  const s = String(v || "").toLowerCase();
  if (s === "fill") return "fill";
  if (s === "exact") return "exact";
  return "fit";
}

function isGifFile(file) {
  const t = String(file.type || "").toLowerCase();
  const n = String(file.name || "").toLowerCase();
  return t === "image/gif" || n.endsWith(".gif");
}

function resolveKeepMime(file) {
  const t = String(file.type || "").toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg") return "image/jpeg";
  if (t === "image/png") return "image/png";
  if (t === "image/webp") return "image/webp";
  if (t === "image/gif") return "image/png"; // animated gif -> static png
  return "image/png";
}

async function loadImageBitmap(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      return img; // ctx.drawImage compatible
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("[resizer] failed to load image"));
    img.src = url;
  });
}

function containSize(ow, oh, bw, bh) {
  const scale = Math.min(bw / ow, bh / oh);
  const dw = Math.max(1, Math.round(ow * scale));
  const dh = Math.max(1, Math.round(oh * scale));
  return { dw, dh };
}

function canvasToBlob(canvas, mime) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("[resizer] canvas.toBlob returned null"));
        resolve(blob);
      },
      mime
    );
  });
}

function toInt(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
