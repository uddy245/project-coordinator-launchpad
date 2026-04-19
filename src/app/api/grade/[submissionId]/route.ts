import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { gradeSubmission } from "@/lib/grading/service";

// Internal grading worker. Called fire-and-forget from createSubmission.
// Protected by a shared secret so a third party can't burn Anthropic
// budget by POST-ing random UUIDs.
//
// Node runtime because gradeSubmission → xlsx parsing → fs-heavy. Dynamic
// so it never caches.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  if (!env.GRADE_WORKER_SECRET) {
    return NextResponse.json({ error: "GRADE_WORKER_SECRET not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-grade-worker-secret");
  if (provided !== env.GRADE_WORKER_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { submissionId } = await params;
  try {
    const result = await gradeSubmission(submissionId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[grade worker] failed", submissionId, err);
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
