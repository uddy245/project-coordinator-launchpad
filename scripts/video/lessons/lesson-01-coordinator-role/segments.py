# -*- coding: utf-8 -*-
"""
Lesson 1 — What a Project Coordinator Actually Does.
Single source of truth for the video. Narration is verbatim from
docs/scripts/lesson-01-coordinator-role.md.

EYEBROW / LESSON_TAG drive the slide chrome (read by render_slides.py).
"""

EYEBROW = "LESSON 1"
LESSON_TAG = "THE COORDINATOR ROLE"

SEGMENTS = [
    dict(
        id=1, mode="title",
        title="The Real Job",
        body=["Lesson 1", "What a project coordinator actually does"],
        narration="",
    ),
    # ---------------- COLD OPEN ----------------
    dict(
        id=2, mode="story", title=None,
        body=["My first real day.",
              "119 emails — almost none of them for me. A few of them for me.",
              "I couldn't yet tell the difference."],
        narration=(
            "I want to start with my first real day as a coordinator, because some "
            "version of it is coming for you, and because the whole lesson is hiding "
            "inside it. I got to the office early, made a coffee I didn't drink, and "
            "opened an inbox with a hundred and nineteen unread emails. They'd given me "
            "the login two days before I started, which had been enough time for me to be "
            "copied on what looked like every email at the firm. Most of them weren't for "
            "me. A few of them were. I could not yet tell the difference."
        ),
    ),
    dict(
        id=3, mode="story", title=None,
        body=["“Can you capture the decisions?”",
              "I wrote down everything for forty minutes.",
              "That's a transcript — not minutes."],
        narration=(
            "At nine, I walked into a room where seven people were already arguing about "
            "a vendor invoice. Someone handed me a notebook and said, \"Can you capture "
            "the decisions?\" I said yes. And then I wrote down everything anyone said for "
            "forty minutes — which, it turns out, is not the same thing as capturing "
            "decisions. I found that out when the P-M — who'd become the best boss I ever "
            "had, though I didn't know it yet — read my minutes and said, gently, \"This "
            "is a transcript. I need you to tell me what we decided, and what's supposed "
            "to happen next.\" I rewrote them. The second version had three actions, two "
            "decisions, and one open question. She nodded and said, \"Better. Send it "
            "out.\""
        ),
    ),
    dict(
        id=4, mode="story", title=None,
        body=["The job wasn't the job description.",
              "And I had no idea how to do it."],
        narration=(
            "By the end of that day I understood two things I hadn't understood that "
            "morning. The first was that the job was not what the job description said it "
            "was. The second was that I had no idea how to do it. This lesson is about "
            "the first one."
        ),
    ),
    # ---------------- POSTING VS WORK ----------------
    dict(
        id=5, mode="statement", title=None,
        body=["The posting describes about a quarter of the job."],
        narration=(
            "Go and read ten coordinator job postings. They're remarkably similar. "
            "They'll tell you the coordinator supports the project manager, maintains "
            "schedules and documentation, records minutes, follows up on actions, tracks "
            "risks, and liaises with stakeholders. None of that is wrong. All of it is "
            "thin. Together, those lines describe maybe a quarter of the actual work. The "
            "job description leaves out six things — six things that, in practice, will "
            "define your career. They're not tasks. They're roles you occupy whether "
            "anyone tells you so or not. Let me name all six, because the moment you can "
            "see them, you start doing the job instead of the checklist."
        ),
    ),
    # ---------------- SIX TRUTHS ----------------
    dict(
        id=6, mode="list", title="The six truths · part one",
        body=[
            ("Information router", "First stop for every question — because you know who does."),
            ("Memory of the project", "Your notes don't forget what was decided in July."),
            ("Defense against drift", "You catch the two-week slips before they stack up."),
        ],
        narration=(
            "One. You are the information router. When a question comes in — from a "
            "sponsor, a vendor, an analyst, a finance partner, a panicked colleague — you "
            "are the first person they come to. Not because you have the answer. Often "
            "you don't. But because you're the one who will know who does, or can find "
            "out, or can at least say, credibly, \"I'll come back to you by end of day.\" "
            "You are the thing that keeps the project's nervous system firing. Two. You "
            "are the memory of the project. People forget what was decided three weeks "
            "ago. You don't get to forget — or rather, you're human, so you do, but your "
            "notes don't. The coordinator who can answer \"what did we decide about the "
            "integration approach in July?\" in under four minutes is the coordinator who "
            "gets promoted. Three. You are the first line of defense against schedule "
            "drift. The P-M sets the schedule. You're the one who notices, a week later, "
            "that tasks are quietly sliding. Most projects don't fail from one dramatic "
            "event. They fail from two-week slips that were nobody's job to escalate, "
            "stacked up until they were unrecoverable."
        ),
    ),
    dict(
        id=7, mode="list", title="The six truths · part two",
        body=[
            ("Author of the record", "A VP who's never met you judges you by your minutes."),
            ("Relationship maintenance", "Friction-reduction is real work. Projects die of friction."),
            ("Shock absorber", "Absorb it well and you're indispensable, not a doormat."),
        ],
        narration=(
            "Four. You are the author of the record. Status reports go out under the "
            "P-M's name. Minutes go out under yours. Most of the written surface of the "
            "project — the paragraphs decision-makers actually read — is written by you. "
            "A senior vice-president who has never met you forms an opinion about the "
            "project, and about you, every single time you send a document. Five. You are "
            "the relationship maintenance function. You send the invite. You confirm the "
            "room. You remind the grumpy finance partner — politely, for the third time — "
            "that the meeting moved to Thursday. That's friction-reduction, and it is "
            "real work, not secretarial work. Projects die from accumulated friction more "
            "often than from any single catastrophe. Six — and this one catches people by "
            "surprise — you are the shock absorber. When the P-M is frustrated, they vent "
            "to you. When a stakeholder is furious, they complain to you. You absorb, a "
            "hundred times a week, the friction that would otherwise travel upward into "
            "senior attention. Done badly, this makes you a doormat. Done well, it makes "
            "you indispensable. None of that is in the description. All of it is the job."
        ),
    ),
    # ---------------- THREE ROLES ----------------
    dict(
        id=8, mode="list", title="Three roles inside the title",
        body=[
            ("Administrative", "Logistics & documents. Ceiling: senior coordinator."),
            ("Hybrid coordinator-analyst", "Schedule, status, RAID, change. Ceiling: project manager."),
            ("Aspiring-PM", "Running a workstream under a coordinator title."),
        ],
        narration=(
            "Now something practical. \"Project coordinator\" covers at least three "
            "distinct roles, and which one you're in matters more than the title on your "
            "LinkedIn. The administrative coordinator handles logistics — scheduling, "
            "rooms, document libraries, formatting, attendance. Lightweight artifacts. "
            "The ceiling, in most organizations, is senior coordinator. It's respectable, "
            "but on its own it won't make you a P-M. The hybrid coordinator-analyst is the "
            "most common role today, and probably the one you're in. Everything the "
            "administrative coordinator does, plus: you maintain the schedule, produce the "
            "status report, keep the RAID log current, draft change requests, run the "
            "working-level meetings when the P-M can't. You're making dozens of small "
            "judgment calls a day. The ceiling here, if you're good, is project manager. "
            "And the aspiring-P-M coordinator is when you're actually running something — "
            "a workstream, a small project — but with a coordinator title, because you're "
            "not yet senior enough to own it outright. You're training to be a P-M, and "
            "you should treat every day that way."
        ),
    ),
    dict(
        id=9, mode="statement", title=None,
        body=["Know which one you're in.",
              "If it's not the one you want — out-deliver, don't complain."],
        narration=(
            "So know which one you're in. Ask your manager directly: what role am I "
            "actually in, and what's the scope of my decision-making? If the answer is "
            "vague, push. And if you're not in the role you want, the path is almost never "
            "to complain. It's to do the role you're in flawlessly, and quietly do small "
            "pieces of the next role visibly, before anyone asks. The best coordinators "
            "I've managed did exactly that. Guess which ones got promoted."
        ),
    ),
    # ---------------- WHAT YOU'RE PAID FOR ----------------
    dict(
        id=10, mode="statement", title=None,
        body=["Tasks are the medium.", "They are not the substance."],
        narration=(
            "Here's the shift that's the beginning of thinking like a P-M. Tasks are the "
            "medium. They are not the substance. You're not paid to take minutes. You're "
            "paid to produce a reliable, accurate written record. You're not paid to "
            "maintain a schedule. You're paid to make sure decisions made on its basis are "
            "sound. You're not paid to chase people. You're paid to close the loops that "
            "would otherwise stay open. Stop measuring your week by tasks completed. Start "
            "measuring it by the outputs those tasks produced."
        ),
    ),
    dict(
        id=11, mode="list", title="What you're actually paid for",
        body=[
            ("Reliability", "If you say it, it gets done — on time, to standard."),
            ("Signal clarity", "People leave knowing what's true and what to do."),
            ("Pattern recognition", "You notice something's off before it blows up."),
            ("Judgment under ambiguity", "You act well when the instructions are incomplete."),
            ("Cumulative trust", "Built only by habits, for long enough. No shortcuts."),
        ],
        narration=(
            "Five things you're actually paid for, in order of how underrated they are. "
            "Reliability — if you say you'll do it, it gets done, on time, to standard. "
            "Every P-M remembers who was reliable and forgets who was clever but flaky. "
            "Signal clarity — people leave your communications knowing what's true, what "
            "matters, and what they need to do. Pattern recognition — you notice when "
            "something's off before it blows up. Judgment under ambiguity — you act well "
            "when the instructions are incomplete. And cumulative trust — built by every "
            "small thing done competently, for long enough that a reputation forms. There "
            "are no shortcuts to that one. Only habits."
        ),
    ),
    # ---------------- FOUR LAYERS ----------------
    dict(
        id=12, mode="example", title="One moment, four layers", file="steering-committee",
        body=[("scene",
               "Steering committee. The finance director quotes a run rate "
               "that is sixty thousand a month off.\n\n"
               "The PM doesn't correct him. A decision is about to be made "
               "on the wrong number.\n\n"
               "What do you do?")],
        narration=(
            "Let me show you all of this in one tiny moment, because the craft has four "
            "layers and they show up together. You're in a steering committee. The "
            "finance director quotes a run rate that's sixty thousand a month off. The "
            "P-M doesn't correct him. A decision is about to be made on the wrong number. "
            "What do you do?"
        ),
    ),
    dict(
        id=13, mode="list", title="The four layers",
        body=[
            ("Conceptual", "You know the number's wrong, and why it matters."),
            ("Procedural", "Flag it quietly; draft minutes that protect the record."),
            ("Judgment", "Material? Yes. Escalate in the room? No. RAID it? Yes."),
            ("Identity", "No drama — and he asks for you by name next time."),
        ],
        narration=(
            "Layer one, conceptual: you understand run rate, baseline, variance — you "
            "know the number is wrong and why it matters. Layer two, procedural: you flag "
            "it quietly to the P-M, and you draft the minutes to protect the record "
            "without re-litigating it in the room. Layer three, judgment: is it material? "
            "Yes. Is it political? Possibly. Escalate right now, in the room? No. Put it "
            "on the RAID log? Yes. Layer four, identity: you do all of this without drama "
            "— and two weeks later, the director asks for you by name on his next "
            "initiative. Most coordinators only ever operate at the first two layers. The "
            "ones who work all four, habitually, are on a P-M track whether anyone has "
            "told them so or not."
        ),
    ),
    # ---------------- THE CEILING ----------------
    dict(
        id=14, mode="story", title=None,
        body=["The ceiling isn't skill.", "It's judgment and identity."],
        narration=(
            "One hard truth before your work for this lesson. Most coordinators hit a "
            "ceiling somewhere around eighteen to twenty-four months in. And here's the "
            "thing — it is almost never a ceiling of skill. It's a ceiling of judgment "
            "and identity. They wait for instruction. They execute but they don't own. "
            "Their written voice is hesitant — full of \"I think\" and \"if that's "
            "okay.\" They escalate the things that don't need escalating and miss the "
            "things that do. The coordinators who walk straight through that ceiling are "
            "the ones who treat the work as a craft, not a checklist. That choice is "
            "available to you from day one."
        ),
    ),
    # ---------------- WORKBOOK ----------------
    dict(
        id=15, mode="list", title="Your work for this lesson",
        body=[
            ("Map your role", "Which of the three are you in — and which do you want in a year?"),
            ("Pick one thing you're paid for", "Choose one of the five and show it this week, visibly."),
        ],
        narration=(
            "Here's your work for this lesson. In the workbook, you'll map your own role "
            "honestly against the three I described — which one are you actually in, and "
            "which one do you want to be in a year from now. Then you'll take the five "
            "things you're paid for, pick one, and write down how you'd demonstrate it "
            "this week in a way someone would notice."
        ),
    ),
    dict(
        id=16, mode="story", title=None,
        body=["The task was “take minutes.”",
              "The job was judgment about what mattered."],
        narration=(
            "The reason I started with that transcript I wrote on my first day is that "
            "it's the whole lesson in miniature. The task was \"take minutes.\" The job "
            "was \"tell us what we decided and what happens next.\" Everyone in that room "
            "could take dictation. The work — the thing I was actually being paid for — "
            "was the judgment about what mattered. That gap, between the task and the "
            "work, is the entire craft. Spend this program learning to live on the right "
            "side of it. See you in the workbook."
        ),
    ),
    dict(
        id=17, mode="end",
        title="Lesson 1 · The Coordinator Role",
        body=["Next up: the Workbook tab"],
        narration="",
    ),
]
