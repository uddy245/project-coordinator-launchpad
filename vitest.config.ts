import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  // Load .env, .env.local, .env.{mode}, .env.{mode}.local so that
  // integration tests that hit real APIs (e.g. RUN_CALIBRATION=1) pick
  // up secrets from .env.local rather than the stub values in tests/setup.ts.
  const loaded = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    test: {
      environment: "node",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      exclude: ["node_modules", "tests/e2e/**"],
      env: loaded,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  };
});
