// src/lib/image/engine/preview-slider.js
import {
  blobToBitmap,
  buildResizerPreview,
  buildSmartLightPreview,
  derivePreviewOutput,
  loadBitmap,
  renderCanvas,
} from "../utils/image-utils.js";

/* =========================
   Small helpers (SAFE)
   ========================= */

function emitSettingsSync(dom, key, value) {
  dom?.$settingsRoot?.dispatchEvent(
    new CustomEvent("image-settings:sync", { bubbles: true, detail: { key, value } })
  );
}

function setBoundNumber(settingsRoot, key, value) {
  const el = settingsRoot?.querySelector?.(`[data-bind="settings.${key}"]`);
  if (!el) return;
  el.value = String(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ✅ For normalized 0..1 values (crop)
// ✅ 给 crop 用：0..1
function clamp01Unit(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// ✅ 给质量用：0.01..1
function clamp01Quality(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0.85;
  return Math.max(0.01, Math.min(1, n));
}

function ratioFrom(aspect) {
  const v = String(aspect || "free");
  if (v === "free") return null;
  const m = v.split(":").map(Number);
  if (m.length !== 2 || !isFinite(m[0]) || !isFinite(m[1]) || m[0] <= 0 || m[1] <= 0) return null;
  return m[0] / m[1];
}

/* =========================
   Rotator preview helpers
   ========================= */

function normDeg(deg) {
  const d = ((Number(deg) || 0) % 360 + 360) % 360;
  return d === 0 || d === 90 || d === 180 || d === 270 ? d : 0;
}

function previewMimeFrom(settings, inputMime) {
  const fmt = String(settings?.outputFormat || "keep").toLowerCase();
  if (fmt === "jpg" || fmt === "jpeg") return "image/jpeg";
  if (fmt === "png") return "image/png";
  if (fmt === "webp") return "image/webp";

  const t = String(inputMime || "").toLowerCase();
  if (t === "image/gif" || t === "image/svg+xml") return "image/png";
  if (t === "image/jpeg" || t === "image/png" || t === "image/webp") return t;
  return "image/png";
}

async function buildRotatorPreviewBlob({ bitmap, settings, inputMime }) {
  const t0 = performance.now();

  const ow = bitmap.width;
  const oh = bitmap.height;

  const previewMax = 1024;
  const s = Math.min(1, previewMax / Math.max(ow, oh));
  const pw = Math.max(1, Math.round(ow * s));
  const ph = Math.max(1, Math.round(oh * s));

  const deg = normDeg(settings.rotateDeg);
  const flipX = !!settings.flipX;
  const flipY = !!settings.flipY;
  const swap = deg === 90 || deg === 270;

  const cw = swap ? ph : pw;
  const ch = swap ? pw : ph;

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(cw, ch)
      : Object.assign(document.createElement("canvas"), { width: cw, height: ch });

  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = cw;
    canvas.height = ch;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: null, ms: 0, mime: "", fallback: true };

  const mime = previewMimeFrom(settings, inputMime);

  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
  } else {
    ctx.clearRect(0, 0, cw, ch);
  }

  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(bitmap, -pw / 2, -ph / 2, pw, ph);
  ctx.restore();

  const q = clamp01Quality((Number(settings.quality ?? 85) || 85) / 100);

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
  return { blob: blob || null, ms: Math.max(1, Math.round(t1 - t0)), mime, fallback: !blob };
}

function maybeSwapOutForRotator(out, settings) {
  const rotDeg = normDeg(settings.rotateDeg);
  if (rotDeg === 90 || rotDeg === 270) {
    const t1 = out.previewWidth;
    out.previewWidth = out.previewHeight;
    out.previewHeight = t1;

    const t2 = out.width;
    out.width = out.height;
    out.height = t2;
  }
}

/* =========================
   Main mount/refresh
   ========================= */

export async function mountOrRefreshSliderForFirst({
  state,
  dom,
  isResizer,
  forceRemount,
  onPreviewUpdated,
  onPreviewFallbackToast,
}) {
  if (!dom.$dropzone || !state.files[0]) return;

  const f0 = state.files[0];
  const bitmap = await loadBitmap(f0);
  if (!bitmap) return;

  const isRotator = state.slug === "image-rotator";
  const isCropper = state.slug === "image-cropper";

  const out = derivePreviewOutput(bitmap, state.settings.values, { isResizer });
  if (isRotator) maybeSwapOutForRotator(out, state.settings.values);

  /* ---------- Cropper special mount (editor instead of compare slider) ---------- */
  if (isCropper) {
    emitSettingsSync(dom, "__cropImgW", bitmap.width);
    emitSettingsSync(dom, "__cropImgH", bitmap.height);
// ✅ 初次进入 cropper：如果还是全图裁剪，就初始化一个“可见裁剪框”
// - 如果 aspect != free：用“最大内切矩形”居中
// - 如果 free：默认 85% 居中
const initCropOnce = () => {
  const sr = dom.$settingsRoot;
  if (!sr) return;

  const curW = Number(state.settings.values.cropW ?? 1);
  const curH = Number(state.settings.values.cropH ?? 1);
  const curX = Number(state.settings.values.cropX ?? 0);
  const curY = Number(state.settings.values.cropY ?? 0);

  // 只有“默认全图状态”才初始化，避免覆盖用户手动裁剪
  const looksDefault = curW >= 0.999 && curH >= 0.999 && curX <= 0.0001 && curY <= 0.0001;
  if (!looksDefault) return;

  const aspect = String(state.settings.values.cropAspect || "free");
  const r = ratioFrom(aspect); // null if free
  const ar = bitmap.width / bitmap.height;

  let fw = 0.85, fh = 0.85; // free 默认 85%
  if (r) {
    // 最大内切：保持 r（宽高比）
    if (ar >= r) {
      fh = 1;
      fw = r / ar;
    } else {
      fw = 1;
      fh = ar / r;
    }
    // 再缩一点，让用户明显看到边界
    const shrink = 0.92;
    fw *= shrink;
    fh *= shrink;
  }

  const fx = (1 - fw) / 2;
  const fy = (1 - fh) / 2;

  // 更新 state + hidden binds（让 preview 立刻出现 crop 框）
  state.settings.values.cropX = fx;
  state.settings.values.cropY = fy;
  state.settings.values.cropW = fw;
  state.settings.values.cropH = fh;

  setBoundNumber(sr, "cropX", fx);
  setBoundNumber(sr, "cropY", fy);
  setBoundNumber(sr, "cropW", fw);
  setBoundNumber(sr, "cropH", fh);
};

// ✅ 确保 UI listener 已挂好：下一轮 microtask 再初始化
queueMicrotask(initCropOnce);
    const existing = state.previews.get(f0.id);
    if (existing && !forceRemount && existing.node?.isConnected && existing.kind === "cropper") {
      await refreshCropEditor({ state, dom, entry: existing, bitmap, out });
      onPreviewUpdated?.({ file0: f0, previewBlob: null, previewMs: 0, previewFallback: false });
      return;
    }

    const node = document.createElement("div");
    node.className =
      "cropper-stage relative rounded-3xl overflow-hidden border border-white/10 " +
      "shadow-[0_0_80px_rgba(0,0,0,0.18)] bg-slate-900 flex items-center justify-center";
    node.setAttribute("data-no-pick", "1");

    // ✅ guarantee height even if tailwind class not applied in some builds
    node.style.minHeight = "520px";
    node.style.height = "600px";

    node.innerHTML = `
      <div class="relative" data-role="crop-stage">
        <canvas data-role="crop-canvas" class="block"></canvas>
        <div data-role="crop-rect"
          class="absolute border-2 border-white/90 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
          <div class="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize" data-h="nw"></div>
          <div class="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize" data-h="ne"></div>
          <div class="absolute -bottom-2 -left-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize" data-h="sw"></div>
          <div class="absolute -bottom-2 -right-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize" data-h="se"></div>
        </div>
      </div>
    `;

    // mount into DropZone fixed stage
    dom.$dropzone.dispatchEvent(new CustomEvent("dropzone:mount", { bubbles: true, detail: { node } }));

    // ✅ fallback: if mount listener didn't append node, append ourselves
    if (!node.isConnected) {
      const host =
        dom.$dropzone.querySelector('[data-role="dropzone-stage"]') ||
        dom.$dropzone.querySelector('[data-role="dropzone-fixed"]') ||
        dom.$dropzone.querySelector('[data-role="dropzone-preview"]') ||
        dom.$dropzone;

      (host || dom.$dropzone).appendChild(node);
    }

    const stage = node.querySelector('[data-role="crop-stage"]');
    const canvas = node.querySelector('canvas[data-role="crop-canvas"]');
    const rect = node.querySelector('[data-role="crop-rect"]');

    if (!stage || !canvas || !rect) return;

    const entry = { kind: "cropper", node, stage, canvas, rect, out, bitmap };
    state.previews.clear();
    state.previews.set(f0.id, entry);

    bindCropEditorInteractions({ state, dom, entry });
    await refreshCropEditor({ state, dom, entry, bitmap, out });

    onPreviewUpdated?.({ file0: f0, previewBlob: null, previewMs: 0, previewFallback: false });
    return;
  }

  /* ---------- Default flow (comparison slider) ---------- */

  const existing = state.previews.get(f0.id);
  if (existing && !forceRemount && existing.node?.isConnected) {
    await refreshPreview({ state, entry: existing, fileModel: f0, bitmap, out, isResizer, onPreviewUpdated, onPreviewFallbackToast });
    return;
  }

  // new node
  const node = document.createElement("div");
  node.className =
    "comparison-slider relative rounded-3xl overflow-hidden border border-white/10 " +
    "shadow-[0_0_80px_rgba(0,0,0,0.18)] h-[520px] md:h-[600px]";
  node.setAttribute("data-no-pick", "1");

  node.innerHTML = `
    <div class="absolute inset-0 bg-slate-900 flex items-center justify-center">
      <canvas data-role="cmp-orig" class="block"></canvas>
      <div class="absolute top-6 left-6 glass px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-slate-400"></div>
        Original
      </div>
    </div>

    <div class="absolute inset-0 mask-right flex items-center justify-center" data-role="cmp-right">
      <canvas data-role="cmp-prev" class="block"></canvas>
      <div class="absolute top-6 right-6 bg-[#137fec] px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        Preview
      </div>
    </div>

    <div class="slider-handle" data-role="cmp-handle" aria-label="Comparison slider">
      <div class="slider-button">
        <span class="material-symbols-outlined text-white">unfold_more</span>
      </div>
    </div>
  `;

  dom.$dropzone.dispatchEvent(new CustomEvent("dropzone:mount", { bubbles: true, detail: { node } }));

  const origCanvas = node.querySelector('canvas[data-role="cmp-orig"]');
  const prevCanvas = node.querySelector('canvas[data-role="cmp-prev"]');
  const rightLayer = node.querySelector('[data-role="cmp-right"]');
  if (isRotator && rightLayer) rightLayer.classList.add("bg-slate-900");
  const handle = node.querySelector('[data-role="cmp-handle"]');

  let pct = 50;
  let dragging = false;

  const setPct = (p) => {
    pct = Math.max(0, Math.min(100, p));
    handle.style.left = `${pct}%`;
    rightLayer.style.clipPath = `inset(0 0 0 ${pct}%)`;
  };

  const getPctFromClientX = (clientX) => {
    const r = node.getBoundingClientRect();
    const x = Math.min(r.right, Math.max(r.left, clientX));
    return ((x - r.left) / r.width) * 100;
  };

  // build preview
  const previewRes = isResizer
    ? await buildResizerPreview({ bitmap, out, settings: state.settings.values, inputMime: f0.type, inputName: f0.name })
    : isRotator
    ? await buildRotatorPreviewBlob({ bitmap, settings: state.settings.values, inputMime: f0.type })
    : await buildSmartLightPreview({ bitmap, out, settings: state.settings.values, originalSize: f0.size, inputMime: f0.type });

  const pBlob = previewRes.blob;
  const pMs = previewRes.ms;
  const pFallback = !!previewRes.fallback;

  let pBitmap = null;
  if (pBlob && !pFallback) pBitmap = await blobToBitmap(pBlob);

  renderComparisonCanvases({
    bitmap,
    previewBitmap: pFallback ? null : pBitmap,
    out,
    origCanvas,
    prevCanvas,
    previewContain: isRotator, // ✅ only rotator
  });

  // prevent DropZone click-pick
  const eat = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  };
  node.addEventListener("click", eat, true);
  node.addEventListener("dblclick", eat, true);
  node.addEventListener("pointercancel", eat, true);

  const down = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    dragging = true;
    try { handle.setPointerCapture?.(ev.pointerId); } catch {}
    setPct(getPctFromClientX(ev.clientX));
  };
  const move = (ev) => {
    if (!dragging) return;
    ev.preventDefault();
    ev.stopPropagation();
    setPct(getPctFromClientX(ev.clientX));
  };
  const up = (ev) => {
    if (!dragging) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging = false;
    try { handle.releasePointerCapture?.(ev.pointerId); } catch {}
  };

  handle.addEventListener("pointerdown", down, { passive: false });
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up, { passive: false });

  node.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setPct(getPctFromClientX(ev.clientX));
  }, { passive: false });

  setPct(50);

  state.previews.clear();
  state.previews.set(f0.id, {
    out,
    bitmap,
    node,
    origCanvas,
    prevCanvas,
    rightLayer,
    handle,
    pct,
    previewBlob: pBlob,
    previewBitmap: pBitmap,
    previewMs: pMs,
    previewFallback: pFallback,
    previewPlan: previewRes.plan || null,
  });

  onPreviewUpdated?.({ file0: f0, previewBlob: pBlob, previewMs: pMs, previewFallback: pFallback });
  if (!isResizer && pFallback) onPreviewFallbackToast?.();
}

