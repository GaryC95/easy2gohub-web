// src/lib/image/engine/stats.js
import { formatBytes } from "../utils/image-utils.js";

function kindFromFile(fileModel) {
  const t = String(fileModel?.type || fileModel?.file?.type || "").toLowerCase();
  const n = String(fileModel?.name || fileModel?.file?.name || "").toLowerCase();

  if (t.includes("jpeg") || t.includes("jpg") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".jfif")) return "JPG";
  if (t.includes("png") || n.endsWith(".png")) return "PNG";
  if (t.includes("webp") || n.endsWith(".webp")) return "WEBP";
  if (t.includes("gif") || n.endsWith(".gif")) return "GIF";
  if (t.includes("svg") || n.endsWith(".svg")) return "SVG";
  if (t.includes("avif") || n.endsWith(".avif")) return "AVIF";
  if (t.startsWith("image/")) return t.replace("image/", "").toUpperCase();

  return "—";
}

function fmtLabelFromSettings(outputFormat, origKind) {
  const f = String(outputFormat || "keep").toLowerCase();
  if (f === "keep") return origKind || "KEEP";
  if (f === "jpeg") return "JPG";
  return f.toUpperCase();
}

export function createStats({ mode = "transform", isResizer, $statOrig, $statOut, $statSaved, $statTime }) {
  function idle() {
    if ($statOrig) $statOrig.textContent = "—";
    if ($statOut) $statOut.textContent = "—";
    if ($statSaved) $statSaved.textContent = "—";
    if ($statTime) $statTime.textContent = "—";
  }

  function idleAfterChange(lastProcessMs) {
    // converter: 保持 orig/out（让格式不跳），其它清掉
    if (mode !== "convert") {
      if ($statOrig) $statOrig.textContent = "—";
    }

    if ($statOut) $statOut.textContent = "—";
    if ($statSaved) $statSaved.textContent = "—";
    if ($statTime) $statTime.textContent = lastProcessMs ? `${(lastProcessMs / 1000).toFixed(1)}s` : "—";
  }

  // ✅ 可选把 state 传进来（如果传了，converter 预览阶段也能显示 output format / files）
  function updatePreview(file0, previewBlob, previewMs, fallback = false, state = null) {
    if (mode === "convert") {
      const orig = kindFromFile(file0);
      const outFmt = state?.settings?.values?.outputFormat;
      const out = fmtLabelFromSettings(outFmt, orig);

      if ($statOrig) $statOrig.textContent = orig;
      if ($statOut) $statOut.textContent = out;

      // Files：预览阶段如果没传 state，就先显示 1
      const filesCount = state?.files?.length ?? 1;
      if ($statSaved) $statSaved.textContent = String(filesCount);

      if ($statTime) $statTime.textContent = previewMs ? `${(previewMs / 1000).toFixed(2)}s` : "—";
      return;
    }

    if (isResizer) {
      // Resizer preview：只显示时间（尺寸/变化等 afterProcess 才准确）
      if ($statTime) $statTime.textContent = previewMs ? `${(previewMs / 1000).toFixed(2)}s` : "—";
      return;
    }

    // compressor (默认旧逻辑)
    if ($statOrig) $statOrig.textContent = formatBytes(file0.size);

    const outSize = fallback ? file0.size : previewBlob?.size;
    if ($statOut) $statOut.textContent = outSize ? formatBytes(outSize) : "—";

    if ($statSaved) {
      if (outSize && file0.size) {
        const pct = Math.round((1 - outSize / file0.size) * 100);
        $statSaved.textContent = fallback ? "0%" : `${Math.max(0, pct)}%`;
      } else {
        $statSaved.textContent = "—";
      }
    }

    if ($statTime) $statTime.textContent = previewMs ? `${(previewMs / 1000).toFixed(2)}s` : "—";
  }

  function afterProcess(state) {
    const first = state.files[0];
    const r = first ? state.results.get(first.id) : null;

    if (mode === "convert") {
      const orig = kindFromFile(first);
      const out = fmtLabelFromSettings(state?.settings?.values?.outputFormat, orig);

      if ($statOrig) $statOrig.textContent = orig;
      if ($statOut) $statOut.textContent = out;

      if ($statSaved) $statSaved.textContent = String(state.files?.length ?? 0);

      if ($statTime) $statTime.textContent = state.lastProcessMs ? `${(state.lastProcessMs / 1000).toFixed(1)}s` : "—";
      return;
    }

    if (!first || !r) {
      if ($statOrig) $statOrig.textContent = "—";
      if ($statOut) $statOut.textContent = "—";
      if ($statSaved) $statSaved.textContent = "—";
      if ($statTime) $statTime.textContent = state.lastProcessMs ? `${(state.lastProcessMs / 1000).toFixed(1)}s` : "—";
      return;
    }

    if (isResizer && r.meta) {
      const { ow, oh, cw, ch, scaleChangePct } = r.meta;
      if ($statOrig) $statOrig.textContent = `${ow}×${oh}px`;
      if ($statOut) $statOut.textContent = `${cw}×${ch}px`;
      if ($statSaved) $statSaved.textContent = String(scaleChangePct || "—");
      if ($statTime) $statTime.textContent = state.lastProcessMs ? `${(state.lastProcessMs / 1000).toFixed(1)}s` : "—";
      return;
    }

    // compressor (旧逻辑)
    if ($statOrig) $statOrig.textContent = formatBytes(first.size);
    if ($statOut) $statOut.textContent = formatBytes(r.size);

    if ($statSaved) {
      const pct = Math.round((1 - r.size / first.size) * 100);
      $statSaved.textContent = `${Math.max(0, pct)}%`;
    }

    if ($statTime) $statTime.textContent = state.lastProcessMs ? `${(state.lastProcessMs / 1000).toFixed(1)}s` : "—";
  }

  return { idle, idleAfterChange, updatePreview, afterProcess };
}