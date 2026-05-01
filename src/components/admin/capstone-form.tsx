"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  upsertCapstone,
  deleteCapstone,
  KNOWN_CAPSTONE_ARTIFACTS,
} from "@/actions/admin-capstones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CapstoneFormDefaults = {
  id?: string;
  slug: string;
  title: string;
  brief: string;
  required_artifacts: string[];
  estimated_hours: number | "";
  is_published: boolean;
  rubric_summary: string;
};

export const EMPTY_CAPSTONE_DEFAULTS: CapstoneFormDefaults = {
  slug: "",
  title: "",
  brief: "",
  required_artifacts: [...KNOWN_CAPSTONE_ARTIFACTS],
  estimated_hours: 24,
  is_published: false,
  rubric_summary: "",
};

export function CapstoneForm({
  defaults,
  isEdit,
}: {
  defaults: CapstoneFormDefaults;
  isEdit: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CapstoneFormDefaults>(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CapstoneFormDefaults>(k: K, v: CapstoneFormDefaults[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function toggleArtifact(a: string) {
    setValues((prev) => ({
      ...prev,
      required_artifacts: prev.required_artifacts.includes(a)
        ? prev.required_artifacts.filter((x) => x !== a)
        : [...prev.required_artifacts, a],
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (values.required_artifacts.length === 0) {
      setError("Pick at least one required artifact.");
      setBusy(false);
      return;
    }

    const result = await upsertCapstone({
      slug: values.slug,
      title: values.title,
      brief: values.brief,
      required_artifacts: values.required_artifacts,
      estimated_hours: typeof values.estimated_hours === "number" ? values.estimated_hours : null,
      is_published: values.is_published,
      rubric_summary: values.rubric_summary || null,
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/capstones");
    router.refresh();
  }

  async function onDelete() {
    if (!values.id) return;
    if (!confirm(`Delete capstone "${values.slug}"?`)) return;
    setBusy(true);
    const result = await deleteCapstone(values.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/capstones");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="kicker mb-2">Identity</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Slug" hint="lowercase, hyphens" required>
            <Input
              value={values.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="meridian-billing"
              disabled={isEdit}
              required
            />
          </Field>
          <Field label="Estimated hours" hint="Total learner effort">
            <Input
              type="number"
              min={1}
              max={200}
              value={values.estimated_hours}
              onChange={(e) =>
                set("estimated_hours", e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.is_published}
                onChange={(e) => set("is_published", e.target.checked)}
              />
              <span className="text-sm font-medium text-ink">Published</span>
            </label>
          </div>
        </div>
        <Field label="Title" required>
          <Input
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Meridian Insurance — Billing Platform Replacement"
            required
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Brief</legend>
        <Field label="Case brief" hint="Markdown supported. The full scenario the learner reads — context, role, constraints, success criteria." required>
          <textarea
            className="flex min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={values.brief}
            onChange={(e) => set("brief", e.target.value)}
            required
            minLength={50}
            maxLength={20000}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Required artifacts</legend>
        <p className="text-sm text-muted-foreground">
          Pick which deliverables learners must submit. Order doesn&apos;t matter.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {KNOWN_CAPSTONE_ARTIFACTS.map((a) => (
            <label
              key={a}
              className="flex items-center gap-2 border border-rule bg-paper px-3 py-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.required_artifacts.includes(a)}
                onChange={() => toggleArtifact(a)}
              />
              <span className="text-sm">{a.replace(/_/g, " ")}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Rubric summary (grader context)</legend>
        <Field label="Rubric summary" hint="Optional but recommended. What separates pass / hire-ready / no-pass on this capstone.">
          <textarea
            className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values.rubric_summary}
            onChange={(e) => set("rubric_summary", e.target.value)}
            maxLength={8000}
          />
        </Field>
      </fieldset>

      {error ? (
        <div className="border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.1] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-rule pt-6">
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create capstone"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
        {isEdit && values.id ? (
          <Button
            type="button"
            variant="ghost"
            className="text-[hsl(var(--destructive))]"
            disabled={busy}
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? <span className="text-[hsl(var(--accent))]"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