async function refreshPreview({ state, entry, fileModel, bitmap, out, isResizer, onPreviewUpdated, onPreviewFallbackToast }) {
  const isCropper = state.slug === "image-cropper";
  if (isCropper && entry.kind === "cropper") {
    // should not hit in default flow, but keep safe
    await refreshCropEditor({ state, dom: { $settingsRoot: null }, entry, bitmap, out });
    onPreviewUpdated?.({ file0: fileModel, previewBlob: null, previewMs: 0, previewFallback: false });
    return;
  }

  const isRotator = state.slug === "image-rotator";
  if (isRotator) maybeSwapOutForRotator(out, state.settings.values);

  const previewRes = isResizer
    ? await buildResizerPreview({ bitmap, out, settings: state.settings.values, inputMime: fileModel.type, inputName: fileModel.name })
    : isRotator
    ? await buildRotatorPreviewBlob({ bitmap, settings: state.settings.values, inputMime: fileModel.type })
    : await buildSmartLightPreview({ bitmap, out, settings: state.settings.values, originalSize: fileModel.size, inputMime: fileModel.type });

  const pBlob = previewRes.blob;
  const pMs = previewRes.ms;
  const pFallback = !!previewRes.fallback;

  let pBitmap = null;
  if (pBlob && !pFallback) pBitmap = await blobToBitmap(pBlob);

  renderComparisonCanvases({
    bitmap,
    previewBitmap: pFallback ? null : pBitmap,
    out,
    origCanvas: entry.origCanvas,
    prevCanvas: entry.prevCanvas,
    previewContain: isRotator,
  });

  entry.out = out;
  entry.bitmap = bitmap;
  entry.previewBlob = pBlob;
  entry.previewBitmap = pBitmap;
  entry.previewMs = pMs;
  entry.previewFallback = pFallback;
  entry.previewPlan = previewRes.plan || null;

  state.previews.set(fileModel.id, entry);

  onPreviewUpdated?.({ file0: fileModel, previewBlob: pBlob, previewMs: pMs, previewFallback: pFallback });
  if (!isResizer && pFallback) onPreviewFallbackToast?.();
}

