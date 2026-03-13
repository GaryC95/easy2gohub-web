// src/lib/image/tool-registry.js
// 企业级工具注册表：只声明，不做业务，不碰 DOM。
// ✅ 新增字段：mode
// - compress: 需要 quality ladder + anti-bloat（变大回退原图）
// - convert: 只做格式转换，不做 ladder，不做 anti-bloat
// - transform: 图像变换（resize/rotate/watermark/border/meme/favicon...），只跑一次

function normMime(file) {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();

  if (t.includes("jpeg") || t.includes("jpg") || n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  if (t.includes("png") || n.endsWith(".png")) return "png";
  if (t.includes("webp") || n.endsWith(".webp")) return "webp";
  if (t.includes("gif") || n.endsWith(".gif")) return "gif";

  return "unknown";
}

function isTransparencyLikely(file) {
  const k = normMime(file);
  return k === "png" || k === "webp" || k === "gif";
}

function sizeMB(file) {
  return file.size / (1024 * 1024);
}

function suggestMaxEdge(file) {
  const mb = sizeMB(file);
  if (mb > 12) return 2560;
  if (mb > 8) return 3200;
  if (mb > 5) return 3840;
  return undefined;
}

function suggestQualityRange(kind) {
  if (kind === "jpg") return { min: 60, max: 88, sweet: 82 };
  if (kind === "webp") return { min: 55, max: 88, sweet: 80 };
  return { min: 1, max: 100, sweet: 85 };
}

function recommendOutputFormat(file) {
  const kind = normMime(file);
  if (kind === "jpg") return "jpg";
  if (kind === "png") return "webp"; // 推荐 webp（更小），不强制
  if (kind === "webp") return "webp";
  return "keep";
}

export const TOOL_REGISTRY = [
  // 1) Image Compressor
  {
    slug: "image-compressor",
    mode: "compress",
    groups: ["quality", "output", "resize", "metadata", "batch"],
    processor: "compressor",
    previewPolicy: {
      interaction: "compare", // compare | crop | static | output
      frame: "square",        // square | auto
      maxSize: 1024,
      fit: "contain",         // contain | fill
      allowUpscale: true,
    },
    autoStrategy: (file) => {
      const kind = normMime(file);
      const maxEdge = suggestMaxEdge(file);

      if (kind === "png") {
        const q = suggestQualityRange("webp");
        return {
          __inputKind: "png",
          __hint: "png-recommend-webp",
          __qualityHint: q,
          outputFormat: "webp",
          quality: q.sweet,
          stripMetadata: true,
          maxEdge,
        };
      }

      if (kind === "jpg") {
        const q = suggestQualityRange("jpg");
        return {
          __inputKind: "jpg",
          __hint: "jpg-auto-ladder",
          __qualityHint: q,
          outputFormat: "jpg",
          quality: q.sweet,
          stripMetadata: true,
          maxEdge,
        };
      }

      if (kind === "webp") {
        const q = suggestQualityRange("webp");
        return {
          __inputKind: "webp",
          __hint: "webp-auto-ladder",
          __qualityHint: q,
          outputFormat: "webp",
          quality: q.sweet,
          stripMetadata: true,
          maxEdge,
        };
      }

      return {
        __inputKind: kind,
        outputFormat: "keep",
        quality: 85,
        stripMetadata: true,
        maxEdge,
      };
    },
  },

  // 2) Image Resizer
  {
    slug: "image-resizer",
    mode: "transform",
    groups: ["resize", "metadata", "batch"],
    processor: "resizer",
    previewPolicy: {
      interaction: "output",
      frame: "square",
      maxSize: 1024,
      fit: "contain",
      allowUpscale: true,
    },
    autoStrategy: () => {
      return {
        resizeTab: "size",
        width: undefined,
        height: undefined,
        keepAspect: true,
        allowUpscale: false,
        resizeMode: "fit",
        scalePercent: 50,
        backgroundFill: false,
        backgroundColor: "#ffffff",
        stripMetadata: false,
      };
    },
  },

  // 3) Image Converter
  {
    slug: "image-converter",
    mode: "convert",
    groups: ["output", "metadata", "batch"],
    processor: "converter",
    previewPolicy: {
      interaction: "compare",
      frame: "square",
      maxSize: 1024,
      fit: "contain",
      allowUpscale: true,
    },
    autoStrategy: (file) => {
      return {
        __inputKind: normMime(file),
        outputFormat: "keep",
        quality: 85,
        stripMetadata: false,
      };
    },
  },

  // 4) Image to WebP
  {
    slug: "image-to-webp",
    mode: "convert",
    groups: ["output", "metadata", "batch"],
    processor: "converter",
    previewPolicy: {
      interaction: "compare",
      frame: "square",
      maxSize: 1024,
      fit: "contain",
      allowUpscale: true,
    },
    autoStrategy: (file) => ({
      __inputKind: normMime(file),
      outputFormat: "webp",
      quality: 100,
      stripMetadata: false,
    }),
  },

  // 5) Image to JPG
  {
    slug: "image-to-jpg",
    mode: "convert",
    groups: ["output", "metadata", "batch"],
    processor: "converter",
    fixedOutputFormat: "jpg",
    previewPolicy: {
      interaction: "compare",
      frame: "square",
      maxSize: 1024,
      fit: "contain",
      allowUpscale: true,
    },
    autoStrategy: (file) => {
      return {
        __inputKind: normMime(file),
        outputFormat: "jpg",
        quality: 100,
        stripMetadata: false,
      };
    },
  },

  // 6) Image to PNG
  {
    slug: "image-to-png",
    mode: "convert",
    groups: ["output", "metadata", "batch"],
    processor: "converter",
    fixedOutputFormat: "png",
    previewPolicy: {
      interaction: "compare",
      frame: "square",
      maxSize: 1024,
      fit: "contain",
      allowUpscale: true,
    },
    autoStrategy: (file) => {
      return {
        __inputKind: normMime(file),
        outputFormat: "png",
        quality: 100,
        stripMetadata: false,
      };
    },
  },

  // 7) Image Rotator
  {
    slug: "image-rotator",
    mode: "transform",
    groups: ["rotate", "metadata", "batch"],
    processor: "rotator",
    previewPolicy: {
      interaction: "static",
      frame: "square",
      maxSize: 1024,
      fit: "contain",
      allowUpscale: true,
    },
    autoStrategy: (file) => {
      return {
        __inputKind: normMime(file),
        outputFormat: "keep",
        rotateDeg: 90,
        flipX: false,
        flipY: false,
        stripMetadata: false,
        quality: 85,
      };
    },
  },

  // 8) Image Cropper
  {
    slug: "image-cropper",
    mode: "transform",
    groups: ["crop", "metadata", "batch"],
    processor: "cropper",
    previewPolicy: {
      interaction: "crop",
      frame: "square",
      maxSize: 1024,
      fit: "contain",
      allowUpscale: true,
    },
    autoStrategy: (file) => {
      return {
        __inputKind: normMime(file),
        outputFormat: "keep",
        quality: 85,
        stripMetadata: false,

        // normalized crop (0..1)
        cropAspect: "free",
        cropX: 0,
        cropY: 0,
        cropW: 1,
        cropH: 1,
      };
    },
  },
];

export function getToolDef(slug) {
  const def = TOOL_REGISTRY.find((t) => t.slug === slug);
  if (!def) throw new Error(`[tool-registry] Unknown slug: ${slug}`);
  return def;
}

