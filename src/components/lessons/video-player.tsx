"use client";

import { useEffect, useRef, useState } from "react";
import { updateVideoProgress } from "@/actions/video-progress";
import { isIframeEmbedUrl } from "@/lib/video/providers";

type Props = {
  lessonSlug: string;
  videoUrl: string | null;
  initialSeconds?: number;
};

const REPORT_INTERVAL_MS = 10_000;

/**
 * Lesson video player. Degrades gracefully in three cases:
 *
 *   - No videoUrl configured yet → "coming soon" placeholder
 *   - Recognized iframe host (Bunny Stream, HeyGen; see
 *     src/lib/video/providers.ts) → renders an iframe. No inline
 *     progress telemetry because we'd need a postMessage bridge per
 *     provider; progress is reported manually via the Mark-as-watched
 *     button under the iframe.
 *   - Any other URL → native <video> element with timeupdate reporting
 *     every 10s and on pause
 */
export function VideoPlayer({ lessonSlug, videoUrl, initialSeconds = 0 }: Props) {
  if (!videoUrl) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        Video for this lesson is in production. Check back soon.
      </div>
    );
  }

  if (isIframeEmbedUrl(videoUrl)) {
    return <IframeEmbed lessonSlug={lessonSlug} src={videoUrl} />;
  }

  return <NativeVideo lessonSlug={lessonSlug} src={videoUrl} initialSeconds={initialSeconds} />;
}

function IframeEmbed({ lessonSlug, src }: { lessonSlug: string; src: string }) {
  const [reporting, setReporting] = useState(false);

  async function markWatched() {
    setReporting(true);
    // We don't know duration from outside the iframe without a
    // per-provider postMessage bridge; pass seconds=duration=1 to
    // flip watched via the Mark-as-watched button.
    await updateVideoProgress({ lessonSlug, seconds: 1, duration: 1 });
    setReporting(false);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-lg border bg-black">
        <iframe
          src={src}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          title="Lesson video"
        />
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Progress tracking for this video host will land when per-provider postMessage events are
          wired. For now, mark it watched when you finish.
        </span>
        <button
          type="button"
          onClick={markWatched}
          disabled={reporting}
          className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
        >
          {reporting ? "Saving..." : "Mark as watched"}
        </button>
      </div>
    </div>
  );
}

function NativeVideo({
  lessonSlug,
  src,
  initialSeconds,
}: {
  lessonSlug: string;
  src: string;
  initialSeconds: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportedRef = useRef<number>(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (initialSeconds > 0 && Number.isFinite(initialSeconds)) {
      v.currentTime = initialSeconds;
    }

    async function report(seconds: number) {
      const duration = Number.isFinite(v?.duration) ? Math.floor(v!.duration) : undefined;
      lastReportedRef.current = seconds;
      await updateVideoProgress({
        lessonSlug,
        seconds: Math.floor(seconds),
        duration,
      });
    }

    function onPlay() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!v) return;
        const current = v.currentTime;
        if (current > lastReportedRef.current) {
          void report(current);
        }
      }, REPORT_INTERVAL_MS);
    }

    function onPauseOrEnd() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (v && v.currentTime > lastReportedRef.current) {
        void report(v.currentTime);
      }
    }

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPauseOrEnd);
    v.addEventListener("ended", onPauseOrEnd);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPauseOrEnd);
      v.removeEventListener("ended", onPauseOrEnd);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lessonSlug, initialSeconds]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-black">
        <video ref={videoRef} src={src} controls className="h-full w-full" preload="metadata" />
      </div>
      <p className="text-xs text-muted-foreground">
        Your progress is saved every 10 seconds while you watch.
      </p>
    </div>
  );
}