/* =========================
   Render helpers (rotator-only previewContain)
   ========================= */

function renderComparisonCanvases({ bitmap, previewBitmap, out, origCanvas, prevCanvas, previewContain = false }) {
  if (!origCanvas || !prevCanvas) return;
  const w = out.previewWidth;
  const h = out.previewHeight;

  // left: contain + no-upscale
  renderCanvasContainNoUpscale(origCanvas, bitmap, w, h);

  if (previewBitmap) {
    if (previewContain) {
      // ✅ rotator: contain + allow-upscale, no distortion
      renderCanvasContain(prevCanvas, previewBitmap, w, h);
    } else {
      // other tools: keep old behavior (fill)
      renderCanvas(prevCanvas, previewBitmap, w, h);
    }
  } else {
    renderCanvasContainNoUpscale(prevCanvas, bitmap, w, h);
  }
}

function renderCanvasContainNoUpscale(canvas, bitmapOrImg, w, h) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const iw = bitmapOrImg.width;
  const ih = bitmapOrImg.height;
  if (!iw || !ih) return;

  const s = Math.min(1, w / iw, h / ih);
  const dw = Math.max(1, Math.round(iw * s));
  const dh = Math.max(1, Math.round(ih * s));
  const dx = Math.round((w - dw) / 2);
  const dy = Math.round((h - dh) / 2);

  ctx.drawImage(bitmapOrImg, 0, 0, iw, ih, dx, dy, dw, dh);
}

