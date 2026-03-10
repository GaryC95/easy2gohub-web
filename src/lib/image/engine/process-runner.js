// src/lib/image/engine/process-runner.js
import {
  buildOutputName,
  buildOutputNameKeep,
  fileToBlob,
  isLossyFormat,
  toInt,
  uniqueQualities,
} from "../utils/image-utils.js";
import { loadProcessorModule } from "./processor-loader.js";

export async function processAllFiles({ state, isResizer, onAfterOne }) {
  const { processor } = state.tool;
  const mod = await loadProcessorModule(processor);

  const concurrency = 3;
  const queue = state.files.slice();
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      if (!f) return;

      const res = await smartProcessOne(mod, f, state.settings.values, {
        isResizer,
        slug: state.slug,
      });

      await onAfterOne?.({ fileModel: f, res });
    }
  }
}

async function smartProcessOne(mod, fileModel, baseSettings, { isResizer, slug }) {
  const attempt = async (settings) => {
    const r = await mod.process(fileModel.file, structuredClone(settings));
    const blob = r?.blob;
    if (!(blob instanceof Blob)) throw new Error("[image-engine] processor must return { blob }");
    const type = r.type || blob.type || "application/octet-stream";

    const name =
      r.name ||
      (isResizer
        ? buildOutputNameKeep(fileModel.name, type, fileModel.file.type)
        : buildOutputName(fileModel.name, type, settings.outputFormat));

    return {
      blob,
      type,
      name,
      fallback: !!r?.meta?.preventedBigger || false,
      usedQuality: settings.quality,
      meta: r?.meta || null,
    };
  };

  // ✅ 只有 compressor 才走“降质找更小 + 变大回退”
  const isCompressor = slug === "image-compressor";

  // ✅ resizer / converter / 其它 transform：只跑一次
  if (!isCompressor || isResizer) {
    return await attempt(baseSettings);
  }

  // ---- compressor ladder logic ----
  const origSize = fileModel.size;
  const outFmt = String(baseSettings.outputFormat || "").toLowerCase();
  const q0 = toInt(baseSettings.quality) ?? 85;

  // ✅ V2: PNG 只有在 output=png 且 quality<95 时才视为“有损可降档”
  const lossy = isLossyFormat(outFmt) || (outFmt === "png" && q0 < 95);

  const qualities = lossy
    ? uniqueQualities([q0, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40])
    : [q0];

  let best = null;

  for (const q of qualities) {
    const s = { ...baseSettings };
    if (lossy) s.quality = q;

    const r = await attempt(s);
    if (!best || r.blob.size < best.blob.size) best = r;

    if (r.blob.size <= origSize) return r;
  }

  // anti-bloat: bigger => keep original
  if (best && best.blob.size > origSize) {
    const origBlob = await fileToBlob(
      fileModel.file,
      fileModel.type || best.type || "application/octet-stream"
    );
    return {
      blob: origBlob,
      type: fileModel.type || "application/octet-stream",
      name: fileModel.name,
      fallback: true,
      meta: { preventedBigger: true },
    };
  }

  return best;
}