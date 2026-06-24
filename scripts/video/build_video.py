# -*- coding: utf-8 -*-
"""
FINAL BUILD. Combines slides/NN.png + audio/NN.mp3 into one MP4, with each
slide held for exactly the length of its narration. Silent title/end cards
hold 3s. Also writes captions.srt aligned to the real audio durations.

    python3 build_video.py [lesson-slug]      # default: lesson-20-raid-logs
    -> lessons/<slug>/<slug>.mp4   (+ captions.srt)

Run generate_audio.py first so audio/ is populated.

Each per-slide clip is validated with ffprobe before concat and re-rendered
once if it fails — a killed encode leaves a corrupt 'moov atom not found'
clip that silently truncates the final video. The final MP4's duration is
then checked against the sum of slide durations and the build aborts on any
truncation.
"""
import os, sys
import build_common as bc

TOLERANCE = 1.5  # seconds: concat container rounding vs. sum of clip durations


def render_validated(slide, clip, dur, audio):
    """Render one clip and guarantee ffprobe can read it back, or die."""
    for attempt in (1, 2):
        bc.render_clip(slide, clip, dur, audio_mp3=audio)
        if bc.probe_ok(clip):
            return
        print(f"  clip {os.path.basename(clip)} failed probe "
              f"(attempt {attempt}) — re-rendering")
    sys.exit(f"clip {clip} still corrupt after re-render. Aborting.")


def main():
    lesson = bc.lesson_from_argv(sys.argv)
    os.makedirs(lesson.work, exist_ok=True)

    missing = [s["id"] for s in lesson.segments
               if s["narration"].strip()
               and not os.path.exists(lesson.audio_mp3(s["id"]))]
    if missing:
        sys.exit(f"Missing audio for slides {missing}. Run generate_audio.py first.")

    durs, clips = [], []
    for s in lesson.segments:
        slide = lesson.slide_png(s["id"])
        if s["narration"].strip():
            dur = bc.mp3_dur(lesson.audio_mp3(s["id"])) + bc.PAD
            audio = lesson.audio_mp3(s["id"])
        else:
            dur, audio = bc.SILENT_HOLD, None
        durs.append(dur)
        clip = os.path.join(lesson.work, f"clip_{s['id']:02d}.mp4")
        render_validated(slide, clip, dur, audio)
        clips.append(clip)
        print(f"slide {s['id']:02d}  {dur:6.2f}s")

    out = lesson.out_mp4()
    bc.concat(clips, out, lesson.work)
    bc.write_srt(lesson, durs)

    expected = sum(durs)
    actual = bc.mp3_dur(out)
    print(f"\nruntime: {int(expected // 60)}m {int(expected % 60)}s "
          f"(expected {expected:.1f}s, mp4 {actual:.1f}s)")
    if abs(actual - expected) > TOLERANCE:
        sys.exit(f"TRUNCATION: mp4 is {actual:.1f}s but slides sum to "
                 f"{expected:.1f}s (>{TOLERANCE}s off). Aborting.")
    print("wrote", out, "and captions.srt — duration verified, no truncation")


if __name__ == "__main__":
    main()
