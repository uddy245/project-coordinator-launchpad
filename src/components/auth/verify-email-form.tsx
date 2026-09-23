"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resendVerificationCode, verifyEmailCode } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyEmailForm({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await verifyEmailCode({ email, code });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Email confirmed.");
      // Full-page navigation so fresh session cookies are sent (Safari).
      window.location.assign(result.data.signedIn ? "/dashboard" : "/login?verified=1");
    });
  }

  function onResend() {
    startTransition(async () => {
      const result = await resendVerificationCode(email);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("New code sent — check your inbox.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending || code.length < 4}>
        {isPending ? "Checking..." : "Confirm email"}
      </Button>
      <button
        type="button"
        onClick={onResend}
        disabled={isPending}
        className="w-full text-sm text-muted-foreground underline"
      >
        Send a new code
      </button>
    </form>
  );
}
