import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { port: 5173, watch: { ignored: ["**/pixelfx/**"] } },
  optimizeDeps: { entries: ["index.html"] },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ["tests/**/*.test.ts"] },
} as never);
