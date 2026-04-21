# Interactive Exercise Patterns
## Turning the workbook into graded practice beyond the single artifact submission

The MVP build (§10.5, LES-001 through LES-010) has one artifact upload per lesson. That's the right scope for launch. But once the grading pipeline is proven, the workbook tab can host smaller interactive exercises that increase learner confidence before the big artifact submission and give us more signal on what they actually know.

This file describes five exercise patterns that reuse the MVP grading infrastructure with minimal new engineering. Each can be added lesson-by-lesson as a content-production task, not a new build engagement.

---

## Pattern 1 — "Spot the problem" critique

**What the learner sees:** A deliberately flawed RAID log (similar to the novice-level worked example). The learner's task is to identify the specific problems with it and suggest corrections.

**Input format:** Text-area response to a specific question: "Identify at least four problems with this RAID log and explain what you'd do to fix each."

**Grading approach:** Reuse the existing grading pipeline. The rubric here is different from the artifact rubric but same shape:

```json
{
  "rubric_id": "raid-critique-v1",
  "rubric_version": "1.0.0",
  "competency": "risk_diagnosis",
  "dimensions": [
    {
      "name": "problem_identification_count",
      "description": "How many distinct problems did the learner identify?",
      "anchors": {
        "1": "Zero to one problems identified.",
        "3": "Three to four problems identified; some substantial, some surface.",
        "5": "Five or more substantial problems correctly identified."
      }
    },
    {
      "name": "diagnosis_quality",
      "description": "Are the problems correctly diagnosed (not just symptoms)?",
      "anchors": {
        "1": "Diagnoses are surface — 'this entry is bad' without why.",
        "3": "Most diagnoses correctly identify the underlying issue (e.g., vague mitigation, missing owner).",
        "5": "All diagnoses identify the underlying issue and name the rubric dimension it affects."
      }
    },
    {
      "name": "correction_specificity",
      "description": "Are suggested corrections specific and actionable?",
      "anchors": {
        "1": "Corrections are vague ('make it better', 'add more detail').",
        "3": "Corrections are mostly specific with some vague entries.",
        "5": "Every correction is specific, actionable, and follows the rubric standards taught in the lesson."
      }
    }
  ],
  "pass_threshold": 3,
  "hire_ready_threshold": 4
}
```

**Why it works:** This exercise trains the diagnostic skill — recognizing bad work — which is directly upstream of producing good work. It uses the same grading call shape as the artifact grader; the prompt is different but the infrastructure is identical.

**Engineering delta from MVP:** A new prompt file (`docs/prompts/critique-raid-v1.md`), a new rubric file, and a text-area input UI component that posts to the same `createSubmission` action with a `submission_type='critique'` flag.

---

## Pattern 2 — Progressive-reveal worked example

**What the learner sees:** A scenario is presented. Then they're asked: "Before reading further, write down the top three risks you would log for this scenario and the mitigation you would propose for each."

After submitting their answer, the app reveals the "expert answer" — what an experienced PM logs — alongside the learner's answer. The AI grader compares the two and provides feedback on where the learner's thinking aligned, where it missed, and where the learner caught something the expert didn't.

**Input format:** Three free-text risk+mitigation pairs.

**Grading approach:** Two-part grading call:
1. Score the learner's three entries against the rubric dimensions (using the standard RAID rubric adapted for a smaller submission).
2. Compare against a reference "expert answer" — identify alignments, gaps, and additions.

**Why it works:** The progressive reveal is motivating — learners are pulled to see how they did. The comparison against the expert answer is more useful than a rubric score alone, because it shows thinking patterns they can internalize.

**Engineering delta from MVP:** A new prompt that takes both the learner's answer and the expert reference. Reference answers become a new content asset — one per exercise — stored alongside the rubric.

---

## Pattern 3 — "Is this a risk?" rapid-fire classification

**What the learner sees:** A series of 8–12 short statements, each one describing a situation. For each, the learner classifies it as R / A / I / D / Not RAID-worthy.

**Input format:** A sequence of single-select questions, quiz-style.

**Grading approach:** This is quiz-shaped, not AI-graded. Answer key is deterministic. Uses the existing `quiz_items` infrastructure — it's a second quiz, not a new UI.

**Why it works:** Differentiation is a core competency (rubric dimension `risk_differentiation`). Learners who struggle with differentiation on their artifact usually struggle because they haven't practiced the classification enough. This exercise builds that pattern recognition fast.

**Engineering delta from MVP:** Zero — this is just more quiz items. The MVP quiz infrastructure handles it. Just add a second quiz_set per lesson.

**Sample items:**

| # | Statement | Correct class | Why |
|---|---|---|---|
| 1 | The vendor has missed two deliverables in the last three weeks. | Issue | Already happened, actively affecting project. |
| 2 | The data migration will take 4 weeks, based on the last similar project. | Assumption | Unverified belief the project is planning on. |
| 3 | We need compliance team sign-off before go-live. | Dependency | External party must provide something. |
| 4 | Our test environment may become unavailable during the Q3 infrastructure maintenance window. | Risk | Might happen, has probability and impact. |
| 5 | The weather might be nice at the team offsite. | Not RAID-worthy | Not material to project outcomes. |

---

## Pattern 4 — Guided workshop simulation

