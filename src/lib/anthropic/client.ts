import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/env";

// Pinned model + version — bumping is a deliberate PR per the calibration
// workflow in BUILD_PLAN.md. Never use `latest` in the grading pipeline.
export const GRADING_MODEL = env.ANTHROPIC_MODEL;
export const GRADING_TEMPERATURE = 0;
export const GRADING_MAX_TOKENS = 2048;

// Lazy-initialised client. Module-level construction broke under
// Turbopack server-action bundling: the actions module evaluates
// before .env.local is hydrated in some paths, so `env.ANTHROPIC_API_KEY`
// is undefined at module-eval time. Constructing on first use guarantees
// the env is loaded by the time we read it.
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

// Backwards-compatible export — looks like a regular client to existing
// callers, but every property/method goes through the lazy getter.
// Anthropic SDK only exposes its API via methods (e.g. `.messages.create`),
// so a Proxy works cleanly here.
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    const client = getClient();
    return Reflect.get(client, prop, receiver);
  },
});
