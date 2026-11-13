-- ==========================================================================
-- Migration: 20261111_01_pushback_judgment_v2.sql
-- Target: Neon pc-launchpad. Review, run on a branch first, then production.
--
-- Lesson 17 (push-back): make the assessment match the lesson.
--
-- The reading and script teach "accept the overrule on judgement calls, never
-- knowingly send something false". The graded scenario still told learners
-- "if she still says send, you send", and rubric/prompt v1 rewarded that.
--
--   1. lessons.scenario_text / summary for 'push-back': task item 3 reworded.
--   2. rubrics: pushback_judgment v2 inserted and made current (v1 kept).
--   3. prompts: grade-pushback v2 inserted and made current (v1 kept).
--   4. workbook_assignments: the lesson's default brief (what learners read in
--      the Workbook tab) is set to the same scenario the grader receives.
--
-- Repo copies (source of truth): docs/rubrics/pushback-judgment-v2.json,
-- docs/prompts/grade-pushback-v2.md, tests/fixtures/pushback_judgment/scenario.txt.
-- prompts.body is the v2 system prompt + the full user template, WITH the
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
--
-- Idempotent. Raises (and applies nothing) if the live push-back scenario is
-- neither the v1 seed text nor this migration's v2 text. Roll back by flipping
-- is_current back to version 1 on both tables and restoring item 3 of the
-- scenario.
-- ==========================================================================

begin;

-- 1. Scenario (item 3 only) and summary -----------------------------------
-- Overwrites the scenario only when it is still the text this migration was
-- written against (the v1 seed in
-- supabase/migrations/20260620_seed_pushback_judgment_rubric_prompt.sql) or
-- this migration's own output (a re-apply). An empty scenario is filled.
-- Any other text means the live lesson was edited since: raise, which aborts
-- the whole transaction, rather than silently replace that edit.
do $step1$
declare
  v1_text constant text := $v1$
You are PC on the eleven-month IAM modernisation programme (healthcare provider, CISO sponsor, Q4 go-live). It is 4:30 p.m. The board meets tomorrow morning; the CISO's office is closing the board pre-read at 6 p.m. tonight.

Yesterday your PM, R. Adekanmi, drafted the 'Q4 Go-Live Readiness Summary' — a one-pager stating Federation is 'on track for conditional go-live, pending final conformance'. Accurate as of yesterday.

Two things landed this morning that R. may not have seen (she has been in steering prep all day): (1) the Federation broker token-exchange conformance results came in — FAIL, the exact gate 'conditional go-live' was pending on; Vantage's fix ETA is 'early next week', unconfirmed. (2) Federation is the single largest go-live risk, and tomorrow's pre-read is what the board will use to confirm or hold the Q4 date.

At 4:30 R. Slacks you, between meetings: 'PC — send the readiness summary to the CISO's chief of staff now, they're closing the board pack at 6. Thanks.' The summary she means is yesterday's draft — the one that says Federation is on track. If it goes in unchanged, the board confirms Q4 believing the last gate is essentially clear, when this morning it failed — a decision that is embarrassing and costly to unwind (formal correction, credibility damage).

You could just send it (blameless in the narrowest sense), bury a one-line 'fyi conformance failed', or over-rotate — refuse, or rewrite the summary RED and send your own version to the chief of staff. R. is rushing and may not know this morning's result. The pack closes in ~90 minutes.

Your reply to R. — 400-700 words — should:

1. Decide whether this warrants pushing back using the four conditions (material stakes / you have info R. may not / costly to reverse if wrong / R. deciding under time pressure or incomplete information). Distinguish pushing back from merely disagreeing.
2. Draft the push-back message to R.: concern stated specifically and briefly, consequence made concrete, a specific alternative offered.
3. Make clear you accept R.'s authority to overrule — if, knowing this, she still says send, you send, without relitigating.
4. Choose your medium (written vs verbal) and justify it given the board-level stakes and the 90-minute clock.
5. Keep the tone respectful, not accusing; route any scope/role question through R.; do not substitute your judgment for hers.

Do not send anything to the CISO's chief of staff yourself, and do not rewrite-and-send your own version. The decision and the deliverable are R.'s — equip her to make the call in the next 90 minutes.
  $v1$;
  v2_text constant text := $v2$
You are PC on the eleven-month IAM modernisation programme (healthcare provider, CISO sponsor, Q4 go-live). It is 4:30 p.m. The board meets tomorrow morning; the CISO's office is closing the board pre-read at 6 p.m. tonight.

Yesterday your PM, R. Adekanmi, drafted the 'Q4 Go-Live Readiness Summary' — a one-pager stating Federation is 'on track for conditional go-live, pending final conformance'. Accurate as of yesterday.

