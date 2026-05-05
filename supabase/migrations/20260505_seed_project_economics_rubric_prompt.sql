-- Seed project_economics rubric + grade-variables prompt for Lesson 7.
-- Sourced from Chapter 7 (Scope, Schedule, Cost, Quality, Risk).
-- Idempotent.

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'project_economics',
  1,
  $rubric$
{
  "rubric_id": "project-economics-v1",
  "rubric_version": "1.0.0",
  "competency": "project_economics",
  "competency_label": "Project Economics - Five-Variable Trade-off Awareness",
  "lesson_ref": "variables",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"five_variable_completeness","description":"Does the analysis cover all five variables - scope, schedule, cost, quality, risk - rather than just the visible three?","anchors":{"1":"Covers only scope/schedule/cost.","3":"Covers four of five with one shallow.","5":"All five explicitly named with state assessed."},"weight":0.20},
    {"name":"silent_cut_detection","description":"Does the learner identify where pressure is being absorbed silently (usually quality or risk)?","anchors":{"1":"Treats reported metrics at face value.","3":"Notices one cut without tracing to a variable.","5":"Names specific silent cuts with quoted evidence and quantified long-term cost."},"weight":0.25},
    {"name":"scope_disambiguation","description":"Does the learner distinguish product scope vs project scope vs scope-in-the-sponsor's-head?","anchors":{"1":"Uses scope as a single concept.","3":"Distinguishes two of three.","5":"Names all three when relevant; catches sponsor-mental-model drift."},"weight":0.15},
    {"name":"trade_off_visibility","description":"Does the status narrative make implicit trade-offs explicit?","anchors":{"1":"RAG summaries with no trade-off explicitness.","3":"Names one trade-off explicitly.","5":"Each pressure followed by absorption + trade-off cost."},"weight":0.20},
    {"name":"long_term_cost_tracking","description":"Does the learner connect short-term choices to long-term cost?","anchors":{"1":"No connection.","3":"Names long-term cost in passing.","5":"For each absorption, names likely long-term cost with rough magnitude."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-variables',
  1,
  $prompt$
# grade-variables v1

You are an experienced PMO leader evaluating a learner's status-narrative + variable-trade analysis. Grade strictly against the rubric. Every score must be supported by a direct quote.

Variables-specific scoring caps:
- Status narrative covering only scope/schedule/cost (no quality variable, no risk-as-variable) caps five_variable_completeness at 2.
- Phrases like "we will maintain quality" or "quality remains high" without metric or evidence cap silent_cut_detection at 2.
- Treating "scope" as a single undifferentiated word caps scope_disambiguation at 2.
- Status narrative naming pressures without naming the absorption variable caps trade_off_visibility at 2.
- No connection between current absorption choices and downstream cost caps long_term_cost_tracking at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;

update public.lessons
set scenario_text = $scenario$
You are PC on a customer-loyalty platform programme at a 900-store retail group. Twelve-month plan. Eight months in. Sponsor (CMO) said in kickoff: "the launch date is non-negotiable, the budget is fixed, the scope is what we agreed."

Three pressures over six weeks, all absorbed silently:
1. POS integration is harder than scoped (4-6 weeks extra). Team is absorbing through unbilled overtime (240 hours).
2. Compliance flagged a data-residency issue. Architect made changes without a change request.
3. Authentication framework licensing problem. Team accepted a less-secure fallback. Security lead flagged in private but not in RAID.

Reported status: schedule green, budget green, scope green, quality "on track". Sponsor pleased.

Behind the status: test coverage compressed 85% to 62%, schedule contingency consumed silently, sponsor's mental model includes morale + board narrative not in scope, non-core POS quietly deferred to phase 2.

Draft a 600-1000 word status narrative covering all five variables. Surface silent cuts with quoted evidence. Distinguish documented vs in-practice vs sponsor's-head scope. Make every implicit trade-off explicit. Connect current absorption to long-term cost. Tell the truth. Do not editorialise about the kickoff stance. Do not propose to fix governance.
$scenario$
where slug = 'variables'
  and (scenario_text is null or scenario_text = '');
