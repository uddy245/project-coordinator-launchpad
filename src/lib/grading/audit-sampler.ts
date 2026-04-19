import { createHash } from "node:crypto";

/**
 * Deterministic 10% sampling. Using SHA-256 mod 10 gives a uniform
 * distribution over UUIDs and is idempotent: re-grading the same
 * submission ID always produces the same sampling decision.
 */
export function shouldSample(submissionId: string, rate = 0.1): boolean {
  const hash = createHash("sha256").update(submissionId).digest();
  // Take the first 4 bytes as an unsigned 32-bit int, mod 1,000,000,
  // compare against rate*1,000,000. Avoids floating-point drift.
  const n = hash.readUInt32BE(0);
  const threshold = Math.floor(rate * 1_000_000);
  return n % 1_000_000 < threshold;
}
