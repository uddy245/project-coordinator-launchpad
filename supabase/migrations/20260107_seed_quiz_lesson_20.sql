-- ==========================================================================
-- Migration: 20260107_seed_quiz_lesson_20.sql
-- Ticket: LES-006
-- Purpose: Seed 10 quiz items for Lesson 20 (RAID Logs).
-- Idempotent: deletes-then-inserts for this lesson so refining the items
-- in a follow-up migration is as simple as editing this file and bumping
-- the timestamp.
--
-- Source of truth for wording: docs/quiz/lesson-20-items.md
-- ==========================================================================

do $body$
declare
  v_lesson_id uuid;
begin
  select id into v_lesson_id
  from public.lessons
  where slug = 'raid-logs';

  if v_lesson_id is null then
    raise exception 'Lesson "raid-logs" not found. Apply 20260105_seed_lesson_20.sql first.';
  end if;

  -- Idempotent: clear existing items for this lesson before re-inserting.
  delete from public.quiz_items where lesson_id = v_lesson_id;

  insert into public.quiz_items (lesson_id, sort, stem, options, correct, distractor_rationale, competency, difficulty) values
  (v_lesson_id, 1,
    'A well-formed risk entry in a RAID log should always include…',
    $$[
      {"id":"a","text":"A risk title and an owner"},
      {"id":"b","text":"Trigger, impact, likelihood, owner, and mitigation"},
      {"id":"c","text":"Title, description, and status"},
      {"id":"d","text":"A severity score and a due date"}
    ]$$::jsonb,
    'b',
    $${
      "a":"Owner is necessary but not sufficient. Without trigger/impact/likelihood/mitigation the risk is not actionable.",
      "c":"Status is a state, not a shape. Missing mitigation and trigger means nobody knows what to do or when it becomes real.",
      "d":"Severity is derived; a 5-field risk has the inputs. A due date alone does not tell the team what the risk *is*."
    }$$::jsonb,
    'risk_completeness', 'easy'),

  (v_lesson_id, 2,
    'A junior PC writes: "Risk: System might be slow. Status: Open." What is the single biggest gap preventing this from being actionable?',
    $$[
      {"id":"a","text":"No ID number assigned"},
      {"id":"b","text":"No trigger or mitigation, so nobody knows when to act or what to do"},
      {"id":"c","text":"Missing the severity score"},
      {"id":"d","text":"Status should be ''In progress''"}
    ]$$::jsonb,
    'b',
    $${
      "a":"IDs help organization but do not unblock action.",
      "c":"Severity is derivative; the entry has no inputs from which to derive it.",
      "d":"Status labels do not add evidence; the entry still lacks a plan."
    }$$::jsonb,
    'risk_completeness', 'medium'),

  (v_lesson_id, 3,
    'You are reviewing a peer''s RAID log. Which entry is MOST complete?',
    $$[
      {"id":"a","text":"R-001 — Risk: Vendor delay. Owner: Vendor PM. Impact: High."},
      {"id":"b","text":"R-002 — Risk: Data migration failure at go-live cutover. Trigger: Migration dry-run fails. Impact: 48h rollback window. Likelihood: Medium. Mitigation: Add 24h buffer; rehearse cutover twice; Mark owns execution. Owner: Mark. Follow-up: 2026-05-10."},
      {"id":"c","text":"R-003 — Could be issues with training."},
      {"id":"d","text":"R-004 — High risk, monitor."}
    ]$$::jsonb,
    'b',
    $${
      "a":"Three of five fields; missing trigger and mitigation — the two that move it from diagnosis to action.",
      "c":"A one-liner is not a risk entry; it is a note-to-self.",
      "d":"''Monitor'' is the weakest mitigation and no other fields are provided."
    }$$::jsonb,
    'risk_completeness', 'hard'),

  (v_lesson_id, 4,
    'A teammate says "The vendor promised the integration would handle our volume." On a RAID log this is a…',
    $$[
      {"id":"a","text":"Risk"},
      {"id":"b","text":"Issue"},
      {"id":"c","text":"Assumption"},
      {"id":"d","text":"Dependency"}
    ]$$::jsonb,
    'c',
    $${
      "a":"It has not happened and is not probabilistic — it is a statement being taken for granted.",
      "b":"Nothing has broken yet.",
      "d":"A dependency is an external blocker you need from someone else; this is a belief about behavior you have accepted."
    }$$::jsonb,
    'risk_differentiation', 'easy'),

  (v_lesson_id, 5,
    'The project''s lead developer just announced a planned 4-week leave starting next sprint. On your RAID log this is a…',
    $$[
      {"id":"a","text":"Risk (might happen)"},
      {"id":"b","text":"Issue (already real — the leave is scheduled)"},
      {"id":"c","text":"Assumption"},
      {"id":"d","text":"Dependency on HR"}
    ]$$::jsonb,
    'b',
    $${
      "a":"The event is already confirmed — risks are things that might happen. You mitigate the consequences (schedule slip), not the leave itself.",
      "c":"Nothing is being assumed; this is a known fact.",
      "d":"HR is not blocking anything; the leave is approved."
    }$$::jsonb,
    'risk_differentiation', 'medium'),

  (v_lesson_id, 6,
    'Which of these is the BEST mitigation for "Risk: vendor API may return stale data under load"?',
    $$[
      {"id":"a","text":"Monitor closely."},
      {"id":"b","text":"Add cache + contract test suite that fails the build if response schema drifts; on-call rotation for alerts."},
      {"id":"c","text":"Escalate."},
      {"id":"d","text":"Add a bug ticket."}
    ]$$::jsonb,
    'b',
    $${
      "a":"''Monitor'' is a posture, not a plan — no owner, no threshold, no action.",
      "c":"Escalate to whom, for what decision?",
      "d":"A ticket is a record of work, not work."
    }$$::jsonb,
    'mitigation_realism', 'easy'),

  (v_lesson_id, 7,
    'Why is "Monitor" a weak mitigation on its own?',
    $$[
      {"id":"a","text":"It is too vague — no action, no owner, no threshold"},
      {"id":"b","text":"Monitoring is expensive"},
      {"id":"c","text":"It is acceptable for low-likelihood risks"},
      {"id":"d","text":"It duplicates the Status column"}
    ]$$::jsonb,
    'a',
    $${
      "b":"Cost is beside the point; the issue is specificity.",
      "c":"A weak mitigation is weak regardless of likelihood. Low-likelihood risks still need an action if they fire.",
      "d":"Status tracks state; mitigation tracks plan — they are unrelated."
    }$$::jsonb,
    'mitigation_realism', 'medium'),

  (v_lesson_id, 8,
    'Your RAID log has 12 items. 3 have no owner listed. What does this most likely indicate?',
    $$[
      {"id":"a","text":"Those items are low priority"},
      {"id":"b","text":"They are orphans — nobody is accountable, so nothing will move"},
      {"id":"c","text":"The log is correctly using role-based ownership"},
      {"id":"d","text":"Those items are not yet real"}
    ]$$::jsonb,
    'b',
    $${
      "a":"Priority is unrelated to ownership; a low-priority item still needs someone to close it.",
      "c":"Role-based ownership still requires a role *named* (e.g. ''Tech Lead''). Blank means no role, no person.",
      "d":"Real or not, an orphaned item rots."
    }$$::jsonb,
    'ownership_and_accountability', 'medium'),

  (v_lesson_id, 9,
    'A follow-up date next to every open item matters because…',
    $$[
      {"id":"a","text":"It lets you sort the log"},
      {"id":"b","text":"It turns the log into a living artifact — you can tell this week what is stale"},
      {"id":"c","text":"Auditors require it"},
      {"id":"d","text":"Stakeholders won''t read it otherwise"}
    ]$$::jsonb,
    'b',
    $${
      "a":"Sorting is a byproduct; the purpose is triage cadence.",
      "c":"Auditors vary; the practice stands on its own merits.",
      "d":"Stakeholders read what is relevant; date alone does not draw attention."
    }$$::jsonb,
    'ownership_and_accountability', 'easy'),

  (v_lesson_id, 10,
    'Which is the STRONGEST signal that a RAID log is a living document rather than a one-off report?',
    $$[
      {"id":"a","text":"It has risks, issues, assumptions, and dependencies"},
      {"id":"b","text":"It was updated once at kickoff"},
      {"id":"c","text":"Items show status transitions over time (Open → In progress → Mitigated → Closed) and follow-up dates that move"},
      {"id":"d","text":"It was reviewed by the product owner"}
    ]$$::jsonb,
    'c',
    $${
      "a":"Having the four categories is structural, not behavioral.",
      "b":"A single update is the opposite of a living artifact.",
      "d":"Review events are a moment; a living log shows movement between moments."
    }$$::jsonb,
    'living_artifact_evidence', 'easy');

end $body$;
