# -*- coding: utf-8 -*-
"""
STEP YOU RUN (needs your ElevenLabs account, spends credits).

Generates one MP3 per narrated slide into lessons/<slug>/audio/NN.mp3 using
the ElevenLabs text-to-speech API.

    pip install requests
    export ELEVENLABS_API_KEY="sk_..."     # from elevenlabs.io > Profile
    export ELEVENLABS_VOICE_ID="..."       # a cloned or stock voice id
    export ELEVENLABS_MODEL="eleven_multilingual_v2"   # warm narration tone
    python3 generate_audio.py [lesson-slug]            # default: lesson-20-raid-logs

Then run:  python3 build_video.py [lesson-slug]

Set SKIP_EXISTING=1 to keep already-recorded slides (re-record one by deleting
its audio/NN.mp3 first).
"""
import os, sys, time, requests
import build_common as bc

API_KEY  = os.environ.get("ELEVENLABS_API_KEY")
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID")
MODEL    = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")

# Voice settings tuned for calm, deliberate instruction. Adjust to taste.
VOICE_SETTINGS = {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": True,
}


def main():
    if not API_KEY or not VOICE_ID:
        sys.exit("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID first.")
    lesson = bc.lesson_from_argv(sys.argv)
    os.makedirs(lesson.audio, exist_ok=True)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {"xi-api-key": API_KEY, "Content-Type": "application/json"}
    for s in lesson.segments:
        narr = s["narration"].strip()
        if not narr:
            continue
        out = lesson.audio_mp3(s["id"])
        if os.path.exists(out) and os.environ.get("SKIP_EXISTING"):
            print(f"slide {s['id']:02d}  skip (exists)"); continue
        payload = {"text": narr, "model_id": MODEL,
                   "voice_settings": VOICE_SETTINGS}
        r = requests.post(url, headers=headers, json=payload, timeout=120)
        if r.status_code != 200:
            sys.exit(f"slide {s['id']:02d} failed: {r.status_code} {r.text[:200]}")
        with open(out, "wb") as f:
            f.write(r.content)
        print(f"slide {s['id']:02d}  ok  ({len(r.content)//1024} KB)")
        time.sleep(0.4)  # gentle on rate limits
    print(f"\nAll narrated slides done -> {lesson.audio}. "
          f"Next: python3 build_video.py {lesson.slug}")


if __name__ == "__main__":
    main()
