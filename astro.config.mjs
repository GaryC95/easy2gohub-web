import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import path from "node:path";

export default defineConfig({
  integrations: [tailwind()],
  vite: {
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
  },
});
