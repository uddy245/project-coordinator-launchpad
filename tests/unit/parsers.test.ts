import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractText, isSupportedMime, MAX_EXTRACTED_CHARS } from "@/lib/grading/parsers";

const FIXTURES = resolve(__dirname, "..", "fixtures");
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

describe("isSupportedMime", () => {
  it("accepts the three core office formats", () => {
    expect(isSupportedMime(XLSX_MIME)).toBe(true);
    expect(isSupportedMime(DOCX_MIME)).toBe(true);
    expect(isSupportedMime(PDF_MIME)).toBe(true);
  });
  it("rejects images and text", () => {
    expect(isSupportedMime("image/png")).toBe(false);
    expect(isSupportedMime("text/plain")).toBe(false);
  });
});

describe("extractText", () => {
  it("extracts readable text from an XLSX", async () => {
    const buf = readFileSync(resolve(FIXTURES, "sample.xlsx"));
    const result = await extractText(XLSX_MIME, buf);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Sheet header marker present
    expect(result.data.text).toMatch(/RAID log/);
    // Actual data rows flowed through
    expect(result.data.text).toMatch(/R-001/);
    expect(result.data.text).toMatch(/Vendor deprecation/);
    expect(result.data.truncated).toBe(false);
  });

  it("extracts plain text from a DOCX", async () => {
    const buf = readFileSync(resolve(FIXTURES, "sample.docx"));
    const result = await extractText(DOCX_MIME, buf);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.text).toMatch(/vendor API could return stale data/);
    expect(result.data.text).toMatch(/cache \+ contract tests/);
  });

  it("extracts text from a PDF", async () => {
    const buf = readFileSync(resolve(FIXTURES, "sample.pdf"));
    const result = await extractText(PDF_MIME, buf);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.text).toMatch(/vendor API could return stale data/);
  });

  it("returns empty text without crashing on empty buffer", async () => {
    const result = await extractText(XLSX_MIME, Buffer.alloc(0));
    expect(result).toEqual({ ok: true, data: { text: "", truncated: false } });
  });

  it("returns UNSUPPORTED_TYPE for a non-allowed MIME", async () => {
    const result = await extractText("image/png", Buffer.from("fake"));
    expect(result).toMatchObject({ ok: false, code: "UNSUPPORTED_TYPE" });
  });

  it("returns PARSER_ERROR on a buffer that parsers cannot read", async () => {
    // A truncated zip that both DOCX and XLSX parsers treat as malformed.
    const result = await extractText(DOCX_MIME, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(result).toMatchObject({ ok: false, code: "PARSER_ERROR" });
  });

  it("truncates output longer than MAX_EXTRACTED_CHARS", async () => {
    // Build a pathologically long docx-like text via the docx parser path.
    // Easier: call the public cap directly by forging a fake mime that
    // maps to XLSX but with a generated oversized workbook.
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.default.Workbook();
    const sheet = wb.addWorksheet("big");
    const padding = "x".repeat(100);
    for (let i = 0; i < 250; i++) {
      sheet.addRow([`row-${i}`, padding, padding, padding]);
    }
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const result = await extractText(XLSX_MIME, Buffer.from(buf));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.text.length).toBeLessThanOrEqual(MAX_EXTRACTED_CHARS);
    expect(result.data.truncated).toBe(true);
  });
});
