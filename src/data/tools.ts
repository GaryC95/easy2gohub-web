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
   Tool Type
   ========================================================= */

export type Tool = {
  /** Routing */
  category: Category;
  slug: string;

  /** UI / SEO */
  title: string;
  description: string;
  icon: string;
  tags: string[];

  /** Tool page SEO content */
  seo: {
    intro: string;
    faq: { q: string; a: string }[];
  };

  /** ===== 架构扩展字段（你不用管逻辑） ===== */
  settingsType?: SettingsType;        // 控制右侧 Settings 面板
  order?: number;                     // Sidebar / 分类排序
  adsProfile?: "default" | "light" | "none";
};

/* =========================================================
   Tools List (唯一真源)
   ========================================================= */

export const tools: Tool[] = [
  /* ---------------- IMAGE ---------------- */

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
    adsProfile: "default",
    seo: {
      intro:
        "Compress images locally in your browser to reduce file size for web, email, and sharing. Your files never leave your device.",
      faq: [
        { q: "Is it free?", a: "Yes. The tool runs in your browser and is free to use." },
        {
          q: "Are my images uploaded?",
          a: "No. Compression is processed locally on your device.",
        },
        {
          q: "What formats are supported?",
          a: "JPG, PNG, and WebP. More formats can be added later.",
        },
      ],
    },
  },

  {
    category: "image",
    slug: "image-resizer",
    title: "Image Resizer",
    description:
      "Resize images to exact dimensions while keeping quality. No upload required.",
    icon: "photo_size_select_large",
    tags: ["Simple", "Accurate"],
    settingsType: "image",
    order: 2,
    seo: {
      intro:
        "Resize images to fit social media, websites, or documents — processed locally in the browser.",
      faq: [
        {
          q: "Can I keep aspect ratio?",
          a: "Yes. Lock the aspect ratio to prevent distortion.",
        },
        {
          q: "Does it upload my file?",
          a: "No. Everything runs client-side in your browser.",
        },
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
    seo: {
      intro:
        "Convert image formats without installing apps. Great for optimizing compatibility and file size.",
      faq: [
        {
          q: "Which formats can I convert to?",
          a: "JPG, PNG, and WebP.",
        },
        {
          q: "Is conversion private?",
          a: "Yes. Your files stay on your device.",
        },
      ],
    },
  },

  {
    category: "image",
    slug: "image-to-webp",
    title: "Image to WebP",
    description:
      "Convert images to WebP for smaller size and faster web performance.",
    icon: "web",
    tags: ["Web", "Smaller"],
    settingsType: "image",
    order: 4,
    seo: {
      intro:
        "WebP usually produces smaller files for the web. Convert locally with one click.",
      faq: [
        {
          q: "Why WebP?",
          a: "WebP offers smaller file sizes while maintaining good quality.",
        },
        {
          q: "Does it work offline?",
          a: "After the page loads, conversion runs locally.",
        },
      ],
    },
  },

  /* ---------------- PDF ---------------- */

  {
    category: "pdf",
    slug: "pdf-merge",
    title: "PDF Merger",
    description:
      "Merge multiple PDF files into one — processed locally in your browser.",
    icon: "picture_as_pdf",
    tags: ["Private", "Local"],
    settingsType: "pdf",
    order: 1,
    seo: {
      intro:
        "Combine PDFs into a single file without uploading to any server. Ideal for forms and documents.",
      faq: [
        {
          q: "Are my PDFs uploaded?",
          a: "No. Merging runs entirely in your browser.",
        },
        {
          q: "Is there a file limit?",
          a: "It depends on your device memory and PDF size.",
        },
      ],
    },
  },

  {
    category: "pdf",
    slug: "pdf-split",
    title: "PDF Splitter",
    description:
      "Split PDF into pages or ranges locally. No server upload.",
    icon: "splitscreen",
    tags: ["Pages", "Ranges"],
    settingsType: "pdf",
    order: 2,
    seo: {
      intro:
        "Extract specific pages from a PDF to create a smaller document — all processed locally.",
      faq: [
        {
          q: "Can I split by page range?",
          a: "Yes, choose a range like 1–3 or 5–10.",
        },
        {
          q: "Does it upload my PDF?",
          a: "No. Everything stays in your browser.",
        },
      ],
    },
  },

  {
    category: "pdf",
    slug: "pdf-compress",
    title: "PDF Compressor",
    description:
      "Reduce PDF size locally in your browser (beta).",
    icon: "compress",
    tags: ["Beta", "Local"],
    settingsType: "pdf",
    order: 3,
    seo: {
      intro:
        "Basic PDF size reduction in the browser. Advanced modes may be added later.",
      faq: [
        {
          q: "Why is it beta?",
          a: "Browser-only PDF compression has tradeoffs depending on content.",
        },
      ],
    },
  },

  /* ---------------- TEXT ---------------- */

  {
    category: "text",
    slug: "json-formatter",
    title: "JSON Formatter",
    description:
      "Format and validate JSON with pretty print instantly in your browser.",
    icon: "data_object",
    tags: ["Format", "Validate"],
    settingsType: "text",
    order: 1,
    seo: {
      intro:
        "Paste JSON to format, validate, and minify it instantly. Great for debugging and sharing.",
      faq: [
        {
          q: "Is my JSON uploaded?",
          a: "No. It’s processed locally.",
        },
        {
          q: "Can it detect invalid JSON?",
          a: "Yes, it shows parsing errors.",
        },
      ],
    },
  },

  {
    category: "text",
    slug: "base64-encode-decode",
    title: "Base64 Encode / Decode",
    description:
      "Encode text to Base64 or decode Base64 back to text in one click.",
    icon: "code",
    tags: ["Encode", "Decode"],
    settingsType: "text",
    order: 2,
    seo: {
      intro:
        "Convert text to Base64 for safe transport, or decode Base64 back to readable text.",
      faq: [
        {
          q: "Does it support UTF-8?",
          a: "Yes, for standard text inputs.",
        },
      ],
    },
  },

  {
    category: "text",
    slug: "text-case-converter",
    title: "Text Case Converter",
    description:
      "Convert text to UPPERCASE, lowercase, Title Case, and more.",
    icon: "text_fields",
    tags: ["Text", "Quick"],
    settingsType: "text",
    order: 3,
    seo: {
      intro:
        "Change text casing instantly for titles, code, or documents.",
      faq: [
        {
          q: "What cases are supported?",
          a: "Upper, lower, title, sentence case and more.",
        },
      ],
    },
  },

  /* ---------------- FILE ---------------- */

  {
    category: "file",
    slug: "file-hash",
    title: "File Hash Generator",
    description:
      "Generate SHA-256 hash of a file locally in your browser.",
    icon: "fingerprint",
    tags: ["SHA-256", "Local"],
    settingsType: "file",
    order: 1,
    seo: {
      intro:
        "Verify file integrity by generating hashes locally. Useful for downloads and security checks.",
      faq: [
        {
          q: "Are files uploaded?",
          a: "No. Hashing runs locally in your browser.",
        },
      ],
    },
  },

  {
    category: "file",
    slug: "uuid-generator",
    title: "UUID Generator",
    description:
      "Generate UUIDs instantly (v4). Fast, simple, and offline-friendly.",
    icon: "tag",
    tags: ["UUID", "Instant"],
    settingsType: "dev",
    order: 2,
    seo: {
      intro:
        "Generate unique identifiers for apps, databases, and testing.",
      faq: [
        {
          q: "Which UUID version?",
          a: "UUID v4 (random) by default.",
        },
      ],
    },
  },
];

/* =========================================================
   Helper functions
   ========================================================= */

export function getToolsByCategory(category: Category) {
  return tools
    .filter((t) => t.category === category)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export function getTool(category: Category, slug: string) {
  return tools.find((t) => t.category === category && t.slug === slug);
}
