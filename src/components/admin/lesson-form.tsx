"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, type FormEvent } from "react";
import {
  upsertLesson,
  replaceQuizItems,
  uploadLessonVideo,
} from "@/actions/admin-lessons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LessonFormDefaults = {
  slug: string;
  number: number | "";
  title: string;
  summary: string;
  video_url: string;
  competency: string;
  prompt_name: string;
  estimated_minutes: number | "";
  is_published: boolean;
  is_preview: boolean;
};

export const EMPTY_DEFAULTS: LessonFormDefaults = {
  slug: "",
  number: "",
  title: "",
  summary: "",
  video_url: "",
  competency: "",
  prompt_name: "",
  estimated_minutes: "",
  is_published: false,
  is_preview: false,
};

export function LessonForm({
  defaults,
  isEdit,
}: {
  defaults: LessonFormDefaults;
  isEdit: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<LessonFormDefaults>(defaults);
  const [quizJson, setQuizJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function set<K extends keyof LessonFormDefaults>(k: K, v: LessonFormDefaults[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function onVideoUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Pick a video file first.");
      return;
    }
    if (!isEdit) {
      // Upload routes to <slug>/<file>; the slug must exist in the DB
      // first because the action looks up the lesson before storing.
      setError("Save the lesson once before uploading a video.");
      return;
    }
    setError(null);
    setInfo(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("lessonSlug", values.slug);
    fd.set("file", file);
    const result = await uploadLessonVideo(fd);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    set("video_url", result.data.url);
    setInfo("Video uploaded. URL pasted in — click Save changes to publish.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    if (typeof values.number !== "number") {
      setError("Number is required.");
      setBusy(false);
      return;
    }

    const result = await upsertLesson({
      slug: values.slug,
      number: values.number,
      title: values.title,
      summary: values.summary || null,
      video_url: values.video_url || null,
      competency: values.competency,
      prompt_name: values.prompt_name,
      estimated_minutes:
        typeof values.estimated_minutes === "number" ? values.estimated_minutes : null,
      is_published: values.is_published,
      is_preview: values.is_preview,
    });

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    if (quizJson.trim().length > 0) {
      const quizResult = await replaceQuizItems({
        lessonSlug: result.data.slug,
        itemsJson: quizJson,
      });
      if (!quizResult.ok) {
        setError(`Lesson saved but quiz items failed: ${quizResult.error}`);
        setBusy(false);
        return;
      }
      setInfo(`Saved. Replaced ${quizResult.data.inserted} quiz items.`);
    } else {
      setInfo("Saved.");
    }

    setBusy(false);
    router.push(`/lessons/${result.data.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="kicker mb-2">Identity</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Slug" hint="lowercase, hyphens — matches /lessons/<slug>" required>
            <Input
              value={values.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="raid-logs"
              disabled={isEdit}
              required
            />
          </Field>
          <Field label="Module number" hint="01–25; sort order" required>
            <Input
              type="number"
              min={1}
              max={99}
              value={values.number}
              onChange={(e) => set("number", e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Estimated minutes" hint="optional · learner-facing">
            <Input
              type="number"
              min={1}
              max={360}
              value={values.estimated_minutes}
              onChange={(e) =>
                set(
                  "estimated_minutes",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </Field>
        </div>

        <Field label="Title" required>
          <Input
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="The RAID Log and the Art of Seeing Trouble Early"
            required
          />
        </Field>

        <Field label="Summary" hint="1–2 sentences shown on the dashboard tile">
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={values.summary}
            onChange={(e) => set("summary", e.target.value)}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Grading & video</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Competency" hint="Snake_case identifier — joins to rubric" required>
            <Input
              value={values.competency}
              onChange={(e) => set("competency", e.target.value)}
              placeholder="risk_identification"
              required
            />
          </Field>
          <Field label="Prompt name" hint="Joins to a prompt row" required>
            <Input
              value={values.prompt_name}
              onChange={(e) => set("prompt_name", e.target.value)}
              placeholder="grade-raid"
              required
            />
          </Field>
        </div>

        <Field label="Video URL" hint="Public Supabase Storage URL — paste manually, or upload below to auto-fill">
          <Input
            type="url"
            value={values.video_url}
            onChange={(e) => set("video_url", e.target.value)}
            placeholder="https://xiksqmvtxwcrodmjxosy.supabase.co/storage/v1/object/public/lesson-videos/lesson-XX-name.mp4"
          />
        </Field>

        <div className="space-y-2 rounded-md border border-rule bg-paper px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              disabled={uploading || !isEdit}
              className="text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVideoUpload}
              disabled={uploading || !isEdit}
            >
              {uploading ? "Uploading…" : "Upload video"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? "MP4 / MOV / WebM, max 500 MB. Goes to the lesson-videos bucket and pastes the URL above. Save the lesson afterward to publish."
              : "Save the lesson once before uploading — we need the slug on disk first."}
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Visibility</legend>

        <Toggle
          label="Published"
          hint="Show this lesson on the dashboard for users with access"
          checked={values.is_published}
          onChange={(v) => set("is_published", v)}
        />
        <Toggle
          label="Public preview"
          hint="Anyone (no auth) can read at /preview/<slug>. Use sparingly — usually only one preview lesson."
          checked={values.is_preview}
          onChange={(v) => set("is_preview", v)}
        />
      </fieldset>

      <fieldset className="space-y-4 border-t border-rule pt-6">
        <legend className="kicker mb-2">Quiz items (optional)</legend>
        <p className="text-sm text-muted-foreground">
          Paste a JSON array of quiz items below. Each item:{" "}
          <code className="font-mono text-xs">
            {`{ sort, stem, options:[{id,text}], correct, distractor_rationale, competency, difficulty }`}
          </code>
          . Submitting will <strong>replace all existing quiz items</strong> for this lesson.
        </p>
        <textarea
          className="flex min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={quizJson}
          onChange={(e) => setQuizJson(e.target.value)}
          placeholder="[ ]"
        />
      </fieldset>

      {error ? (
        <div className="border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.1] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="border border-rule bg-paper px-4 py-3 text-sm text-ink">{info}</div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-rule pt-6">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create lesson"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
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

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
    </label>
  );
}
