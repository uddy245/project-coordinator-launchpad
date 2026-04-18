# Launchpad Starter — How to use this folder

This folder is the starter kit for the Project Coordinator Launchpad build. When you drop it into an empty project directory, the files are already in the locations Claude Code expects.

## What's in here

```
launchpad-starter/
├── BUILD_PLAN.md              ← Master build plan. Read this first, then keep it open as reference.
├── CLAUDE.md                  ← Drop at repo root. Claude Code reads this at the start of every session.
├── SETUP.md                   ← This file. Delete after reading.
├── .env.example               ← Copy to .env.local and fill in values. Never commit .env.local.
├── supabase/
│   └── migrations/
│       └── 20260101_init.sql  ← First migration. Creates profiles, lessons, rubrics, prompts tables with RLS.
└── docs/
    ├── rubrics/
    │   └── raid-v1.json       ← Lesson 20 (RAID Logs) grading rubric, 5 dimensions, versioned.
    ├── prompts/
    │   └── grade-raid-v1.md   ← Production grading prompt with tool-use pattern, temperature 0.
    └── tickets/
        ├── FND-001.md         ← M1 foundation tickets (8). One per session, in order.
        ├── FND-002.md
        ├── FND-003.md
        ├── FND-004.md
        ├── FND-005.md
        ├── FND-006.md
        ├── FND-007.md
        └── FND-008.md
```

## Day 1 — actual steps

1. **Create the GitHub repo** `project-coordinator-launchpad` (empty, no README).
2. **Clone it locally**, then drop the contents of `launchpad-starter/` into the repo root. Commit as `chore: initial starter kit`.
3. **Create Supabase projects** — one for production (`launchpad-prod`), one for preview (`launchpad-preview`). Note the URL and anon/service-role keys.
4. **Create a Vercel project**, connect the GitHub repo.
5. **Create a Stripe account**, enable test mode, create a one-time $749 product. Note the price ID.
6. **Copy `.env.example` to `.env.local`** and fill in every value. Never commit `.env.local`.
7. **Open Claude Code** in the repo folder (`claude` in your terminal).
8. **First session prompt:**
   ```
   Read @CLAUDE.md and @BUILD_PLAN.md sections 1–4. Read @docs/tickets/FND-001.md.
   Do NOT write code yet. Propose a plan for FND-001. Wait for my approval.
   ```
9. **Execute one ticket per session.** Merge each PR, `/clear` in Claude Code, move to FND-002. Do not batch tickets in a single session.

## After M1 (tickets FND-001 through FND-008)

Write the remaining tickets from `BUILD_PLAN.md` section 10 (AUTH, PAY, LES, GRADE, PORT — 30 more tickets) into `docs/tickets/` as individual files before starting each milestone. Each ticket text in the build plan is already in the right shape — copy it into `docs/tickets/<ID>.md`.

## Things you should NOT do

- Do not edit `20260101_init.sql` after it's been applied to a Supabase database. Create a new migration instead.
- Do not edit `raid-v1.json` or `grade-raid-v1.md` in place. Create `raid-v2.json` or `grade-raid-v2.md` and flip `is_current` in the DB.
- Do not commit `.env.local` or any file with real API keys.
- Do not skip the planning step at the start of each Claude Code session. That's what separates a good session from a wasted one.

## If something feels wrong

- Re-read `CLAUDE.md`. It's short on purpose.
- Re-read the relevant section of `BUILD_PLAN.md`.
- If Claude Code goes sideways mid-session, `git reset --hard` to last commit and `/clear`. Don't try to correct mid-spiral.
- If the same ticket fails twice, rewrite the ticket. It's probably under-specified.
