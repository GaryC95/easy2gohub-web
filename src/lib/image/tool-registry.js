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

  // 3) Image Converter (通用格式转换：不做压缩 ladder)
  {
  slug: "image-converter",
  mode: "convert",
  // ✅ 不要 quality，避免出现 quality ring
  // ✅ 不要 output 的“auto策略提示”，但 output 控件本身可以保留
  groups: ["output", "metadata", "batch"],  // 你想保留 metadata 也行，但 UI 那块你要自己做
  processor: "converter",
  autoStrategy: (file) => {
    // converter 默认更建议 keep（纯格式工具，不做“更小”推荐）
    return {
      __inputKind: normMime(file),
      outputFormat: "keep",
      // quality 仍可存在（converter.js 用得上），但 UI 不显示也没关系
      quality: 85,
      stripMetadata: false,
    };
  },
},

 // 4) Image to WebP (固定输出 WebP + compress ladder + anti-bloat)
{
  slug: "image-to-webp",
  mode: "convert",
  groups: ["output", "metadata", "batch"],
  processor: "converter",
  autoStrategy: (file) => ({
    __inputKind: normMime(file),
    outputFormat: "webp",
    quality: 100,
    stripMetadata: false,
  }),
},

// Image to JPG (convert-only)
{
  slug: "image-to-jpg",
  mode: "convert",
  groups: ["output", "metadata", "batch"],
  processor: "converter",
  fixedOutputFormat: "jpg",
  autoStrategy: (file) => {
    return {
      __inputKind: normMime(file),
      outputFormat: "jpg",
      quality: 100,
      stripMetadata: false,
    };
  },
},

// Image to PNG (convert-only)
{
  slug: "image-to-png",
  mode: "convert",
  groups: ["output", "metadata", "batch"],
  processor: "converter",
  fixedOutputFormat: "png",
  autoStrategy: (file) => {
    return {
      __inputKind: normMime(file),
      outputFormat: "png",
      quality: 100,
      stripMetadata: false,
    };
  },
},

  // 5) Image Rotator
  {
  slug: "image-rotator",
  mode: "transform",
  groups: ["rotate", "metadata", "batch"], // 你现在这样就行
  processor: "rotator",
  autoStrategy: (file) => {
  return {
    __inputKind: normMime(file),
    outputFormat: "keep",   // ✅ rotator 不让改格式 -> 永远 keep
    rotateDeg: 90,
    flipX: false,
    flipY: false,
    stripMetadata: false,
    quality: 85,
    };
  },
},

{
  slug: "image-cropper",
  mode: "transform",
  groups: ["crop", "metadata", "batch"],
  processor: "cropper",
  autoStrategy: (file) => {
    return {
      __inputKind: normMime(file),
      // keep format (no output UI)
      outputFormat: "keep",
      quality: 85,
      stripMetadata: false,

      // ✅ V2: normalized crop (0..1)
      cropAspect: "free", // free | 1:1 | 4:5 | 16:9 | 9:16 | 3:2 | 2:3 ...
      cropX: 0,
      cropY: 0,
      cropW: 1,
      cropH: 1,
    };
  },
},

  // 6) Image Watermark
  {
    slug: "image-watermark",
    mode: "transform",
    groups: ["watermark", "output", "quality", "resize", "metadata", "batch"],
    processor: "watermark",
    autoStrategy: (file) => {
      const kind = normMime(file);
      const transparency = isTransparencyLikely(file);

      let outFmt = "jpg";
      if (transparency) outFmt = kind === "png" ? "keep" : "webp";

      const qKind = outFmt === "jpg" ? "jpg" : "webp";
      const q = suggestQualityRange(qKind);

      return {
        __inputKind: kind,
        __qualityHint: q,
        outputFormat: outFmt,
        quality: q.sweet,
        watermarkType: "text",
        watermarkText: "Easy2GoHub",
        watermarkOpacity: 0.35,
        watermarkPosition: "br",
        stripMetadata: true,
        maxEdge: suggestMaxEdge(file),
      };
    },
  },

  // 7) Image Border
  {
    slug: "image-border",
    mode: "transform",
    groups: ["border", "output", "quality", "resize", "metadata", "batch"],
    processor: "border",
    autoStrategy: (file) => {
      const kind = normMime(file);
      const transparency = isTransparencyLikely(file);

      let outFmt = "jpg";
      if (transparency) outFmt = kind === "png" ? "keep" : "webp";

      const qKind = outFmt === "jpg" ? "jpg" : "webp";
      const q = suggestQualityRange(qKind);

      return {
        __inputKind: kind,
        __qualityHint: q,
        outputFormat: outFmt,
        quality: q.sweet,
        borderWidth: 24,
        borderColor: "#ffffff",
        borderRadius: 24,
        stripMetadata: true,
        maxEdge: suggestMaxEdge(file),
      };
    },
  },

  // 8) Meme Generator
  {
    slug: "meme-generator",
    mode: "transform",
    groups: ["meme", "output", "quality", "resize", "batch"],
    processor: "meme",
    autoStrategy: (file) => {
      return {
        __inputKind: normMime(file),
        outputFormat: "png",
        topText: "TOP TEXT",
        bottomText: "BOTTOM TEXT",
        memeFontSize: 48,
        memeStrokeWidth: 6,
        quality: 92,
      };
    },
  },

  // 9) Favicon Generator
  {
    slug: "favicon-generator",
    mode: "transform",
    groups: ["favicon", "output", "batch"],
    processor: "favicon",
    autoStrategy: (file) => {
      return {
        __inputKind: normMime(file),
        outputFormat: "png",
        faviconSizes: [16, 32, 48, 64, 128, 256],
        faviconPadding: 0.12,
        faviconBackground: "transparent",
      };
    },
  },

  // 10) EXIF Tool
  {
    slug: "exif-tool",
    mode: "transform",
    groups: ["metadata", "batch"],
    processor: "exif",
    autoStrategy: (file) => {
      return { __inputKind: normMime(file), exifMode: "read", stripMetadata: false };
    },
  },
];

export function getToolDef(slug) {
  const def = TOOL_REGISTRY.find((t) => t.slug === slug);
  if (!def) throw new Error(`[tool-registry] Unknown slug: ${slug}`);
  return def;
}

