// src/lib/image/engine/settings-binder.js
import { debounce, readControlValue, writeControlValue } from "../utils/image-utils.js";

export function bindSettingsUI({
  settingsRoot,
  getValues,
  setValue,
  isTouched,
  touch,
  emitSync,
  onChange,
}) {
  bindSettings(settingsRoot, (key, value, isUser) => onChange(key, value, isUser));

  function bindSettings(scope, onChangeLocal) {
    const controls = scope.querySelectorAll("[data-bind^='settings.']");
    controls.forEach((el) => {
      const key = el.dataset.bind?.replace("settings.", "");
      if (!key) return;

      writeControlValue(el, getValues()[key]);
      emitSync(key, getValues()[key]);

      const handler = (ev) => {
        const value = readControlValue(el);
        onChangeLocal(key, value, ev?.isTrusted !== false);
      };

      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
  }

  function syncSettingsUI() {
    const controls = settingsRoot.querySelectorAll("[data-bind^='settings.']");
    controls.forEach((el) => {
      const key = el.dataset.bind?.replace("settings.", "");
      if (!key) return;
      writeControlValue(el, getValues()[key]);
      emitSync(key, getValues()[key]);
    });
  }

  function applyAutoSuggestion(suggestion, { isResizer } = {}) {
    if (!suggestion) return;

    // meta keys: only sync to UI
    for (const [k, v] of Object.entries(suggestion)) {
      if (v === undefined) continue;
      if (k.startsWith("__")) emitSync(k, v);
    }

    const normFmt = (x) => {
      const s = String(x ?? "").toLowerCase().trim();
      if (!s) return s;
      if (s === "jpeg") return "jpg";
      return s;
    };

    // recommendedFormat: converter only
    if (
      suggestion.recommendedFormat &&
      !isTouched("outputFormat") &&
      (getValues().outputFormat === "keep" || getValues().outputFormat == null)
    ) {
      const fmt = normFmt(suggestion.recommendedFormat);
      if (fmt) {
        setValue("outputFormat", fmt);
        emitSync("outputFormat", fmt);
      }
    }

    for (const [k, v] of Object.entries(suggestion)) {
      if (v === undefined) continue;
      if (k === "recommendedFormat") continue;
      if (k.startsWith("__")) continue;

      // Resizer: always keep format
      if (isResizer && k === "outputFormat") continue;

      if (k === "outputFormat") {
        if (isTouched("outputFormat")) continue;
        const fmt = normFmt(v);
        if (fmt) {
          setValue("outputFormat", fmt);
          emitSync("outputFormat", fmt);
        }
        continue;
      }

      if (isTouched(k)) continue;
      setValue(k, v);
      emitSync(k, v);
    }

    syncSettingsUI();
  }

  // ✅ same style as your original engine:
  // const debounced = debounce(async () => { ... }, 180); debounced();
  function createDebounced(fn, ms) {
    return debounce(fn, ms);
  }

  return {
    syncSettingsUI,
    applyAutoSuggestion,
    createDebounced, // return a debounced function you can call multiple times
  };
}