/**
 * POST /api/tutor  — streaming AI tutor
 * GET  /api/tutor  — recent message history
 *
 * Auth: cookie-based Supabase session (createClient + getUser).
 *       Returns JSON 401/403 — never redirects.
 * Gate: profiles.has_access must be true (paid feature).
 * Guard: per-user daily message cap + global daily spend cap, checked
 *        before any Anthropic call.
 * AI:   anthropic.messages.stream() → text/plain chunked SSE.
 * Store: tutor_messages — both turns + token usage on assistant rows.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropic } from "@/lib/anthropic/client";
import { env } from "@/env";
import { getLessonReadingTruncated } from "@/lib/lessons/reading";
import { checkSpendCap, checkUserMessageCap } from "@/lib/grading/spend-guard";
import { getCurrentAssignment } from "@/lib/workbook/select";

// ── Validation ────────────────────────────────────────────────────────────────

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(32_000),
});

const postBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  lessonSlug: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  tab: z.enum(["video", "read", "workbook", "quiz"]).optional(),
  conversation_id: z.string().uuid().optional(),
});

// ── Workbook brief fetch ──────────────────────────────────────────────────────

async function fetchWorkbookBrief(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  lessonSlug: string
): Promise<string | null> {
  try {
    // Resolve slug → lesson id + scenario_text fallback
    const { data: lesson } = await admin
      .from("lessons")
      .select("id, scenario_text")
      .eq("slug", lessonSlug)
      .single();

    if (!lesson) return null;

    // Try the user's currently active workbook assignment (most recently seen → default)
    const assignment = await getCurrentAssignment({
      supabase: admin,
      userId,
      lessonId: lesson.id,
    });

    if (assignment?.brief) return assignment.brief;

    // Fall back to the lesson's own scenario_text if no workbook assignment exists
    return (lesson.scenario_text as string | null) ?? null;
  } catch {
    return null;
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  lessonSlug?: string,
  tab?: string,
  workbookBrief?: string | null
): string {
  let template: string;
  try {
    template = readFileSync(join(process.cwd(), "docs", "prompts", "tutor-v1.md"), "utf8");
  } catch {
    template =
      "You are the Tutor for the Project Coordinator Launchpad.\n\n{{TAB_CONTEXT}}\n\n{{LESSON_CONTEXT}}";
  }

  // Replace {{TAB_CONTEXT}} — warn about graded work when on quiz or workbook tabs
  const tabNote =
    tab === "quiz" || tab === "workbook"
      ? `The student is currently on the ${tab} tab — be extra careful not to complete their graded work; coach instead.`
      : "";
  template = template.replace("{{TAB_CONTEXT}}", tabNote);

  // Replace {{LESSON_CONTEXT}}
  let lessonBlock = "";
  if (lessonSlug) {
    const reading = getLessonReadingTruncated(lessonSlug, 6000);
    if (reading) {
      lessonBlock = [
        "---",
        `**Current lesson: ${lessonSlug}**`,
        "",
        reading,
        "---",
        "",
        "The learner is currently studying this lesson. Where relevant, connect your answers to the reading above.",
      ].join("\n");
    }
  }
  template = template.replace("{{LESSON_CONTEXT}}", lessonBlock);

  // Append workbook scenario when the student is on the workbook tab.
  // This is the assignment prompt (the fictional scenario they apply skills to),
  // NOT an answer key — safe to share; it lets the tutor coach on the actual task.
  if (tab === "workbook" && workbookBrief) {
    template += [
      "",
      "",
      "---",
      "**WORKBOOK SCENARIO — the assignment this student is currently working on:**",
      "",
      workbookBrief,
      "---",
      "",
      "Use this scenario as context when coaching. Do NOT complete the workbook for the student — coach them instead.",
    ].join("\n");
  }

  return template;
}

// ── POST — streaming chat ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Access gate — profiles.has_access
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_access")
    .eq("id", user.id)
    .single();

  if (!profile?.has_access) {
    return NextResponse.json(
      { error: "The AI tutor is a paid feature. Upgrade your account to access it." },
      { status: 403 }
    );
  }

  // 3. Parse + validate body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { messages, lessonSlug, tab, conversation_id } = parsed.data;

  // 4. Abuse guards — admin client so we can query all users' rows for the spend cap
  const admin = createAdminClient();

  const [msgCap, spendCap] = await Promise.all([
    checkUserMessageCap(admin, user.id),
    checkSpendCap(admin),
  ]);

  if (!msgCap.ok) {
    return NextResponse.json(
      {
        error: `You've reached your daily tutor limit (${msgCap.cap} messages). Resets at midnight UTC.`,
      },
      { status: 429 }
    );
  }

  if (!spendCap.ok) {
    return NextResponse.json(
      { error: "Daily AI budget reached. Please try again tomorrow." },
      { status: 429 }
    );
  }

  // 5. Persist the user's message (fire-and-forget — don't block the stream)
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) {
    admin
      .from("tutor_messages")
      .insert({
        user_id: user.id,
        lesson_slug: lessonSlug ?? null,
        conversation_id: conversation_id ?? null,
        role: "user",
        content: lastUserMsg.content,
      })
      .then(({ error }) => {
        if (error) console.error("[tutor] persist user msg:", error.message);
      });
  }

  // 6. Fetch workbook scenario (only when on workbook tab — safe assignment prompt, not an answer key)
  const workbookBrief =
    tab === "workbook" && lessonSlug ? await fetchWorkbookBrief(admin, user.id, lessonSlug) : null;

  // 7. Build system prompt
  const systemPrompt = buildSystemPrompt(lessonSlug, tab, workbookBrief);

  // 8. Stream from Anthropic
  const encoder = new TextEncoder();
  let assistantContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: env.TUTOR_MODEL,
          max_tokens: env.TUTOR_MAX_TOKENS,
          system: systemPrompt,
          messages: messages as Array<{ role: "user" | "assistant"; content: string }>,
        });

        for await (const chunk of anthropicStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            assistantContent += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        const final = await anthropicStream.finalMessage();
        inputTokens = final.usage.input_tokens;
        outputTokens = final.usage.output_tokens;
      } catch (err) {
        console.error("[tutor] Anthropic stream error:", err);
        controller.enqueue(
          encoder.encode("\n\n[The tutor encountered an error. Please try again.]")
        );
      } finally {
        controller.close();

        // 9. Persist assistant reply + token usage
        admin
          .from("tutor_messages")
          .insert({
            user_id: user.id,
            lesson_slug: lessonSlug ?? null,
            conversation_id: conversation_id ?? null,
            role: "assistant",
            content: assistantContent,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            model: env.TUTOR_MODEL,
          })
          .then(({ error }) => {
            if (error) console.error("[tutor] persist assistant msg:", error.message);
          });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// ── GET — recent history ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId") ?? undefined;
  const lessonSlug = url.searchParams.get("lessonSlug") ?? undefined;
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "100", 10), 1), 200);

  // User-scoped client — RLS ensures we only see this user's rows.
  let query = supabase
    .from("tutor_messages")
    .select("id, role, content, lesson_slug, conversation_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (conversationId) {
    query = query.eq("conversation_id", conversationId) as typeof query;
  } else if (lessonSlug) {
    query = query.eq("lesson_slug", lessonSlug) as typeof query;
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: (data ?? []).reverse() });
}
