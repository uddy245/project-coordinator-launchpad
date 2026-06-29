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
import { createClient } from "@/lib/supabase/server";

interface RawRow {
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all rows that belong to a conversation, oldest-first so the first
  // user message per conversation is encountered before later ones.
  const { data, error } = await supabase
    .from("tutor_messages")
    .select("conversation_id, role, content, created_at")
    .eq("user_id", user.id)
    .not("conversation_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by conversation_id in JS. Rows are in ascending time order so the
  // first user message we encounter per conversation becomes the title, and
  // each successive row updates last_message_at.
  const convMap = new Map<
    string,
    { conversation_id: string; title: string; last_message_at: string; message_count: number }
  >();

  for (const row of (data ?? []) as RawRow[]) {
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