**What the learner sees:** A "pre-mortem workshop" simulation. The app presents a project scenario, then walks the learner through a simulated 30-minute workshop. At each step — framing, silent reflection, round-robin share, clustering, prioritization, capture — the app prompts the learner as if they were the facilitator, and responds as if it were a team of participants.

**Input format:** Multi-turn free-text responses as the learner facilitates each phase of the workshop.

**Grading approach:** More complex. This exercise exits with a graded transcript — the AI reviews the full session and scores the learner on facilitation quality. Rubric dimensions would include: structure adherence, follow-up quality, capture discipline, time management (was each phase kept within time?), inclusion (did the facilitator draw out quieter voices?).

**Why it works:** Facilitation is a skill the video can only partially teach. Simulation is how you build it. This is more ambitious than the other patterns and maps to the "day-in-the-life simulation" roadmap item in §16 (post-MVP, Weeks 29–34).

**Engineering delta from MVP:** Meaningful. Multi-turn conversation means session state management, prompt chaining (each learner turn informs the next AI response), and a more complex grading pass over the full transcript. This is a post-MVP build, not a content-only addition.

**Scope signal:** This is a Lesson 20 exercise only if Lesson 20 is chosen as the simulation showpiece. More likely this pattern lands first on lessons about running meetings (Ch 11) or facilitation specifically. For Lesson 20 in the MVP, skip this pattern; for a later premium track, it's a differentiator.

---

## Pattern 5 — Peer-calibration (async)

**What the learner sees:** After submitting their own artifact and receiving grading, they are shown (with permission / anonymization) two other learners' submissions at different score bands — one near their own, one at hire-ready. The app asks them to rate the other two submissions on one or two specific dimensions, then reveals the AI's grading of those submissions for comparison.

**Input format:** Slider / single-select for each dimension, plus a short text response explaining their reasoning.

**Grading approach:** Not AI-graded. The exercise is that the learner sees how their own rating aligns with the AI grader and with the "hire-ready" anchor. Calibration is the learning outcome, not a score.

**Why it works:** Learners learn what hire-ready looks like by rating it and comparing their rating to the standard. This is how graders are trained in academic contexts, and it works. It also socializes the standard — learners see other learners' work (with consent) and build a mental library of what good looks like.

**Engineering delta from MVP:** Moderate. Requires a consent flow at submission time ("may we use your submission as a calibration sample for future learners?"), an anonymization layer on name fields, and a new `calibration_samples` table linking to anonymized submissions. Not an MVP addition but an early post-MVP enhancement.

**Privacy caveat:** Careful implementation is required — anonymization must be robust, consent must be meaningful, and learners must be able to withdraw their submission from the sample pool at any time. This is a post-launch feature that benefits from real legal review.

---

## Sequencing the exercises in Lesson 20

A learner going through the full workbook would ideally encounter these in order:

1. **Rapid-fire classification (Pattern 3)** — builds basic differentiation fluency. 5 minutes, feels like a warm-up.
2. **Spot the problem critique (Pattern 1)** — builds diagnostic skill on a flawed sample. 15 minutes.
3. **Progressive-reveal worked example (Pattern 2)** — builds constructive skill with guided calibration. 20 minutes.
4. **Full artifact submission** — the MVP assessment, now with three rounds of scaffolding behind it. 45 minutes.
5. **Peer-calibration (Pattern 5, post-submission)** — calibration reinforcement after their own work is graded. 10 minutes.

Total lesson time with full exercise stack: about 90 minutes learner time, plus video. Without the exercises (MVP shape): about 60 minutes. The 30-minute delta is what the exercises buy, and the confidence / competence boost is substantial.

---

## MVP vs. post-MVP stance

**In the MVP (Weeks 1–12):**
- Ship the single artifact submission with the five-dimension rubric.
- Ship the 10-item quiz.
- Do NOT build any of these five exercise patterns. The MVP's job is to prove the grading pipeline on the artifact. Interactive exercises are scope that distracts from that proof.

**In the first post-MVP phase (Weeks 13–20, during content mass-production):**
- Add Pattern 3 (rapid-fire classification) — zero engineering, just more quiz items. Can be done per-lesson as content.
- Add Pattern 1 (spot the problem critique) — small engineering delta, significant learning boost.

**In the second post-MVP phase (Weeks 21+):**
- Add Pattern 2 (progressive reveal) and Pattern 5 (peer-calibration) — meaningful but tractable engineering.

**In the premium / differentiator phase:**
- Add Pattern 4 (simulation) — the showpiece exercise for lessons where it fits, the most engineering-heavy.

---

## How this maps to the Launchpad product narrative

The MVP proves the grading pipeline on one artifact per lesson. The post-MVP trajectory layers on scaffolding that makes each lesson a richer learning experience — more practice, more calibration, more confidence at artifact submission time. Each pattern is a separately-shippable increment that compounds the product's perceived value without rewriting the foundation.

The handbook chapters are the source material for all of it. Every exercise pattern extracts a different learning dimension from the same chapter. One chapter yields: a video, a scenario, a starter template, three worked examples, ten quiz items, twenty calibration fixtures, eight interview questions, ten classification items, one critique prompt, one progressive-reveal exercise, and optionally one workshop simulation. That is ~45 distinct learning artifacts per chapter, all produced from ~7,000 words of source writing.

This is the multiplier the handbook unlocks: roughly 6–8 hours of product content per hour of chapter writing, depending on how much exercise scaffolding you choose to build.
