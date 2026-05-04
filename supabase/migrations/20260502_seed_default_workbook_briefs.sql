-- Seed default workbook scenario briefs for the 8 currently-published
-- lessons (M01–M07 + M20). Every learner's first visit to a lesson's
-- Workbook tab now lands on a polished, calibrated, tech-themed
-- scenario instead of an empty "Generate scenario" CTA.
--
-- Each brief is calibrated to the lesson's competency, set in a
-- realistic technology / IT industry context (per the project's
-- tech-only content scope), specific (named fictional companies,
-- dollar amounts, real-feeling team structures), and open-ended
-- (does not pre-classify items into the answer).
--
-- Idempotent: only inserts a default brief for a lesson if no
-- existing default brief is already in place. Lookup is by
-- lesson slug to avoid hard-coding lesson UUIDs.

with l as (
  select slug, id from public.lessons
)
insert into public.workbook_assignments (lesson_id, title, brief, is_default, is_ai_generated, sort)
select x.lesson_id, x.title, x.brief, true, false, 1
from (values
  ((select id from l where slug = 'coordinator-role'),
   'Coordinator self-audit — Helix Robotics, Series B SaaS',
   $$You've just completed your first 90 days as project coordinator at **Helix Robotics** (Series B, 140 people, computer-vision platform for warehouse automation). You report to a Senior Program Manager who runs four concurrent customer pilots — three Fortune-500 logistics companies and one DoE national lab. Your role description says "coordinate cross-functional delivery"; what you actually do varies by week.

In a typical week you: schedule and minute four standups + a steering call; chase three customer engineering teams for environment access; maintain the master pilot tracker (Linear + Notion); write the weekly status memo for the VP of Customer Success; field ad-hoc questions from the legal team about data-handling clauses; and re-run the deployment dashboard's metrics calculation when it diverges from the engineering team's numbers.

Your manager has asked you to do a "role audit" before your end-of-quarter 1:1. The questions she wants you to come prepared with: which of the five buckets (administrator / chronicler / chaser / interpreter / quietly-improving-things) do you spend the most time in this quarter? Which does your manager think you spend most time in? Where is the gap between the role you were hired for and the role you're actually in? What is your honest view of which kind of coordinator (admin / hybrid / proto-PM) you are right now, and which you want to be in 18 months?

Bring written answers and one concrete commitment for what you'll change in the next 90 days. Use the workbook template to structure this.$$),
  ((select id from l where slug = 'project-lifecycle'),
   'Mid-flight diagnosis — Telos Health EMR cloud migration',
   $$You've joined **Telos Health Systems** (regional health-tech provider, 900 staff, $180M ARR) as project coordinator for their EMR migration from a legacy on-prem system to a cloud-hosted Epic deployment. The project is in week 26 of a planned 52-week schedule. Your predecessor left to take a PMO role at a competitor.

The project manager hands you the artefacts: a charter signed nine months ago, a Microsoft Project schedule with 380 tasks (43% baseline-complete, 18 amber, 4 red), three Confluence pages of "governance documentation" last edited four months ago, and a steering deck from two months back. There is no closeout playbook drafted. The risk register exists but hasn't been reviewed in seven weeks. Two of the four workstream leads have rotated off since project start.

The PM's specific ask: "Tell me where we actually are in the lifecycle, what's missing, and what governance hygiene we need to fix in the next two weeks." She is presenting to the sponsor in 12 days. The sponsor is the Chief Medical Officer; he is privately worried about clinical-workflow risk at go-live but does not surface concerns directly.

Use the workbook template to: locate the project on the five-phase lifecycle, identify the three most material gaps, and propose a two-week catch-up plan that doesn't require restarting governance from scratch.$$),
  ((select id from l where slug = 'written-voice'),
   'Comms triage — Skiff AI go-live week',
   $$You're project coordinator at **Skiff** (Series A, 38 people, an AI agent platform for B2B contract review). It's Wednesday afternoon, three days before the production go-live for your largest customer (a top-10 US law firm, $1.4M ACV). The CTO has just told the team in standup: the model accuracy for one document type is 4 points below target and they're "not sure if it'll be there by Friday."

You have to send three pieces of writing in the next four hours, all visible across the company:

1. A reply to the customer's procurement lead, who emailed at 2pm asking "can you confirm the Friday go-live date so I can update our partner team?" She has been reasonable and patient throughout the project.
2. The weekly status memo to your CEO and VP Engineering. Last week's status was green. This week it's at risk; you don't yet know whether it'll be amber or red by Friday.
3. A short note to the customer-side technical project manager (a former engineering director — knowledgeable, blunt, occasionally curt) heads-upping that there is a risk to the Friday cut-over and asking for a 30-minute call tomorrow.

Each message must be honest, professional, and appropriate for its audience. None can promise something you cannot deliver. None can be evasive. The reply to procurement specifically must not commit to Friday but must not panic her.

Use the workbook template — draft all three messages. The grading attends to lede, register-matching, hedge use, and what you choose NOT to say.$$),
  ((select id from l where slug = 'mindset'),
   'Mindset reset — pre-cutover night, B2B SaaS data migration',
   $$It's Thursday night, the eve of a Saturday production cutover. You're project coordinator on the **Lumen Insights** customer-platform migration — moving 11 million customer records from a vendor-hosted CRM to an in-house Snowflake + Hightouch stack. You've been on this project for fourteen months. Your PM has been on it for two years.

You are tired. The project has visibly worn you down. Two specific things happened this week that you are still processing:

1. On Tuesday, an engineering team lead — someone you considered a friend on the project — sent a sharp message in a public Slack channel implying that the data-migration delays were "the coordinator side not chasing hard enough." This is not true; you have written records of the chasing. You did not respond, but it has not left your head.
2. On Wednesday, the sponsor (the Chief Customer Officer) asked you in steering "are you going to be okay for Saturday?" in a tone you read as concerned but possibly also doubtful. You said "yes, of course" too quickly.

It is now 9pm Thursday. You have done the operational prep — runbook, comms tree, rollback plan. What's left is your own head. Tomorrow your PM will ask you in your 1:1 "how are you actually doing?" She means it.

Use the workbook template to write a short, honest reflection — not a diary, a professional self-assessment — across the seven mindset shifts the chapter introduces. The goal is to walk into Saturday with composure, not pretence.$$),
  ((select id from l where slug = 'methodologies'),
   'Methodology diagnosis — Anchor Pay "Scrum-but" rescue',
   $$You've been hired as project coordinator at **Anchor Pay** (Series B fintech, payments-orchestration platform, 220 people) to support a programme called "Velocity 2.0." The mandate from the COO was: "Help our engineering teams move faster." You're four weeks in.

What you've found: each of the seven engineering teams claims to "do Scrum." Three teams have a real Scrum Master and run two-week sprints with a backlog, retros, and a working definition of done. Two teams have a "Scrum Master" who is also a tech lead, run loose sprints with no real retros, and pull from a Jira board with 600+ tickets and no real prioritisation. Two teams (the Platform Infra team and the Compliance Tech team) explicitly do NOT do sprints — they work to a quarterly roadmap with monthly milestones, because their dependencies are quarterly regulatory deadlines and infrastructure procurement cycles. The COO and VP Engineering refer to the entire org as "Agile."

The product roadmap has three workstreams that span all seven teams: a regulatory compliance push (hard external deadline, March), a customer-driven product bet (no hard deadline), and a platform-stability initiative (no hard deadline but technical debt accumulating).

The COO's specific ask of you: "Diagnose what we're actually doing methodology-wise, where each team should sit, and what you'd recommend we change." He wants a one-pager + a 30-minute readout next Thursday.

Use the workbook template to produce the diagnosis. Specifically: classify each of the seven teams across the waterfall–agile spectrum, identify the Scrum-but failure patterns, recommend whether each team should stay or move, and propose how the three cross-team workstreams should be coordinated given the methodology mix.$$),
  ((select id from l where slug = 'governance'),
   'Org diagnosis — Nexus Security SIEM integration steering',
   $$You've moved into the project coordinator seat for **Nexus Security** (Series C cybersecurity, 460 people, EDR + cloud workload protection). Your project: a new SIEM integration that affects four product lines. The on-paper governance is described in a 14-slide deck called "Programme Governance Framework v2.1," signed off by the CTO three months ago.

The deck specifies: a sponsor (the SVP Engineering), a steering committee of four product VPs that meets fortnightly, a PMO that "oversees portfolio reporting," a programme manager who "owns delivery," a project manager (your boss) who "runs day-to-day," and four workstream leads (one per product line).

The lived reality, after your first six weeks of observation:
- The SVP Engineering has not attended a steering meeting in seven weeks; the Chief Product Officer has shown up to two of the last three steerings without being on the invite.
- Of the four product VPs, two send delegates, one consistently no-shows, one is engaged.
- Decisions on integration scope are being made in a recurring "tech sync" that includes none of the steering members but does include the principal engineer of two of the four product lines.
- The PMO has emailed three times asking for an updated governance RACI; you have not seen one produced.
- Your PM is well-respected technically but visibly avoids steering conflict.

Your PM has just asked you, privately: "Help me figure out who actually decides what here, because I think we're going to hit a real disagreement on scope in the next two weeks and I want to know who I'm talking to."

Use the workbook template to map the on-paper structure vs. the actual decision architecture. Specifically: identify the real sponsor, the real decision forum, and the three relationships you (and your PM) will most need to navigate in the next month.$$),
  ((select id from l where slug = 'variables'),
   'Five-variable trade-off — Atlas Care SOC 2 + HITRUST push',
   $$You're project coordinator at **Atlas Care** (pre-IPO health-tech company, 600 people, $90M ARR), supporting a programme called "SOC 2 Type II + HITRUST CSF." The company is targeting an S-1 filing in Q3, which makes the certifications a hard external dependency for the IPO timeline. Your CFO has been clear: "The certifications must be done by July or we slip the IPO."

The current state, as of this week:
- **Scope**: 47 controls in the SOC 2 implementation plan, 22 controls in HITRUST. Three of the SOC 2 controls require engineering work that isn't yet started (an MFA enforcement rollout to the legacy admin tools, an encryption-at-rest implementation for one specific data store, and a privileged-access logging upgrade).
- **Schedule**: 10 weeks of audit window remaining before the deadline.
- **Cost**: $880k spent of a $1.1M budget. The remaining work involves contractor backfill ($120k quoted) and the audit firm itself ($95k).
- **Quality**: the audit firm has flagged that the existing access-review process is "minimally compliant" — it works, but the documentation is thin.
- **Risk**: the principal security engineer who knows the MFA rollout best is leaving the company in five weeks for a competitor.

The CTO has called a one-hour meeting on Monday with you, your PM, the security lead, and the head of engineering. The agenda line says simply: "Scoping the trade-offs." The CTO's standing instruction has been: "Bring me options, not opinions."

Use the workbook template to surface the five variables (scope, schedule, cost, quality, risk) with current state, what's actually at risk, and three concrete trade-off options for the CTO to choose between. Identify the variable most likely to be cut silently if you don't surface it.$$),
  ((select id from l where slug = 'raid-logs'),
   'Live RAID — Q3 multi-cloud migration, pre-cutover',
   $$You're project coordinator on the **Halcyon** programme at **Ridgeline Logistics** (mid-market 3PL, 1,200 staff, $400M revenue). The programme is a multi-cloud migration: moving 47 workloads from a single on-prem data centre to a primary AWS / secondary GCP architecture. You're 19 weeks in to a 32-week schedule, with cutover scheduled for week 28. Your sponsor is the CIO. Your PM is a contractor, eight weeks new to the project.

It's a Tuesday morning. You're preparing the RAID log for Wednesday's steering meeting. The current log has 12 risks, 4 issues, 6 dependencies, and 3 assumptions, several of which are stale (last reviewed > 6 weeks ago). You've spent the last week walking the floor — listening, observing, reading Jira and Slack — and you have a working file of things you've noticed but not yet logged. They include:

- The lead Cloud Architect (the only person on staff who deeply understands the legacy authentication pattern in two of the workloads) is interviewing externally; you saw a calendar invite for an offsite next Tuesday with a Big Tech recruiter visible.
- The networking team has not signed off on the cutover-week DNS change; the team lead has been on PTO twice in the last three weeks and is hard to pin down.
- The disaster-recovery (DR) test for the AWS landing zone has been deferred twice. The PM's plan has it "in week 26"; the Cloud Architect privately said "realistically week 30 at this point."
- The vendor doing the data-migration tooling delivery is six business days late on a contracted milestone. They have not formally raised it. Your PM's note in the contract review says "monitor."
- The sponsor's exec assistant told you in passing that the CIO "is not enthused about the secondary GCP plan" but the CIO has not said so in any meeting.
- An audit team from the parent company (an unannounced finding from last quarter) is tentatively scheduled to review the migration in week 30.

Use the workbook template to build a real, well-disciplined RAID log entry — specific, owned, with mitigation and review dates — for at least: 3 risks, 1 issue, 2 dependencies, and 1 assumption from the above. For each entry note: which would you escalate to the CIO via the steering deck, and which would you keep at the project level.$$)
) as x(lesson_id, title, brief)
where x.lesson_id is not null
  and not exists (
    select 1 from public.workbook_assignments existing
    where existing.lesson_id = x.lesson_id and existing.is_default = true
  );
