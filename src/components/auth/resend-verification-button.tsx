"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function ResendVerificationButton() {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await resendVerificationEmail();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Confirmation email sent — check your inbox.");
    });
  }

  return (
    <Button type="button" className="w-full" onClick={onClick} disabled={isPending}>
      {isPending ? "Sending..." : "Resend confirmation email"}
    </Button>
  );
}
