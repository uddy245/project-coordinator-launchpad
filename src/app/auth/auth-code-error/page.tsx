import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Link expired — Launchpad" };

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">This link didn&apos;t work</h1>
        <p className="text-sm text-muted-foreground">
          The magic link has expired or has already been used. Request a new one to continue.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    </div>
  );
}
