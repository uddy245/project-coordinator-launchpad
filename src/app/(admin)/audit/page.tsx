import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit queue — Launchpad" };

type QueueRow = {
  id: string;
  reason: "sampled" | "requested";
  status: "pending" | "approved" | "overridden";
  created_at: string;
  submission: {
    id: string;
    overall_score: number | null;
    submitted_at: string;
    user_id: string;
  };
};

export default async function AuditQueuePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_queue")
    .select(
      "id, reason, status, created_at, submission:submissions(id, overall_score, submitted_at, user_id)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as QueueRow[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit queue</h1>
        <p className="text-sm text-muted-foreground">
          Pending human reviews. 10% of graded submissions are auto-sampled; learner-requested
          reviews are flagged.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Queue is clear.
        </div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/audit/${r.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Learner {shortId(r.submission.user_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(r.submission.submitted_at).toLocaleString()}
                  </p>
                </div>
                {r.submission.overall_score !== null && (
                  <span className="text-sm font-semibold">
                    {Number(r.submission.overall_score).toFixed(1)} / 5
                  </span>
                )}
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-medium " +
                    (r.reason === "requested"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {r.reason === "requested" ? "Requested" : "Sampled"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function shortId(id: string): string {
  // PII-minimizing default: first two + last two chars of the UUID.
  // Once a display_name column exists on profiles we can switch to
  // "J. D." style initials.
  return `${id.slice(0, 2)}…${id.slice(-2)}`;
}
