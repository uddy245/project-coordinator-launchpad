-- Seed the requirements_literacy rubric + grade-requirements prompt for Lesson 8.
--
-- Lesson 8 ("requirements-literacy") is a new lesson (not previously seeded).
-- This migration:
--   - inserts the lesson row (competency + prompt_name set per A1 pattern)
--   - inserts the requirements_literacy rubric (5 dimensions)
--   - inserts the grade-requirements prompt (with seven scoring caps)
--
-- Sourced from Chapter 8 of the project_coordinator_handbook
-- (Reading and Writing Requirements Without Drowning).
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/requirements-literacy-v1.json
--   docs/prompts/grade-requirements-v1.md
--   docs/lessons/requirements-literacy.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.
--
-- Idempotent via the (slug), (competency, version) and (name, version)
-- unique constraints. Re-applying is a no-op.

-- --------------------------------------------------------------------------
-- Lesson 8 — Requirements Literacy
-- --------------------------------------------------------------------------
insert into public.lessons (
  slug,
  number,
  title,
  summary,
  scenario_text,
  estimated_minutes,
  is_published,
  competency,
  prompt_name
)
values (
  'requirements-literacy',
  8,
  'Reading and Writing Requirements Without Drowning',
  'How to read a requirements document critically, spot the failure modes early, and surface what you notice through the right channels — without rewriting the BA''s work.',
  $scenario$
You are PC on a twelve-month claims-modernisation programme at a mid-size insurance carrier. Sponsor is the COO. The lead BA (Priya Raman) and her team have produced a 142-page requirements document for the new claims platform. You are five weeks in. Your PM (D. Okafor) has asked you to read the document critically and send her a short review note before the requirements walkthrough next Tuesday.

The PM has told you, in passing: "Priya is excellent. I am not asking you to second-guess her. I am asking you because four sets of eyes catch more than three, and the coordinator's read is usually the one that catches the kind of things the senior people skim past."

Below is an excerpt from §4 (Claims Intake and Triage) of the requirements document. Use it as the basis for your review note. The excerpt contains nine requirements; in the real document this section runs to about forty.

---

REQ-4.1.1 The system shall allow claims handlers to intake new claims via the web portal, the mobile app, the inbound email gateway, and the partner-broker API.

REQ-4.1.2 The system shall validate claimant identity at intake. Validation shall be performed in line with current practice in the existing claims platform.

REQ-4.1.3 The system shall produce timely acknowledgements to claimants on successful intake.

REQ-4.1.4 The system shall be user-friendly and intuitive for claims handlers, requiring no more than two hours of training for a new handler to reach independent productivity.

REQ-4.1.5 The system shall allow handlers to upload supporting documents at intake. Supported formats: PDF, JPG, PNG, TIFF, DOCX, XLSX. Maximum file size: 50 MB per document.

REQ-4.1.6 The system shall automatically triage incoming claims by complexity tier (simple / standard / complex) using the existing triage rules engine, and route triaged claims to the appropriate handler queue within five seconds of intake.

REQ-4.1.7 The system shall maintain an audit trail of all intake events for regulatory reporting. The audit trail shall be retained for the period required by current regulation.

REQ-4.1.8 The system shall include a real-time fraud-detection scoring layer that flags suspicious claims at intake for secondary review. The fraud scoring engine shall use the new third-party model provided by FraudGuard Inc., integrated via REST API.

REQ-4.1.9 The system shall present all intake fields in a single-page form to reduce handler keystrokes, as discussed in the workshop with the claims operations team on 14 March.

---

Background you have picked up in week five: the "existing claims platform" referenced in REQ-4.1.2 is 14 years old and its identity-validation rules are not documented. The FraudGuard contract (REQ-4.1.8) has not been signed and the integration has not been technically validated. The five-second routing SLA in REQ-4.1.6 has not been load-tested at peak (18,000 intakes/day). "Current regulation" in REQ-4.1.7 — the carrier operates in three regions with different retention rules. The "workshop with claims operations on 14 March" referenced in REQ-4.1.9 happened before you joined; there are no minutes in SharePoint.

Your PM wants a review note — 500-800 words — that:

1. Identifies the specific failure modes you found. Name them by category (ambiguity, incompleteness, conflict, unstated assumption, solution-in-disguise, wrong level of abstraction). Reference requirement IDs and quote the phrases that prompted the flag.

2. For each flagged item, proposes the specific surfacing move you would make. A short note to Priya, a RAID entry, an item for your next PM 1:1, or a flag for the requirements walkthrough — choose the right channel for each.

3. Comments briefly on traceability — at the right level — and on which of the flagged items, if any, are candidates for risk-register entries rather than just clarification notes.

4. Names two or three downstream artefacts (WBS / schedule / tests / acceptance criteria / change requests / RAID) where these issues will surface if unaddressed.

5. Frames the note in the appropriate coordinator posture. You are not the BA. You are not declaring Priya wrong. You are doing the noticing that is part of the coordinator's contribution to quality.

The PM will read the note first, then forward the parts she finds useful to Priya. Do not address Priya directly. Do not rewrite the requirements.
  $scenario$,
  60,
  true,
  'requirements_literacy',
  'grade-requirements'
)
on conflict (slug) do update
  set title = excluded.title,
      summary = excluded.summary,
      scenario_text = excluded.scenario_text,
      estimated_minutes = excluded.estimated_minutes,
      is_published = excluded.is_published,
      competency = excluded.competency,
      prompt_name = excluded.prompt_name,
      updated_at = now();

