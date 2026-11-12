import Link from "next/link";
import { Button } from "@/components/ui/button";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export const metadata = {
  title: "Unsubscribe — Launchpad",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ token?: string | string[]; status?: string | string[] }>;
};

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/**
 * Confirm page for the unsubscribe link in the weekly progress email.
 * Rendering this page changes nothing: the button posts to
 * /api/email/unsubscribe, which does the work and redirects back here.
 * Works without JavaScript and without signing in.
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const token = one(params.token);
  const status = one(params.status);
  const tokenIsValid = verifyUnsubscribeToken(token) !== null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center space-y-4 px-6 py-12 text-center">
      <h1 className="text-3xl font-bold">Weekly progress email</h1>

      {status === "unsubscribed" ? (
        <>
          <p className="text-muted-foreground">
            You&apos;re unsubscribed. We won&apos;t send you the weekly progress email again.
          </p>
          <p className="text-sm text-muted-foreground">
            Changed your mind? You can switch it back on from your profile.
          </p>
          <Button asChild variant="outline">
            <Link href="/profile">Go to your profile</Link>
          </Button>
        </>
      ) : tokenIsValid && token ? (
        <>
          {status === "error" ? (
            <p role="alert" className="text-sm text-destructive">
              Something went wrong and you are still subscribed. Please try again.
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Stop receiving the weekly progress email? You&apos;ll still get receipts and other
            emails about your account.
          </p>
          <form method="post" action={`/api/email/unsubscribe?token=${encodeURIComponent(token)}`}>
            <input type="hidden" name="source" value="page" />
            <Button type="submit" size="lg">
              Unsubscribe
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">
            This unsubscribe link isn&apos;t valid. You can switch the weekly email off from your
            profile instead.
          </p>
          <Button asChild variant="outline">
            <Link href="/profile">Go to your profile</Link>
          </Button>
        </>
      )}
    </main>
  );
}
