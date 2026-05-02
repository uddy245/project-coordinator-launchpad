/**
 * Claude-powered quiz item generator.
 *
 * Called when a learner refreshes a lesson's quiz and the existing pool
 * has been exhausted (everything's already been served to that user).
 * Generated items are validated through the SAME Zod schema admins use
 * for human-authored items, then inserted into quiz_items with
 * is_ai_generated=true so they become part of the shared pool — every
 * generation grows the global pool, reducing future generation cost.
 *
 * Cost: ~10 items per call ≈ $0.015–0.02 in Claude tokens. Capped by
 * the existing ANTHROPIC_SPEND_CAP_USD daily budget.
 */

import { z } from "zod";
import { anthropic, GRADING_MODEL } from "@/lib/anthropic/client";
import { checkSpendCap } from "@/lib/grading/spend-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuizItemSchema } from "@/lib/quiz/schema";

export type GenerateQuizItemsArgs = {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonSummary: string | null;
  competency: string;
  count: number;
  startSort: number; // first sort number to assign (e.g. max(existing.sort)+1)
};

export type GeneratedQuizItem = {
  id: string;
  sort: number;
  stem: string;
  options: { id: string; text: string }[];
  competency: string;
  difficulty: "easy" | "medium" | "hard";
};

const SYSTEM_PROMPT = `You are an experienced senior project manager writing rigorous quiz items for a project-coordinator training programme aimed at the TECHNOLOGY / IT industry.

EVERY scenario, example, and option you write must be set in a technology context. Acceptable archetypes include: software product launches, cloud / data-centre migrations, cybersecurity programmes, ML / AI rollouts, SaaS implementations, mobile app launches, fintech / healthtech / regtech projects, DevOps transformations, infrastructure upgrades, data platform builds, API integrations, ERP / CRM rollouts, and similar IT projects. Do NOT use construction, manufacturing, retail merchandising, or other non-tech industries — even as side examples — unless the lesson explicitly calls for cross-industry comparison.

Each item tests professional judgment, not trivia. Aim for the quality of a strong professional certification exam — items should distinguish thoughtful coordinators from rote memorisers.

Output a JSON array of quiz items. Each item is an object with these fields:
- sort: integer (use the values you're given)
- stem: a single-paragraph question with enough scenario context to be answerable; avoid pronouns without antecedents
- options: array of EXACTLY 4 objects, each with {id, text}. Use option ids "a", "b", "c", "d" in order
- correct: the id of the correct option (one of "a", "b", "c", "d")
- distractor_rationale: object mapping each WRONG option's id to a 1-2 sentence explanation of why it's wrong. Do not include the correct option in this map.
- competency: copy this from what you're given
- difficulty: "easy", "medium", or "hard". Spread the set across all three.

Quality bar:
- Distractors must be plausible — a beginner could reasonably pick them. No throwaway "obviously wrong" options.
- The correct answer must be clearly defensible from the lesson context, not a matter of opinion.
- Do not produce items already covered in the existing pool the user has seen (you'll be told the recent stems to avoid duplicates).
- No trick questions. No double-negatives. No "all of the above".

No preamble, no markdown, no code fences — output ONLY the JSON array.`;

export async function generateQuizItems(
  args: GenerateQuizItemsArgs,
): Promise<GeneratedQuizItem[]> {
  // Spend cap — bail before calling Claude if we'd blow the daily budget.
  const spend = await checkSpendCap(createAdminClient());
  if (!spend.ok) {
    throw new Error(
      `Spend cap reached: $${spend.projectedUsd.toFixed(4)} would exceed $${spend.capUsd}`,
    );
  }

  // Pull a small sample of existing stems so Claude can avoid obvious dupes.
  const admin = createAdminClient();
  const { data: existingStems } = await admin
    .from("quiz_items")
    .select("stem")
    .eq("lesson_id", args.lessonId)
    .order("created_at", { ascending: false })
    .limit(20);

  const avoidList = (existingStems ?? [])
    .map((r, i) => `${i + 1}. ${r.stem}`)
    .join("\n");

  const userMessage = `Lesson: ${args.lessonTitle}
Slug: ${args.lessonSlug}
Competency under test: ${args.competency}

Lesson summary (use this as the source of truth for what's in scope):
${args.lessonSummary ?? "(no summary available — infer from the title)"}

Recent existing items in the pool — generate items that are NOT duplicates of these:
${avoidList || "(pool is empty — you have free range)"}

Generate ${args.count} new quiz items. Use sort values starting at ${args.startSort} and increment by 1.

Output the JSON array now.`;

  const message = await anthropic.messages.create({
    model: GRADING_MODEL,
    max_tokens: 4000,
    temperature: 0.7, // Some variability so refresh after refresh isn't identical
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
    throw new Error(`Quiz generator returned non-JSON output: ${raw.slice(0, 200)}`);
  }

  const validated = z.array(QuizItemSchema).min(1).safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Generated quiz items failed validation: ${validated.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  // Insert into quiz_items, marked as AI-generated. Returning rows gives
  // us the assigned ids which the caller needs to record in quiz_item_seen.
  const rows = validated.data.map((it) => ({
    lesson_id: args.lessonId,
    sort: it.sort,
    stem: it.stem,
    options: it.options,
    correct: it.correct,
    distractor_rationale: it.distractor_rationale,
    competency: it.competency,
    difficulty: it.difficulty,
    is_ai_generated: true,
    generated_at: new Date().toISOString(),
  }));

  const { data: inserted, error: insertErr } = await admin
    .from("quiz_items")
    .insert(rows)
    .select("id, sort, stem, options, competency, difficulty");
  if (insertErr || !inserted) {
    throw new Error(
      `Failed to insert generated quiz items: ${insertErr?.message ?? "unknown"}`,
    );
  }

  return inserted.map((r) => ({
    id: r.id,
    sort: r.sort,
    stem: r.stem,
    options: r.options as { id: string; text: string }[],
    competency: r.competency,
    difficulty: r.difficulty as "easy" | "medium" | "hard",
  }));
}
