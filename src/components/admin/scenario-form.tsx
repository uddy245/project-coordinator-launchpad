"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { upsertScenario, deleteScenario } from "@/actions/admin-scenarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ScenarioFormDefaults = {
  id?: string;
  slug: string;
  prompt: string;
  category: "behavioural" | "procedural" | "judgment";
  difficulty: "easy" | "medium" | "hard";
  competency: string;
  sort: number | "";
  is_published: boolean;
  rubric_summary: string;
};

export const EMPTY_SCENARIO_DEFAULTS: ScenarioFormDefaults = {
  slug: "",
  prompt: "",
  category: "behavioural",
  difficulty: "medium",
  competency: "",
  sort: 100,
  is_published: false,
  rubric_summary: "",
};

export function ScenarioForm({
  defaults,
  isEdit,
}: {
  defaults: ScenarioFormDefaults;
  isEdit: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ScenarioFormDefaults>(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ScenarioFormDefaults>(k: K, v: ScenarioFormDefaults[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (typeof values.sort !== "number") {
      setError("Sort order is required.");
      setBusy(false);
      return;
    }

    const result = await upsertScenario({
      slug: values.slug,
      prompt: values.prompt,
      category: values.category,
      difficulty: values.difficulty,
      competency: values.competency,
      sort: values.sort,
      is_published: values.is_published,
      rubric_summary: values.rubric_summary || null,
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/scenarios");
    router.refresh();
  }

  async function onDelete() {
    if (!values.id) return;
    if (!confirm(`Delete "${values.slug}"? This cannot be undone.`)) return;
    setBusy(true);
    const result = await deleteScenario(values.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/scenarios");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="kicker mb-2">Identity</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Slug" hint="lowercase, hyphens — e.g. m08-q1" required>
            <Input
              value={values.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="m08-q1"
              disabled={isEdit}
              required
            />
          </Field>
          <Field label="Sort order" hint="Lower = earlier in list" required>
            <Input
              type="number"
              min={0}
              max={9999}
              value={values.sort}
              onChange={(e) => set("sort", e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Category" required>
            <select
              value={values.category}
              onChange={(e) => set("category", e.target.value as ScenarioFormDefaults["category"])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="behavioural">Behavioural</option>
              <option value="procedural">Procedural</option>
              <option value="judgment">Judgment</option>
            </select>
          </Field>
          <Field label="Difficulty" required>
            <select
              value={values.difficulty}
              onChange={(e) =>
                set("difficulty", e.target.value as ScenarioFormDefaults["difficulty"])
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Competency" hint="snake_case identifier" required>
            <Input
              value={values.competency}
              onChange={(e) => set("competency", e.target.value)}
              placeholder="risk_identification"
              required
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Prompt</legend>
        <Field
          label="Prompt text"
          hint="The scenario the learner sees. Specific, role-grounded, 100–500 words."
          required
        >
          <textarea
            className="flex min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values.prompt}
            onChange={(e) => set("prompt", e.target.value)}
            required
            minLength={20}
            maxLength={4000}
          />
        </Field>
        <Field
          label="Rubric summary"
          hint="Optional. What you're looking for in a strong answer — used as grader context."
        >
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values.rubric_summary}
            onChange={(e) => set("rubric_summary", e.target.value)}
            maxLength={2000}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Visibility</legend>
        <label className="flex cursor-pointer select-none items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={values.is_published}
            onChange={(e) => set("is_published", e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium text-ink">Published</div>
            <div className="text-xs text-muted-foreground">
              Show on /interviews. Unpublishing hides it from learners but keeps responses intact.
            </div>
          </div>
        </label>
      </fieldset>

      {error ? (
        <div className="border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.1] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-rule pt-6">
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create scenario"}
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
