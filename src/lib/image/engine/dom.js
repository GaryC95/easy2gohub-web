// src/lib/image/engine/dom.js
export function collectDom({ slug, root }) {
  const $dropzone = root.querySelector('[data-role="dropzone"]');
  const $resultList = root.querySelector('[data-role="result-list"]');

  // stats
  const $statOrig = root.querySelector('[data-role="stat-orig"]');
  const $statOut = root.querySelector('[data-role="stat-out"]');
  const $statSaved = root.querySelector('[data-role="stat-saved"]');
  const $statTime = root.querySelector('[data-role="stat-time"]');

  // ✅ Settings root can be outside tool root (right panel)
  const $settingsRoot =
    document.querySelector(`[data-role="settings"][data-tool="${slug}"]`) ||
    root.querySelector('[data-role="settings"]') ||
    root;

  // ✅ actions in right settings
  const $btnProcess =
    $settingsRoot.querySelector?.('[data-action="process"]') ||
    root.querySelector('[data-action="process"]') ||
    document.querySelector(`[data-action="process"][data-tool="${slug}"]`);

  const $btnZip =
    $settingsRoot.querySelector?.('[data-action="download-zip"]') ||
    root.querySelector('[data-action="download-zip"]') ||
    document.querySelector(`[data-action="download-zip"][data-tool="${slug}"]`);

  const $btnReturn =
    $settingsRoot.querySelector?.('[data-action="return-auto"]') ||
    root.querySelector('[data-action="return-auto"]') ||
    document.querySelector(`[data-action="return-auto"][data-tool="${slug}"]`);

  return {
    root,
    $dropzone,
    $resultList,
    $statOrig,
    $statOut,
    $statSaved,
    $statTime,
    $settingsRoot,
    $btnProcess,
    $btnZip,
    $btnReturn,
  };
}