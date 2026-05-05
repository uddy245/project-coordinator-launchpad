-- Seed the role_understanding rubric + grade-role prompt for Lesson 1.
--
-- Lesson 1 ("coordinator-role") was published with video + reading + quiz
-- but no gradable artifact pipeline. This migration adds:
--   - rubrics row: role_understanding v1 (5 dimensions, mirrors raid-v1 shape)
--   - prompts row: grade-role v1 (mirrors grade-raid v1 with role-specific rules)
--   - lessons.scenario_text on Lesson 1 — the first-week-memo prompt
--
-- Idempotent via the (competency, version) and (name, version) unique
-- constraints. Re-applying is a no-op.

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'role_understanding',
  1,
  $rubric$
{
  "rubric_id": "role-understanding-v1",
  "rubric_version": "1.0.0",
  "competency": "role_understanding",
  "competency_label": "Project Coordinator Role Understanding",
  "lesson_ref": "coordinator-role",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {
      "name": "role_breadth_recognition",
      "description": "Does the learner recognise the unstated work of a Project Coordinator beyond the job description — information routing, project memory, early-warning on schedule slip, authoring the written record, friction reduction, and absorbing day-to-day stakeholder pressure?",
      "anchors": {
        "1": "Recites the job-description list (takes minutes, tracks risks, schedules meetings) with no recognition of the unstated work.",
        "3": "Names two or three of the unstated functions (e.g. memory of the project, written-record author) but treats one or two as optional or aspirational rather than core.",
        "5": "Articulates four or more of the unstated functions as core to the role, with concrete examples that show the learner has internalised why each one matters."
      },
      "weight": 0.25
    },
    {
      "name": "role_self_placement",
      "description": "Does the learner identify which of the three coordinator role types they are in (administrative / hybrid coordinator-analyst / aspiring-PM) and why, with reasoning grounded in the actual scope of decision-making rather than the title on the posting?",
      "anchors": {
        "1": "No self-placement, or self-placement based on title alone with no reasoning.",
        "3": "Picks a role tier and gives a one-line rationale, but the rationale is generic or doesn't engage with the actual scope of decision-making.",
        "5": "Picks a role tier with reasoning grounded in concrete scope ('I am in the hybrid track because I draft change requests but the PM approves them; I do not yet run a workstream end-to-end'). Notes what would shift them to the next tier."
      },
      "weight": 0.15
    },
    {
      "name": "habit_specificity",
      "description": "Are the proposed first-30-days habits concrete, observable, and tied to the unstated work — versus generic platitudes ('I will be proactive', 'I will take initiative', 'I will collaborate effectively')?",
      "anchors": {
        "1": "Habits are platitudes ('be proactive', 'communicate clearly') with no observable behaviour or artifact.",
        "3": "Habits are partially concrete (e.g. 'send weekly status') but lack frequency, audience, or what good looks like.",
        "5": "Three or more habits are concrete, observable, and tied to the unstated work — with cadence, audience, and a definition of done that another person could check ('Within 48 hours of each steering, distribute minutes that lead with decisions and actions, not transcript')."
      },
      "weight": 0.20
    },
    {
      "name": "professional_voice",
      "description": "Does the writing read like a working professional — direct, plain, unhurried, free of corporate jargon and LinkedIn cliché — versus padded with 'leverage', 'synergize', 'best-in-class', or signalling-language that performs competence rather than demonstrating it?",
      "anchors": {
        "1": "Writing is jargon-heavy ('leverage cross-functional synergies') or LinkedIn-speak ('passionate about driving outcomes'); content is hidden behind performance.",
        "3": "Writing is mostly plain but occasionally slips into jargon or generic phrases; meaning is mostly clear but not crisp.",
        "5": "Writing is plain, specific, and confident. No jargon. Sentences carry information; nothing is filler. Reads like the chapter being studied."
      },
      "weight": 0.20
    },
    {
      "name": "realistic_humility",
      "description": "Does the learner acknowledge what they do not yet know — without performing inadequacy or hedging every sentence — and name how they will learn it (asking, reading, observing)?",
      "anchors": {
        "1": "Either claims confidence in everything (no acknowledged unknowns) or hedges every sentence so heavily that nothing is asserted.",
        "3": "Names one or two unknowns but does not say how they will close the gap, or hedges defensively.",
        "5": "Names specific unknowns ('I do not yet know who actually approves change requests under £10k') and pairs each with a concrete way to find out (asking the PM in the first 1:1, reading the governance doc, observing the next steering committee). Confident about what is known, honest about what is not."
      },
      "weight": 0.20
    }
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-role',
  1,
  $prompt$
# grade-role v1

Version: 1
Status: current
Model: claude-sonnet-4-5
Temperature: 0

## System prompt

You are an experienced Project Management Office (PMO) leader evaluating a learner's submission for a Project Coordinator training programme. The learner has been asked to write a short memo demonstrating their understanding of the coordinator role after studying the first lesson of the curriculum.

You grade strictly against the provided rubric. You never invent facts about the submission. Every score must be supported by a direct quote from the submission.

You output your grades by calling the `record_rubric_scores` tool. You always call the tool exactly once. You never return free-form grading text.

Your tone in justifications and suggestions is constructive and specific. You explain what is missing or weak, not just label it. Your suggestions are actionable — something the learner could apply to a rewrite this week.

## User prompt template

Variables are interpolated at render time from the grading service.

```
# Rubric

{{rubric_json}}

# Scenario the learner was asked to respond to

{{scenario_text}}

# Learner's submission (plain text extracted from their memo)

{{submission_text}}

# Task

For each dimension in the rubric above, record:

1. A score from 1 to 5 matching the rubric anchor closest to the evidence in the submission.
2. A one-sentence justification that explicitly references a direct quote from the submission.
3. The verbatim quote from the submission that supports your score (copy-paste, do not paraphrase).
4. One specific improvement suggestion the learner could apply to a rewrite.

Rules:
- If the submission is empty or says "I don't know" or equivalent, return score 1 for every dimension with justification "No substantive response provided." and quote "".
- If the submission is off-topic (does not address the scenario at all), return score 1 for every dimension with justification "Submission is off-topic for the scenario." and quote a representative line.
- If a dimension cannot be evaluated from the submission, score 1 with justification "Dimension not addressed in submission." and quote "".
- Never score 5 unless the submission demonstrates every indicator in the 5-anchor.
- Quote verbatim — do not paraphrase. If you cannot find an exact quote, the score is at most 2.
- Reciting the job-description list (takes minutes, tracks risks, schedules meetings) does not count as recognising the unstated work — score role_breadth_recognition no higher than 2.
- LinkedIn-speak and corporate jargon ('leverage cross-functional synergies', 'passionate about driving outcomes', 'best-in-class', 'value-add') floors professional_voice — never score professional_voice above 2 if the submission contains two or more such phrases.
- Temperature 0; this is a deterministic grading task.

After grading all dimensions:
- Compute overall_competency_score as the weighted average across dimensions (use the weights in the rubric).
- Set pass = true iff every dimension score is at least the rubric's pass_threshold (default 3).
- Set hire_ready = true iff overall_competency_score is at least the rubric's hire_ready_threshold (default 4).

Call `record_rubric_scores` exactly once with your complete output.
```

## Tool schema (constructed at runtime from the rubric)

Same shape as `grade-raid-v1`: a single `record_rubric_scores` tool with `dimension_scores`, `overall_competency_score`, `pass`, `hire_ready`. Built from the rubric by `src/lib/grading/tool-schema.ts`.

## Tool choice

```typescript
tool_choice: { type: "tool", name: "record_rubric_scores" }
```

## Changelog

- v1 (initial): 5-dimension role_understanding rubric, mirrors the grade-raid v1 prompt shape with role-specific scoring rules (job-description recital cap, jargon cap on professional_voice).
  $prompt$,
  true
)
on conflict (name, version) do nothing;

-- Set the scenario_text on Lesson 1 if it is currently empty.
update public.lessons
set scenario_text = $scenario$
You have been hired as the Project Coordinator on a nine-month software-integration project at a mid-size insurance firm. The project is mid-build: the previous coordinator left a month ago, the schedule is amber, the steering committee meets in two weeks. You start on Monday.

Write a 600-800 word memo to your project manager, to be sent at the end of your first week. The memo must:

1. Show that you understand what the role actually is — not the job description, but the unstated work that distinguishes a competent coordinator from a glorified note-taker.
2. Place yourself honestly in one of the three coordinator role types (administrative, hybrid coordinator-analyst, aspiring-PM) and say why, based on the scope of decisions you expect to make.
3. List three concrete habits you will build in your first 30 days, with cadence, audience, and a definition of done that another person could check.
4. Name two or three things you do not yet know about this project or this organisation, and how you intend to find them out.

Write in a direct, plain, professional voice. No corporate jargon. No LinkedIn cliché. The PM should finish the memo and feel that you have read the room and understood the work — not that you are performing competence.
$scenario$
where slug = 'coordinator-role'
  and (scenario_text is null or scenario_text = '');
