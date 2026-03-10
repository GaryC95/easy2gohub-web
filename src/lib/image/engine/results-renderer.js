// src/lib/image/engine/results-renderer.js
import { downloadBlob, escapeHtml, formatBytes } from "../utils/image-utils.js";

export function renderResults({ dom, state }) {
  const $resultList = dom.$resultList;
  $resultList.innerHTML = "";

  if (!state.files.length) {
    $resultList.innerHTML = `<div class="text-slate-500 text-sm">No files.</div>`;
    return;
  }

  for (const f of state.files) {
    const r = state.results.get(f.id);
    const row = document.createElement("div");

    row.className =
      "rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur p-4 " +
      "shadow-[0_18px_50px_rgba(2,6,23,0.06)]";

    if (!r) {
      row.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold text-slate-900 truncate">${escapeHtml(f.name)}</div>
            <div class="text-xs text-slate-500 mt-1">Ready to process</div>
          </div>

          <div class="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
            ${formatBytes(f.size)}
          </div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold text-slate-900 truncate">${escapeHtml(r.name)}</div>
            <div class="text-xs text-slate-500 mt-1">${escapeHtml(r.type || "unknown")} • ${formatBytes(r.size)}</div>
          </div>

          <button
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#137fec] text-white
                   shadow-lg shadow-blue-500/15 hover:brightness-110 active:scale-[0.98] transition"
            data-action="download-one"
          >
            Download
          </button>
        </div>
      `;

      row.querySelector('[data-action="download-one"]').addEventListener("click", () => {
        downloadBlob(r.blob, r.name);
      });
    }

    $resultList.appendChild(row);
  }
}