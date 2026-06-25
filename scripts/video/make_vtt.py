# -*- coding: utf-8 -*-
"""
Backfill captions.vtt for every lesson that has a captions.srt.

HTML5 <track> requires WebVTT, not SRT. Each slide's narration is one long SRT
cue (30-60s). This script splits it into sentence-level VTT cues, distributing
the slide's time window across sentences proportional to character length.
Output: lessons/<slug>/captions.vtt.

    python3 scripts/video/make_vtt.py           # all lessons
    python3 scripts/video/make_vtt.py lesson-20-raid-logs  # single lesson

Delegates to build_common.write_vtt so the logic stays in one place.
"""
import os, sys
import build_common as bc

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    positional = [a for a in sys.argv[1:] if not a.startswith("-")]
    if positional:
        slugs = positional
    else:
        slugs = sorted(
            d for d in os.listdir(bc.LESSONS_DIR)
            if os.path.isdir(os.path.join(bc.LESSONS_DIR, d))
        )

    n = 0
    for slug in slugs:
        lesson_dir = os.path.join(bc.LESSONS_DIR, slug)
        srt = os.path.join(lesson_dir, "captions.srt")
        if not os.path.exists(srt):
            print(f"skip {slug} — no captions.srt")
            continue
        try:
            lesson = bc.Lesson(slug)
        except SystemExit as e:
            print(f"skip {slug} — {e}")
            continue
        bc.write_vtt(lesson)
        print(f"wrote {slug}/captions.vtt")
        n += 1

    print(f"\n{n} captions.vtt file(s) written")


if __name__ == "__main__":
    main()
