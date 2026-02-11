/* =========================================================
   Categories
   ========================================================= */

export type Category =
  | "image"
  | "pdf"
  | "text"
  | "file"
  | "dev"
  | "convert"
  | "media";

/** 用于 Sidebar / 分类页显示 */
export const CATEGORY_LABEL: Record<Category, string> = {
  image: "Graphics",
  pdf: "Documents",
  text: "Text & Data",
  file: "File Tools",
  dev: "Dev & Web",
  convert: "Converters",
  media: "Media",
};

/** 用于分类页 SEO 描述 */
export const CATEGORY_DESC: Record<Category, string> = {
  image: "Compress, convert, resize images in your browser — fast and private.",
  pdf: "Merge, split and process PDFs locally with no server upload.",
  text: "Format JSON, convert cases, encode and decode text instantly.",
  file: "Client-side utilities like hashing and identifiers.",
  dev: "Developer utilities like UUID, JWT, URL encoding and debugging tools.",
  convert: "Unit, date, and number converters that work fully in your browser.",
  media: "Media processing tools running locally in your browser.",
};

/** 分类排序（Sidebar / /tools 页面都用这个顺序）
 *  ✅ 审核前：只显示 image
 */
export const CATEGORY_ORDER: Category[] = ["image"];

/** Sidebar 分类 meta（图标+颜色+副标题） */
export const CATEGORY_META: Record<
  Category,
  { label: string; desc: string; icon: string; iconClass: string }
> = {
  image: {
    label: "Graphics",
    desc: CATEGORY_DESC.image,
    icon: "image",
    iconClass: "text-blue-500",
  },
  pdf: {
    label: "Documents",
    desc: CATEGORY_DESC.pdf,
    icon: "picture_as_pdf",
    iconClass: "text-red-500",
  },
  text: {
    label: "Text & Data",
    desc: CATEGORY_DESC.text,
    icon: "data_object",
    iconClass: "text-fuchsia-500",
  },
  file: {
    label: "File Tools",
    desc: CATEGORY_DESC.file,
    icon: "folder",
    iconClass: "text-slate-600",
  },
  dev: {
    label: "Dev & Web",
    desc: CATEGORY_DESC.dev,
    icon: "terminal",
    iconClass: "text-emerald-600",
  },
  convert: {
    label: "Converters",
    desc: CATEGORY_DESC.convert,
    icon: "swap_horiz",
    iconClass: "text-teal-600",
  },
  media: {
    label: "Media",
    desc: CATEGORY_DESC.media,
    icon: "movie",
    iconClass: "text-violet-600",
  },
};

/* =========================================================
   Settings Type (for right sidebar)
   ========================================================= */

export type SettingsType =
  | "image"
  | "pdf"
  | "text"
  | "file"
  | "dev"
  | "convert"
  | "media"
  | "none";

/* =========================================================
   Tool SEO Type  ✅宽松：所有字段可选
   ========================================================= */

export type ToolSEO = {
  intro?: string;
  howTo?: string[];
  steps?: string[];
  tips?: string[];
  faq?: { q: string; a: string }[];
  lastUpdated?: string;
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

  seo?: ToolSEO;

  settingsType?: SettingsType;
  order?: number;
  adsProfile?: "light" | "default" | "heavy" | "none";
};

/* =========================================================
   Tools List  ✅审核前只保留 4 个 image tools
   ========================================================= */

export const tools: Tool[] = [
  {
    category: "image",
    slug: "image-compressor",
    title: "Image Compressor",
    description:
      "Compress JPG, PNG, and WebP images in your browser. No upload. Fast and private.",
    icon: "compress",
    tags: ["Fast", "Private"],
    settingsType: "image",
    order: 1,
    adsProfile: "heavy",
    seo: {
      intro:
        "Compress images locally in your browser to reduce file size for web, email, and sharing. Your files never leave your device.",
      howTo: [
        "Drop images into the upload area or click “Select from computer”.",
        "Adjust Compression Level (higher = better quality, larger file).",
        "Choose Target Format (AUTO keeps the best compatible format).",
        "Click “Process Images” and download your compressed file(s).",
      ],
      tips: [
        "Use WEBP or AVIF for the best size savings on modern browsers.",
        "Use JPG for photos and gradients; use PNG when you need sharp edges or transparency.",
        "Downscaling very large images (e.g., 4096px → 2048px) can reduce size dramatically.",
      ],
      faq: [
        { q: "Is it free?", a: "Yes. The tool runs in your browser and is free to use." },
        { q: "Are my images uploaded?", a: "No. Compression is processed locally on your device." },
        { q: "What formats are supported?", a: "JPG, PNG, and WebP. AVIF/WEBP output depends on browser support." },
      ],
      lastUpdated: "2026-02-10",
    },
  },

  {
    category: "image",
    slug: "image-resizer",
    title: "Image Resizer",
    description:
      "Resize images locally in your browser. Batch resize, keep quality, optional format output.",
    icon: "photo_size_select_large",
    tags: ["resize", "dimensions", "bulk", "jpg", "png", "webp", "avif"],
    settingsType: "image",
    order: 2,
    adsProfile: "default",
    seo: {
      intro:
        "Resize images directly in your browser with no uploads. Perfect for reducing dimensions for web, email, and social posts—fast, private, and batch-friendly.",
      faq: [
        { q: "Does it upload my images?", a: "No. Everything runs locally in your browser—your files never leave your device." },
        { q: "Will it upscale small images?", a: "No by default. If an image is already smaller than the max dimension, it will be kept as-is." },
        { q: "What output formats are supported?", a: "You can keep the original format or export to JPEG/PNG/WEBP/AVIF depending on browser support." },
      ],
    },
  },

  {
    category: "image",
    slug: "image-converter",
    title: "Image Converter",
    description:
      "Convert between JPG, PNG, and WebP instantly in your browser.",
    icon: "swap_horiz",
    tags: ["Convert", "Local"],
    settingsType: "image",
    order: 3,
    adsProfile: "default",
    seo: {
      intro:
        "Convert image formats without installing apps. Great for compatibility and optimizing file size.",
      faq: [
        { q: "Which formats can I convert to?", a: "JPG, PNG, and WebP." },
        { q: "Is conversion private?", a: "Yes. Your files stay on your device." },
      ],
      lastUpdated: "2026-02-10",
    },
  },

  {
    category: "image",
    slug: "image-to-webp",
    title: "Image to WebP",
    description:
      "Convert images to WebP locally for faster websites and better performance.",
    icon: "image",
    tags: ["webp", "image", "convert"],
    settingsType: "image",
    order: 4,
    adsProfile: "heavy",
    seo: {
      intro: "Convert PNG, JPG and other images to WebP directly in your browser.",
      steps: [
        "Upload your images",
        "Adjust quality and optional resize settings",
        "Convert and download WebP images",
      ],
      faq: [
        { q: "Is it private?", a: "Yes. Everything runs locally in your browser." },
        { q: "Will my images be uploaded?", a: "No. Files never leave your device." },
      ],
      lastUpdated: "2026-02-11",
    },
  },
];

/* =========================================================
   Helpers
   ========================================================= */

export function getToolsByCategory(category: Category) {
  return tools
    .filter((t) => t.category === category)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export function getTool(category: Category, slug: string) {
  return tools.find((t) => t.category === category && t.slug === slug);
}
