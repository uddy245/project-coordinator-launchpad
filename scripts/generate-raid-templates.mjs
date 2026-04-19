/**
 * Generate the four RAID log workbook templates with consistent styling.
 * Run via: `node scripts/generate-raid-templates.mjs`
 *
 * Produces professional-looking XLSX files with:
 *  - Branded header row (frozen, filtered, bold)
 *  - Data validation dropdowns for Type / Likelihood / Impact / Status
 *  - Conditional color fills on Likelihood + Impact
 *  - Instructions sheet explaining column semantics
 *  - Borders and zebra striping on the data grid
 */

import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, "..", "public", "templates");

const COLUMNS = [
  { header: "ID", key: "id", width: 8 },
  { header: "Type", key: "type", width: 13 },
  { header: "Description", key: "description", width: 52 },
  { header: "Trigger", key: "trigger", width: 32 },
  { header: "Impact", key: "impact", width: 36 },
  { header: "Likelihood", key: "likelihood", width: 13 },
  { header: "Mitigation", key: "mitigation", width: 56 },
  { header: "Owner", key: "owner", width: 22 },
  { header: "Follow-up", key: "followUp", width: 14 },
  { header: "Status", key: "status", width: 13 },
];

const TYPES = ["Risk", "Issue", "Assumption", "Dependency"];
const LIKELIHOOD = ["Low", "Medium", "High"];
const STATUS = ["Open", "In progress", "Mitigated", "Closed"];

// Visual language — dark slate header, zebra rows, subtle borders
const HEADER_FILL = "FF0F172A"; // slate-900
const HEADER_TEXT = "FFFFFFFF";
const ZEBRA_FILL = "FFF8FAFC"; // slate-50
const BORDER = { style: "thin", color: { argb: "FFE2E8F0" } }; // slate-200

const LIKELIHOOD_FILL = {
  Low: "FFDCFCE7", // green-100
  Medium: "FFFEF3C7", // amber-100
  High: "FFFEE2E2", // red-100
};

async function buildWorkbook({ title, intro, rows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Project Coordinator Launchpad";
  wb.created = new Date();

  // ---------- RAID log sheet ----------
  const sheet = wb.addWorksheet("RAID log", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
  });
  sheet.columns = COLUMNS;

  // Header styling
  const header = sheet.getRow(1);
  header.height = 24;
  header.values = COLUMNS.map((c) => c.header);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };
  });

  // Data rows
  rows.forEach((row, idx) => {
    const added = sheet.addRow(row);
    added.height = 42;
    added.alignment = { vertical: "top", wrapText: true };

    // Zebra striping
    if (idx % 2 === 0) {
      added.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA_FILL },
        };
      });
    }

    // Borders on every cell
    added.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };
    });

    // Likelihood color fill overrides zebra
    const likelihoodCell = added.getCell("likelihood");
    const likelihoodVal = likelihoodCell.value;
    if (typeof likelihoodVal === "string" && LIKELIHOOD_FILL[likelihoodVal]) {
      likelihoodCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: LIKELIHOOD_FILL[likelihoodVal] },
      };
      likelihoodCell.font = { bold: true };
    }
  });

  // Pad to 20 rows with validation-ready empty rows so the learner can
  // keep adding items without re-applying the data validation.
  const targetRows = Math.max(rows.length + 5, 20);
  for (let r = rows.length + 2; r <= targetRows + 1; r++) {
    const row = sheet.getRow(r);
    row.height = 36;
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: BORDER,
        left: BORDER,
        right: BORDER,
        bottom: BORDER,
      };
    });
  }

  // Data validations on column B (Type), F (Likelihood), J (Status)
  // Covers the first 100 data rows — enough for any realistic log.
  const lastRow = 100;

  for (let r = 2; r <= lastRow; r++) {
    sheet.getCell(`B${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${TYPES.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Invalid type",
      error: "Choose one of: Risk, Issue, Assumption, Dependency.",
    };
    sheet.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${LIKELIHOOD.join(",")}"`],
    };
    sheet.getCell(`J${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${STATUS.join(",")}"`],
    };
    sheet.getCell(`I${r}`).numFmt = "yyyy-mm-dd";
  }

  // Auto-filter on header
  sheet.autoFilter = { from: "A1", to: "J1" };

  // ---------- Instructions sheet ----------
  const info = wb.addWorksheet("Instructions");
  info.columns = [
    { header: "Field", key: "field", width: 20 },
    { header: "What goes here", key: "what", width: 90 },
  ];
  const infoHeader = info.getRow(1);
  infoHeader.height = 24;
  infoHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle" };
    cell.border = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };
  });

  const guidance = [
    [
      "ID",
      "R-001, I-001, A-001, D-001... Use the letter prefix to make the Type obvious even in a quick scan.",
    ],
    [
      "Type",
      "One of: Risk (might happen), Issue (already happened), Assumption (taken for granted), Dependency (external blocker).",
    ],
    [
      "Description",
      "What specifically could go wrong or has gone wrong. One sentence. Use project-specific nouns — 'the vendor API', not 'the integration'.",
    ],
    [
      "Trigger",
      "The observable event that would move this from theoretical to real. 'Vendor announces deprecation date', 'Sprint 3 ends without sign-off', etc.",
    ],
    [
      "Impact",
      "What concretely breaks or slips if this risk fires. Quantify when possible — days, dollars, SLAs.",
    ],
    ["Likelihood", "Low / Medium / High. Keep it simple; probability maths isn't the point."],
    [
      "Mitigation",
      "The actual action being taken — not 'monitor'. 'Backfill lead engineer from contractor pool', 'Draft v2 migration plan by Sprint 4', etc.",
    ],
    ["Owner", "Named role (Tech Lead) or named person (Jordan). Never blank."],
    ["Follow-up", "Date you'll check this item again. Every open item has one."],
    [
      "Status",
      "Open → In progress → Mitigated → Closed. A RAID log is a living artifact; update status weekly.",
    ],
  ];

  guidance.forEach((row, idx) => {
    const r = info.addRow(row);
    r.alignment = { vertical: "top", wrapText: true };
    r.height = 42;
    if (idx % 2 === 0) {
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA_FILL },
        };
      });
    }
    r.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };
    });
  });

  // Header note row on the RAID sheet explaining what this file is
  // (sheet name + a tooltip via a frozen "intro" feels more pro than a comment).
  // We set this through a worksheet-level comment / properties instead.
  sheet.pageSetup = { orientation: "landscape", fitToPage: true };
  sheet.headerFooter = {
    oddHeader: `&L&B${title}&R${intro}`,
    oddFooter: "&L&Iproject-coordinator-launchpad",
  };

  return wb;
}

