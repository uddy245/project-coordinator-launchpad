import Link from "next/link";
import { env } from "@/env";
import { cn } from "@/lib/utils";

/**
 * Terms and Privacy links for the site footers (landing, app, preview).
 *
 * Hidden unless SHOW_LEGAL_LINKS is "true". The pages are drafts awaiting
 * the owner's approval; until then they exist but nothing points to them.
 * Server components only.
 */
export function FooterLegalLinks({ className }: { className?: string }) {
  if (env.SHOW_LEGAL_LINKS !== "true") return null;
  return <LegalLinks className={className} />;
}

/** Terms and Privacy links, always shown. Used on the legal pages themselves. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={cn("flex items-center gap-4 text-sm", className)}>
      <Link href="/terms" className="text-muted-foreground underline-offset-4 hover:underline">
        Terms
      </Link>
      <Link href="/privacy" className="text-muted-foreground underline-offset-4 hover:underline">
        Privacy
      </Link>
    </nav>
  );
}
