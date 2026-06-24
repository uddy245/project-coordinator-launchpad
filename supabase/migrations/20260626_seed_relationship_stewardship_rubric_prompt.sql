-- Seed the relationship_stewardship rubric + grade-relationships prompt for Lesson 21.
-- File dated 20260626 — strict lex order after 20260625_seed_political_intelligence_rubric_prompt.
--
-- Lesson 21 ("stakeholder-relationships") covers handbook Ch 21
-- (Stakeholder Relationships That Last). Part V, the professional.
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- Canonical copies also live in:
--   docs/rubrics/relationship-stewardship-v1.json
--   docs/prompts/grade-relationships-v1.md
--   docs/lessons/stakeholder-relationships.md (Read tab)

insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'stakeholder-relationships',
  21,
  'Stakeholder Relationships That Last',
  'How careers compound through relationships - the four qualities people remember (reliability, respect, integrity, generosity), maintenance without performance, stepping forward when you can help at modest cost, and letting toxic-pattern relationships thin without burning bridges. Sincere and consistent, never transactional.',
  $scenario$
The IAM modernisation programme is wrapping up. As you close out, four relationship situations are on your plate:

(a) Dembe Okoro, the client-side business analyst you worked closely with for ten months, is leaving the client next week for a role elsewhere. You got on well - she was sharp and straight with you, and she built the access-matrix that made Workstream B tractable. You haven't talked about staying in touch.

(b) A junior on your team, Sam, quietly did the bulk of the dashboard rebuild that the vendor PM praised in the closeout meeting - but the praise landed vaguely on 'the PC team,' and Sam's name wasn't mentioned. Sam doesn't push for credit.

(c) Maya Adeyemi, a PM you worked under two projects ago and learned a lot from, was just promoted to programme director at another firm - you saw it on LinkedIn this morning. You haven't spoken in about eighteen months.

(d) A peer, Victor, has over the past year repeatedly taken credit for others' work and, in one steering meeting, threw a junior under the bus to protect himself. He's now messaging you wanting to 'team up' on the next bid, and asking you to put in a good word for him with your director.

Write the relationship moves you'd make as you close out - the note to Dembe, how you handle Sam's credit, the message to Maya - and decide how you'll handle Victor's ask. Your answer should:

1. Be sincere and specific - reference something real for each person, not strategic or performative networking.
2. Reflect the qualities people remember - reliability, respect (to Sam as much as to Maya), integrity (don't let Sam's work stay misattributed), and generosity.
3. Take the step-forward moments - credit Sam to the people who matter, reconnect with Dembe, congratulate Maya - because they're right, not because they're useful, and without being asked.
4. Handle Victor by distinguishing a toxic pattern from one-off difficulty, then letting the relationship thin: stay professional, decline the ask, don't invest - and don't burn the bridge.
5. Keep the register warm-but-not-gushing and proportionate to each actual relationship.
  $scenario$,
  60,
  true,
  'relationship_stewardship',
  'grade-relationships'
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
  'relationship_stewardship', 1,
  $rubric$
{
  "rubric_id": "relationship-stewardship-v1",
  "rubric_version": "1.0.0",
  "competency": "relationship_stewardship",
  "competency_label": "Relationship Stewardship - Building Professional Relationships That Last",
  "lesson_ref": "stakeholder-relationships",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"sincerity_not_performance","description":"Are the moves sincere and specific (referencing something real, treating people as people) rather than strategic, transactional, or performative networking?","anchors":{"1":"Transactional/strategic ('worth staying close - she could send work') or generic/performative with no specifics.","3":"Warm and mostly genuine but one move is generic or carries a faint angle/ask.","5":"Each move is sincere and specific, references real shared work, and is offered for its own sake."},"weight":0.20},
    {"name":"four_qualities","description":"Do the moves reflect reliability, respect (junior as well as senior), integrity (doesn't take/misattribute credit), and generosity - e.g. correcting the junior's misattributed credit?","anchors":{"1":"Self-serving or careless with others' credit (leaves the junior misattributed, or claims it), or disrespectful to juniors.","3":"Shows some qualities but misses one clearly (e.g. doesn't fix the junior's credit).","5":"Reliable, respectful up and down, honest about credit (names the junior to the people who matter), generous."},"weight":0.20},
    {"name":"step_forward_judgment","description":"Does the learner take the disproportionate-difference moments (credit the junior, reconnect, congratulate) because they're right, not useful, and unprompted?","anchors":{"1":"Skips the moments, or only acts where there's a payoff.","3":"Takes some moments but misses one, or frames help as an investment.","5":"Takes the moments unprompted and unconditionally, clearly because it's right."},"weight":0.20},
    {"name":"boundary_with_toxic","description":"Does the learner distinguish a toxic pattern from one-off difficulty and let the relationship thin - stay professional, decline, don't invest, NOT burn the bridge?","anchors":{"1":"Capitulates (teams up/vouches despite the pattern) OR burns the bridge (cutting call-out, public confrontation).","3":"Right instinct (keeps distance) but over- or under-does it, or doesn't separate pattern from one-off.","5":"Names the pattern, declines courteously, stays professional, stops investing, lets it fade without burning."},"weight":0.20},
    {"name":"register_and_proportion","description":"Warm-but-not-gushing, professional, proportionate - light maintenance, brief sincere notes sized to each relationship's actual closeness.","anchors":{"1":"Over-the-top/effusive or stiff/transactional; mis-sized to the relationship.","3":"Generally appropriate but one move mis-pitched in warmth or length.","5":"Each note sized right - brief, sincere, warm without performance, matched to the relationship."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-relationships', 1,
  $prompt$
# grade-relationships v1

You are an experienced PMO leader evaluating a learner's relationship stewardship. At a project's close the coordinator (PC) faces four moves: a reconnect note to a departing client BA (Dembe), correcting vague credit so a quiet junior (Sam) is named, a congratulation to a former PM (Maya) just promoted, and declining a toxic-pattern peer's (Victor) ask to team up and be vouched for. A strong submission makes each move sincere and specific (not strategic networking), reflects reliability/respect/integrity/generosity, takes the step-forward moments because they're right not useful, and handles Victor by letting the relationship thin - courteous, declining to invest, not burning the bridge. The scenario embeds two failure directions: transactional/performative networking (people as assets, gushing, self-crediting) and mishandling the toxic peer (capitulating and vouching, OR burning the bridge with a confrontation). Grade strictly against the rubric. Every score must be supported by a direct quote.

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

Relationship-stewardship-specific scoring caps:
- Framing relationships transactionally or strategically (a contact as a source of future work, cultivating the useful, a list for ROI) caps sincerity_not_performance at 2.
- Generic, specific-free notes ('great working with everyone, let's keep in touch') cap sincerity_not_performance at 2.
- Letting the junior's work stay misattributed, or claiming/absorbing the credit, caps four_qualities at 2 AND step_forward_judgment at 2.
- Capitulating to the toxic peer - agreeing to team up, or vouching for him to the director despite the known pattern - caps boundary_with_toxic at 1 AND four_qualities at 2.
- Burning the bridge with the toxic peer - a cutting call-out, public confrontation, or dramatic cut-off rather than a professional fade - caps boundary_with_toxic at 2 AND register_and_proportion at 2.
- Over-the-top/effusive or performative warmth mis-sized to the relationship caps register_and_proportion at 2.
- No actual moves drafted (pure description of what one would do) caps multiple dims.
- Inventing facts not in the scenario caps the affected dimensions at 2.

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
