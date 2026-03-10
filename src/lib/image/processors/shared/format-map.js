// src/lib/image/processors/shared/format-map.js

export const FORMAT_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image", // 可选：别在第一版 UI 暴露
};

export function normalizeFormat(fmt) {
  const f = String(fmt || "keep").toLowerCase().trim();
  if (f === "jpeg") return "jpg";
  return f;
}

export function mimeToExt(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("avif")) return "avif";
  if (m.includes("gif")) return "gif";
  if (m.includes("svg")) return "svg";
  return "";
}

export function isLossyMime(mime) {
  const m = String(mime || "").toLowerCase();
  return m === "image/jpeg" || m === "image/webp" || m === "image";
}

export function resolveKeepMime(file) {
  const t = String(file?.type || "").toLowerCase();

  // canvas 不能直接导出 GIF；keep GIF 时我们转 PNG（通用且稳定）
  if (t === "image/gif") return "image/png";

  if (t === "image/jpeg" || t === "image/jpg") return "image/jpeg";
  if (t === "image/png") return "image/png";
  if (t === "image/webp") return "image/webp";
  if (t === "image") return "image"; // 仅当浏览器支持编码时才真正 keep 成功（codec 会校验）
  if (t === "image/svg+xml") return "image/png"; // SVG keep：通常导出 PNG（更可靠）

  // 其它未知 image/* 统一落到 PNG
  if (t.startsWith("image/")) return "image/png";
  return "image/png";
}

/**
 * outputFormat: keep/png/jpg/webp
 */
export function resolveOutputMime(file, outputFormat) {
  const fmt = normalizeFormat(outputFormat);
  if (fmt === "keep") return resolveKeepMime(file);

  const mime = FORMAT_MIME[fmt];
  return mime || "image/png";
}

export function buildOutputName(originalName, outMime, outputFormat) {
  const base = String(originalName || "output").replace(/\.[^.]+$/, "");
  const fmt = normalizeFormat(outputFormat);

  // keep：按 outMime 来定扩展
  if (fmt === "keep") {
    const ext = mimeToExt(outMime) || "png";
    return `${base}.${ext}`;
  }

  // 非 keep：按 outputFormat
  const ext = fmt === "jpeg" ? "jpg" : fmt;
  return `${base}.${ext || "png"}`;
}