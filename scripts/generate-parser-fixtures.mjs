/**
 * Generate deterministic fixtures for tests/unit/parsers.test.ts.
 * Run via: node scripts/generate-parser-fixtures.mjs
 *
 * Commits a reproducible XLSX + DOCX. A tiny hand-authored PDF is kept
 * directly in tests/fixtures/sample.pdf (see the test file for its
 * expected contents).
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, "..", "tests", "fixtures");

// ---------- XLSX: 2-row RAID sample ----------
async function writeXlsx() {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("RAID log");
  sheet.addRow(["ID", "Type", "Description", "Owner"]);
  sheet.addRow(["R-001", "Risk", "Vendor deprecation", "Integration Architect"]);
  sheet.addRow(["I-001", "Issue", "Scope creep", "Project Coordinator"]);
  const path = resolve(OUT, "sample.xlsx");
  await wb.xlsx.writeFile(path);
  console.log("wrote", path);
}

// ---------- DOCX: hand-authored minimal file ----------
// DOCX is a zip — we use a known-good file mammoth can parse.
// Build one with ExcelJS's own zip? No — easier: use mammoth's companion
// writer isn't available, so we use a simple approach: build the zip
// manually with jszip (transitively available via exceljs).
async function writeDocx() {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Risk: vendor API could return stale data under load.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Mitigation: add cache + contract tests.</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const path = resolve(OUT, "sample.docx");
  writeFileSync(path, buf);
  console.log("wrote", path);
}

async function writePdf() {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument();
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((res) => doc.on("end", res));
  doc.fontSize(12).text("Risk: vendor API could return stale data under load.");
  doc.moveDown();
  doc.text("Mitigation: add cache + contract tests.");
  doc.end();
  await done;
  const path = resolve(OUT, "sample.pdf");
  writeFileSync(path, Buffer.concat(chunks));
  console.log("wrote", path);
}

await writeXlsx();
await writeDocx();
await writePdf();
