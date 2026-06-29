import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Load a lesson's markdown from docs/lessons/<slug>.md.
 * Returns null when the file is absent or the slug is unsafe.
 * Server-side only (uses fs).
 */
export function getLessonReading(slug: string): string | null {
  // Block path traversal before touching the filesystem.
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  try {
    return readFileSync(join(process.cwd(), "docs", "lessons", `${slug}.md`), "utf8");
  } catch {
    return null;
  }
}

/** Rough token estimate at 4 chars/token. */
function roughTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Like getLessonReading but truncates to approximately maxTokens.
 * Cuts at the last newline boundary within the limit.
 */
export function getLessonReadingTruncated(slug: string, maxTokens = 6000): string | null {
  const raw = getLessonReading(slug);
  if (!raw) return null;
  if (roughTokens(raw) <= maxTokens) return raw;
  const limit = maxTokens * 4;
  const truncated = raw.slice(0, limit);
  const lastNl = truncated.lastIndexOf("\n");
  return (lastNl > limit * 0.8 ? truncated.slice(0, lastNl) : truncated) +
    "\n\n[Reading truncated for length]";
}
