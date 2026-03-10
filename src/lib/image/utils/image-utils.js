// src/lib/image/utils/image-utils.js
// Shared utilities for image engine.
// NOTE: This file contains both pure helpers and small browser-side bridges (e.g. toast/modal events).

export function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function formatBytes(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = b;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function toInt(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

export function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function readControlValue(el) {
  if (el.type === "checkbox") return !!el.checked;

  if (el.type === "number" || el.type === "range") {
    const v = el.value;
    if (v === "" || v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return el.value;
}

export function writeControlValue(el, value) {
  if (el.type === "checkbox") {
    el.checked = !!value;
    return;
  }
  if (value === undefined || value === null) {
    if (el.type === "number") el.value = "";
    return;
  }
  el.value = String(value);
}

// MOVED FROM image-engine.js (utilities)

export function showToast(detail) {
  window.dispatchEvent(new CustomEvent("image-ui:toast", { detail }));
}

export function showModal(detail) {
  window.dispatchEvent(new CustomEvent("image-ui:modal", { detail }));
}

export function createDefaultSettings(groups, { isResizer } = {}) {
  const base = {
    // compressor-like default
    outputFormat: isResizer ? "keep" : "webp",
    quality: 85,

    // resize shared
    keepAspect: true,
    width: undefined,
    height: undefined,
    maxEdge: undefined,

    // metadata
    stripMetadata: false,
  };

  // resizer-only keys (your ImageSettings uses these binds)
  if (groups.includes("resize")) {
    Object.assign(base, {
      resizeTab: "size",
      resizeMode: "fit", // fit|fill|exact
      allowUpscale: false,
      scalePercent: 50,
      backgroundFill: false,
      backgroundColor: "#ffffff",
    });
  }
if (groups.includes("crop")) {
  Object.assign(base, {
    cropAspect: "free",
    cropX: 0,
    cropY: 0,
    cropW: 1,
    cropH: 1,
  });
}
  if (groups.includes("rotate")) Object.assign(base, { rotateDeg: 0, flipX: false, flipY: false });
  if (groups.includes("watermark"))
    Object.assign(base, { watermarkType: "text", watermarkText: "", watermarkOpacity: 0.35, watermarkPosition: "br" });
  if (groups.includes("border")) Object.assign(base, { borderWidth: 0, borderColor: "#ffffff", borderRadius: 0 });
  if (groups.includes("meme")) Object.assign(base, { topText: "", bottomText: "", memeFontSize: 48, memeStrokeWidth: 6 });
  if (groups.includes("favicon"))
    Object.assign(base, {
      faviconSizes: [16, 32, 48, 64, 128, 256],
      faviconPadding: 0.12,
      faviconBackground: "transparent",
    });
  if (groups.includes("batch")) Object.assign(base, { fileNameMode: "auto" });

  return base;
}

export function safeAuto(fn, file) {
  try {
    return fn ? fn(file) : null;
  } catch {
    return null;
  }
}

export function isPngMime(mime) {
  return String(mime || "").toLowerCase() === "image/png";
}

export function inferOutputFormatFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return null;
}

export function isLossyFormat(fmt) {
  const f = String(fmt || "").toLowerCase();
  return f === "webp" || f === "jpg" || f === "jpeg";
}

export function uniqueQualities(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    const x = Math.max(1, Math.min(100, Math.round(n)));
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

export async function fileToBlob(file, mimeFallback) {
  const ab = await file.arrayBuffer();
  return new Blob([ab], { type: file.type || mimeFallback || "application/octet-stream" });
}

export async function loadBitmap(fileModel) {
  if (fileModel.bitmap) return fileModel.bitmap;
  try {
    const bmp = await createImageBitmap(fileModel.file);
    fileModel.bitmap = bmp;
    return bmp;
  } catch {
    return await loadBitmapFallback(fileModel);
  }
}

export function loadBitmapFallback(fileModel) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = fileModel.url;
  });
}

// DPR-aware render
export function renderCanvas(canvas, bitmapOrImg, w, h) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmapOrImg, 0, 0, w, h);
}

