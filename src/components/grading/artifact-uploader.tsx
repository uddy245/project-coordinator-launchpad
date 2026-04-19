"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSubmission, type CreateSubmissionInput } from "@/actions/submission";
import { MAX_UPLOAD_BYTES } from "@/lib/submission/constants";
import { Button } from "@/components/ui/button";

const ALLOWED_MIMES: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLS",
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // btoa can't handle >64k chars at once; chunk it.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function ArtifactUploader({ lessonSlug }: { lessonSlug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  function handleFiles(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!(file.type in ALLOWED_MIMES)) {
      toast.error(`Unsupported file type. Accepted: ${Object.values(ALLOWED_MIMES).join(", ")}.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`);
      return;
    }

    setSubmitting(true);
    startTransition(async () => {
      try {
        const b64 = await fileToBase64(file);
        const result = await createSubmission({
          lessonSlug,
          filename: file.name,
          mimeType: file.type as CreateSubmissionInput["mimeType"],
          fileBase64: b64,
        });
        setSubmitting(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Uploaded — grading starting…");
        router.push(`/submissions/${result.data.submissionId}`);
      } catch (err) {
        setSubmitting(false);
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={
          "rounded-lg border-2 border-dashed p-8 text-center transition-colors " +
          (dragOver
            ? "border-foreground bg-muted/50"
            : "border-border hover:border-muted-foreground/50")
        }
      >
        <p className="font-medium">Drop your RAID log here</p>
        <p className="mt-1 text-sm text-muted-foreground">XLSX, PDF, or DOCX · up to 10 MB</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={submitting}
        >
          {submitting ? "Uploading…" : "Choose file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
