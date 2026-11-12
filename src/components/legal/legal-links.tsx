import Link from "next/link";
import { cn } from "@/lib/utils";

/** Terms and Privacy links, shown in every page footer. */
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
