// src/lib/image/image-ui-bridge.js
// Listens to CustomEvents from image-engine and shows Toast/Modal UI.

function qs(sel) {
  return document.querySelector(sel);
}

function ensure() {
  const toastRoot = qs('[data-role="ui-toast-root"]');
  const modal = qs('[data-role="ui-modal"]');
  return { toastRoot, modal };
}

function showToast({ message = "", tone = "info", ms = 2600 } = {}) {
  const { toastRoot } = ensure();
  if (!toastRoot) return;

  const el = document.createElement("div");
  el.className =
    "pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 " +
    "bg-slate-950/70 backdrop-blur px-4 py-3 shadow-xl text-sm text-slate-100 " +
    "animate-[toastIn_180ms_ease]";

  const icon =
    tone === "warn" ? "warning" : tone === "error" ? "error" : tone === "success" ? "check_circle" : "info";

  el.innerHTML = `
    <span class="material-symbols-outlined text-xl opacity-90 mt-[1px]">${icon}</span>
    <div class="min-w-0 leading-snug">${escapeHtml(message)}</div>
  `;

  toastRoot.appendChild(el);

  const t = setTimeout(() => {
    el.style.animation = "toastOut 180ms ease forwards";
    setTimeout(() => el.remove(), 180);
  }, ms);

  el.addEventListener("click", () => {
    clearTimeout(t);
    el.remove();
  });
}

function showModal({ title = "Notice", message = "", primaryText = "OK", secondaryText = "", onPrimary, onSecondary } = {}) {
  const { modal } = ensure();
  if (!modal) return;

  modal.querySelector('[data-role="ui-modal-title"]').textContent = title;
  modal.querySelector('[data-role="ui-modal-msg"]').textContent = message;

  const btnPrimary = modal.querySelector('[data-role="ui-modal-primary"]');
  const btnSecondary = modal.querySelector('[data-role="ui-modal-secondary"]');

  btnPrimary.textContent = primaryText || "OK";
  btnSecondary.textContent = secondaryText || "";

  btnSecondary.classList.toggle("hidden", !secondaryText);

  const close = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    btnPrimary.onclick = null;
    btnSecondary.onclick = null;
  };

  btnPrimary.onclick = () => {
    try { onPrimary?.(); } finally { close(); }
  };
  btnSecondary.onclick = () => {
    try { onSecondary?.(); } finally { close(); }
  };

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // click backdrop closes
  modal.querySelector('[data-role="ui-modal-backdrop"]').onclick = close;
  // ESC closes
  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", onKey);
    }
  };
  window.addEventListener("keydown", onKey);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -------- Event Wiring --------
window.addEventListener("image-ui:toast", (e) => {
  showToast(e.detail || {});
});

window.addEventListener("image-ui:modal", (e) => {
  showModal(e.detail || {});
});

// keyframes (inject once)
(function injectCssOnce() {
  if (document.querySelector("#ui-bridge-css")) return;
  const style = document.createElement("style");
  style.id = "ui-bridge-css";
  style.textContent = `
@keyframes toastIn { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes toastOut { from { transform: translateY(0); opacity: 1 } to { transform: translateY(8px); opacity: 0 } }
`;
  document.head.appendChild(style);
})();