export function buildOutputName(originalName, mimeType, outputFormat) {
  const base = originalName.replace(/\.[^.]+$/, "");
  let ext = mimeToExt(mimeType);

  if (outputFormat && outputFormat !== "keep") {
    ext = String(outputFormat).toLowerCase();
    if (ext === "jpeg") ext = "jpg";
  }

  return `${base}.${ext || "bin"}`;
}

// keep format naming (resizer)
export function buildOutputNameKeep(originalName, outMime, inMime) {
  const base = originalName.replace(/\.[^.]+$/, "");
  const ext = mimeToExt(outMime || inMime) || originalName.split(".").pop() || "png";
  return `${base}.${ext}`;
}

export function mimeToExt(mime) {
  const m = (mime || "").toLowerCase();
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "";
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * derive preview size
 * - compressor: keep current behavior
 * - resizer: aware of container strategy (fit without bgfill => container = scaled image size)
 */
export function derivePreviewOutput(bitmap, settings, { isResizer } = {}) {
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  // base target inputs
  const tab = String(settings.resizeTab || "size");
  const keepAspect = settings.keepAspect !== false;

  let boxW = srcW;
  let boxH = srcH;

  if (tab === "percent") {
    const p = Number(settings.scalePercent ?? 100);
    let s = Math.max(1, p) / 100;

    // upscale clamp in preview sizing (real clamp also happens in processor)
    if (!settings.allowUpscale && s > 1) s = 1;

    boxW = Math.max(1, Math.round(srcW * s));
    boxH = Math.max(1, Math.round(srcH * s));
  } else {
    const w = toInt(settings.width);
    const h = toInt(settings.height);

    if (w || h) {
      if (keepAspect) {
        if (w && !h) {
          boxW = w;
          boxH = Math.max(1, Math.round((srcH / srcW) * w));
        } else if (!w && h) {
          boxH = h;
          boxW = Math.max(1, Math.round((srcW / srcH) * h));
        } else if (w && h) {
          // this "box" is user-input target box
          boxW = w;
          boxH = h;
        }
      } else {
        boxW = Math.max(1, w || boxW);
        boxH = Math.max(1, h || boxH);
      }
    }
  }

  if (!isResizer) {
    // compressor preview uses scaled image size as output canvas size
    const previewMax = 1024;
    const previewScale = Math.min(1, previewMax / Math.max(boxW, boxH));
    return {
      width: boxW,
      height: boxH,
      previewWidth: Math.max(1, Math.round(boxW * previewScale)),
      previewHeight: Math.max(1, Math.round(boxH * previewScale)),
    };
  }

  // resizer container strategy
  const mode = String(settings.resizeMode || "fit");
  const bgFill = !!settings.backgroundFill;

  // when bgFill => force container = target box
  // mode fill/exact => container = target box
  // mode fit (no bgFill) => container = scaled image size that fits in box
  let cw = boxW;
  let ch = boxH;

  if (mode === "fit" && !bgFill) {
    // fit without bgFill => container == content size (scaled to fit inside box)
    const scale = Math.min(boxW / srcW, boxH / srcH);
    const s = !settings.allowUpscale ? Math.min(1, scale) : scale;
    cw = Math.max(1, Math.round(srcW * s));
    ch = Math.max(1, Math.round(srcH * s));
  } else {
    cw = boxW;
    ch = boxH;
  }

  const previewMax = 1024;
  const previewScale = Math.min(1, previewMax / Math.max(cw, ch));
  return {
    width: cw,
    height: ch,
    previewWidth: Math.max(1, Math.round(cw * previewScale)),
    previewHeight: Math.max(1, Math.round(ch * previewScale)),
    // keep original target box for plan
    _boxW: boxW,
    _boxH: boxH,
    _previewScale: previewScale,
  };
}

/**
 * Resizer preview: composition render (Container Strategy + Composition Strategy)
 * keep format, no Pro blocks.
 */
export async function buildResizerPreview({ bitmap, out, settings, inputMime, inputName }) {
  const t0 = performance.now();

  // compute plan at preview resolution
  const plan = deriveResizerPlan(bitmap.width, bitmap.height, settings, {
    containerW: out.previewWidth,
    containerH: out.previewHeight,
    // when container is "target box", we need original box ratio; we pass hint by using out._boxW/_boxH
    // if absent (older), fallback to container itself
    boxW: out._boxW || out.width,
    boxH: out._boxH || out.height,
  });

  const w = plan.cw;
  const h = plan.ch;

  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: null, ms: 0, mime: "", fallback: true, plan: null };

  ctx.imageSmoothingEnabled = true;
  try {
    ctx.imageSmoothingQuality = "high";
  } catch {}

  // background (bgfill OR output jpeg)
  const inMime = String(inputMime || "").toLowerCase();
  const safeMime =
    inMime === "image/jpeg" || inMime === "image/jpg"
      ? "image/jpeg"
      : inMime === "image/webp"
      ? "image/webp"
      : inMime === "image/png"
      ? "image/png"
      : inMime === "image/gif"
      ? "image/gif"
      : "image/png";

  const needBg =
    !!settings.backgroundFill || safeMime === "image/jpeg" || (safeMime === "image/gif"); // gif -> still ok
  if (needBg) {
    // jpeg: always white
    const fill = safeMime === "image/jpeg" ? "#ffffff" : (settings.backgroundColor || "#ffffff");
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  // draw with composition plan
  ctx.drawImage(bitmap, plan.sx, plan.sy, plan.sw, plan.sh, plan.dx, plan.dy, plan.dw, plan.dh);

  // keep format encode (gif can't be encoded by canvas; fallback to png for preview blob)
  const encodeMime =
    safeMime === "image/gif"
      ? "image/png"
      : safeMime === "image/jpeg" || safeMime === "image/png" || safeMime === "image/webp"
      ? safeMime
      : "image/png";

  const blob = await new Promise((resolve) => {
    if (canvas.convertToBlob) {
      canvas.convertToBlob({ type: encodeMime }).then(resolve).catch(() => resolve(null));
      return;
    }
    canvas.toBlob((b) => resolve(b), encodeMime);
  });

  const t1 = performance.now();
  return {
    blob: blob || null,
    ms: Math.max(1, Math.round(t1 - t0)),
    mime: encodeMime,
    fallback: !blob,
    plan,
  };
}

/**
 * Container Strategy + Composition Strategy -> drawImage 9-params plan
 * returns plan in container pixel space.
 */
export function deriveResizerPlan(srcW, srcH, settings, { containerW, containerH, boxW, boxH }) {
  const keepAspect = settings.keepAspect !== false;
  const allowUpscale = !!settings.allowUpscale;

  const requestedMode = String(settings.resizeMode || "fit");
  const bgFill = !!settings.backgroundFill;
  const effectiveMode = bgFill ? "fit" : requestedMode; // ✅ bgFill 强制 fit (内容策略)

  // container is already decided by derivePreviewOutput => containerW/H
  const cw = Math.max(1, Math.round(containerW));
  const ch = Math.max(1, Math.round(containerH));

  // We need to know "target box" size for scaling logic:
  // - If container equals scaled content size (fit no bgFill), we treat box as container
  // - If container equals target box, we treat box as that ratio base
  const tw = Math.max(1, Math.round(boxW || cw));
  const th = Math.max(1, Math.round(boxH || ch));

  // clamp upscale (affects scale)
  const clampScale = (s) => (!allowUpscale ? Math.min(1, s) : s);

  // default: draw entire source
  let sx = 0, sy = 0, sw = srcW, sh = srcH;
  let dx = 0, dy = 0, dw = cw, dh = ch;

  if (!keepAspect || effectiveMode === "exact") {
    // stretch: fill container
    sx = 0; sy = 0; sw = srcW; sh = srcH;
    dx = 0; dy = 0; dw = cw; dh = ch;
    return { cw, ch, sx, sy, sw, sh, dx, dy, dw, dh };
  }

  if (effectiveMode === "fit") {
    // contain inside target box (tw/th), but draw into container (cw/ch)
    const s = clampScale(Math.min(tw / srcW, th / srcH));
    const drawW = Math.max(1, Math.round(srcW * s));
    const drawH = Math.max(1, Math.round(srcH * s));

    // container strategy:
    // - bgFill: container is target box (cw/ch), content centered
    // - no bgFill: container is content size (cw/ch==drawW/drawH) => dx=0 dy=0
    dw = bgFill ? drawW : cw;
    dh = bgFill ? drawH : ch;

    dx = bgFill ? Math.round((cw - drawW) / 2) : 0;
    dy = bgFill ? Math.round((ch - drawH) / 2) : 0;

    sx = 0; sy = 0; sw = srcW; sh = srcH;
    if (!bgFill) {
      // container is content size, ensure dw/dh matches container
      dw = cw;
      dh = ch;
      dx = 0;
      dy = 0;
    }
    return { cw, ch, sx, sy, sw, sh, dx, dy, dw, dh };
  }

  // fill (cover/crop)
  const s = clampScale(Math.max(tw / srcW, th / srcH));
  const scaledW = srcW * s;
  const scaledH = srcH * s;

  // crop in source space to match container aspect (cover center crop)
  const viewW = cw / s;
  const viewH = ch / s;

  sx = Math.max(0, (srcW - viewW) / 2);
  sy = Math.max(0, (srcH - viewH) / 2);
  sw = Math.min(srcW, viewW);
  sh = Math.min(srcH, viewH);

  dx = 0; dy = 0; dw = cw; dh = ch;
  return { cw, ch, sx, sy, sw, sh, dx, dy, dw, dh };
}

/**
 * Build light preview blob once (single attempt)
 */
export async function buildLightPreviewBlob(bitmap, out, settings) {
  const t0 = performance.now();

  const w = out.previewWidth;
  const h = out.previewHeight;

  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: null, ms: 0, mime: "" };

  const fmt = String(settings.outputFormat || "").toLowerCase();
  let mime = "image/webp";
  if (fmt === "jpg" || fmt === "jpeg") mime = "image/jpeg";
  else if (fmt === "png") mime = "image/png";
  else if (fmt === "webp") mime = "image/webp";
  else mime = "image/webp";

  ctx.clearRect(0, 0, w, h);
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);

  const q = clamp01((toInt(settings.quality) ?? 85) / 100);

  const blob = await new Promise((resolve) => {
    if (canvas.convertToBlob) {
      canvas
        .convertToBlob(mime === "image/png" ? { type: mime } : { type: mime, quality: q })
        .then(resolve)
        .catch(() => resolve(null));
      return;
    }

    canvas.toBlob((b) => resolve(b), mime, mime === "image/png" ? undefined : q);
  });

  const t1 = performance.now();
  return { blob: blob || null, ms: Math.max(1, Math.round(t1 - t0)), mime };
}

