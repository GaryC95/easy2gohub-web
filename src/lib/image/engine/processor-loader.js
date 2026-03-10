// src/lib/image/engine/processor-loader.js

// Vite-friendly processor loader (no dynamic import warning)
const PROCESSOR_MODULES = import.meta.glob("../processors/*.js");

export async function loadProcessorModule(processorName) {
  const key = `../processors/${processorName}.js`;
  const loader = PROCESSOR_MODULES[key];
  if (!loader) throw new Error(`[image-engine] Processor missing file: ${processorName}`);
  const mod = await loader();
  if (!mod?.process) throw new Error(`[image-engine] Processor missing process(): ${processorName}`);
  return mod;
}