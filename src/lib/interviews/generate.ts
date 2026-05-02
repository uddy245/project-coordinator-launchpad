/**
 * Claude-powered mock-interview scenario generator.
 *
 * When a learner clicks "↻ Generate more scenarios" on the /interviews
 * page, this generates 3 fresh scenarios across categories, validates
 * them through the same Zod schema admins use, and inserts them with
 * is_ai_generated=true. Generated scenarios join the global pool —
 * every learner sees them on their next page load.
 *
 * Cost: 3 scenarios per call ≈ $0.01–0.015 in Claude tokens. Capped
 * by the existing ANTHROPIC_SPEND_CAP_USD daily budget.
 */

import { z } from "zod";
import { anthropic, GRADING_MODEL } from "@/lib/anthropic/client";
import { checkSpendCap } from "@/lib/grading/spend-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScenarioSchema, type ScenarioInput } from "@/lib/interviews/schema";

export type GenerateScenariosArgs = {
  count: number;
  // Optional steers — when omitted, the generator spreads across all values.
  competency?: string;
  category?: "behavioural" | "procedural" | "judgment";
  difficulty?: "easy" | "medium" | "hard";
};

export type GeneratedScenario = {
  id: string;
  slug: string;
  prompt: string;
  category: "behavioural" | "procedural" | "judgment";
  difficulty: "easy" | "medium" | "hard";
  competency: string;
  sort: number;
};

const SYSTEM_PROMPT = `You are an experienced senior project manager designing mock-interview prompts for early-career project coordinators interviewing for roles in the TECHNOLOGY / IT industry.

EVERY scenario must be set in a technology context. Acceptable archetypes include: software product launches, cloud / data-centre migrations, cybersecurity programmes, ML / AI rollouts, SaaS implementations, mobile app launches, fintech / healthtech / regtech projects, DevOps transformations, infrastructure upgrades, data platform builds, API integrations, and ERP / CRM rollouts. Do NOT use non-tech industries (construction, manufacturing, retail, hospitality) for scenarios.

Each scenario must read like a real interviewer's question — concrete, specific, with enough setup that the candidate can dive in without asking clarifying questions. Avoid generic openers ("tell me about a time…") in favour of grounded operational situations.

Output a JSON array of scenarios. Each item is an object with these fields:
- slug: kebab-case identifier, max 60 chars (e.g. "amber-rating-pushback")
- prompt: the interview question text. 80–800 chars. Set the scene in 1–2 sentences, then ask "walk me through…" / "how do you handle…" / "what do you do first…". No multi-part questions.
- category: "behavioural" | "procedural" | "judgment"
- difficulty: "easy" | "medium" | "hard"
- competency: a short phrase naming the competency under test (e.g. "stakeholder management", "risk escalation", "schedule integrity")
- sort: integer (use the values you're given)
- is_published: always true
- rubric_summary: 2–4 sentences naming what a strong answer must include — the test is whether the candidate displays specific judgment, not just a textbook framework.

Quality bar:
- Specific situational detail. Names of roles, timeframes, deliverables.
- A defensible "best" approach must exist — not "depends on company culture".
- Spread across categories and difficulty when generating multiple.
- Avoid duplicating prompts already in the pool (you'll be told the recent ones).
- Slugs must be unique relative to the existing pool (you'll be told existing slugs to avoid).

No preamble, no markdown, no code fences — output ONLY the JSON array.`;

export async function generateInterviewScenarios(
  args: GenerateScenariosArgs,
): Promise<GeneratedScenario[]> {
  const spend = await checkSpendCap(createAdminClient());
  if (!spend.ok) {
    throw new Error(
      `Spend cap reached: $${spend.projectedUsd.toFixed(4)} would exceed $${spend.capUsd}`,
    );
  }

  const admin = createAdminClient();

  // Pull existing slugs + recent prompts so Claude can avoid collisions.
  const [{ data: existingSlugs }, { data: recentPrompts }, { data: maxSortRow }] =
    await Promise.all([
      admin.from("mock_interview_scenarios").select("slug"),
      admin
        .from("mock_interview_scenarios")
        .select("prompt")
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(15),
      admin
        .from("mock_interview_scenarios")
        .select("sort")
        .order("sort", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const slugList = (existingSlugs ?? []).map((r) => r.slug).join(", ");
  const promptList = (recentPrompts ?? [])
    .map((r, i) => `${i + 1}. ${r.prompt}`)
    .join("\n");
  const startSort = (maxSortRow?.sort ?? 0) + 1;

  const steerLines: string[] = [];
  if (args.competency) steerLines.push(`Competency to focus on: ${args.competency}`);
  if (args.category) steerLines.push(`Category: ${args.category}`);
  if (args.difficulty) steerLines.push(`Difficulty: ${args.difficulty}`);

  const userMessage = `Generate ${args.count} new mock-interview scenarios for project coordinators.

${steerLines.length ? steerLines.join("\n") + "\n\n" : ""}Slug values that already exist (do NOT reuse — append a numeric suffix or rephrase):
${slugList || "(none yet)"}

Recent prompts in the pool — generate scenarios that test DIFFERENT situations from these:
${promptList || "(pool is empty — you have free range)"}

Use sort values starting at ${startSort} and increment by 1.
${args.count > 1 ? "Spread across categories and difficulty levels." : ""}

Output the JSON array now.`;

  const message = await anthropic.messages.create({
    model: GRADING_MODEL,
    max_tokens: 4000,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  let raw = "";
  for (const block of message.content) {
    if (block.type === "text") raw += block.text;
  }

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Scenario generator returned non-JSON output: ${raw.slice(0, 200)}`,
    );
  }

  const validated = z.array(ScenarioSchema).min(1).safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Generated scenarios failed validation: ${validated.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  // Belt-and-braces de-dupe against existing slugs in case Claude ignores
  // the avoid list. Append "-ai-<n>" so we don't fail on conflict.
  const existingSlugSet = new Set((existingSlugs ?? []).map((r) => r.slug));
  const rows = validated.data.map((s: ScenarioInput) => {
    let slug = s.slug;
    let suffix = 2;
    while (existingSlugSet.has(slug)) {
      slug = `${s.slug}-${suffix}`;
      suffix++;
    }
    existingSlugSet.add(slug);
    return {
      slug,
      prompt: s.prompt,
      category: s.category,
      difficulty: s.difficulty,
      competency: s.competency,
      sort: s.sort,
      is_published: true,
      rubric_summary: s.rubric_summary || null,
      is_ai_generated: true,
      generated_at: new Date().toISOString(),
    };
  });

  const { data: inserted, error: insertErr } = await admin
    .from("mock_interview_scenarios")
    .insert(rows)
    .select("id, slug, prompt, category, difficulty, competency, sort");
  if (insertErr || !inserted) {
    throw new Error(
      `Failed to insert generated scenarios: ${insertErr?.message ?? "unknown"}`,
    );
  }

  return inserted as GeneratedScenario[];
}
