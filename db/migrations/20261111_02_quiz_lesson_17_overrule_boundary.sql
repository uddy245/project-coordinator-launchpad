-- ==========================================================================
-- Migration: 20261111_02_quiz_lesson_17_overrule_boundary.sql
-- Target: Neon pc-launchpad. Run after 20261111_01.
--
-- Lesson 17 quiz: bring three items into line with "Where the overrule stops".
--   Q7  — stem limited to judgement calls; rationales for (c) and (d) reworded.
--   Q11 — option (b) now says "a worse failure", matching the reading and script.
--   Q16 — replaced. It duplicated Q15 (say yes carefully); the new item tests
--         the known-inaccuracy boundary, which no item covered. Correct answer: c.
-- Count stays at 20. Idempotent.
-- Original text: supabase/migrations/20260709_seed_quiz_lesson_17_pushback.sql.
--
-- Matching: an item is edited only if it is the original hand-authored
-- question — same lesson and sort, not AI-generated, and its stem is the
-- original (or, on a re-run, the new one). quiz_items has no unique
-- (lesson_id, sort): AI-generated items take their sort from model output and
-- an admin can replace a lesson's questions, so lesson + sort alone could hit
-- a different question and leave it with another item's options or answer.
-- Any item that does not match is left unchanged and a NOTICE reports how
-- many of the three were edited.
-- ==========================================================================

begin;

do $migration$
declare
  n integer;
  edited integer := 0;
begin

update public.quiz_items qi
set stem = $$On a judgement call — timing, framing, how much risk to carry — if the PM considers your push-back and still says proceed, you should:$$,
    distractor_rationale = $${"a": "Relitigating after a decision tips into insubordination.", "c": "On a judgement call the decision is the PM's. Open escalation is only for a known inaccuracy the PM insists on sending.", "d": "On a judgement call, refusing after an informed overrule is insubordination. Declining applies only to something you know is false."}$$::jsonb
from public.lessons l
where l.slug = 'push-back' and qi.lesson_id = l.id and qi.sort = 7
  and not qi.is_ai_generated
  and qi.stem in (
    $$If the PM considers your push-back and still says proceed, you should:$$,
    $$On a judgement call — timing, framing, how much risk to carry — if the PM considers your push-back and still says proceed, you should:$$
  );
get diagnostics n = row_count;
edited := edited + n;

update public.quiz_items qi
set options = $$[{"id": "a", "text": "Pushing back too often"}, {"id": "b", "text": "Letting the reasons-not-to compound until the default becomes 'never push back, ever' — a worse failure than the occasional wrong push"}, {"id": "c", "text": "Documenting too much"}, {"id": "d", "text": "Being too direct"}]$$::jsonb
from public.lessons l
where l.slug = 'push-back' and qi.lesson_id = l.id and qi.sort = 11
  and not qi.is_ai_generated
  and qi.stem = $$The deeper failure mode the chapter warns about is:$$;
get diagnostics n = row_count;
edited := edited + n;

update public.quiz_items qi
set stem = $$A status summary says a workstream is "on track". You know it failed its test this morning. Your PM, told this, still says send it unchanged. You should:$$,
    options = $$[{"id": "a", "text": "Send it — you flagged it and were overruled"}, {"id": "b", "text": "Rewrite it yourself and send your version"}, {"id": "c", "text": "Not send that version; tell the PM you are raising it, then take it openly to the next appropriate person"}, {"id": "d", "text": "Send it and quietly warn the recipient"}]$$::jsonb,
    correct = 'c',
    distractor_rationale = $${"a": "Accepting the overrule covers judgement calls, not sending something you know is false.", "b": "The document is still the PM's; you offer a correction, you don't replace it.", "d": "Going around the PM is the thing the lesson rules out."}$$::jsonb,
    difficulty = 'hard'
from public.lessons l
where l.slug = 'push-back' and qi.lesson_id = l.id and qi.sort = 16
  and not qi.is_ai_generated
  and qi.stem in (
    $$The 'say yes carefully' reframings are best understood as:$$,
    $$A status summary says a workstream is "on track". You know it failed its test this morning. Your PM, told this, still says send it unchanged. You should:$$
  );
get diagnostics n = row_count;
edited := edited + n;

if edited <> 3 then
  raise notice 'push-back quiz: % of 3 items edited; items that are not the original questions were left unchanged', edited;
end if;

end $migration$;

commit;
