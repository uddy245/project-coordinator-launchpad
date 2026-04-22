/**
 * Recognized iframe-embed hosts. Any URL matching one of these patterns
 * is rendered via an iframe in the lesson video player; anything else
 * falls through to the native <video> element.
 *
 * Adding a new hosted-video provider is one line here + one test case
 * in tests/unit/video-providers.test.ts.
 */
const IFRAME_HOST_PATTERNS: RegExp[] = [
  /^https?:\/\/iframe\.mediadelivery\.net\//, // Bunny Stream
  /^https?:\/\/app\.heygen\.com\/embeds?\//, // HeyGen (embed + embeds)
];

export function isIframeEmbedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return IFRAME_HOST_PATTERNS.some((re) => re.test(url));
}
