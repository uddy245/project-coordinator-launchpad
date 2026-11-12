import Link from "next/link";
import { MarkdownProse } from "@/components/ui/markdown-prose";
import { LegalLinks } from "@/components/legal/legal-links";

type Props = { title: string; lastEdited: string; body: string };

/**
 * A draft legal page (/terms, /privacy). The banner stays until the owner
 * has reviewed the text, filled every "[OWNER TO CONFIRM: …]" gap and
 * removed the draft marking.
 */
export function LegalPage({ title, lastEdited, body }: Props) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-xl font-semibold leading-none text-ink">
            Launchpad
          </Link>
          <LegalLinks />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div
          role="note"
          aria-label="Draft notice"
          className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-bold uppercase tracking-wide">Draft — not yet in force</p>
          <p className="mt-1">
            This text is a draft awaiting the owner&apos;s review. It has not been checked by a
            lawyer. Items in square brackets are still to be decided.
          </p>
        </div>

        <h1 className="mt-8 font-display text-3xl font-semibold text-ink">{title} (DRAFT)</h1>
        <p className="mt-2 text-sm text-muted-foreground">Draft last edited {lastEdited}</p>

        <MarkdownProse content={body} className="mt-8" />
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-6">
          <span className="text-sm font-semibold text-muted-foreground">Launchpad</span>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
