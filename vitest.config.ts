import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "fs";

// Load .env, .env.{mode}, .env.local, .env.{mode}.local (vite precedence:
// most-specific wins) so integration tests that hit real APIs
// (e.g. RUN_CALIBRATION=1) pick up secrets from .env.local rather than the
// stub values in tests/setup.ts.
//
// Implemented inline rather than via vite's `loadEnv` so this config doesn't
// import from "vite" — vite is only a transitive dep, and under pnpm's strict
// install on Vercel `import { loadEnv } from "vite"` fails the production
// type-check ("Cannot find module 'vite'").
function loadDotEnv(mode: string): Record<string, string> {
  const out: Record<string, string> = {};
  const files = [".env", `.env.${mode}`, ".env.local", `.env.${mode}.local`];
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(resolve(__dirname, file), "utf8");
    } catch {
      continue; // file absent — skip
    }
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trimStart().startsWith("#")) continue;
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[m[1]] = value;
    }
  }
  return out;
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    exclude: ["node_modules", "tests/e2e/**"],
    env: loadDotEnv(mode),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
}));
