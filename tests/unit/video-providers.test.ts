import { describe, it, expect } from "vitest";
import { isIframeEmbedUrl } from "@/lib/video/providers";

describe("isIframeEmbedUrl", () => {
  it("returns false for null/undefined/empty", () => {
    expect(isIframeEmbedUrl(null)).toBe(false);
    expect(isIframeEmbedUrl(undefined)).toBe(false);
    expect(isIframeEmbedUrl("")).toBe(false);
  });

  it("recognizes Bunny Stream iframe URLs", () => {
    expect(isIframeEmbedUrl("https://iframe.mediadelivery.net/embed/12345/abc-def")).toBe(true);
  });

  it("recognizes HeyGen embed URLs (singular + plural)", () => {
    expect(isIframeEmbedUrl("https://app.heygen.com/embed/e6246969a37842e99b7eae9d8908e68c")).toBe(
      true
    );
    expect(isIframeEmbedUrl("https://app.heygen.com/embeds/e6246969a37842e99b7eae9d8908e68c")).toBe(
      true
    );
  });

  it("rejects HeyGen share / videos URLs (not embed-playable)", () => {
    expect(isIframeEmbedUrl("https://app.heygen.com/videos/e6246969a37842e99b7eae9d8908e68c")).toBe(
      false
    );
    expect(isIframeEmbedUrl("https://app.heygen.com/share/e6246969a37842e99b7eae9d8908e68c")).toBe(
      false
    );
  });

  it("rejects arbitrary non-iframe URLs (MP4, random host, etc.)", () => {
    expect(isIframeEmbedUrl("https://example.com/video.mp4")).toBe(false);
    expect(isIframeEmbedUrl("https://commondatastorage.googleapis.com/big-buck-bunny.mp4")).toBe(
      false
    );
    expect(isIframeEmbedUrl("https://youtube.com/embed/abc123")).toBe(false);
  });

  it("rejects lookalike hostnames (no TLS spoofing via substring)", () => {
    // Without the leading-anchor regex, a malicious/nested path could
    // trick a substring match. Confirm the anchored pattern rejects.
    expect(isIframeEmbedUrl("https://evil.com/iframe.mediadelivery.net/x")).toBe(false);
    expect(isIframeEmbedUrl("https://evil.com/app.heygen.com/embeds/x")).toBe(false);
  });
});
