# GRADE-004: XLSX / PDF / DOCX text extraction

**Milestone:** M4 Grading
**Dependencies:** GRADE-003
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

Given a submission file from Supabase Storage, extract plain text suitable for feeding into the grading prompt. Node-side (Next.js server action or background worker) — Deno port deferred until we move grading to an Edge Function (GRADE-006 decision pending).

Libraries already in deps:
- `xlsx` (community edition, enough for reading) — XLSX → sheet-name-prefixed tab-separated rows
- `pdf-parse` — PDF → string
- `mammoth` — DOCX → string

## Files to create

- `src/lib/grading/parsers.ts` — `extractText(mimeType, buffer): Promise<string>`
- `tests/fixtures/` — small sample XLSX / PDF / DOCX files with known content
- `tests/unit/parsers.test.ts`

## Acceptance criteria

- [ ] XLSX with a multi-row RAID log extracts as readable text — column headers included, rows tab-separated
- [ ] PDF extracts as plain text in document order
- [ ] DOCX extracts as plain text
- [ ] Empty file returns empty string, does not crash
- [ ] Corrupted / password-protected file returns a clear `PARSER_ERROR` code
- [ ] Total output capped at ~20k characters (protects prompt length)

## Tests required

- [ ] Unit: one test per format asserting expected substring in output

## Definition of done

- [ ] Acceptance criteria checked
- [ ] Fixtures committed
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] PR merged
