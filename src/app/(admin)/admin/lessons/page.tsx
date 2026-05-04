import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Lessons — Admin" };
export const dynamic = "force-dynamic";

type LessonRow = {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string | null;
  competency: string | null;
  is_published: boolean;
  is_preview: boolean;
  estimated_minutes: number | null;
  updated_at: string;
};

export default async function AdminLessonsPage() {
  // The (admin) layout already gates on requireAdmin(). We use the admin
  // client here because we want to see unpublished lessons too.
  const admin = createAdminClient();
  const { data } = await admin
    .from("lessons")
    .select(
      "id, slug, number, title, summary, competency, is_published, is_preview, estimated_minutes, updated_at"
    )
    .order("number", { ascending: true });

  const lessons = (data ?? []) as LessonRow[];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-4">
        <div>
          <span className="kicker">Admin · Content</span>
          <h1 className="display-title mt-1 text-2xl">Lessons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All lessons in the database — published and draft. Click to edit.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/lessons/new">+ New lesson</Link>
        </Button>
      </header>

      {lessons.length === 0 ? (
        <div className="border border-rule p-8 text-center">
          <span className="kicker">No lessons yet — create the first one.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((l) => (
            <Link
              key={l.id}
              href={`/admin/lessons/${l.slug}`}
              className="tile grid grid-cols-12 items-stretch gap-0 hover:border-ink"
            >
              <div className="col-span-2 border-r border-rule p-4">
                <div className="kicker text-[0.7rem]">M{String(l.number).padStart(2, "0")}</div>
                <div className="data-numeral mt-1 text-[1.4rem] leading-none text-ink">
                  {String(l.number).padStart(2, "0")}
                </div>
              </div>
              <div className="col-span-7 space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {l.is_published ? (
                    <span className="rounded-sm bg-[hsl(var(--status-complete))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
                      Published
                    </span>
                  ) : (
                    <span className="rounded-sm bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Draft
                    </span>
                  )}
                  {l.is_preview ? (
                    <span className="rounded-sm bg-[hsl(var(--accent))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
                      Public preview
                    </span>
                  ) : null}
                  {l.competency ? (
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                      {l.competency.replace(/_/g, " ")}
                    </span>
                  ) : null}
                </div>
                <h3 className="display-title text-[1.15rem]">{l.title}</h3>
                {l.summary ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{l.summary}</p>
                ) : null}
              </div>
              <div className="col-span-3 flex flex-col justify-center border-l border-rule p-4">
                <div className="kicker">/lessons/{l.slug}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {l.estimated_minutes ? `${l.estimated_minutes} min` : "No duration set"}
                </div>
                <div className="mt-2 text-[0.7rem] text-muted-foreground">
                  Updated {new Date(l.updated_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
