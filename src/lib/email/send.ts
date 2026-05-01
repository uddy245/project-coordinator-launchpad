/**
 * Transactional email — single send() interface backed by Resend.
 *
 * The module is fail-soft: when RESEND_API_KEY is unset (dev / preview /
 * test environments), send() logs the intent and returns success without
 * making a network call. Production must set the key.
 *
 * Templates live under ./templates and export a render(vars) -> { subject,
 * html, text } function. We deliberately keep them as plain TS modules
 * (no JSX, no @react-email/*) — the npm tree gets ugly fast and these
 * emails are simple enough that hand-written HTML is more reliable.
 */

import { Resend } from "resend";
import { env } from "@/env";

let _client: Resend | null | undefined;

function client(): Resend | null {
  if (_client !== undefined) return _client;
  const key = env.RESEND_API_KEY;
  _client = key ? new Resend(key) : null;
  return _client;
}

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

export type EmailRender = {
  subject: string;
  html: string;
  text: string;
};

export type SendResult =
  | { ok: true; id: string | null; skipped?: false }
  | { ok: true; id: null; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendEmail(opts: {
  to: EmailRecipient;
  render: EmailRender;
  /** When true, errors are logged but never thrown — use for non-critical sends. */
  silent?: boolean;
  /** Append to the message tag for easy filtering in Resend dashboard. */
  tag?: string;
}): Promise<SendResult> {
  const c = client();
  if (!c) {
    const reason = "RESEND_API_KEY not set — email send skipped";
    // Not a hard error; in dev we just log so flows still work end-to-end.
    console.info(
      `[email] skipped to=${opts.to.email} subject="${opts.render.subject}" (${reason})`,
    );
    return { ok: true, id: null, skipped: true, reason };
  }

  try {
    const recipient = opts.to.name
      ? `${opts.to.name} <${opts.to.email}>`
      : opts.to.email;

    const result = await c.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: [recipient],
      subject: opts.render.subject,
      html: opts.render.html,
      text: opts.render.text,
      tags: opts.tag ? [{ name: "category", value: opts.tag }] : undefined,
    });

    if (result.error) {
      const msg = `Resend error: ${result.error.message}`;
      console.error(`[email] ${msg}`);
      if (opts.silent) return { ok: false, error: msg };
      throw new Error(msg);
    }
    return { ok: true, id: result.data?.id ?? null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] send failed: ${msg}`);
    if (opts.silent) return { ok: false, error: msg };
    throw err;
  }
}
