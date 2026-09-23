"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendSignInCode, signInWithCode } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInCodeForm({ email, redirectTo }: { email: string; redirectTo: string }) {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await signInWithCode({ email, code });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Full-page navigation so fresh session cookies are sent (Safari).
      window.location.assign(redirectTo);
    });
  }

  function onResend() {
    startTransition(async () => {
      const result = await sendSignInCode({ email });
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
        <Label htmlFor="code">Sign-in code</Label>
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
        {isPending ? "Signing in..." : "Sign in"}
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
