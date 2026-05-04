import { renderLayout, appUrl, type LayoutBlock } from "../layout";
import type { EmailRender } from "../send";

export type PurchaseConfirmedVars = {
  firstName: string | null;
  amountUsd: number;
  receiptUrl: string | null;
};

export function renderPurchaseConfirmed(vars: PurchaseConfirmedVars): EmailRender {
  const greeting = vars.firstName ? `${vars.firstName}, you're in.` : "You're in.";

  const blocks: LayoutBlock[] = [
    {
      type: "p",
      text: "Your payment has been received and your access to the full programme is now active. You can begin immediately.",
    },
    { type: "fact", label: "Programme", value: "PROG·PC·25" },
    { type: "fact", label: "Modules", value: "25" },
    { type: "fact", label: "Format", value: "Self-paced" },
    {
      type: "fact",
      label: "Amount charged",
      value: `$${vars.amountUsd.toFixed(2)} USD`,
    },
    { type: "rule" },
    { type: "h", text: "Where to begin" },
    {
      type: "p",
      text: "The dashboard is the home of the programme. Modules unlock in order; your portfolio fills in as you submit graded artifacts; the four career gates show you the route to hire-ready.",
    },
    { type: "cta", label: "Open the dashboard →", url: `${appUrl()}/dashboard` },
  ];

  if (vars.receiptUrl) {
    blocks.push({ type: "rule" });
    blocks.push({ type: "h", text: "Receipt" });
    blocks.push({
      type: "p",
      text: "A Stripe receipt for this transaction is available below. Keep it for your records — companies often reimburse certifications and online programmes.",
    });
    blocks.push({ type: "cta", label: "View receipt", url: vars.receiptUrl });
  }

  const { html, text } = renderLayout({
    preheader: "Payment received. Access is active. The programme is yours.",
    kicker: "PAYMENT CONFIRMED",
    title: greeting,
    blocks,
    signoff: "— The Launchpad team",
  });

  return {
    subject: "Payment confirmed — your access is active",
    html,
    text,
  };
}
