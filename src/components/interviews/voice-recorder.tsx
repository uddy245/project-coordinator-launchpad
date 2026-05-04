"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_SECONDS = 60;

// English accents the Web Speech API recognises. Picking the variant that
// matches the speaker's accent dramatically improves transcription quality —
// Chrome's en-US acoustic model otherwise mis-hears words like "scope" as
// "socks", "risk" as "Richard", etc., for non-American speakers.
const SPEECH_LANGS: { value: string; label: string }[] = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-NG", label: "English (Nigeria)" },
  { value: "en-IN", label: "English (India)" },
  { value: "en-ZA", label: "English (South Africa)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-IE", label: "English (Ireland)" },
  { value: "en-NZ", label: "English (New Zealand)" },
  { value: "en-PH", label: "English (Philippines)" },
  { value: "en-SG", label: "English (Singapore)" },
];

const LANG_STORAGE_KEY = "voice-recorder-lang";

function pickInitialLang(): string {
  if (typeof window === "undefined") return "en-US";
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (stored && SPEECH_LANGS.some((l) => l.value === stored)) return stored;
  // Fall back to the browser's locale if it's a supported English variant.
  const navLang = navigator.language;
  if (navLang && SPEECH_LANGS.some((l) => l.value === navLang)) return navLang;
  return "en-US";
}

/**
 * Dual-stream voice recorder for mock-interview practice.
 *
 * Two things happen simultaneously when the learner clicks Record:
 *  1. MediaRecorder — captures audio for playback (browser memory only, never uploaded)
 *  2. SpeechRecognition — transcribes speech in real time (browser-native, free, no API)
 *
 * When recording stops, the transcript is passed to the parent via `onTranscript`
 * so it can auto-fill the response textarea. The learner then reviews / edits the
 * text and submits it for Claude grading — the audio itself is never sent anywhere.
 *
 * Graceful degradation: SpeechRecognition is not available in Firefox. In that case
 * no transcript is produced and the learner falls back to typing manually.
 *
 * MIME type detection: Safari requires audio/mp4; Chrome/Firefox prefer webm+opus.
 * We probe MediaRecorder.isTypeSupported() at start time and pick accordingly.
 */

// Minimal Web Speech API type declarations. TypeScript's DOM lib includes
// these in recent versions, but they may not be present in all Next.js build
// environments. We define just enough here to avoid depending on the ambient
// SpeechRecognition global being present.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionCtor {
  new (): ISpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionCtor | undefined;
    webkitSpeechRecognition: SpeechRecognitionCtor | undefined;
  }
}

export function VoiceRecorder({
  onElapsed,
  onTranscript,
  disabled,
}: {
  onElapsed?: (seconds: number) => void;
  onTranscript?: (text: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Live transcript preview while recording (interim + final results combined).
  const [liveTranscript, setLiveTranscript] = useState("");
  // Whether SpeechRecognition is available in this browser.
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  // Selected English variant for the recogniser. Persisted in localStorage so
  // the user only has to set it once.
  const [lang, setLang] = useState<string>("en-US");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  // Accumulate final (committed) transcript segments.
  const finalTranscriptRef = useRef("");
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Detect browser support once on mount.
    const supported =
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);
    setHasSpeechSupport(supported);
    setLang(pickInitialLang());

    return () => {
      // Cleanup on unmount.
      stopTick();
      stopStream();
      stopRecognition();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
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

  function stopRecognition() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore — stop() throws if recognition is already stopped.
    }
    recognitionRef.current = null;
  }

  function startRecognition() {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = () => {
      // Non-fatal — recording continues even if transcription drops.
    };

    recognition.onend = () => {
      // Called when stop() completes. Nothing to do; we read
      // finalTranscriptRef in recorder.onstop instead.
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // If start() throws (e.g. already running), just continue without it.
      recognitionRef.current = null;
    }
  }

  async function start() {
    setError(null);
    setElapsed(0);
    setLiveTranscript("");
    finalTranscriptRef.current = "";
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
      const mimeType =
        [
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
        // Blob for playback — audio stays in browser memory.
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopStream();

        // Fire transcript callback with the committed text.
        const transcript = finalTranscriptRef.current.trim();
        if (transcript && onTranscript) {
          onTranscript(transcript);
        }
      };

      // Start both streams together.
      recorder.start();
      startRecognition();
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
          : "Couldn't access the microphone."
      );
      stopStream();
    }
  }

  function stop() {
    // Stop speech recognition first so its final results land before
    // recorder.onstop fires and we read finalTranscriptRef.
    stopRecognition();
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
    setLiveTranscript("");
    finalTranscriptRef.current = "";
  }

  return (
    <div className="space-y-3 border border-rule bg-paper px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="kicker">Practise out loud · optional</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasSpeechSupport
              ? "Record up to 60 seconds. Your speech is transcribed live and auto-fills the box below — audio stays in your browser, nothing is uploaded."
              : "Record up to 60 seconds. Audio stays in your browser — nothing is uploaded. Listen back, then write what you said in the box below."}
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
        <div className="space-y-2">
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
            Recording · {elapsed}s / {MAX_SECONDS}s
          </div>
          {hasSpeechSupport && liveTranscript ? (
            <p className="text-xs italic text-muted-foreground">{liveTranscript}</p>
          ) : null}
        </div>
      ) : null}

      {audioUrl ? (
        <audio controls src={audioUrl} className="w-full">
          Your browser doesn&apos;t support audio playback.
        </audio>
      ) : null}

      {hasSpeechSupport && !recording ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3 text-xs text-muted-foreground">
          <label htmlFor="speech-lang" className="font-mono uppercase tracking-[0.14em]">
            Accent
          </label>
          <select
            id="speech-lang"
            value={lang}
            onChange={(e) => {
              const next = e.target.value;
              setLang(next);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(LANG_STORAGE_KEY, next);
              }
            }}
            disabled={disabled}
            className="rounded-sm border border-input bg-background px-2 py-1 text-xs"
          >
            {SPEECH_LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="ml-1 italic">
            Pick the variant closest to your accent for best transcription.
          </span>
        </div>
      ) : null}

      {error ? <div className="text-xs text-[hsl(var(--destructive))]">{error}</div> : null}
    </div>
  );
}