Two things landed this morning that R. may not have seen (she has been in steering prep all day): (1) the Federation broker token-exchange conformance results came in — FAIL, the exact gate 'conditional go-live' was pending on; Vantage's fix ETA is 'early next week', unconfirmed. (2) Federation is the single largest go-live risk, and tomorrow's pre-read is what the board will use to confirm or hold the Q4 date.

At 4:30 R. Slacks you, between meetings: 'PC — send the readiness summary to the CISO's chief of staff now, they're closing the board pack at 6. Thanks.' The summary she means is yesterday's draft — the one that says Federation is on track. If it goes in unchanged, the board confirms Q4 believing the last gate is essentially clear, when this morning it failed — a decision that is embarrassing and costly to unwind (formal correction, credibility damage).

You could just send it (blameless in the narrowest sense), bury a one-line 'fyi conformance failed', or over-rotate — refuse, or rewrite the summary RED and send your own version to the chief of staff. R. is rushing and may not know this morning's result. The pack closes in ~90 minutes.

Your reply to R. — 400-700 words — should:

1. Decide whether this warrants pushing back using the four conditions (material stakes / you have info R. may not / costly to reverse if wrong / R. deciding under time pressure or incomplete information). Distinguish pushing back from merely disagreeing.
2. Draft the push-back message to R.: concern stated specifically and briefly, consequence made concrete, a specific alternative offered.
3. Make clear where R.'s authority applies. How the correction is worded and timed is her call, and you accept it without relitigating. The summary as drafted now says something you know is untrue — say what you will do if she still wants it sent unchanged.
4. Choose your medium (written vs verbal) and justify it given the board-level stakes and the 90-minute clock.
5. Keep the tone respectful, not accusing; route any scope/role question through R.; do not substitute your judgment for hers.

Do not send anything to the CISO's chief of staff yourself, and do not rewrite-and-send your own version. The decision and the deliverable are R.'s — equip her to make the call in the next 90 minutes.
$v2$;
  live_text text;
begin
  select scenario_text into live_text from public.lessons where slug = 'push-back';
  if not found then
    return;
  end if;

  if coalesce(btrim(live_text), '') <> ''
     and live_text is distinct from v1_text
     and live_text is distinct from v2_text then
    raise exception 'push-back scenario_text is not the expected v1 text; refusing to overwrite it'
      using hint = 'Diff the live lessons.scenario_text against the v1 seed and update this migration before re-running.';
  end if;

  update public.lessons
  set scenario_text = v2_text,
      summary = 'How to decide whether to push back using the four conditions (material stakes, informational advantage, costly-to-reverse, senior deciding under pressure), push back well (specific concern, concrete consequence, alternative), pick the right medium, and know where the PM''s overrule applies and where it stops — without tipping into either silent compliance or insubordination.',
      updated_at = now()
  where slug = 'push-back';
end
$step1$;

