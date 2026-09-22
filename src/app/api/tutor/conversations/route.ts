/**
 * GET /api/tutor/conversations
 *
 * Returns the current user's tutor conversation threads, ordered most-recent
 * first. Title is derived from the first user message of each thread (truncated
 * to 40 chars). Empty threads (no messages yet) never appear because threads
 * only exist in tutor_messages rows.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { tutorMessages } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";

interface RawRow {
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

export async function GET() {
  const user = await getAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all rows that belong to a conversation, oldest-first so the first
  // user message per conversation is encountered before later ones.
  // Owner-only: filter by the signed-in user (RLS no longer applies).
  let data: RawRow[];
  try {
    data = (await db
      .select({
        conversation_id: tutorMessages.conversationId,
        role: tutorMessages.role,
        content: tutorMessages.content,
        created_at: tutorMessages.createdAt,
      })
      .from(tutorMessages)
      .where(and(eq(tutorMessages.userId, user.id), isNotNull(tutorMessages.conversationId)))
      .orderBy(asc(tutorMessages.createdAt))) as RawRow[];
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }

  // Group by conversation_id in JS. Rows are in ascending time order so the
  // first user message we encounter per conversation becomes the title, and
  // each successive row updates last_message_at.
  const convMap = new Map<
    string,
    { conversation_id: string; title: string; last_message_at: string; message_count: number }
  >();

  for (const row of data) {
    const cid = row.conversation_id;
    const existing = convMap.get(cid);
    if (!existing) {
      const raw = row.content ?? "";
      const title =
        row.role === "user"
          ? raw.slice(0, 40).replace(/\n/g, " ").trim() + (raw.length > 40 ? "…" : "")
          : "Conversation";
      convMap.set(cid, {
        conversation_id: cid,
        title,
        last_message_at: row.created_at,
        message_count: 1,
      });
    } else {
      existing.last_message_at = row.created_at;
      existing.message_count += 1;
      // Backfill title if the first row happened to be an assistant row.
      if (existing.title === "Conversation" && row.role === "user") {
        const raw = row.content ?? "";
        existing.title = raw.slice(0, 40).replace(/\n/g, " ").trim() + (raw.length > 40 ? "…" : "");
      }
    }
  }

  const conversations = Array.from(convMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );

  return NextResponse.json({ conversations });
}
