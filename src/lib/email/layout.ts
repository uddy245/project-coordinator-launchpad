/**
 * Shared HTML/text layout for transactional emails.
 *
 * Hand-rolled HTML (no React Email) on purpose — keeps the dependency tree
 * small and the rendering predictable across email clients. Inline styles
 * only; no <style> blocks or external CSS (clients strip them).
 */

import { env } from "@/env";

const APP_URL = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

const PALETTE = {
  ink: "#11161e",
  inkSoft: "#2c3340",
  inkMute: "#6a7385",
  rule: "#d9dde4",
  paper: "#ffffff",
  paperWarm: "#f5f7fa",
  amber: "#b8801a",
  amberLt: "#fef3c7",
  indigo: "#312e81",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type LayoutBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "kicker"; text: string }
  | { type: "cta"; label: string; url: string }
  | { type: "rule" }
  | { type: "fact"; label: string; value: string };

export type LayoutInput = {
  preheader: string;
  kicker: string; // "WELCOME" | "PURCHASE" | "GRADING" | "AUDIT"
  title: string;
  blocks: LayoutBlock[];
  /** Optional sign-off line (e.g. "— The Launchpad team"). */
  signoff?: string;
};

/**
 * Render a layout into { html, text }. The text variant is generated from
 * the same blocks so we never get a divergent text fallback.
 */
export function renderLayout(input: LayoutInput): { html: string; text: string } {
  return { html: renderHtml(input), text: renderText(input) };
}

function renderHtml(input: LayoutInput): string {
  const blocks = input.blocks.map((b) => htmlBlock(b)).join("\n");
  const signoff = input.signoff
    ? `<p style="margin:32px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:${PALETTE.inkMute};">${escapeHtml(
        input.signoff,
      )}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.paperWarm};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PALETTE.ink};">
  <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:${PALETTE.paperWarm};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.paperWarm};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${PALETTE.paper};border:1px solid ${PALETTE.rule};">
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PALETTE.inkMute};">PROG·PC·25 · ${escapeHtml(input.kicker)}</p>
              <h1 style="margin:12px 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:${PALETTE.ink};font-weight:600;letter-spacing:-0.012em;">${escapeHtml(input.title)}</h1>
              <hr style="border:0;border-top:2px solid ${PALETTE.ink};margin:0 0 28px;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              ${blocks}
              ${signoff}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:${PALETTE.paperWarm};border-top:1px solid ${PALETTE.rule};">
              <p style="margin:0;font-family:'IBM Plex Mono','Courier New',monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PALETTE.inkMute};">Launchpad · Project Coordinator Series</p>
              <p style="margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:${PALETTE.inkMute};line-height:1.5;">
                <a href="${APP_URL}/dashboard" style="color:${PALETTE.amber};text-decoration:underline;">Open the dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function htmlBlock(b: LayoutBlock): string {
  switch (b.type) {
    case "kicker":
      return `<p style="margin:0 0 8px;font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${PALETTE.amber};">${escapeHtml(b.text)}</p>`;
    case "h":
      return `<h2 style="margin:24px 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.3;color:${PALETTE.ink};font-weight:600;">${escapeHtml(b.text)}</h2>`;
    case "p":
      return `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${PALETTE.inkSoft};">${escapeHtml(b.text)}</p>`;
    case "rule":
      return `<hr style="border:0;border-top:1px solid ${PALETTE.rule};margin:24px 0;" />`;
    case "fact":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr>
    <td width="40%" style="padding:8px 0;font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${PALETTE.inkMute};">${escapeHtml(b.label)}</td>
    <td style="padding:8px 0;font-family:'IBM Plex Mono','Courier New',monospace;font-size:13px;color:${PALETTE.ink};font-weight:500;">${escapeHtml(b.value)}</td>
  </tr>
</table>`;
    case "cta":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:${PALETTE.ink};padding:14px 28px;">
      <a href="${escapeHtml(b.url)}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${PALETTE.paper};text-decoration:none;letter-spacing:0.02em;">${escapeHtml(b.label)}</a>
    </td>
  </tr>
</table>`;
  }
}

function renderText(input: LayoutInput): string {
  const lines: string[] = [];
  lines.push(`PROG·PC·25 — ${input.kicker}`);
  lines.push("");
  lines.push(input.title);
  lines.push("=".repeat(Math.min(input.title.length, 60)));
  lines.push("");

  for (const b of input.blocks) {
    switch (b.type) {
      case "kicker":
        lines.push(`[${b.text.toUpperCase()}]`);
        lines.push("");
        break;
      case "h":
        lines.push(b.text);
        lines.push("-".repeat(Math.min(b.text.length, 60)));
        lines.push("");
        break;
      case "p":
        lines.push(b.text);
        lines.push("");
        break;
      case "rule":
        lines.push("---");
        lines.push("");
        break;
      case "fact":
        lines.push(`${b.label.toUpperCase()}: ${b.value}`);
        break;
      case "cta":
        lines.push(`> ${b.label}: ${b.url}`);
        lines.push("");
        break;
    }
  }

  if (input.signoff) {
    lines.push("");
    lines.push(input.signoff);
  }

  lines.push("");
  lines.push("---");
  lines.push("Launchpad · Project Coordinator Series");
  lines.push(`${APP_URL}/dashboard`);
  return lines.join("\n");
}

export function appUrl(): string {
  return APP_URL;
}
