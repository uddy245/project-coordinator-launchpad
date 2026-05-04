/**
 * Claude-powered workbook scenario generator.
 *
 * Generates a *scenario brief* — the fictional case the learner applies
 * their workbook to. The grading rubric is competency-bound and
 * doesn't see this brief, so we can safely vary scenarios without
 * touching the calibrated grading pipeline.
 *
 * Cost: 1 brief per call ≈ $0.005–0.01. Capped by ANTHROPIC_SPEND_CAP_USD.
 */

import { anthropic, GRADING_MODEL } from "@/lib/anthropic/client";
import { checkSpendCap } from "@/lib/grading/spend-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkbookAssignmentSchema, type WorkbookAssignmentInput } from "@/lib/workbook/schema";

export type GenerateAssignmentArgs = {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonSummary: string | null;
  competency: string;
};

export type GeneratedAssignment = {
  id: string;
  lesson_id: string;
  title: string;
  brief: string;
  sort: number;
};

const SYSTEM_PROMPT = `You write realistic project-management case scenarios that early-career project coordinators apply their workbook templates to. Every scenario is set in the TECHNOLOGY / IT industry — software product launches, cloud or data-centre migrations, cybersecurity programmes, ML / AI rollouts, SaaS implementations, mobile app launches, fintech / healthtech / regtech projects, DevOps transformations, infrastructure upgrades, data platform builds, API integrations, ERP / CRM rollouts, and similar IT initiatives. Do NOT use non-tech industries (construction, manufacturing, retail merchandising, hospitality, healthcare-non-IT, etc.) for the scenario setting.

Your output is a single JSON object with two fields:
- title: a short scenario name, max 140 chars (e.g. "Fintech compliance go-live — Q3 launch", "EHR migration — regional health system", "Zero-trust rollout — global SaaS").
- brief: a 200–500 word scenario in markdown. Set the scene with concrete operational detail: company / tech sub-domain / programme name (fictional), the coordinator's role on the project, the team composition (engineering leads, security, infra, vendors, etc.), the immediate situation that requires the workbook task, and 3–5 concrete inputs the coordinator can use to fill the workbook. Avoid leading the candidate to the answer — present the situation honestly, and let them apply professional judgment.

Quality bar:
- Specific. Real-feeling tech company names (fictional but plausible), team names, technology stacks, dates, dollar amounts, role titles. No "Acme Corp" or "Project X".
- Plausible. The coordinator's task must be solvable with the workbook structure for THIS lesson's competency.
- Open-ended. The brief should not pre-classify items into the answer (e.g. don't pre-label something as "this is a Risk"). The learner's job is to do that classification.
- Different from the existing pool — you'll be told recent briefs to avoid duplicating.

No preamble, no markdown code fence, no explanation outside the JSON.`;

export async function generateWorkbookAssignment(
  args: GenerateAssignmentArgs
): Promise<GeneratedAssignment> {
  const spend = await checkSpendCap(createAdminClient());
  if (!spend.ok) {
    throw new Error(
      `Spend cap reached: $${spend.projectedUsd.toFixed(4)} would exceed $${spend.capUsd}`
    );
  }

  const admin = createAdminClient();

  const [{ data: existingTitles }, { data: maxSortRow }] = await Promise.all([
    admin
      .from("workbook_assignments")
      .select("title")
      .eq("lesson_id", args.lessonId)
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("workbook_assignments")
      .select("sort")
      .eq("lesson_id", args.lessonId)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const avoidList = (existingTitles ?? []).map((r, i) => `${i + 1}. ${r.title}`).join("\n");
  const startSort = (maxSortRow?.sort ?? 99) + 1;

  const userMessage = `Lesson: ${args.lessonTitle}
Slug: ${args.lessonSlug}
Competency the learner is exercising: ${args.competency}

Lesson summary (the workbook task and template structure are scoped to this):
${args.lessonSummary ?? "(no summary — infer from the title)"}

Existing scenario titles in this lesson's pool — generate a scenario whose situation/industry is meaningfully different from these:
${avoidList || "(pool is empty — you have free range)"}

Generate ONE new workbook scenario. Output the JSON object now.`;

  const message = await anthropic.messages.create({
    model: GRADING_MODEL,
    max_tokens: 2000,
    temperature: 0.8,
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
    throw new Error(`Workbook generator returned non-JSON output: ${raw.slice(0, 200)}`);
  }

  const validated = WorkbookAssignmentSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Generated workbook assignment failed validation: ${validated.error.issues[0]?.message ?? "unknown"}`
    );
  }

  const row: WorkbookAssignmentInput & {
    lesson_id: string;
    is_ai_generated: boolean;
    generated_at: string;
    sort: number;
    is_default: boolean;
  } = {
    lesson_id: args.lessonId,
    title: validated.data.title,
    brief: validated.data.brief,
    is_ai_generated: true,
    generated_at: new Date().toISOString(),
    sort: startSort,
    is_default: false,
  };

  const { data: inserted, error: insertErr } = await admin
    .from("workbook_assignments")
    .insert(row)
    .select("id, lesson_id, title, brief, sort")
    .single();
  if (insertErr || !inserted) {
    throw new Error(
      `Failed to insert generated workbook assignment: ${insertErr?.message ?? "unknown"}`
    );
  }

  return inserted as GeneratedAssignment;
}
