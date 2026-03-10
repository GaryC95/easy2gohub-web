/* =========================================================
   Categories
   ========================================================= */

export type Category = "image" | "pdf" | "text" | "file" | "dev" | "media";

/** 用于 Sidebar / 分类页显示 */
export const CATEGORY_LABEL: Record<Category, string> = {
  image: "Graphics",
  pdf: "PDF",
  text: "Text",
  file: "Files",
  dev: "Dev",
  media: "Media",
};

/** 用于分类页 SEO 描述 */
export const CATEGORY_DESC: Record<Category, string> = {
  image: "Compress, convert, resize images in your browser — fast and private.",
  pdf: "Merge, split, compress and convert PDFs locally — fast and private.",
  text: "Text tools for formatting, cleaning, and transforming content locally.",
  file: "File utilities for organizing, converting, and packaging files locally.",
  dev: "Developer utilities: formatters, encoders, generators, and more.",
  media: "Media utilities for audio/video processing in your browser (where supported).",
};

/** 分类排序（以后你加工具，主页/分类页会按这个顺序自动出现） */
export const CATEGORY_ORDER: Category[] = ["image", "pdf", "text", "file", "dev", "media"];

/** Sidebar 分类 meta */
export const CATEGORY_META: Record<
  Category,
  { label: string; desc: string; icon: string; iconClass: string }
> = {
  image: { label: "Graphics", desc: CATEGORY_DESC.image, icon: "image", iconClass: "text-blue-500" },
  pdf: { label: "PDF", desc: CATEGORY_DESC.pdf, icon: "picture_as_pdf", iconClass: "text-red-500" },
  text: { label: "Text", desc: CATEGORY_DESC.text, icon: "text_fields", iconClass: "text-indigo-600" },
  file: { label: "Files", desc: CATEGORY_DESC.file, icon: "folder", iconClass: "text-amber-600" },
  dev: { label: "Dev", desc: CATEGORY_DESC.dev, icon: "terminal", iconClass: "text-emerald-600" },
  media: { label: "Media", desc: CATEGORY_DESC.media, icon: "movie", iconClass: "text-fuchsia-600" },
};

/* =========================================================
   Settings Type (for right sidebar)
   ========================================================= */

export type SettingsType = "image" | "none";

/* =========================================================
   Tool SEO Type  ✅ 与 ToolSeoBlock.astro 对齐：intro/tips/steps/faq
   ========================================================= */

export type FaqItem = { q: string; a: string };

export type ToolSEO = {
  intro?: string;
  tips?: string[];
  steps?: string[];
  faq?: FaqItem[];
  
};

/* =========================================================
   Tool Type
   ========================================================= */

export type Tool = {
  category: Category;
  slug: string;

  title: string;
  description: string;
  icon: string;
  tags: string[];
  live?: boolean;
  seo: ToolSEO;

  settingsType?: SettingsType;
  order?: number;
  adsProfile?: "light" | "default" | "heavy" | "none";
};

/* =========================================================
   Tools List (IMAGE ONLY for now)
   ========================================================= */

