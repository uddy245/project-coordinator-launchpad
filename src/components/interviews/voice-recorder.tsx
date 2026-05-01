"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_SECONDS = 60;

/**
 * Minimal voice recorder for mock-interview practice. Records up to 60
 * seconds via MediaRecorder, plays back, and lets the learner copy the
 * waveform-implied transcript into the textarea (we do not auto-transcribe
 * — the act of writing what you said is part of the practice).
 *
 * The recording itself is deliberately ephemeral: it lives in browser
 * memory only, never uploaded. Learners who want a record use the textarea
 * which IS persisted. This keeps the privacy story simple and the storage
 * footprint zero.
 */
export function VoiceRecorder({
  onElapsed,
  disabled,
}: {
  onElapsed?: (seconds: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount.
      stopTick();
      stopStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopTick() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setError(null);
    setElapsed(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick the first MIME type the browser actually supports.
      // Safari requires audio/mp4; Chrome/Firefox prefer webm+opus.
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const recorderOptions = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // Use the recorder's actual mimeType (may differ from requested if
        // the browser normalised it) so the Blob header matches the data.
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopStream();
      };

      recorder.start();
      setRecording(true);

      const startedAt = Date.now();
      tickRef.current = window.setInterval(() => {
        const next = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(next);
        onElapsed?.(next);
        if (next >= MAX_SECONDS) {
          stop();
        }
      }, 250);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Microphone access denied: ${err.message}`
          : "Couldn't access the microphone.",
      );
      stopStream();
    }
  }

  function stop() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    stopTick();
  }

  function reset() {
    stop();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setElapsed(0);
  }

  return (
    <div className="space-y-3 border border-rule bg-paper px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="kicker">Practise out loud · optional</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Record up to 60 seconds. Audio stays in your browser — nothing is
            uploaded. Listen back, then write what you said in the box below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!recording && !audioUrl ? (
            <Button type="button" size="sm" onClick={start} disabled={disabled}>
              ● Record
            </Button>
          ) : null}
          {recording ? (
            <Button type="button" size="sm" variant="outline" onClick={stop}>
              ■ Stop · {elapsed}s
            </Button>
          ) : null}
          {audioUrl && !recording ? (
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              ↺ New take
            </Button>
          ) : null}
        </div>
      </div>

      {recording ? (
        <div className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
          Recording · {elapsed}s / {MAX_SECONDS}s
        </div>
      ) : null}

      {audioUrl ? (
        <audio controls src={audioUrl} className="w-full">
          Your browser doesn&apos;t support audio playback.
        </audio>
      ) : null}

      {error ? (
        <div className="text-xs text-[hsl(var(--destructive))]">{error}</div>
      ) : null}
    </div>
  );
}