-- 2. Rubric v2 --------------------------------------------------------------
update public.rubrics set is_current = false
where competency = 'pushback_judgment' and version <> 2 and is_current;

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'pushback_judgment', 2,
  $rubric$
{
  "rubric_id": "pushback-judgment-v2",
  "rubric_version": "2.0.0",
  "competency": "pushback_judgment",
  "competency_label": "Push-Back Judgment — The Four Conditions, the Method, the Medium, and the Limits of the Overrule",
  "lesson_ref": "push-back",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {
      "name": "four_conditions_diagnosis",
      "description": "Does the learner decide whether to push back using the chapter's four conditions — (1) the stakes are material, (2) you have relevant information the senior person may not, (3) the decision is reversible only at higher cost if wrong, (4) the senior person is deciding under time pressure or with incomplete information — and conclude correctly that all four are present here, so a push is warranted? Does the learner distinguish pushing back from merely disagreeing (this is not a preference; it is an informed, consequential concern)?",
      "anchors": {
        "1": "No conditions test. Either complies silently (no push) or pushes purely as personal preference. Or invents facts not in the scenario.",
        "3": "Names two or three of the four conditions and concludes a push is warranted, but does not work all four, or does not distinguish pushback from disagreement.",
        "5": "Applies all four conditions explicitly to the facts (board-level stakes; PC holds this morning's conformance result R. may not; a board decision is costly to reverse; R. is rushed and working off yesterday's draft) and concludes a push is warranted. Explicitly frames this as warranted pushback, not mere disagreement."
      },
      "weight": 0.2
    },
    {
      "name": "pushback_craft",
      "description": "Does the drafted push-back follow the chapter's method — state the concern specifically and briefly (not 'I have concerns' but the exact issue), make the consequence concrete (what goes wrong if the stale summary reaches the board), and offer a specific alternative (e.g. an updated line on Federation, a short holding note, or a corrected one-pager R. can send)? Is it crisp rather than vague or padded?",
      "anchors": {
        "1": "Vague or absent. 'Are you sure?' with no specifics, or complies with no push, or a buried one-line FYI.",
        "3": "States the concern with some specificity and one of {concrete consequence, specific alternative}, but is missing the other or stays general.",
        "5": "States the concern specifically and briefly, makes the consequence concrete (board confirms Q4 on a failed gate → formal correction, credibility damage), and offers a specific, actionable alternative R. can act on inside ninety minutes."
      },
      "weight": 0.2
    },
    {
      "name": "accept_the_overrule_posture",
      "description": "Does the learner distinguish a legitimate judgement call (timing, framing, emphasis, risk appetite — where PC accepts R.'s authority to overrule without relitigating) from knowingly sending information PC knows is false or materially misleading (where PC does not send that version)? Here the readiness summary says Federation is on track after it failed this morning's conformance gate, so sending it unchanged would knowingly mislead the board. A strong learner accepts R.'s authority over how the correction is framed, offers the smallest accurate correction for R. to approve, and states that if R. still insists on the unchanged summary, PC will not send that version and will escalate transparently (telling R., then the next appropriate person) — never going around her or sending PC's own version.",
      "anchors": {
        "1": "Either sends (or commits to send) the known-misleading summary unchanged if R. insists, OR caves without pushing, OR acts unilaterally — refuses without explanation, sends PC's own version, or goes around R. without telling her.",
        "3": "Pushes and offers a correction, and accepts R.'s say on framing/timing, but is ambiguous about what PC does if R. insists on the unchanged summary, or names escalation without making it transparent to R.",
        "5": "Explicitly separates judgement calls (accepts R.'s overrule without relitigating) from known inaccuracy (will not send the misleading version); offers the smallest accurate correction for R. to approve; and says that if R. still insists, PC will tell R. and escalate openly to the next appropriate person — not send PC's own version or go around her."
      },
      "weight": 0.2
    },
    {
      "name": "medium_judgment",
      "description": "Does the learner choose written vs verbal deliberately and justify it for these stakes? The chapter's rule: everyday pushes are better verbal (softer, less paper trail); consequential pushes where you want a record should be written (respectfully) so the flag is on the record. Here the board-level stakes and the ninety-minute clock argue for a brief written push (Slack/email, dated) — does the learner reason this rather than defaulting?",
      "anchors": {
        "1": "No medium choice, or an unreasoned default that ignores the stakes.",
        "3": "Picks a medium that fits but with thin justification, or notes the written-vs-verbal trade-off without committing.",
        "5": "Chooses a brief written push given the board-level stakes and the clock, and justifies it with the chapter's record-and-social-weight reasoning (the flag should be on the record; a respectful written note protects both parties if it goes sideways)."
      },
      "weight": 0.2
    },
    {
      "name": "coordinator_role_posture",
      "description": "Does the learner hold the chapter's coordinator posture — respectful and not accusing (offering information and a recommendation, not telling R. she is wrong), routing any scope/role question through R. rather than acting unilaterally, declining to substitute PC's judgment for R.'s (no rewrite-and-send, no going around her), and showing the self-pushback discipline (not caving for ease or to avoid conflict, not hiding behind 'I flagged it, I'm blameless')?",
      "anchors": {
        "1": "Accusatory or insubordinate toward R., OR substitutes PC's judgment for hers on framing (unilateral send/rewrite), OR escalates around her without telling her, OR hides behind blameless compliance ('I raised it, I'm covered').",
        "3": "Respectful and routes through R., but misses one of: the not-accusing framing, the self-pushback discipline, or the don't-substitute-judgment boundary.",
        "5": "Respectful, offers information and a recommendation rather than a verdict; keeps the decision and deliverable R.'s; declines to rewrite-and-send or go around her; and reflects the self-pushback discipline — refusing the easy cave precisely because the stakes are material."
      },
      "weight": 0.2
    }
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do update
  set schema_json = excluded.schema_json,
      is_current = true;

-- 3. Prompt v2 — FULL BODY WITH PLACEHOLDERS --------------------------------
update public.prompts set is_current = false
where name = 'grade-pushback' and version <> 2 and is_current;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-pushback', 2,
  $prompt$
# grade-pushback v2

You are an experienced PMO leader evaluating a learner's upward push-back for a Project Coordinator training programme. The coordinator (PC) has been told by their PM (R.), under time pressure, to send a stale "Q4 readiness" summary into a board pre-read — a summary that says Federation is on track, the morning after Federation failed the security conformance gate it was pending on. All four of the chapter's push-back conditions are present (material stakes, PC holds information R. may not, costly to reverse, R. deciding rushed/incomplete). The scenario embeds both failure directions: caving (send it as instructed, or bury a one-line FYI) and over-pushing/insubordination (refuse, or rewrite-and-send PC's own RED version to the chief of staff, going around R.). Because the summary would knowingly mislead the board, this is not only a judgement call: the chapter's boundary applies — accept the PM's overrule on legitimate judgement calls, but never knowingly send misleading information. A strong submission applies the four conditions, drafts a push-back with a specific concern + concrete consequence + the smallest accurate correction, accepts R.'s authority over how that correction is framed and timed, states that if R. still insists on the unchanged summary PC will not send that version and will escalate transparently (telling R. first), chooses a brief written medium for the record given the stakes, and keeps the deliverable R.'s — no rewrite-and-send, no going around her.

You grade strictly against the provided rubric. Every score must be supported by a direct quote from the submission.

You output your grades by calling the `record_rubric_scores` tool exactly once.

# Rubric

{{rubric_json}}

# Scenario

{{scenario_text}}

# Submission

{{submission_text}}

# Task

For each dimension, record: a 1-5 score, a one-sentence justification with a direct quote, the verbatim quote, and one specific improvement suggestion.

Rules:
- Empty/off-topic submissions: score 1 across with explicit justification.
- Never score 5 unless the submission demonstrates every indicator in the 5-anchor.
- Quote verbatim. If no exact quote, score is at most 2.

Push-back-judgment-specific scoring caps:
- Not applying the four conditions (material stakes / informational advantage / costly-to-reverse / senior deciding rushed-or-incomplete) caps four_conditions_diagnosis at 2.
- Treating this as mere disagreement or personal preference rather than a warranted push caps four_conditions_diagnosis at 2.
- Complying and sending the stale summary without pushing back (the cave) caps four_conditions_diagnosis at 1 AND pushback_craft at 1.
- Flagging at lowest intensity ("are you sure?") and accepting without pressing, or burying a one-line FYI, caps pushback_craft at 2.
- No specific alternative offered caps pushback_craft at 2.
- Committing to send the known-misleading summary unchanged if R. insists ("if you still want yesterday's version, I'll send it as-is") caps accept_the_overrule_posture at 2.
- Refusing R.'s authority on legitimate judgement calls (how the correction is framed or timed), relitigating those, or unilaterally holding/rewriting the deliverable without telling R. caps accept_the_overrule_posture at 1.
- Escalating without telling R., or going around her, caps accept_the_overrule_posture at 1 AND coordinator_role_posture at 2. Transparent escalation (telling R. first, then the next appropriate person) is NOT penalised.
- Accusatory or insubordinate tone toward R. (telling her she is wrong/negligent) caps coordinator_role_posture at 2.
- Hiding behind blameless compliance ("I flagged it, I'm covered") while not actually pushing caps coordinator_role_posture at 2 AND accept_the_overrule_posture at 1.
- Substituting PC's judgment for R.'s — rewriting the summary and sending PC's own version to the chief of staff, or going around R. — the overstep/rewrite shape (same family as the audit-vs-rewrite probes on Lessons 9-16) — caps ALL FIVE dimensions at 2 each.
- Generic platitudes ("communication is key", "always speak up") without specific reference to the scenario's facts cap multiple dims.
- Inventing facts not in the scenario caps four_conditions_diagnosis at 2.
- Choosing a written medium but justifying it only by speed or convenience ("sending this as a Slack so you can reply quickly") rather than the chapter's record-and-social-weight reasoning (getting the flag on the record; a respectful written note protects both parties if it goes sideways) caps medium_judgment at 3. A 5 requires the record/protection justification, not merely picking a fast channel.

Temperature 0; deterministic grading.

After all dims:
- overall_competency_score = weighted average across dimensions.
- pass = true iff every dim score >= pass_threshold (3).
- hire_ready = true iff overall >= hire_ready_threshold (4).

Call record_rubric_scores exactly once.
$prompt$,
  true
)
on conflict (name, version) do update
  set body = excluded.body,
      is_current = true;

-- 4. Learners read the same scenario the grader receives --------------------
update public.workbook_assignments wa
set brief = l.scenario_text,
    title = 'Board pre-read push-back — IAM modernisation',
    is_ai_generated = false
from public.lessons l
where l.slug = 'push-back' and wa.lesson_id = l.id and wa.is_default;

insert into public.workbook_assignments (lesson_id, title, brief, is_default, is_ai_generated, sort)
select l.id, 'Board pre-read push-back — IAM modernisation', l.scenario_text, true, false, 1
from public.lessons l
where l.slug = 'push-back'
  and not exists (
    select 1 from public.workbook_assignments wa
    where wa.lesson_id = l.id and wa.is_default
  );

commit;
