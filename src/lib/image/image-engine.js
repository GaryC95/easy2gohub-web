import { getToolDef } from "./tool-registry.js";
import { zipFiles } from "../../utils/zip.ts";

import {
  createDefaultSettings,
  safeAuto,
  isPngMime,
  inferOutputFormatFromMime,
  showToast,
  showModal,
} from "./utils/image-utils.js";

import { collectDom } from "./engine/dom.js";
import { bindSettingsUI } from "./engine/settings-binder.js";
import { mountOrRefreshSliderForFirst } from "./engine/preview-slider.js";
import { processAllFiles } from "./engine/process-runner.js";
import { renderResults } from "./engine/results-renderer.js";
import { createStats } from "./engine/stats.js";

/**
 * @param {{ slug: string, root: HTMLElement }} args
 */
export function initImageTool({ slug, root }) {
  if (!root) throw new Error("[image-engine] root is required");

  const tool = getToolDef(slug);
  const isResizer = slug === "image-resizer";

  const dom = collectDom({ slug, root, isResizer });
  if (!dom.$resultList) throw new Error(`[image-engine] Missing [data-role="result-list"] in tool ${slug}`);
  if (!dom.$btnProcess) throw new Error(`[image-engine] Missing [data-action="process"] for ${slug}`);

  const processIdleLabel = (dom.$btnProcess.textContent || (isResizer ? "Resize" : "Process")).trim();
  const zipIdleLabel = (dom.$btnZip?.textContent || "Download ZIP").trim();

 const stats = createStats({ mode: tool.mode, isResizer, ...dom });

  const state = {
    notifyOnce: new Set(),

    slug,
    tool,
    settings: {
      values: createDefaultSettings(tool.groups, { isResizer }),
      touched: new Set(),
    },

    files: [],
    previews: new Map(),
    results: new Map(),

    busy: false,
    lastProcessMs: 0,

    ui: {
      warnedAdvanced: false,
      lastProcessHadFallback: false,
      lastProcessHadAnySaved: false,
    },
  };
state.env = detectRuntimeEnv();
document.documentElement.dataset.mobileLike = state.env.isMobileLike ? "1" : "0";
  const api = createApi();
  window.__imageTools = window.__imageTools || new Map();
  window.__imageTools.set(slug, api);

  bindDropzone(root, onFilesChanged, () => api.clearFiles(true));


  const settingsApi = bindSettingsUI({
    settingsRoot: dom.$settingsRoot,
    getValues: () => state.settings.values,
    setValue: (k, v) => (state.settings.values[k] = v),
    isTouched: (k) => state.settings.touched.has(k),
    touch: (k) => state.settings.touched.add(k),
    emitSync,
    onChange: onSettingChanged,
  });

  bindActions();
  setZipEnabled(false);

  function showModalOnce(key, modal) {
    const f0 = state.files?.[0];
    const fid = f0?.id || "nofile";
    const k = `${fid}:${key}`;
    if (state.notifyOnce.has(k)) return;
    state.notifyOnce.add(k);
    showModal(modal);
  }

  function showToastOnce(key, toast) {
    const f0 = state.files?.[0];
    const fid = f0?.id || "nofile";
    const k = `${fid}:${key}`;
    if (state.notifyOnce.has(k)) return;
    state.notifyOnce.add(k);
    showToast(toast);
  }

  const getOutputFmt = () => String(state.settings.values.outputFormat || "keep").toLowerCase();

  const shouldShowPreviewFallbackToast = () => {
    if (isResizer) return false;
    // ✅ 用户选了 PNG 输出时，不弹 “seems already optimized” 的预览提示（避免误导/烦）
    if (getOutputFmt() === "png") return false;
    return true;
  };

  const debouncedRefreshPreview = settingsApi.createDebounced(async () => {
    if (!state.files.length) return;

    await mountOrRefreshSliderForFirst({
      state,
      dom,
      isResizer,
      forceRemount: false,
      onPreviewUpdated: ({ file0, previewBlob, previewMs, previewFallback }) => {
        stats.updatePreview(file0, previewBlob, previewMs, previewFallback, state);
      },
      onPreviewFallbackToast: () => {
        if (shouldShowPreviewFallbackToast()) {
          showToast({
            tone: "info",
            message: "Preview: no smaller result with current safe settings.",
            ms: 2600,
          });
        }
      },
    });

    state.results.clear();
    renderResults({ dom, state });
    setZipEnabled(false);
    stats.idleAfterChange(state.lastProcessMs);
  }, 180);

  async function onFilesChanged(files) {
    api.clearFiles(false);

    state.files = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      bitmap: null,
    }));

    state.ui.warnedAdvanced = false;
    state.ui.lastProcessHadFallback = false;
    state.ui.lastProcessHadAnySaved = false;

    const f0 = state.files[0];
    if (f0) {
      emitSync("__inputMime", f0.type);

      const suggestion = safeAuto(tool.autoStrategy, f0.file);
      settingsApi.applyAutoSuggestion(suggestion, { isResizer });

      if (!isResizer && !state.settings.touched.has("outputFormat")) {
        const cur = String(state.settings.values.outputFormat || "keep").toLowerCase();
        if (cur === "keep" || cur === "") {
          const inferred = inferOutputFormatFromMime(f0.type);
          if (inferred) {
            state.settings.values.outputFormat = inferred;
            settingsApi.syncSettingsUI();
            emitSync("outputFormat", inferred);
          }
        }
      }

      // ✅ PNG 输入说明：用 Modal（手动关闭，不会太快消失）
      if (state.tool.mode === "compress" && isPngMime(f0.type)) {
        showModalOnce("png-v2-notice", {
          title: "PNG Compression (V2)",
          message:
            "PNG input detected.\n\n• Output=PNG: Quality < 95 => PNG-8 (lossy, fewer colors). Quality ≥ 95 => lossless.\n• Output=WEBP: usually gives the smallest size.\n\nTip: If gradients/photos look worse with PNG-8, try WEBP or increase Quality.",
          primaryText: "OK",
        });
      }
    }

    await mountOrRefreshSliderForFirst({
      state,
      dom,
      isResizer,
      forceRemount: true,
      onPreviewUpdated: ({ file0, previewBlob, previewMs, previewFallback }) => {
        stats.updatePreview(file0, previewBlob, previewMs, previewFallback, state);
      },
      onPreviewFallbackToast: () => {
        if (shouldShowPreviewFallbackToast()) {
          showToast({
            tone: "info",
            message: "Preview: no smaller result with current safe settings.",
            ms: 2600,
          });
        }
      },
    });

    state.results.clear();
    renderResults({ dom, state });
    setZipEnabled(false);

    stats.idle();
    if (f0) {
      const entry = state.previews.get(f0.id);
      if (entry) stats.updatePreview(f0, entry.previewBlob, entry.previewMs, entry.previewFallback, state);
    }
  }

  function onSettingChanged(key, value, isUserInput) {
    state.settings.values[key] = value;
    if (isUserInput) state.settings.touched.add(key);

    // ✅ Advanced mode 提示：10 秒才消失
if (isUserInput && !state.ui.warnedAdvanced) {
  state.ui.warnedAdvanced = true;

  // ✅ rotator 不需要“优化/变小”提示（只做变换）
  if (state.slug === "image-rotator") {
    // no-op
  } else {
    showToast({
      tone: "warn",
      message: isResizer
        ? "Manual settings enabled. Preview updates instantly."
        : "Advanced mode enabled: Auto optimization paused.\nIf size doesn’t reduce: lower Quality, use Max Edge, or try WebP.",
      ms: 10000,
    });
  }
}

    emitSync(key, value);
    debouncedRefreshPreview();
  }

  function bindActions() {
    if (dom.$btnProcess?.dataset.bound === "1") return;
    dom.$btnProcess.dataset.bound = "1";
    if (dom.$btnZip) dom.$btnZip.dataset.bound = "1";

    dom.$btnProcess.addEventListener("click", async () => {
      await api.process();
    });

    if (dom.$btnZip) {
      dom.$btnZip.addEventListener("click", async () => {
        await api.downloadZip();
      });
    }

    const $btnReturn = dom.$btnReturn;
    if ($btnReturn && $btnReturn.dataset.bound !== "1") {
      $btnReturn.dataset.bound = "1";
      $btnReturn.addEventListener("click", async () => {
        await api.returnToAutoBest();
      });
    }
  }

  function emitSync(key, value) {
    dom.$settingsRoot?.dispatchEvent(
      new CustomEvent("image-settings:sync", { bubbles: true, detail: { key, value } })
    );
  }

  function setProcessingUI(isProcessing) {
    dom.$btnProcess.disabled = isProcessing;
    dom.$btnProcess.textContent = isProcessing ? "Processing..." : processIdleLabel;

    if (dom.$btnZip) {
      if (isProcessing) {
        dom.$btnZip.disabled = true;
        dom.$btnZip.textContent = zipIdleLabel;
        dom.$btnZip.classList.add("opacity-50");
      }
    }
  }

  function setZipEnabled(enabled) {
    if (!dom.$btnZip) return;
    dom.$btnZip.disabled = !enabled;
    dom.$btnZip.classList.toggle("opacity-50", !enabled);
    dom.$btnZip.textContent = zipIdleLabel;
    emitSync("__zipEnabled", !!enabled);
  }

  function cleanupAll() {
    for (const f of state.files) {
      if (f.url) URL.revokeObjectURL(f.url);
      f.url = null;
      f.bitmap = null;
    }
    state.previews.clear();
    state.results.clear();
  }

  function createApi() {
    return {
      getState: () => state,
      isAdvanced: () => state.settings.touched.size > 0,

      async process() {
        if (!state.files.length) return;
        if (state.busy) return;

        state.busy = true;
        setProcessingUI(true);

        const t0 = performance.now();
        try {
          state.ui.lastProcessHadFallback = false;
          state.ui.lastProcessHadAnySaved = false;

          await processAllFiles({
            state,
            isResizer,
            onAfterOne: ({ fileModel, res }) => {
              if (res.fallback) state.ui.lastProcessHadFallback = true;
              if (!res.fallback && res.blob.size < fileModel.size) state.ui.lastProcessHadAnySaved = true;

              if (isResizer) {
                const meta = res?.meta || null;
                if (meta?.gifStatic) {
                  showToastOnce("resizer:gif-static", {
                    tone: "info",
                    message: "Note: Animated GIFs will be processed as a static image.",
                    ms: 2400,
                  });
                }
                if (meta?.clampedUpscale) {
                  showToastOnce("resizer:clamped-upscale", {
                    tone: "warn",
                    message: "Upscale is disabled. Keeping original maximum dimensions.",
                    ms: 2600,
                  });
                }
              }

              state.results.set(fileModel.id, {
                blob: res.blob,
                name: res.name,
                type: res.type,
                size: res.blob.size,
                meta: res.meta || null,
              });

              renderResults({ dom, state });
            },
          });

          const t1 = performance.now();
          state.lastProcessMs = Math.max(1, Math.round(t1 - t0));

          renderResults({ dom, state });
          setZipEnabled(state.results.size > 1);
          stats.afterProcess(state);
          if (state.slug === "image-cropper") {
  showToast({ tone: "success", message: "Cropped! Scroll down to download.", ms: 2200 });
}

          if (!isResizer && state.ui.lastProcessHadFallback && !state.ui.lastProcessHadAnySaved) {
            showModal({
              title: "Already Optimized",
              message:
                "This image looks already highly optimized.\n\nTry:\n• Lower Quality\n• Resize / Max Edge\n• Convert to WebP",
              primaryText: "OK",
            });
          }

          dom.$resultList.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          const msg = String(err?.message || err || "Process failed");
          showToast({ tone: "error", message: msg, ms: 3600 });
          return;
        } finally {
          state.busy = false;
          setProcessingUI(false);
        }
      },

      async downloadZip() {
        if (!state.results.size || state.results.size < 2) return;

        const out = [];
        for (const f of state.files) {
          const r = state.results.get(f.id);
          if (!r) continue;
          out.push({ name: r.name, blob: r.blob });
        }
        if (out.length < 2) return;

        await zipFiles(out, `${state.slug}.zip`);
      },

      async returnToAutoBest() {
        state.settings.touched.clear();
        state.settings.values = createDefaultSettings(state.tool.groups, { isResizer });
        state.ui.warnedAdvanced = false;

        if (state.files[0]) {
          const suggestion = safeAuto(state.tool.autoStrategy, state.files[0].file);
          settingsApi.applyAutoSuggestion(suggestion, { isResizer });

          if (!isResizer && !state.settings.touched.has("outputFormat")) {
            const cur = String(state.settings.values.outputFormat || "keep").toLowerCase();
            if (cur === "keep" || cur === "") {
              const inferred = inferOutputFormatFromMime(state.files[0].type);
              if (inferred) state.settings.values.outputFormat = inferred;
            }
          }
        }

        settingsApi.syncSettingsUI();

        state.results.clear();
        renderResults({ dom, state });
        setZipEnabled(false);

        await mountOrRefreshSliderForFirst({
          state,
          dom,
          isResizer,
          forceRemount: false,
          onPreviewUpdated: ({ file0, previewBlob, previewMs, previewFallback }) => {
            stats.updatePreview(file0, previewBlob, previewMs, previewFallback, state);
          },
          onPreviewFallbackToast: () => {
            if (shouldShowPreviewFallbackToast()) {
              showToast({
                tone: "info",
                message: "Preview: no smaller result with current safe settings.",
                ms: 2600,
              });
            }
          },
        });

        dom.$btnProcess.textContent = processIdleLabel;
      },

      clearFiles(clearUI = true) {
        cleanupAll();

        state.files = [];
        state.results.clear();
        setZipEnabled(false);

        state.ui.warnedAdvanced = false;
        state.ui.lastProcessHadFallback = false;
        state.ui.lastProcessHadAnySaved = false;

        if (clearUI) {
          dom.$resultList.innerHTML = "";
          stats.idle();
        }

        state.settings.touched.clear();
        state.settings.values = createDefaultSettings(state.tool.groups, { isResizer });
        settingsApi.syncSettingsUI();
      },
    };
  }

  return api;
}

/* ---------- DropZone binding ---------- */
function bindDropzone(scope, cb, onClear) {
  scope.addEventListener("dropzone:change", (e) => {
    const files = e?.detail?.files;
    if (!Array.isArray(files)) return;
    cb(files);
  });
  scope.addEventListener("dropzone:clear", () => onClear?.());
}

function detectRuntimeEnv() {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  const narrow =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches;

  const mem =
    typeof navigator !== "undefined"
      ? (navigator.deviceMemory || 4)
      : 4;

  return {
    isTouchLike: coarse,
    isNarrow: narrow,
    isMobileLike: coarse || narrow,
    deviceMemory: mem,
  };
}