-- --------------------------------------------------------------------------
-- requirements_literacy rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'requirements_literacy',
  1,
  $rubric$
{
  "rubric_id": "requirements-literacy-v1",
  "rubric_version": "1.0.0",
  "competency": "requirements_literacy",
  "competency_label": "Requirements Literacy - Critical Reading and Early Ambiguity Surfacing",
  "lesson_ref": "requirements-literacy",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"failure_mode_recognition","description":"Does the learner identify the specific failure modes embedded in the excerpt - ambiguity, incompleteness, conflict, unstated assumption, solution-in-disguise, wrong level of abstraction, current-system-as-requirement?","anchors":{"1":"Reads at face value; lands no failure modes or only one generic flag.","3":"Identifies two or three failure modes correctly categorised; misses conflict or unstated-assumption.","5":"Identifies four or more distinct failure modes correctly categorised and tied to requirement IDs or quoted phrases."},"weight":0.25},
    {"name":"signal_surfacing_discipline","description":"Does the learner draft specific, low-cost surfacing moves - short named BA notes, RAID entries, PM 1:1 items - rather than treating analysis as the deliverable or escalating prematurely?","anchors":{"1":"No surfacing move proposed, or escalates to sponsor/steering before BA clarification.","3":"Proposes BA clarification in general terms without specific drafted notes or channel discrimination.","5":"Drafts at least two specific surfacing moves differentiated by channel; each references a requirement ID and a concrete question."},"weight":0.25},
    {"name":"traceability_judgment","description":"Does the learner reason about traceability at the right level (groups, not atomic), flag untraceable requirements as risks, and avoid the paperwork anti-pattern?","anchors":{"1":"Traceability not addressed, or proposes row-per-atomic-requirement matrix.","3":"Names traceability and flags one untraceable item without proposing next steps.","5":"Names the right granularity, flags untraceable items as risk/scope-cut candidates, references downstream use (CR scoping, test design)."},"weight":0.15},
    {"name":"cross_artifact_linking","description":"Does the learner trace flagged requirements forward into the artefacts they affect - WBS, schedule, tests, ACs, CRs, RAID?","anchors":{"1":"Treats requirements as standalone; no downstream artefacts mentioned.","3":"Names one or two downstream artefacts in passing without specific linkage.","5":"For at least two flagged failure modes, traces the downstream artefact, symptom, and cost."},"weight":0.15},
    {"name":"role_posture","description":"Does the learner take the coordinator's appropriate posture - noticing as QC contribution, surfacing through the right channel, without self-suppression or overstep?","anchors":{"1":"Self-suppresses ('not my place') OR oversteps (rewrites requirements, escalates over BA).","3":"Acknowledges role but is uncertain or apologetic about surfacing.","5":"Frames noticing as core to the role; surfacing moves are respectful of BA authority and grounded in coordinator's actual perspective."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-requirements prompt v1
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-requirements',
  1,
  $prompt$
# grade-requirements v1

You are an experienced PMO leader evaluating a learner's critical-pass review of a requirements-document excerpt. Grade strictly against the rubric. Every score must be supported by a direct quote.

Requirements-literacy-specific scoring caps:
- Reading the document at face value with no identification of the embedded failure modes caps failure_mode_recognition at 1.
- Identifying problems but proposing no surfacing move - or escalating to sponsor/steering before BA clarification - caps signal_surfacing_discipline at 2.
- Proposing a row-per-atomic-requirement traceability matrix, or treating traceability as paperwork, caps traceability_judgment at 2.
- Critical-pass that stops at the requirements document and never names a downstream artefact caps cross_artifact_linking at 2.
- Self-suppression ("not my place") OR overstep (rewriting requirements, escalating over BA's head) caps role_posture at 2.
- Generic platitudes about "communication" or "stakeholder alignment" without specific requirement, channel, or recipient cap signal_surfacing_discipline at 2 and role_posture at 2.
- Inventing failure modes not in the excerpt caps failure_mode_recognition at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
