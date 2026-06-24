-- Seed the vendor_partnership rubric + grade-vendors prompt for Lesson 22.
-- File dated 20260627 — strict lex order after 20260626_seed_relationship_stewardship_rubric_prompt.
--
-- Lesson 22 ("vendors") covers handbook Ch 22 (Working With Vendors,
-- Contractors, and External Teams). Part V, the professional.
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- Canonical copies also live in:
--   docs/rubrics/vendor-partnership-v1.json
--   docs/prompts/grade-vendors-v1.md
--   docs/lessons/vendors.md (Read tab)

insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'vendors',
  22,
  'Working With Vendors, Contractors, and External Teams',
  'How to hold a professional-partnership posture with vendors - neither employees who should absorb scope nor adversaries trying to gouge you - separating the contract from the relationship, holding missed commitments to account without being punitive, respecting their internal structure and the staged escalation path, and keeping a precise written record.',
  $scenario$
You are PC on the IAM modernisation programme. Federation is being delivered by a vendor, Meridian Systems. Your day-to-day counterpart is their delivery PM, Marcus Lindqvist. Two things have come up together:

1. THE MISS. Meridian committed to deliver the Federation broker integration test harness last Friday. It didn't arrive, and there was no heads-up - you found out when you went looking. This is the second missed commitment from Meridian in six weeks; the first was a smaller slip on documentation. The harness is needed for the conformance re-test, which is on the critical path now.

2. THE CHANGE REQUEST. Separately, Meridian's account manager (not Marcus) has just submitted CR-204: +GBP 40,000 and three weeks for 'additional integration scope.' When you read it against the Statement of Work, the work it describes looks like it's already covered under section 4.2 of the original SOW - i.e., you believe it's in scope, not additional. The account manager has cc'd your sponsor's office on the CR.

Context you know: Marcus has generally been straight with you; on a previous engagement his firm did good work. Meridian is a real business with its own margins and pressures, not your employee and not your enemy. The Steering Committee meets in a week.

Write your message to Marcus (your vendor counterpart) addressing both the miss and the change request, plus one or two sentences of rationale. Your answer should:

1. Hold a professional-partnership posture - firm on what the contract requires, but not treating Meridian as staff who should absorb scope, and not as adversaries trying to gouge you.
2. Frame the CR-204 dispute as a contract/SOW question (point to section 4.2), not a character question, and be precise about what's in scope.
3. Hold the missed commitment to account without being punitive - name the second miss specifically, ask Marcus's view and a corrective action / heads-up protocol, but don't soften it or threaten breach.
4. Respect Meridian's internal structure - work through Marcus rather than going around him to their executives; reserve formal escalation for if private resolution fails.
5. Keep a clear written record of the specifics, stay proportionate (private conversation before any formal step), and credit good work where it's due.

