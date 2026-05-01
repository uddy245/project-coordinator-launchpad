"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { uploadLessonTemplate, deleteLessonTemplate } from "@/actions/admin-lessons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ExistingTemplate = {
  id: string;
  title: string;
  description: string | null;
  kind: "starter" | "example";
  file_url: string;
  sort: number;
};

export function TemplateUploader({
  lessonSlug,
  existing,
}: {
  lessonSlug: string;
  existing: ExistingTemplate[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    const fd = new FormData(e.currentTarget);
    fd.set("lessonSlug", lessonSlug);

    const result = await uploadLessonTemplate(fd);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setInfo("Template uploaded.");
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title *</Label>
            <Input
              name="title"
              required
              maxLength={120}
              placeholder="Banking · Capital Markets — sample"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kind *</Label>
            <select
              name="kind"
              required
              defaultValue="example"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="starter">Starter</option>
              <option value="example">Example</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <textarea
            name="description"
            maxLength={500}
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="One sentence — what's in this template, who's it for"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>File * (XLSX, PDF, or CSV — max 10 MB)</Label>
            <Input
              type="file"
              name="file"
              required
              accept=".xlsx,.xls,.csv,.pdf"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              name="sort"
              min={0}
              max={9999}
              defaultValue={100}
            />
          </div>
        </div>

        {error ? (
          <div className="border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.1] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
            {error}
          </div>
        ) : null}
        {info ? (
          <div className="border border-rule bg-paper px-4 py-3 text-sm text-ink">{info}</div>
        ) : null}

        <Button type="submit" disabled={busy}>
          {busy ? "Uploading…" : "Upload template"}
        </Button>
      </form>

      {existing.length > 0 ? (
        <div className="space-y-3 border-t border-rule pt-6">
          <h3 className="kicker">Existing DB-backed templates</h3>
          <ul className="space-y-2">
            {existing.map((t) => (
              <ExistingRow key={t.id} t={t} onChanged={() => router.refresh()} />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Static templates from <code className="font-mono">src/lib/lessons/templates.ts</code>{" "}
            still appear on the lesson page; they aren&apos;t editable here.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ExistingRow({
  t,
  onChanged,
}: {
  t: ExistingTemplate;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Delete "${t.title}"? This removes the file too.`)) return;
    startTransition(async () => {
      const result = await deleteLessonTemplate(t.id);
      if (result.ok) onChanged();
      else alert(result.error);
    });
  }

  return (
    <li className="flex items-start justify-between gap-3 border border-rule bg-paper px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-ink">{t.title}</span>
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            {t.kind} · sort {t.sort}
          </span>
        </div>
        {t.description ? (
          <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
        ) : null}
        <a
          href={t.file_url}
          target="_blank"
          rel="noreferrer"
          className="mono-link mt-1 inline-block text-xs"
        >
          Download ↗
        </a>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={onDelete}
        disabled={pending}
        className="text-[hsl(var(--destructive))]"
      >
        {pending ? "…" : "Delete"}
      </Button>
    </li>
  );
}
