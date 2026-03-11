// src/lib/image/tool-boot.js
import { initImageTool } from "./image-engine.js";

function initAllTools() {
  const scope = document.querySelector("[data-tool-scope]");
  if (!scope) return;

  scope.querySelectorAll("[data-tool-root]").forEach((root) => {
    const slug = root.getAttribute("data-tool-root");
    if (!slug) return;
    try {
      initImageTool({ slug, root });
    } catch (e) {
      console.error("[tool-init] failed", slug, e);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAllTools);
} else {
  initAllTools();
}