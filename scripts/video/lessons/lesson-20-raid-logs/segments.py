# -*- coding: utf-8 -*-
"""
Lesson 20 — RAID Logs. Single source of truth for the video.

Each segment has:
  id        : ordered slide id (used for slides/NN.png, audio/NN.mp3, narration/NN.txt)
  mode      : visual template -> story | title | def | example | list | end
  title     : on-screen heading (or None)
  body      : list of strings / tuples, meaning depends on mode
  narration : the EXACT voiceover text for this slide (verbatim from the script)

Narration is taken verbatim from docs/scripts/lesson-20-raid-logs.md so the
authored voice is preserved. Edit narration here and re-run the pipeline.
"""

# Slide chrome labels used by render_slides.py (v2 design):
#   EYEBROW    — top-left lesson label (e.g. "LESSON 20")
#   LESSON_TAG — top-left lesson title beside the eyebrow dot
#   FOOTER     — legacy single-line label (retained for any v1 consumer)
EYEBROW = "LESSON 20"
LESSON_TAG = "RAID LOGS"
FOOTER = "Lesson 20 · RAID Logs"

SEGMENTS = [
    # ---------------- COLD OPEN (story, on-navy) ----------------
    dict(
        id=1, mode="title",
        title="RAID Logs",
        body=["Lesson 20", "The project's early warning system"],
        narration="",  # title card, silent 3s hold
    ),
    dict(
        id=2, mode="story",
        title=None,
        body=["A mistake I made.", "The mistake is the whole lesson."],
        narration=(
            "I want to start this lesson with a mistake I made, because the mistake "
            "is the whole lesson. Some years ago I was on a capital-markets operations "
            "project, coordinator-level role, and I noticed something about one of the "
            "client-side subject-matter experts. She was the only person on their team "
            "who genuinely understood a specific legacy calculation engine. And she was "
            "disengaging. She'd moved to a new role within her organization, and while "
            "officially she was still on our project, she was increasingly unavailable. "
            "Meetings she was supposed to join went unattended. Questions we sent her "
            "went unanswered for days."
        ),
    ),
    dict(
        id=3, mode="story",
        title=None,
        body=["I noticed in March.", "I noted it in my own file.",
              "I did not put it on the RAID log."],
        narration=(
            "I noticed this in early March. I noted it in my own working file. I did not "
            "put it on the project's RAID log, because the RAID log was reviewed in the "
            "weekly status meeting, and I did not want to be the junior coordinator who "
            "raised an issue about a named senior person on the client side."
        ),
    ),
    dict(
        id=4, mode="story",
        title=None,
        body=["The project slipped five weeks.",
              "I had seen it coming. For two months."],
        narration=(
            "In May, she effectively withdrew. No formal conversation. She just stopped "
            "responding. The calculation engine work ground to a halt. We spent six weeks "
            "identifying and briefing a less senior replacement. The project slipped five "
            "weeks. My P-M asked, in the post-mortem, how we hadn't seen this coming. "
            "I had seen it coming. For two months. I had watched a risk grow in my notebook "
            "and chosen not to put it in the place the project could actually act on it. "
            "This lesson is about the RAID log — what it is, how to fill it in honestly, "
            "and what it actually costs when you do it wrong. Which, as you just heard, "
            "I know from experience."
        ),
    ),
    # ---------------- WHAT RAID STANDS FOR (def) ----------------
    dict(
        id=5, mode="title",
        title="R · A · I · D",
        body=["Risks · Assumptions · Issues · Dependencies",
              "Four categories that might move your project. One log."],
        narration=(
            "RAID stands for four things: Risks, Assumptions, Issues, Dependencies. "
            "Four categories of thing that might move your project, tracked in one log."
        ),
    ),
    dict(
        id=6, mode="def",
        title="Risk",
        body=[("Might happen — hasn't yet.",
               "Has a probability and an impact. You watch it. You try to reduce one or "
               "the other. If it materializes, it's no longer a risk — it's an issue.")],
        narration=(
            "A risk is something that might happen but hasn't yet. It has a probability. "
            "It has an impact. You watch it. You try to reduce one or the other. If it "
            "materializes, it's no longer a risk — it's an issue."
        ),
    ),
    dict(
        id=7, mode="def",
        title="Issue",
        body=[("Has happened — affecting you now.",
               "Issues require action, not monitoring. Log issues as risks and the project "
               "fails to act on what's already happened. Log risks as issues and the project "
               "panics over what may never occur.")],
        narration=(
            "An issue is something that has happened and is affecting the project now. "
            "Issues require action, not monitoring. This distinction matters more than it "
            "sounds. When people log issues as risks, the project fails to act on things "
            "that have already happened. When people log risks as issues, the project "
            "panics over things that may never occur."
        ),
    ),
    dict(
        id=8, mode="def",
        title="Assumption",
        body=[("Taken as true without verifying.",
               "Every plan rests on assumptions. Naming them makes them examinable. A false "
               "assumption is a risk that materialized without ever being on the risk list.")],
        narration=(
            "An assumption is something the project is taking as true without having "
            "verified. Every plan rests on assumptions. Naming them makes them examinable. "
            "An assumption that turns out to be false is a risk that materialized without "
            "being on the risk list — which is exactly what hurts projects."
        ),
    ),
    dict(
        id=9, mode="def",
        title="Dependency",
        body=[("Something you need from outside your control.",
               "The vendor's deliverable. The stakeholder's decision. The compliance "
               "approval. Dependencies generate risks, but they need active coordination, "
               "not just monitoring.")],
        narration=(
            "A dependency is something the project needs from outside its direct control. "
            "The vendor's deliverable. The stakeholder's decision. The compliance approval. "
            "Dependencies usually generate risks, but they're worth tracking separately "
            "because they require active coordination rather than just monitoring. "
            "Some organizations use only risks and issues. Some lump assumptions into risks. "
            "None of that matters as much as what I'm about to tell you, which is how to "
            "actually write a good RAID entry."
        ),
    ),
    # ---------------- WHAT A GOOD ENTRY LOOKS LIKE (example) ----------------
    dict(
        id=10, mode="example",
        title="What most coordinators write",
        body=[("bad", '"Resource availability remains a risk."')],
        narration=(
            "Here's what most junior coordinators write when they add a risk: "
            "\"Resource availability remains a risk.\" "
            "This sentence is useless. It's true on every project ever run. It gives the "
            "reader no information about what to actually do. If the worst risk you can "
            "articulate is this, you haven't thought about your project hard enough."
        ),
    ),
    dict(
        id=11, mode="example",
        title="What a real risk entry looks like",
        body=[("good",
               "Client-side SME Jennifer Chen may become unavailable due to competing "
               "demands in her new role.\n\n"
               "Impact: the calculation-engine workstream loses its only domain expert.\n"
               "Probability: medium and rising (two meetings missed in three weeks).\n"
               "Owner: Rahul (tech lead) — identify a backup SME by April 12.\n"
               "Mitigation: secure contingent access from her manager this sprint.\n"
               "Next review: next Tuesday.")],
        narration=(
            "Here's what a real risk entry looks like. "
            "\"Client-side SME Jennifer Chen may become unavailable due to competing "
            "demands in her new role at the client. Impact: the calculation engine "
            "workstream loses its only domain expert. Probability: medium and rising, two "
            "meetings missed in the last three weeks. Owner: our technical lead, Rahul, to "
            "identify a backup SME by April twelfth. Mitigation: secure contingent access "
            "commitment from her manager before the current sprint ends. Next review: next "
            "Tuesday.\" Five things in that entry, and every one of them matters."
        ),
    ),
    dict(
        id=12, mode="list",
        title="Five things that matter",
        body=[
            ("1  Specific statement", "The actual risk, named — not \"resource risk.\""),
            ("2  Honest probability & impact", "The real number. Not softened so status goes green."),
            ("3  A single named owner", "A person. Rahul. No name means no owner."),
            ("4  A specific mitigation", "A concrete move with a date — not \"monitor closely.\""),
            ("5  A review date", "When we look again. Untouched for months = decoration."),
        ],
        narration=(
            "One: a specific statement of what might go wrong. Not \"resource risk\" — the "
            "actual risk, named. Two: an honest probability and impact. Not calibrated for "
            "politics. Not softened so the status goes green. The real number. Three: a "
            "single named owner. Not \"the team.\" Not \"we.\" A person. Rahul. If there's "
            "no name, there's no owner, and if there's no owner, the risk just sits there. "
            "Four: a specific mitigation plan. What the project is actually doing, or will "
            "do, to reduce probability or impact. Not \"monitor closely.\" A concrete move, "
            "with a date. Five: a review date. When will we look at this again? If it sits "
            "untouched for three months, it's not a risk log entry anymore. It's decoration. "
            "A good risk entry is a tool you could hand to a P-M who joined the project "
            "yesterday, and they could act on it. A bad risk entry is a sentence you wrote "
            "so the log wouldn't be empty."
        ),
    ),
    # ---------------- THE HARD PART (story) ----------------
    dict(
        id=13, mode="story",
        title=None,
        body=["The hard part isn't the format.",
              "It's the part where I said nothing for two months."],
        narration=(
            "Now we get to the hard part. Which is not the format. Which is not the "
            "template. Which is not any mechanical thing I can teach you in a video. "
            "The hard part is the part where I said nothing about Jennifer Chen for two "
            "months. Let me name the reasons people don't add things to the RAID log. "
            "They're predictable and they're every one of them wrong."
        ),
    ),
    dict(
        id=14, mode="list",
        title="Why people stay silent",
        body=[
            ("It feels political", "The SME is senior. Raising it feels like an accusation."),
            ("It feels like blame", "As if logging a risk caused it."),
            ("Maybe it resolves itself", "Maybe she comes back. Maybe someone else flags it."),
            ("I'm busy", "I'll get to it next week. The tracker will still be there."),
            ("I want more evidence", "I'm not sure yet. I don't want to cry wolf."),
        ],
        narration=(
            "You don't want to be the one who raises a politically sensitive issue. I get "
            "it. The SME is senior. Her manager is senior. Raising it feels like accusing "
            "someone. You fear that raising a risk implies blame for the situation. That if "
            "you log it, you'll be asked why the project has this risk, as if logging a "
            "risk caused it. You hope the problem will resolve itself. Maybe she'll come "
            "back. Maybe the cross-team pressure will ease. Maybe someone else will flag it "
            "first. You're busy. You'll get to it next week. The tracker will still be "
            "there. You want more evidence first. You're not sure yet. You don't want to "
            "cry wolf. Every one of these is a reason. None of them is a good reason."
        ),
    ),
    dict(
        id=15, mode="story",
        title=None,
        body=["The RAID log is a professional tool,",
              "not a personal judgment."],
        narration=(
            "The right posture — which my P-M taught me the hard way, after the Jennifer "
            "Chen thing blew up — is that the RAID log is a professional tool, not a "
            "personal judgment. Adding something to it is how a project says \"this "
            "deserves attention.\" It is not an accusation of anyone. It does not say you "
            "caused the risk. It does not say you think someone is incompetent. It says you "
            "noticed something that might affect the project, and you are doing the thing "
            "coordinators are paid to do, which is making it visible."
        ),
    ),
    dict(
        id=16, mode="story",
        title=None,
        body=["Silent watching is worse than nothing.",
              "When in doubt, put it on the log."],
        narration=(
            "Silent watching isn't neutral. Silent watching is worse than nothing, because "
            "your private awareness is a substitute for the project actually doing "
            "something. When you're watching alone, no one else is. When it's on the log, "
            "the team, the P-M, the sponsor can all see it and make choices. Put it on the "
            "log. If you're not sure, put it on the log. If it turns out to be nothing, you "
            "close it with a note. That's a thirty-second paperwork cost. The alternative, "
            "which I learned, is five weeks of slip and a post-mortem you remember a decade "
            "later."
        ),
    ),
    # ---------------- RISKS VS ISSUES (example) ----------------
    dict(
        id=17, mode="example",
        title="Same situation, two entries",
        body=[("split",
               "RISK   →   \"Jennifer might disengage.\"\n"
               "ISSUE  →   \"Jennifer has disengaged.\"")],
        narration=(
            "One more discipline before we get to the workbook. Risks and issues often "
            "describe the same underlying situation at different times. Jennifer might "
            "disengage. That's a risk. Jennifer has disengaged. That's an issue. When the "
            "risk materializes, you don't just leave the risk entry sitting there. You "
            "close the risk, explicitly, with a note that it became an issue, and you open "
            "a new issue entry with what's happening now and what the project is doing "
            "about it. This takes maybe sixty seconds. It is not optional."
        ),
    ),
    dict(
        id=18, mode="story",
        title=None,
        body=["Keep risks as risks. Convert when they materialize.",
              "A log read as theater stops being read at all."],
        narration=(
            "Projects that don't do this end up with RAID logs full of \"risks\" that are "
            "really issues the team is pretending haven't happened yet. The log gets read "
            "as theater rather than as a working tool. Everyone stops believing it. And the "
            "one time the risk entry was actually a live risk, nobody notices, because "
            "they've trained themselves to skim past them. Keep risks as risks. Convert "
            "them to issues when they materialize. Close what's genuinely closed. Be "
            "specific about dates and transitions."
        ),
    ),
    # ---------------- PRE-MORTEM (def/list) ----------------
    dict(
        id=19, mode="def",
        title="The pre-mortem",
        body=[("A practice worth stealing.",
               "A thirty-minute exercise at the start of a phase. The team imagines the "
               "phase has already failed: \"It is September. The milestone is missed. What "
               "happened?\" Then you work backwards.")],
        narration=(
            "One practice worth adopting, because it changes how your RAID log looks, is "
            "the pre-mortem. A pre-mortem is a thirty-minute exercise at the start of a "
            "project phase where the team imagines the phase has just failed. You say, "
            "\"It is September. The milestone is missed. What happened?\" Then you work "
            "backwards."
        ),
    ),
    dict(
        id=20, mode="example",
        title="Why it works",
        body=[("split",
               "Workshop answer:  \"vendor resource risk.\"        ← wallpaper\n\n"
               "Pre-mortem answer:  \"the vendor's key architect went on\n"
               "paternity leave mid-sprint and we hadn't backstopped.\"  ← useful")],
        narration=(
            "The questions this format draws out are different from the questions a "
            "traditional risk workshop draws out. People are much better at imagining "
            "concrete failure modes in scenarios than at brainstorming abstract risks. "
            "You'll get answers like \"the vendor's key architect went on paternity leave "
            "mid-sprint and we hadn't backstopped\" instead of \"vendor resource risk.\" "
            "The first is a useful RAID entry. The second is wallpaper. You don't have to "
            "formalize it. You can propose it casually. \"Let's take thirty minutes and "
            "imagine what could go wrong between now and the milestone.\" The output goes "
            "into the RAID log with the usual five-element discipline. Pre-mortems are "
            "underused and disproportionately valuable. Bring them to your next phase start."
        ),
    ),
    # ---------------- WHAT YOU'RE GOING TO DO (list) ----------------
    dict(
        id=21, mode="list",
        title="Your work for this lesson",
        body=[
            ("1  Download the template", "The starter RAID log in the Workbook tab — five-column structure."),
            ("2  Read the scenario", "~500 words. Once for context, once for risk signals."),
            ("3  Build the RAID log", "8–15 entries across R, A, I, D. Not 50 (no priority). Not 3 (no thought)."),
        ],
        narration=(
            "Here's your work for this lesson. First, you're going to download the starter "
            "RAID log template from the Workbook tab. It's an Excel file with the "
            "five-column structure we've been using: category, description, probability and "
            "impact, owner, mitigation, review date. The structure is boring on purpose. "
            "Structure is not where the skill lives. Second, you're going to read the "
            "scenario — it's in the Workbook tab, about five hundred words. A specific "
            "project, with specific people and constraints. Read it once for context, then "
            "once more for risk signals. Third, you're going to build the RAID log for that "
            "scenario. Aim for between eight and fifteen entries across R, A, I, and D. Not "
            "fifty entries — that's a sign you haven't prioritized. Not three — that's a "
            "sign you haven't thought hard enough."
        ),
    ),
    dict(
        id=22, mode="list",
        title="What we grade — five dimensions",
        body=[
            ("Completeness", "Every risk has all five elements."),
            ("Differentiation", "R is R, I is I, A is A, D is D. No miscategorization."),
            ("Mitigation realism", "Specific and actionable — not \"monitor closely.\""),
            ("Ownership", "A named person or explicit role. Not \"the team.\" Not \"TBD.\""),
            ("Living-artifact evidence", "Signs the log was updated over time, not all at once."),
        ],
        narration=(
            "And here's what we'll be grading on. Five dimensions. Completeness — every "
            "risk has all five elements I described. Owner, mitigation, impact, "
            "probability, review date. Differentiation — risks are risks, issues are "
            "issues, assumptions are assumptions, dependencies are dependencies. No "
            "miscategorization. Mitigation realism — mitigations are specific and "
            "actionable, not \"monitor closely.\" Ownership — every entry has a named "
            "person or explicit role. Not \"the team.\" Not \"T-B-D.\" Living-artifact "
            "evidence — your log shows evidence that it's been updated over time. If every "
            "entry looks like it was written at the same moment with no weekly progression, "
            "that's a tell."
        ),
    ),
    dict(
        id=23, mode="def",
        title="How submission works",
        body=[("Quiz: 10 items, 8 to pass. The artifact is the real deliverable.",
               "Upload your log and get per-dimension scores in about two minutes — each "
               "with a direct quote from your submission and one specific suggestion. Want "
               "a human second opinion? There's a button for that.")],
        narration=(
            "The quiz is ten items. Eight or better to pass. The artifact is the real "
            "deliverable — the RAID log itself, graded against those five dimensions. When "
            "you upload it, you'll get scores on each dimension within about two minutes, "
            "with a direct quote from your submission justifying each score and one "
            "specific suggestion for improvement. If you want a human to also review your "
            "submission, there's a button for that — use it whenever you want a second "
            "opinion."
        ),
    ),
    dict(
        id=24, mode="story",
        title=None,
        body=["The lesson isn't \"always log everything.\"",
              "It's that silent watching is worse than nothing."],
        narration=(
            "One last thing. I want you to notice something about the Jennifer Chen story I "
            "told you at the top. The lesson isn't \"always log everything.\" The lesson is "
            "that silent watching is worse than nothing. When you can see a risk and the "
            "project can't, your awareness is misleading the project. Putting it in the log "
            "is the move that costs you almost nothing and saves the project sometimes a "
            "great deal. When in doubt, put it on the log. Get your hands on the template. "
            "See you in the workbook."
        ),
    ),
    dict(
        id=25, mode="end",
        title="Lesson 20 · RAID Logs",
        body=["Next up: the Workbook tab"],
        narration="",  # end card, silent 3s hold
    ),
]