// ---------- Content for the four templates ----------

const STARTER_ROWS = [
  { id: "R-001", type: "Risk", status: "Open" },
  { id: "R-002", type: "Risk", status: "Open" },
  { id: "I-001", type: "Issue", status: "Open" },
  { id: "A-001", type: "Assumption", status: "Open" },
  { id: "D-001", type: "Dependency", status: "Open" },
];

const NOVICE_ROWS = [
  {
    id: "R-001",
    type: "Risk",
    description: "Might miss deadline",
    impact: "Bad",
    likelihood: "Medium",
    mitigation: "Watch closely",
    status: "Open",
  },
  {
    id: "R-002",
    type: "Risk",
    description: "Vendor issues",
    mitigation: "Monitor",
    status: "Open",
  },
  {
    id: "I-001",
    type: "Issue",
    description: "Scope changed",
    mitigation: "Talk to PM",
    status: "Open",
  },
];

const INTERMEDIATE_ROWS = [
  {
    id: "R-001",
    type: "Risk",
    description: "Lead engineer on paternity leave for 4 weeks",
    trigger: "Start of leave period",
    impact: "Schedule slip on v2 endpoint",
    likelihood: "High",
    mitigation: "Backfill from contractor pool",
    owner: "Tech Lead",
    followUp: new Date("2026-05-10"),
    status: "Open",
  },
  {
    id: "R-002",
    type: "Risk",
    description: "Vendor deprecating API in 90 days",
    trigger: "Deprecation date",
    impact: "Integration breaks",
    likelihood: "Medium",
    mitigation: "Begin v2 migration plan",
    owner: "Integration Architect",
    followUp: new Date("2026-06-15"),
    status: "Open",
  },
  {
    id: "I-001",
    type: "Issue",
    description: "Scope creep: 3 new endpoints since kickoff",
    trigger: "Sprint 2 review",
    impact: "Timeline slip",
    likelihood: "High",
    mitigation: "Re-baseline with PM",
    owner: "Project Coordinator",
    followUp: new Date("2026-05-01"),
    status: "Open",
  },
  {
    id: "A-001",
    type: "Assumption",
    description: "Pilot clinic volume reflects full rollout",
    trigger: "Go-live",
    impact: "Performance risk",
    likelihood: "Medium",
    mitigation: "Validate with load test",
    owner: "QA Lead",
    followUp: new Date("2026-05-20"),
    status: "Open",
  },
  {
    id: "D-001",
    type: "Dependency",
    description: "Vendor sign-off on integration contract",
    trigger: "Before expansion",
    impact: "Blocks Clinic 2 go-live",
    likelihood: "High",
    mitigation: "Escalate via vendor PM",
    owner: "Product Owner",
    followUp: new Date("2026-05-05"),
    status: "Open",
  },
];