/**
 * ✅ Smart preview (compressor):
 * - try multiple qualities if lossy
 * - if still larger than originalSize -> fallback=true (use original)
 * - output png is pro -> fallback
 */
export async function buildSmartLightPreview({ bitmap, out, settings, originalSize }) {
  if (String(settings.outputFormat || "").toLowerCase() === "png") {
    return { blob: null, ms: 0, mime: "", fallback: true };
  }

  const fmt = String(settings.outputFormat || "").toLowerCase();
  const lossy = isLossyFormat(fmt);

  const q0 = toInt(settings.quality) ?? 85;
  const ladder = lossy ? uniqueQualities([q0, q0 - 5, q0 - 10, 75, 70, 65, 60, 55, 50, 45, 40]) : [q0];

  let best = null;

  for (const q of ladder) {
    const s = { ...settings };
    if (lossy) s.quality = q;

    const res = await buildLightPreviewBlob(bitmap, out, s);
    if (!res.blob) continue;

    if (!best || res.blob.size < best.blob.size) best = { ...res, q };

    if (res.blob.size <= originalSize) {
      return { blob: res.blob, ms: res.ms, mime: res.mime, fallback: false };
    }
  }

  if (!best?.blob) return { blob: null, ms: 0, mime: "", fallback: true };
  if (best.blob.size > originalSize) return { blob: best.blob, ms: best.ms, mime: best.mime, fallback: true };

  return { blob: best.blob, ms: best.ms, mime: best.mime, fallback: false };
}

export async function blobToBitmap(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    return bmp;
  } catch {
    return await new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }
}