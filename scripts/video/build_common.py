# -*- coding: utf-8 -*-
"""Shared helpers for the narrated-slides pipeline (preview + final build).

Lesson-aware: every lesson lives under ``scripts/video/lessons/<slug>/`` with
its own ``segments.py`` (the single source of truth) plus generated ``slides/``,
``audio/``, ``narration/`` and ``.work/`` folders. The pipeline code here does
not change between lessons; only the per-lesson ``segments.py`` does.

    from build_common import resolve_lesson
    lesson = resolve_lesson("lesson-20-raid-logs")
    lesson.segments  # the SEGMENTS list from that lesson's segments.py
"""
import os, sys, subprocess, json, re, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
LESSONS_DIR = os.path.join(HERE, "lessons")
DEFAULT_LESSON = "lesson-20-raid-logs"

SILENT_HOLD = 3.0     # seconds for title/end cards with no narration
WPS = 2.7             # words/sec estimate for the silent preview
PAD = 0.8             # trailing breath after narration (final build)


def load_segments(lesson_dir):
    """Import SEGMENTS from <lesson_dir>/segments.py without polluting sys.path."""
    path = os.path.join(lesson_dir, "segments.py")
    spec = importlib.util.spec_from_file_location("segments", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SEGMENTS


class Lesson:
    """Resolved paths + segments for one lesson folder."""

    def __init__(self, slug):
        self.slug = slug
        self.dir = os.path.join(LESSONS_DIR, slug)
        if not os.path.isdir(self.dir):
            raise SystemExit(f"No lesson folder: {self.dir}")
        self.slides = os.path.join(self.dir, "slides")
        self.audio = os.path.join(self.dir, "audio")
        self.narr = os.path.join(self.dir, "narration")
        self.work = os.path.join(self.dir, ".work")
        self.segments = load_segments(self.dir)

    def slide_png(self, sid):
        return os.path.join(self.slides, f"{sid:02d}.png")

    def audio_mp3(self, sid):
        return os.path.join(self.audio, f"{sid:02d}.mp3")

    def out_mp4(self):
        return os.path.join(self.dir, f"{self.slug}.mp4")


def resolve_lesson(slug=None):
    """Lesson from an explicit slug, the LESSON env var, or the default."""
    return Lesson(slug or os.environ.get("LESSON") or DEFAULT_LESSON)


def lesson_from_argv(argv):
    """Pull a positional slug off argv (after flags), else the default."""
    positional = [a for a in argv[1:] if not a.startswith("-")]
    return resolve_lesson(positional[0] if positional else None)


def words(t):
    return len(t.split())


def estimate_dur(narr):
    if not narr.strip():
        return SILENT_HOLD
    return max(3.0, round(words(narr) / WPS + 0.6, 2))


def mp3_dur(path):
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", path],
        capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def probe_ok(path):
    """True if ffprobe can read a positive container duration. A killed
    encode leaves a corrupt 'moov atom not found' clip with no readable
    duration — that silently truncates the concat. Validate before relying
    on a clip."""
    try:
        return os.path.exists(path) and mp3_dur(path) > 0
    except Exception:
        return False


def write_narration_files(lesson):
    os.makedirs(lesson.narr, exist_ok=True)
    full = []
    for s in lesson.segments:
        if s["narration"].strip():
            p = os.path.join(lesson.narr, f"{s['id']:02d}.txt")
            with open(p, "w") as f:
                f.write(s["narration"].strip() + "\n")
            full.append(f"# Slide {s['id']:02d}\n{s['narration'].strip()}\n")
    with open(os.path.join(lesson.dir, "full_script.txt"), "w") as f:
        f.write("\n".join(full))


def write_segments_json(lesson):
    """Machine-readable export of the deck, committed alongside segments.py so
    the unit test (and any non-Python tooling) can validate it without
    importing Python."""
    data = [
        {"id": s["id"], "mode": s["mode"],
         "has_narration": bool(s["narration"].strip())}
        for s in lesson.segments
    ]
    with open(os.path.join(lesson.dir, "segments.json"), "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def srt_time(t):
    h = int(t // 3600); m = int((t % 3600) // 60)
    s = int(t % 60); ms = int((t - int(t)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(lesson, durations):
    """Slide-level captions from the narration text."""
    lines, t, idx = [], 0.0, 1
    for s, dur in zip(lesson.segments, durations):
        if s["narration"].strip():
            txt = re.sub(r"\s+", " ", s["narration"].strip())
            lines.append(f"{idx}\n{srt_time(t)} --> {srt_time(t+dur)}\n{txt}\n")
            idx += 1
        t += dur
    with open(os.path.join(lesson.dir, "captions.srt"), "w") as f:
        f.write("\n".join(lines))


def render_clip(slide_png, out_mp4, dur, audio_mp3=None, fps=30,
                w=1920, h=1080, preset="medium"):
    """One slide -> one normalized mp4 (with audio track, silent if none)."""
    common_v = ["-vf", f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
                       f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p",
                "-r", str(fps), "-c:v", "libx264", "-preset", preset,
                "-tune", "stillimage", "-pix_fmt", "yuv420p"]
    # Force IDENTICAL audio params on every clip (stereo, 44.1k AAC) so the
    # concat demuxer's stream-copy never drops a track. ElevenLabs MP3s are
    # mono; the silent cards were stereo — that mismatch silently killed the
    # audio in the concatenated file. -ac 2 -ar 44100 normalizes both paths.
    audio_out = ["-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2"]
    if audio_mp3 and os.path.exists(audio_mp3):
        # Pad the audio tail with silence (apad) and cap with -t dur, instead
        # of -shortest. -shortest ends the clip at the audio's end, which
        # drops the PAD breath (clip = mp3_dur, not mp3_dur + PAD) and shaves
        # ~0.8s/slide off the final video — a silent ~18s shortfall across the
        # deck. apad + -t holds each slide for its full intended duration.
        cmd = ["ffmpeg", "-y", "-loop", "1", "-i", slide_png, "-i", audio_mp3,
               "-map", "0:v:0", "-map", "1:a:0", *common_v, *audio_out,
               "-af", "apad", "-t", f"{dur:.3f}", out_mp4]
    else:
        cmd = ["ffmpeg", "-y", "-loop", "1", "-i", slide_png,
               "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
               "-map", "0:v:0", "-map", "1:a:0", *common_v, *audio_out,
               "-t", f"{dur:.3f}", out_mp4]
    subprocess.run(cmd, check=True, capture_output=True)


def vtt_time(s):
    h = int(s // 3600); m = int((s % 3600) // 60); sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}"


def _split_sentences(text):
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"“])", text.strip())
    return [p.strip() for p in parts if p.strip()]


def write_vtt(lesson):
    """Convert captions.srt -> captions.vtt with sentence-level cues.

    Splits each slide's narration (one long SRT cue) into sentence-level VTT
    cues by distributing the slide's time window across sentences proportional
    to character length, capped at ~7s per cue for on-screen readability.
    """
    srt_path = os.path.join(lesson.dir, "captions.srt")
    if not os.path.exists(srt_path):
        return  # build_video.py calls write_srt first; shouldn't happen

    # Parse the SRT written by write_srt.
    blocks = re.split(r"\n\s*\n", open(srt_path, encoding="utf-8").read().strip())
    cues = []
    for b in blocks:
        lines = b.strip().split("\n")
        ts = next((l for l in lines if "-->" in l), None)
        if not ts:
            continue
        a, c = ts.split("-->")
        def _srt_sec(t):
            t = t.strip().replace(",", ".")
            h, m, s = t.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
        start, end = _srt_sec(a), _srt_sec(c)
        idx = lines.index(ts)
        text = " ".join(l.strip() for l in lines[idx + 1:])
        cues.append((start, end, text))

    out = ["WEBVTT", ""]
    for start, end, text in cues:
        sents = _split_sentences(text) or [text]
        total = sum(len(s) for s in sents) or 1
        span = end - start
        t = start
        for sent in sents:
            dur = span * (len(sent) / total)
            seg_end = min(t + dur, end)
            out.append(f"{vtt_time(t)} --> {vtt_time(seg_end)}")
            out.append(sent)
            out.append("")
            t = seg_end

    vtt_path = os.path.join(lesson.dir, "captions.vtt")
    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))


def concat(clips, out_mp4, work_dir):
    os.makedirs(work_dir, exist_ok=True)
    listfile = os.path.join(work_dir, "concat.txt")
    with open(listfile, "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", listfile, "-c", "copy", out_mp4],
                   check=True, capture_output=True)
