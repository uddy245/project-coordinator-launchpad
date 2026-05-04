import Link from "next/link";
import { LessonForm, EMPTY_DEFAULTS } from "@/components/admin/lesson-form";

export const metadata = { title: "New lesson — Admin" };

export default function NewLessonPage() {
  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <Link href="/admin/lessons" className="kicker hover:underline">
          ← Lessons
        </Link>
        <h1 className="display-title mt-2 text-2xl">New lesson</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new module. Slug must be unique. Quiz items are optional — you can add them
          later.
        </p>
      </header>
      <LessonForm defaults={EMPTY_DEFAULTS} isEdit={false} />
    </div>
  );
}