const HIRE_READY_ROWS = [
  {
    id: "R-001",
    type: "Risk",
    description: "Lead engineer on 4-week paternity leave starting Monday",
    trigger: "Leave begins; PRs queue in code review",
    impact: "Schedule slip of 2–3 weeks on integration endpoint v2",
    likelihood: "High",
    mitigation:
      "Pre-assign review alternates (Sam, Priya); defer non-critical PRs; daily standup tracking of unblocked work",
    owner: "Tech Lead (Jordan)",
    followUp: new Date("2026-05-10"),
    status: "Mitigated",
  },
  {
    id: "R-002",
    type: "Risk",
    description: "Vendor deprecating /orders v1 API in 90 days",
    trigger: "Deprecation notice received",
    impact: "All three new integrations break unless migrated",
    likelihood: "Medium",
    mitigation:
      "Draft v2 migration ADR this sprint; target first endpoint migrated by 2026-06-01; QA against staging vendor instance",
    owner: "Integration Architect (Kai)",
    followUp: new Date("2026-06-15"),
    status: "Open",
  },
  {
    id: "R-003",
    type: "Risk",
    description: "Product owner proposing expansion to 2 more clinics before stabilization",
    trigger: "Next steering committee",
    impact: "Defect debt entering production; stabilization gate missed",
    likelihood: "Medium",
    mitigation:
      "Prepare decision memo with defect rate and SLA breach data; recommend delaying expansion until 95th-percentile ticket age < 7 days",
    owner: "Project Coordinator",
    followUp: new Date("2026-04-28"),
    status: "Open",
  },
  {
    id: "I-001",
    type: "Issue",
    description: "3 new integration endpoints added since kickoff without change requests",
    trigger: "Retrospective audit",
    impact: "Effort over-commitment; timeline slip already realized",
    likelihood: "High",
    mitigation: "Retroactively log as CRs; propose change-control policy at steering",
    owner: "Project Coordinator",
    followUp: new Date("2026-04-25"),
    status: "Open",
  },
  {
    id: "I-002",
    type: "Issue",
    description: "Pilot clinic throughput 30% below projection",
    trigger: "Go-live + 14 days",
    impact: "Forecasted expansion may be unsustainable at current headcount",
    likelihood: "High",
    mitigation: "Root-cause review with clinical ops lead; expected complete 2026-05-08",
    owner: "Clinical Ops Lead (Maria)",
    followUp: new Date("2026-05-08"),
    status: "In progress",
  },
  {
    id: "A-001",
    type: "Assumption",
    description: "Vendor supports parallel v1/v2 during migration window",
    trigger: "Migration planning",
    impact: "If false, blocks the migration plan",
    likelihood: "Medium",
    mitigation: "Written confirmation requested from vendor account manager",
    owner: "Vendor PM",
    followUp: new Date("2026-04-30"),
    status: "Open",
  },
  {
    id: "A-002",
    type: "Assumption",
    description: "Pilot clinic staff training covers new workflows",
    trigger: "Go-live + 30 days check-in",
    impact: "If false, user errors and rework spike",
    likelihood: "Low",
    mitigation: "Survey clinic staff end of week; re-training if <80% comfort",
    owner: "Training Lead",
    followUp: new Date("2026-05-03"),
    status: "Open",
  },
  {
    id: "D-001",
    type: "Dependency",
    description: "Vendor sign-off on expansion contract before Clinic #2 and #3",
    trigger: "Contract execution",
    impact: "Blocks expansion start",
    likelihood: "High",
    mitigation: "Escalated 2026-04-15; legal review in progress",
    owner: "Product Owner",
    followUp: new Date("2026-05-05"),
    status: "In progress",
  },
  {
    id: "D-002",
    type: "Dependency",
    description: "InfoSec review of v2 API data flows",
    trigger: "v2 migration",
    impact: "Blocks production deploy of v2",
    likelihood: "Medium",
    mitigation: "Security review package submitted 2026-04-20; 2-week SLA",
    owner: "Security Architect",
    followUp: new Date("2026-05-04"),
    status: "Open",
  },
];

// ---------- Write all four ----------

async function main() {
  const specs = [
    {
      filename: "raid_log_starter.xlsx",
      title: "RAID log — starter",
      intro: "Fill me in. One row per item.",
      rows: STARTER_ROWS,
    },
    {
      filename: "raid_log_novice_example.xlsx",
      title: "RAID log — novice example",
      intro: "Intentionally weak. Find what's missing.",
      rows: NOVICE_ROWS,
    },
    {
      filename: "raid_log_intermediate_example.xlsx",
      title: "RAID log — intermediate example",
      intro: "Most fields filled; mitigations still a bit soft.",
      rows: INTERMEDIATE_ROWS,
    },
    {
      filename: "raid_log_hire_ready_example.xlsx",
      title: "RAID log — hire-ready example",
      intro: "Steering-committee-grade. Specific, owned, dated.",
      rows: HIRE_READY_ROWS,
    },
  ];

  for (const spec of specs) {
    const wb = await buildWorkbook(spec);
    const out = resolve(OUT, spec.filename);
    await wb.xlsx.writeFile(out);
    console.log("wrote", out);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
