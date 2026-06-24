# CONTENT-VIDEO-001: Narrated-slides lesson video pipeline + Lesson 20 video

**Milestone:** Content Production
**Dependencies:** LES-004 (video player + lesson_progress), CONTENT-001 (Lesson 20 script)
**Estimated session length:** long (90 min+, plan to split: build pipeline, then produce L20)
**Status:** not started

## Context

We have no one to film and no budget for a presenter, so lesson videos are
produced as **narrated slides**: on-brand slides rendered from the lesson
script, narrated by an ElevenLabs voice, stitched into an MP4 where each slide
is held for exactly the length of its narration. This produces a clean,
authoritative lesson video with zero filming, and scales to all 46 lessons.

This ticket builds the reusable pipeline under `scripts/video/` and uses it to
produce the real video for **Lesson 20 (RAID Logs)**, whose script already
lives at `docs/scripts/lesson-20-raid-logs.md`. Lesson 20's `lessons.video_url`
is currently NULL (see `docs/PUNCH_LIST.md`); this ticket closes that.

A validated reference implementation already exists outside the repo at
`../video-production/lesson-20-raid-logs/` (segments.py, render_slides.py,
generate_audio.py, build_video.py, build_common.py, plus rendered slides and a
silent preview). If that folder is reachable, copy it into `scripts/video/` to
save time and adapt paths. If not, build it from the spec below — it is
complete.

## Questions to resolve before starting

- [ ] `ELEVENLABS_API_KEY` available in the environment?
- [ ] `ELEVENLABS_VOICE_ID` chosen? Prefer an **instant voice clone** of the
      intended instructor (Voices > Add > Instant Voice Clone, ~1–2 min clean
      audio) over a stock voice, to keep the warm senior-PM tone.
- [ ] Bunny Stream account + `BUNNY_STREAM_LIBRARY_ID` available (the player
      already routes `iframe.mediadelivery.net` URLs)? If not, host the MP4 in
      the Supabase `lesson_videos` bucket and use the native `<video>` path.
- [ ] **Integrity check (founder decision):** the cold open is first-person
      ("a mistake I made… Jennifer Chen"). If that is the instructor's real
      experience, narrate it in their cloned voice. If it is composite, reword
      those lines to third person in the segment file before generating audio.

## Files to create

- `scripts/video/build_common.py` — shared ffmpeg/timing helpers
- `scripts/video/render_slides.py` — segments -> `slides/NN.png`
- `scripts/video/generate_audio.py` — ElevenLabs TTS -> `audio/NN.mp3`
- `scripts/video/build_video.py` — slides + audio -> final MP4 + `captions.srt`
- `scripts/video/make_preview.py` — silent estimated-timing preview (review aid)
- `scripts/video/lessons/lesson-20-raid-logs/segments.py` — per-lesson source of
  truth: ordered slides, each with `mode`, `title`, `body`, and verbatim
  `narration` taken from `docs/scripts/lesson-20-raid-logs.md`
- `scripts/video/README.md` — the 3-step run instructions
- `scripts/seed-production-video.ts` (or extend the existing production seed) —
  idempotent service-role UPDATE that sets `lessons.video_url` for `raid-logs`
- Add `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`,
  `BUNNY_STREAM_LIBRARY_ID` to `.env.example`

## Pipeline spec (build to this)

**Slides.** 1920x1080 PNG, one per narration chunk, rendered with Pillow.
Brand palette from `src/app/globals.css`: navy ink `#151D28`, crisp white
`#FFFFFF`, amber accent `#B8801A`, muted `#5A6473`, paper `#F4F5F7`, border
`#DCDFE4`. Fonts: a clean sans (Liberation/Arial/Inter) for headings/body,
a monospace (DejaVu Sans Mono) for RAID-entry example boxes. Footer on every
slide: "PROJECT COORDINATOR LAUNCHPAD" (left), "Lesson 20 · RAID Logs" (right).
Slide templates (`mode`): `title`, `story` (navy, centered quote for the
on-camera/personal beats), `def` (term + definition), `example` (mono card with
STRONG/WEAK label; auto-shrink font when the entry is long so it never spills
the card), `list` (amber bullets, head + subtext rows), `end`.

**Segment schema.** A Python list `SEGMENTS`, each item:
`dict(id:int, mode:str, title:str|None, body:list, narration:str)`. Narration
is verbatim from the script and is the single source of truth for both audio
and captions. Spell out things TTS mis-reads: "P-M", "T-B-D", "April twelfth".
Title/end cards have empty narration and hold 3s.

**Audio.** `generate_audio.py` POSTs each segment's narration to
`https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}` (model
`eleven_multilingual_v2`, voice_settings stability 0.5 / similarity 0.75),
writing `audio/NN.mp3`. Skip-existing flag for re-recording a single slide.

**Assembly.** `build_video.py`: per slide, duration = `ffprobe` mp3 length +
0.8s breath (or 3s for silent cards); render each as a normalized clip
(`-loop 1 -i slide.png -i audio.mp3 -r 30 -c:v libx264 -tune stillimage
-pix_fmt yuv420p -c:a aac -t <dur> -shortest`), then concat via the concat
demuxer with `-c copy`. **Validate each clip with ffprobe before concat and
re-render any that fail** (a killed encode leaves a corrupt "moov atom not
found" clip that silently truncates the final video — this bit the reference
build). Also emit `captions.srt` aligned to real audio durations.

## Acceptance criteria

- [ ] `python3 scripts/video/render_slides.py` produces 25 on-brand slides
- [ ] `python3 scripts/video/generate_audio.py` produces one MP3 per narrated
      slide using the configured ElevenLabs voice
- [ ] `python3 scripts/video/build_video.py` produces
      `lesson-20-raid-logs.mp4` (1920x1080, 30fps, H.264/AAC) whose total
      duration equals the sum of slide durations (~13–15 min) — verified with
      ffprobe, not assumed
- [ ] `captions.srt` generated and time-aligned to the audio
- [ ] MP4 uploaded to Bunny Stream **or** the `lesson_videos` Supabase bucket
- [ ] `lessons.video_url` for slug `raid-logs` set in **production** via the
      idempotent seed script (not the local seed), `is_published=true`
- [ ] Manual check on preview: video plays, and watching ≥90% flips
      `lesson_progress.video_watched=true` (native path) or the
      Mark-as-watched control works (iframe path)

## Tests required

- [ ] Unit `tests/unit/video-segments.test.ts` (or `.py`): every segment has a
      unique ascending id; non-card segments have non-empty narration; ids map
      1:1 to existing `slides/NN.png`
- [ ] Lint/typecheck clean; `pnpm test` green

## Definition of done

- [ ] Acceptance criteria checked
- [ ] Pipeline committed under `scripts/video/`, documented in its README
- [ ] Lesson 20 video live in prod, `video_url` populated, gate verified
- [ ] PUNCH_LIST item "Lesson 20 real video" checked off
- [ ] PR merged

## Reusing for future lessons

For each new lesson: write `docs/scripts/lesson-NN-<slug>.md`, copy
`scripts/video/lessons/lesson-20-raid-logs/segments.py` to a new lesson folder,
replace the `SEGMENTS` content (verbatim narration + slide specs), update the
footer label, then run render → generate → build → seed. The pipeline code does
not change between lessons; only the per-lesson `segments.py` does.