function renderCanvasContain(canvas, bitmapOrImg, w, h) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const iw = bitmapOrImg.width;
  const ih = bitmapOrImg.height;
  if (!iw || !ih) return;

  // contain + allow upscale
  const s = Math.min(w / iw, h / ih);
  const dw = Math.max(1, Math.round(iw * s));
  const dh = Math.max(1, Math.round(ih * s));
  const dx = Math.round((w - dw) / 2);
  const dy = Math.round((h - dh) / 2);

  ctx.drawImage(bitmapOrImg, 0, 0, iw, ih, dx, dy, dw, dh);
}

/* =========================
   Crop editor: refresh + interactions (V2 batch)
   ========================= */

async function refreshCropEditor({ state, dom, entry, bitmap, out }) {
  const w = out.previewWidth;
  const h = out.previewHeight;

  entry.stage.style.width = `${w}px`;
  entry.stage.style.height = `${h}px`;

  // render image into canvas
  renderCanvas(entry.canvas, bitmap, w, h);

  const rx = clamp01Unit(state.settings.values.cropX);
  const ry = clamp01Unit(state.settings.values.cropY);
  const rw = clamp01Unit(state.settings.values.cropW);
  const rh = clamp01Unit(state.settings.values.cropH);

  const x = Math.round(rx * w);
  const y = Math.round(ry * h);
  const cw = Math.max(1, Math.round(rw * w));
  const ch = Math.max(1, Math.round(rh * h));

  entry.rect.style.left = `${x}px`;
  entry.rect.style.top = `${y}px`;
  entry.rect.style.width = `${cw}px`;
  entry.rect.style.height = `${ch}px`;
}