export const tools: Tool[] = [
  {
    category: "image",
    slug: "image-compressor",
    title: "Image Compressor",
    description: "Compress images locally in your browser. No upload. Fast and private.",
    icon: "compress",
    tags: ["Fast", "Private", "Batch"],
    settingsType: "image",
    order: 1,
    live: true,
    adsProfile: "heavy",
    seo: {
  intro:
    "Free online image compressor that runs locally in your browser. Compress JPG/PNG/WebP with no uploads — fast, private, and great for web, email, and forms.",
  steps: [
    "Add images (drag & drop or click Select from computer).",
    "Choose output format (keep original / JPG / PNG / WebP) and adjust quality in Settings.",
    "Optional: set Max Dimension to downscale large images for smaller file sizes.",
    "Click Process Images and download results (ZIP for multiple files).",
  ],
  tips: [
    "For “compress image to 100KB/200KB”, lower quality gradually and also reduce dimensions.",
    "Use WebP for websites to keep good quality with smaller size (if your target supports it).",
    "Use JPG for photos, PNG for logos/graphics or when you need transparency.",
    "If the file is still large, downscale first — size drops dramatically on huge images.",
  ],
  faq: [
    { q: "Are my images uploaded?", a: "No. Everything runs locally in your browser — your files never leave your device." },
    { q: "Does it support batch compression?", a: "Yes. Add multiple images and download as a ZIP." },
    { q: "How can I compress to a specific size (e.g. 100KB)?", a: "Reduce quality first, then reduce dimensions (Max Dimension). Repeat until you reach your target." },
    { q: "Which formats work best for compression?", a: "JPG/WebP are best for photos. PNG is lossless and may be larger for photos." },
  ],
    },
  },

  {
    category: "image",
    slug: "image-resizer",
    title: "Image Resizer",
    description: "Resize images locally. Batch resize, keep aspect ratio, optional output format.",
    icon: "photo_size_select_large",
    tags: ["Resize", "Batch", "Private"],
    settingsType: "image",
    live: true,
    order: 2,
    adsProfile: "default",
    seo: {
  intro:
    "Free online image resizer that runs locally (no uploads). Resize images in batch — change dimensions for social media, thumbnails, and forms quickly and privately.",
  steps: [
    "Add images (drag & drop or select).",
    "Set Max Dimension or specific width/height, and choose Resize Mode (Fit/Fill/Exact).",
    "Optional: keep aspect ratio and disable upscaling to avoid blur.",
    "Download resized images (ZIP for multiple files).",
  ],
  tips: [
    "Common sizes: 1080×1080 (square), 1080×1350 (portrait), 1200×630 (OG), 1920×1080 (HD).",
    "Use Fit to avoid cropping; use Fill when you want full coverage (may crop edges).",
    "Avoid upscaling small images — it can look blurry.",
    "After resizing, run Image Compressor to reduce file size further.",
  ],
  faq: [
    { q: "Are files uploaded to a server?", a: "No. Resizing happens locally in your browser." },
    { q: "Can I resize multiple images at once?", a: "Yes. This tool supports batch resizing." },
    { q: "Will resizing reduce quality?", a: "Resizing changes pixel dimensions. Quality loss mainly depends on the output format and compression settings." },
    { q: "How do I keep the aspect ratio?", a: "Enable Keep Aspect Ratio (or use Fit mode) to prevent distortion." },
  ],
},
  },

  {
    category: "image",
    slug: "image-converter",
    title: "Image Converter",
    description: "Convert images between JPG/PNG/WEBP locally in your browser.",
    icon: "swap_horiz",
    tags: ["Convert", "Local"],
    settingsType: "image",
    live: true,
    order: 3,
    adsProfile: "default",
    seo: {
  intro:
    "Free online image converter that runs locally in your browser. Convert JPG ↔ PNG or WebP to JPG/PNG — no uploads, fast, and private.",
  steps: [
    "Drop images into the page (or click Select from computer).",
    "Choose Target Format: KEEP, WEBP, JPG, or PNG.",
    "Click Convert Image.",
    "Download each file or use Download ZIP for batch.",
  ],
  tips: [
    "Use KEEP to re-export in the original format (useful for batch processing / consistent output).",
    "Choose PNG when you need transparency; choose JPG for smaller photo sizes.",
    "Choose WebP for web performance (often smaller than JPG/PNG).",
    "For many files, ZIP download from the right panel is the fastest.",
  ],
  faq: [
    { q: "Are my images uploaded?", a: "No. Conversion runs locally in your browser — files never leave your device." },
    { q: "What does KEEP mean?", a: "KEEP keeps the original format and re-exports the image without changing the format." },
    { q: "Can I convert multiple images at once?", a: "Yes. Add multiple files and download results as a ZIP." },
    { q: "What happens to transparency if I convert to JPG?", a: "JPG doesn’t support transparency, so transparent areas may be filled with a solid background." },
  ],
},
  },

  {
    category: "image",
    slug: "image-to-webp",
    title: "Image to WebP",
    description: "Convert images to WebP locally for faster websites and better performance.",
    icon: "image",
    tags: ["WEBP", "Convert", "Batch"],
    settingsType: "image",
    live: true,
    order: 4,
    adsProfile: "default",
    seo: {
  intro:
    "Free online WebP converter that runs locally. Convert JPG/PNG to WebP for smaller files and faster websites — no uploads.",
  steps: [
    "Drop images into the page (or click Select from computer).",
    "Click Convert Image.",
    "Download the WebP file, or Download ZIP for batch.",
  ],
  tips: [
    "WebP is great for web performance and often smaller than JPG/PNG.",
    "If your target platform doesn’t support WebP, keep a JPG/PNG copy too.",
    "Batch conversions are easiest with ZIP download.",
  ],
  faq: [
    { q: "Are my images uploaded?", a: "No. Conversion runs locally in your browser." },
    { q: "Can I convert multiple images?", a: "Yes. Add multiple files and download them as a ZIP." },
    { q: "Does WebP support transparency?", a: "Yes. WebP can support transparency." },
    { q: "Why use WebP?", a: "WebP often provides smaller files with good visual quality for websites." },
  ],
},
  },
{
  category: "image",
  slug: "image-to-jpg",
  title: "Image to JPG",
  description: "Convert images to JPG locally for compatibility and smaller photo sizes.",
  icon: "image",
  tags: ["JPG", "Convert", "Batch"],
  settingsType: "image",
  live: true,
  order: 5,
  adsProfile: "default",
  seo: {
  intro:
    "Free online JPG converter that runs locally. Convert PNG/WebP to JPG for compatibility and smaller photo sizes — no uploads.",
  steps: [
    "Drop images into the page (or click Select from computer).",
    "Click Convert Image.",
    "Download the JPG file, or Download ZIP for batch.",
  ],
  tips: [
    "JPG is best for photos and usually smaller than PNG.",
    "JPG doesn’t support transparency — transparent areas will be filled.",
    "Use ZIP download when converting multiple images.",
  ],
  faq: [
    { q: "Are my images uploaded?", a: "No. Everything runs locally in your browser." },
    { q: "What happens to transparency?", a: "JPG doesn’t support transparency, so transparent areas may be filled with a solid background." },
    { q: "Can I convert multiple images at once?", a: "Yes. Add multiple images and download results as a ZIP." },
    { q: "Will JPG reduce file size?", a: "Often yes for photos, but results depend on the original image." },
  ],
},
},

{
  category: "image",
  slug: "image-to-png",
  title: "Image to PNG",
  description: "Convert images to PNG locally for lossless quality and transparency support.",
  icon: "image",
  tags: ["PNG", "Convert", "Batch"],
  settingsType: "image",
  live: true,
  order: 6,
  adsProfile: "default",
  seo: {
  intro:
    "Free online PNG converter that runs locally in your browser. Convert JPG/WebP to PNG for lossless quality and transparency support — no uploads.",
  steps: [
    "Drop images into the page (or click Select from computer).",
    "Click Convert Image.",
    "Download the converted PNG file, or Download ZIP for batch.",
  ],
  tips: [
    "PNG is lossless and often larger for photos. For smaller photo size, use JPG or WebP.",
    "If you need transparency, PNG is a good choice.",
    "For many files, use the ZIP download from the right panel.",
  ],
  faq: [
    { q: "Are my images uploaded?", a: "No. Conversion runs locally in your browser — files never leave your device." },
    { q: "Can I convert multiple images at once?", a: "Yes. Add multiple files and download them as a ZIP." },
    { q: "Is PNG always smaller?", a: "Not always. PNG is lossless and can be larger, especially for photos." },
    { q: "Does PNG support transparency?", a: "Yes. PNG supports transparency." },
  ],
},
},
  {
    category: "image",
    slug: "image-rotator",
    title: "Image Rotator / Flipper",
    description: "Rotate images (0/90/180/270) and flip horizontally/vertically. Batch supported.",
    icon: "flip",
    tags: ["Rotate", "Flip", "Batch"],
    settingsType: "image",
    live: true,
    order: 10,
    adsProfile: "default",
    seo: {
  intro:
    "Free online image rotator & flipper that runs locally. Rotate images 90/180/270 degrees and flip horizontally/vertically — no uploads, batch supported.",
  steps: [
    "Add images (single or batch).",
    "Choose rotation angle (0/90/180/270) and flip options in Settings.",
    "Download results (ZIP for multiple images).",
  ],
  tips: [
    "Use 90° rotation to fix sideways camera photos.",
    "Flip horizontally to correct mirrored selfies or scans.",
    "For consistent output, keep the original format unless you need conversion.",
  ],
  faq: [
    { q: "Is it private?", a: "Yes. All processing happens locally in your browser." },
    { q: "Does it support batch rotation?", a: "Yes. Add multiple images and download as ZIP." },
    { q: "Will the image quality change?", a: "Rotation/flip re-exports the image. Quality depends on output format and quality settings (if provided)." },
    { q: "Can I rotate and flip together?", a: "Yes. You can apply rotation and flip options in one export." },
  ],
},
  },

  {
  category: "image",
  slug: "image-cropper",
  title: "Image Cropper",
  description: "Crop images locally with a draggable crop box. Batch supported via relative crop.",
  icon: "crop",
  tags: ["Crop", "Batch", "Private"],
  settingsType: "image",
  live: true,
  order: 7,
  adsProfile: "default",
  seo: {
  intro:
    "Free online image cropper that runs locally in your browser. Crop JPG/PNG/WebP with no uploads — fast, private, and precise.",
  steps: [
    "Add images (drag & drop or select from your device).",
    "Choose a crop mode: freeform or a fixed aspect ratio (e.g., 1:1, 4:5, 16:9).",
    "Drag/resize the crop box and adjust the crop area.",
    "Apply crop and download the result (multiple files export as ZIP when available).",
  ],
  tips: [
    "Use fixed ratios for consistent results (1:1 for avatars, 4:5 for feeds, 16:9 for thumbnails).",
    "Zoom in for precise edges when cropping small details.",
    "If you need transparency, keep PNG/WebP as output format.",
    "After cropping, use Image Resizer or Image Compressor to optimize size for web/email.",
  ],
  faq: [
    { q: "Are my images uploaded?", a: "No. Cropping happens locally in your browser — files never leave your device." },
    { q: "Can I crop multiple images?", a: "Yes. Add multiple files and export them together (ZIP for batch when supported)." },
    { q: "Will cropping reduce image quality?", a: "Cropping itself does not reduce quality. Quality changes only if you choose a lossy output format or lower quality settings." },
    { q: "What formats are supported?", a: "Common formats like JPG, PNG, and WebP are supported (output options depend on your browser)." },
  ],
 }
},

  {
    category: "image",
    slug: "image-watermark",
    title: "Watermark (Text)",
    description: "Add a text watermark to images locally. Batch supported.",
    icon: "branding_watermark",
    tags: ["Watermark", "Batch"],
    settingsType: "image",
    order: 11,
    adsProfile: "default",
    seo: {
      intro: "Add a text watermark with opacity, size, position, and color — no uploads.",
      steps: ["Add images.", "Set watermark text/options in Settings.", "Export and download."],
       
    },
  },

  {
    category: "image",
    slug: "favicon-generator",
    title: "Favicon Generator",
    description: "Generate multiple favicon PNG sizes from an image. Download as ZIP.",
    icon: "emoji_symbols",
    tags: ["Favicon", "ZIP"],
    settingsType: "image",
    order: 12,
    adsProfile: "light",
    seo: {
      intro: "Create common favicon PNG sizes (16–256) locally. Optional padding and background.",
      steps: ["Upload a square-ish image.", "Choose sizes/padding/background.", "Download a ZIP of icons."],
       
    },
  },

  {
    category: "image",
    slug: "exif-tool",
    title: "EXIF Viewer / Remove Metadata",
    description: "View image EXIF locally or export a clean copy to remove metadata.",
    icon: "info",
    tags: ["EXIF", "Privacy"],
    settingsType: "image",
    order: 13,
    adsProfile: "default",
    seo: {
      intro: "Inspect EXIF data and remove metadata by exporting a clean copy locally.",
      steps: ["Upload an image.", "Choose View or Remove mode.", "Download clean export if needed."],
       
    },
  },

  {
    category: "image",
    slug: "image-border",
    title: "Border / Rounded / Background",
    description: "Add border, rounded corners, and background color locally. Batch supported.",
    icon: "rounded_corner",
    tags: ["Border", "Rounded"],
    settingsType: "image",
    order: 14,
    adsProfile: "default",
    seo: {
      intro: "Add a clean border, rounded corners, and a background color — perfect for social posts.",
      steps: ["Add images.", "Set border/radius/background in Settings.", "Export and download."],
       
    },
  },

  {
    category: "image",
    slug: "meme-generator",
    title: "Meme Generator",
    description: "Add top/bottom text and export locally.",
    icon: "mood",
    tags: ["Meme", "Text"],
    settingsType: "image",
    order: 15,
    adsProfile: "default",
    seo: {
      intro: "Create memes quickly with top/bottom text, font size, stroke, and color.",
      steps: ["Upload an image.", "Edit text in Settings.", "Render preview and export."],
       
    },
  },
];

/* =========================================================
   Helpers (LIVE ONLY)
   ========================================================= */

// ✅ 只暴露已上线工具（live === true）
export const liveTools: Tool[] = tools
  .filter((t) => t.live === true)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

export function getToolsByCategory(category: Category) {
  return liveTools
    .filter((t) => t.category === category)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export function getTool(category: Category, slug: string) {
  // ✅ 只允许访问已上线 tool
  return liveTools.find((t) => t.category === category && t.slug === slug);
}

/** All categories that currently have at least 1 LIVE tool */
export function getActiveCategories(): Category[] {
  const set = new Set<Category>();
  for (const t of liveTools) set.add(t.category);
  // keep CATEGORY_ORDER order
  return CATEGORY_ORDER.filter((c) => set.has(c));
}