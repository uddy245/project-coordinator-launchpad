import * as XLSX from "xlsx";
import type { ActionResult } from "@/lib/types";

export const MAX_EXTRACTED_CHARS = 20_000;

export const SUPPORTED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls (legacy)
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
] as const;

export type SupportedMime = (typeof SUPPORTED_MIME_TYPES)[number];

export function isSupportedMime(m: string): m is SupportedMime {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(m);
}

/**
 * Extract plain text from a submission buffer for the grading pipeline.
 * Returns ActionResult so callers never need to try/catch — parser
 * failures are data, not exceptions.
 *
 * Output is capped at MAX_EXTRACTED_CHARS to keep prompt length sane
 * (Claude can easily handle more, but our rubric context + rules +
 * tool schema take up meaningful tokens).
 */
export async function extractText(
  mimeType: string,
  buffer: Buffer
): Promise<ActionResult<{ text: string; truncated: boolean }>> {
  if (buffer.length === 0) {
    return { ok: true, data: { text: "", truncated: false } };
  }

  if (!isSupportedMime(mimeType)) {
    return {
      ok: false,
      error: `Unsupported file type: ${mimeType}`,
      code: "UNSUPPORTED_TYPE",
    };
  }

  try {
    let text = "";
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      text = extractFromXlsx(buffer);
    } else if (mimeType === "application/pdf") {
      text = await extractFromPdf(buffer);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      text = await extractFromDocx(buffer);
    }

    const truncated = text.length > MAX_EXTRACTED_CHARS;
    return {
      ok: true,
      data: {
        text: truncated ? text.slice(0, MAX_EXTRACTED_CHARS) : text,
        truncated,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return {
      ok: false,
      error: `Could not parse file: ${message}`,
      code: "PARSER_ERROR",
    };
  }
}

function extractFromXlsx(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const chunks: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    chunks.push(`### Sheet: ${sheetName}`);
    // sheet_to_csv gives a readable tab-separated approximation with
    // proper quoting. We use \t as the separator so row boundaries stay
    // visible to Claude and so commas inside cells don't become noise.
    chunks.push(XLSX.utils.sheet_to_csv(sheet, { FS: "\t", blankrows: false }));
  }
  return chunks.join("\n\n").trim();
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import: pdf-parse is CJS and its top-level does filesystem
  // reads that fail in some runtimes; loading it lazily keeps the
  // import graph clean for tests that don't touch PDFs.
  const mod = (await import("pdf-parse")) as unknown as {
    default: (b: Buffer) => Promise<{ text: string }>;
  };
  const result = await mod.default(buffer);
  return result.text?.trim() ?? "";
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")) as unknown as {
    extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
  };
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}