function bindCropEditorInteractions({ state, dom, entry }) {
  const settingsRoot = dom.$settingsRoot;
  if (!settingsRoot) return;

  const stage = entry.stage;
  const rectEl = entry.rect;

  // prevent double bind
  if (rectEl?.dataset?.bound === "1") return;
  if (rectEl?.dataset) rectEl.dataset.bound = "1";

  const clamp01Unit = (x) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  };

  const ratioFrom = (aspect) => {
    const v = String(aspect || "free");
    if (v === "free") return null;
    const m = v.split(":").map(Number);
    if (m.length !== 2 || !isFinite(m[0]) || !isFinite(m[1]) || m[0] <= 0 || m[1] <= 0) return null;
    return m[0] / m[1];
  };

  const setBoundNumber = (k, v) => {
    const el = settingsRoot.querySelector(`[data-bind="settings.${k}"]`);
    if (!el) return;
    el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const getStageBox = () => stage.getBoundingClientRect();

  const getRectPx = () => {
    const r = rectEl.getBoundingClientRect();
    const s = getStageBox();
    return {
      x: r.left - s.left,
      y: r.top - s.top,
      w: r.width,
      h: r.height,
      sw: s.width,
      sh: s.height,
    };
  };

  const applyRectPx = (px) => {
    let x = px.x, y = px.y, w = px.w, h = px.h;
    const sw = Math.max(1, px.sw);
    const sh = Math.max(1, px.sh);

    w = Math.max(1, Math.min(sw, w));
    h = Math.max(1, Math.min(sh, h));
    x = Math.max(0, Math.min(sw - w, x));
    y = Math.max(0, Math.min(sh - h, y));

    rectEl.style.left = `${Math.round(x)}px`;
    rectEl.style.top = `${Math.round(y)}px`;
    rectEl.style.width = `${Math.round(w)}px`;
    rectEl.style.height = `${Math.round(h)}px`;
  };

  const commitToSettings = () => {
    const px = getRectPx();
    setBoundNumber("cropX", clamp01Unit(px.x / px.sw));
    setBoundNumber("cropY", clamp01Unit(px.y / px.sh));
    setBoundNumber("cropW", clamp01Unit(px.w / px.sw));
    setBoundNumber("cropH", clamp01Unit(px.h / px.sh));
  };

  const snapRectToAspect = (aspectStr) => {
    const r = ratioFrom(aspectStr);
    if (!r) return;

    const s = getStageBox();
    const sw = Math.max(1, s.width);
    const sh = Math.max(1, s.height);
    const ar = sw / sh;

    let w, h;
    if (ar >= r) {
      h = sh;
      w = sh * r;
    } else {
      w = sw;
      h = sw / r;
    }

    const shrink = 0.92;
    w *= shrink;
    h *= shrink;

    const x = (sw - w) / 2;
    const y = (sh - h) / 2;

    applyRectPx({ x, y, w, h, sw, sh });
    commitToSettings();
  };

  // --- drag ---
  let dragMode = null; // move | nw ne sw se
  let start = null;

  const onDown = (ev) => {
    const h = ev.target?.closest?.("[data-h]")?.getAttribute?.("data-h");
    dragMode = h || "move";
    start = { clientX: ev.clientX, clientY: ev.clientY, rect: getRectPx() };
    ev.preventDefault();
    ev.stopPropagation();
    try { rectEl.setPointerCapture?.(ev.pointerId); } catch {}
  };

  const onMove = (ev) => {
    if (!dragMode || !start) return;
    ev.preventDefault();
    ev.stopPropagation();

    const dx = ev.clientX - start.clientX;
    const dy = ev.clientY - start.clientY;

    const cur = { ...start.rect };
    const aspect = String(state.settings.values.cropAspect || "free");
    const r = ratioFrom(aspect);

    if (dragMode === "move") {
      cur.x += dx;
      cur.y += dy;
    } else {
      if (dragMode === "nw") { cur.x += dx; cur.y += dy; cur.w -= dx; cur.h -= dy; }
      if (dragMode === "ne") { cur.y += dy; cur.w += dx; cur.h -= dy; }
      if (dragMode === "sw") { cur.x += dx; cur.w -= dx; cur.h += dy; }
      if (dragMode === "se") { cur.w += dx; cur.h += dy; }

      if (r) cur.h = Math.max(1, Math.round(cur.w / r));
    }

    applyRectPx(cur);
  };

  const onUp = (ev) => {
    if (!dragMode) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragMode = null;
    start = null;
    try { rectEl.releasePointerCapture?.(ev.pointerId); } catch {}
    commitToSettings();
  };

  // prevent dropzone click-pick
  const eat = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
  entry.node.addEventListener("click", eat, true);
  entry.node.addEventListener("dblclick", eat, true);

  rectEl.addEventListener("pointerdown", onDown, { passive: false });
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp, { passive: false });

  // ✅ listen cropAspect updates from right panel
  settingsRoot.addEventListener("image-settings:sync", (ev) => {
    const d = ev?.detail || {};
    if (d.key === "cropAspect") {
      queueMicrotask(() => snapRectToAspect(String(d.value || "free")));
    }
  });
  queueMicrotask(() => snapRectToAspect(String(state.settings.values.cropAspect || "free")));
}