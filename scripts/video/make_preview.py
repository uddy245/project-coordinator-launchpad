# -*- coding: utf-8 -*-
"""
Build a SILENT preview MP4 with estimated slide timings — so you can judge
the look and pacing before generating any audio. No network needed.

    python3 render_slides.py [lesson-slug]    # if you haven't already
    python3 make_preview.py [lesson-slug]
    -> lessons/<slug>/preview_silent.mp4
"""
import os, sys
import build_common as bc


def main():
    lesson = bc.lesson_from_argv(sys.argv)
    bc.write_narration_files(lesson)
    os.makedirs(lesson.work, exist_ok=True)
    durs, clips = [], []
    for s in lesson.segments:
        dur = bc.estimate_dur(s["narration"])
        durs.append(dur)
        slide = lesson.slide_png(s["id"])
        clip = os.path.join(lesson.work, f"prev_{s['id']:02d}.mp4")
        if not bc.probe_ok(clip):
            bc.render_clip(slide, clip, dur, audio_mp3=None,
                           fps=15, w=1280, h=720, preset="ultrafast")
            print(f"slide {s['id']:02d}  ~{dur:5.1f}s  rendered")
        clips.append(clip)
    out = os.path.join(lesson.dir, "preview_silent.mp4")
    bc.concat(clips, out, lesson.work)
    bc.write_srt(lesson, durs)
    total = sum(durs)
    print(f"\nestimated runtime: {int(total//60)}m {int(total%60)}s")
    print("wrote", out)


if __name__ == "__main__":
    main()