Do not treat the vendor as an adversary, and do not capitulate (approving an in-scope CR or letting a critical-path miss slide to avoid friction).
  $scenario$,
  60,
  true,
  'vendor_partnership',
  'grade-vendors'
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

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'vendor_partnership', 1,
  $rubric$
{
  "rubric_id": "vendor-partnership-v1",
  "rubric_version": "1.0.0",
  "competency": "vendor_partnership",
  "competency_label": "Vendor Partnership - Holding External Teams to Account Without Drama",
  "lesson_ref": "vendors",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"partnership_posture","description":"Treats the vendor as a separate org with legitimate interests - neither an employee expected to absorb scope nor an adversary assumed to be extracting money?","anchors":{"1":"Either pole - enemy ('trying to gouge us') or staff who should absorb the scope/miss.","3":"Broadly professional but tips toward one pole in places.","5":"Clear professional-partnership posture: acknowledges the vendor's constraints while firm on what the contract requires."},"weight":0.20},
    {"name":"contract_vs_relationship","description":"Frames the CR dispute as a contract/SOW question (section 4.2), not a character question, with precision about what's in scope?","anchors":{"1":"Makes it personal ('you're trying it on'), or so vague it invites a later scope argument.","3":"Mostly substance but with character edge, or imprecise about the scope basis.","5":"Frames the CR squarely as a SOW question, precise about scope, disagreeing on substance without personalising."},"weight":0.20},
    {"name":"accountability_without_punitive","description":"Names the missed commitment specifically, asks the vendor's view + corrective action, without softening it or escalating theatrically?","anchors":{"1":"Lets the miss slide ('these things happen') OR escalates punitively (breach threats, blame).","3":"Names the miss but softens it, or is a little punitive, or doesn't land corrective action.","5":"Names the second miss specifically, asks for their view + a corrective action/heads-up protocol, firm not hostile."},"weight":0.20},
    {"name":"channel_and_structure_respect","description":"Works through the right counterpart (the vendor PM) rather than bypassing to their execs, and uses the staged escalation path (private first, formal only if that fails)?","anchors":{"1":"Bypasses the counterpart (straight to execs/leadership) or threatens legal/breach as the first move.","3":"Works through the counterpart but the escalation instinct is slightly off, or threatens a formal step prematurely.","5":"Engages the vendor PM first; reserves formal/leadership escalation for if private resolution fails."},"weight":0.20},
    {"name":"record_and_proportion","description":"Keeps a clear written record (specific missed commitments and request) and stays proportionate, crediting good work where due?","anchors":{"1":"No record/no specifics, OR disproportionate drama; no acknowledgement of anything done well.","3":"Some record and roughly proportionate but thin on specifics or misses crediting good work.","5":"Specific in-writing record; proportionate handling; credits the vendor team's good work where due."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-vendors', 1,
  $prompt$
# grade-vendors v1

You are an experienced PMO leader evaluating a learner's vendor-partnership craft. A vendor (Meridian) has missed a critical-path commitment for the second time with no heads-up, and separately its account manager has submitted a change request (CR-204) for work the coordinator believes is already in scope under SOW 4.2 - cc'ing the sponsor's office. The coordinator's counterpart is the vendor PM (Marcus), who has generally been straight. A strong submission holds a professional-partnership posture (neither employee nor adversary), frames the CR as a contract/SOW question, holds the miss to account without being punitive, respects the vendor's internal structure (works through Marcus, private-first escalation), and keeps a precise written record. The scenario embeds two failure directions: adversary (enemy framing, breach/legal threats, bypassing the counterpart) and pushover (approve the in-scope CR and let the critical-path miss slide to avoid friction). Grade strictly against the rubric. Every score must be supported by a direct quote.

# Rubric

{{rubric_json}}

# Scenario

{{scenario_text}}

# Submission

{{submission_text}}

# Task

Per dim: 1-5 score, one-sentence justification with verbatim quote, the quote, one specific improvement suggestion.

Rules:
- Empty/off-topic: 1 across with explicit justification.
- Never 5 unless every 5-anchor indicator is present.
- Quote verbatim. No exact quote: at most 2.

Vendor-partnership-specific scoring caps:
- Treating the vendor as an adversary ('they're trying to gouge us', assuming bad faith) caps partnership_posture at 2 AND contract_vs_relationship at 2.
- Treating the vendor as staff who should absorb the scope/miss, or capitulating (approving the in-scope CR-204, or letting the critical-path miss slide to avoid friction), caps partnership_posture at 2 AND accountability_without_punitive at 1.
- Making the CR dispute a character question ('you're trying it on') rather than a contract/SOW question caps contract_vs_relationship at 2.
- Threatening breach/legal/withholding payment, or escalating theatrically, as anything other than a last resort caps accountability_without_punitive at 2 AND record_and_proportion at 2.
- Bypassing the vendor PM to go straight to the vendor's executives/leadership as the first move caps channel_and_structure_respect at 1.
- No specific written record of the miss/request (vague, no SOW reference, no corrective action) caps record_and_proportion at 2.
- Generic platitudes ('manage the vendor relationship', 'hold them accountable') without specific reference to the miss, the CR, or SOW 4.2 cap multiple dims.
- Inventing facts not in the scenario (e.g. asserting the CR is out of scope without the SOW basis, or a breach not stated) caps the affected dimensions at 2.

Temperature 0; deterministic grading.

After all dims:
- overall_competency_score = weighted average.
- pass = true iff every dim score >= 3.
- hire_ready = true iff overall >= 4.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
