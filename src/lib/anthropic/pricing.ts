/**
 * Anthropic model pricing (USD per million tokens). Verify against
 * https://docs.claude.com/en/docs/about-claude/pricing when you bump
 * the pinned model; the calibration workflow gates the model bump
 * behind a prompt/rubric regression check, this just keeps the cost
 * math honest.
 */
export const MODEL_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

export function priceFor(model: string): { input: number; output: number } {
  const entry = MODEL_PRICING_USD_PER_MTOK[model];
  if (!entry) {
    throw new Error(`Unknown model pricing: ${model}`);
  }
  return entry;
}

/** USD cost for a single (input, output) token pair on a given model. */
export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const { input, output } = priceFor(model);
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}

/**
 * Conservative upper-bound estimate for a single grade call. Used by
 * the spend guard to reject a new grade when today's budget is already
 * close to the cap. Keeps the cap honest even before the real call
 * records its tokens.
 *
 * Assumes a full GRADING_MAX_TOKENS output and a generous input budget
 * that covers rubric + prompt + scenario + submission.
 */
export function estimateGradeCostUsd(
  model: string,
  opts: { inputTokens?: number; outputTokens?: number } = {}
): number {
  return costUsd(model, opts.inputTokens ?? 5000, opts.outputTokens ?? 2048);
}

type TokenRow = { model: string | null; input_tokens: number | null; output_tokens: number | null };

/**
 * Sum cost across a bag of rubric_scores rows. Rows with unknown models
 * are treated as worst case (priced at the most expensive known model)
 * so the guard errs on the side of stopping.
 */
export function sumSpendUsd(rows: TokenRow[]): number {
  let total = 0;
  const worst = Object.values(MODEL_PRICING_USD_PER_MTOK).reduce(
    (max, p) => ({
      input: Math.max(max.input, p.input),
      output: Math.max(max.output, p.output),
    }),
    { input: 0, output: 0 }
  );

  for (const r of rows) {
    const input = r.input_tokens ?? 0;
    const output = r.output_tokens ?? 0;
    if (r.model && MODEL_PRICING_USD_PER_MTOK[r.model]) {
      total += costUsd(r.model, input, output);
    } else {
      total += (input * worst.input + output * worst.output) / 1_000_000;
    }
  }
  return total;
}
