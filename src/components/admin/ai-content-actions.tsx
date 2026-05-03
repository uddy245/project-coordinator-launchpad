"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteAiQuizItem,
  toggleAiScenarioPublished,
  deleteAiScenario,
  deleteAiWorkbookAssignment,
} from "@/actions/admin-ai-content";

/**
 * Action buttons for rows on the /admin/ai-content review page.
 * Confirm dialogs guard destructive operations; toggling publish state
 * is single-click. router.refresh() picks up the new server state.
 */

function useAdminAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successMsg: string,
  ) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  }
  return { pending, run };
}

export function DeleteQuizItemButton({ id }: { id: string }) {
  const { pending, run } = useAdminAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this AI-generated quiz item permanently?")) return;
        run(() => deleteAiQuizItem(id), "Quiz item deleted.");
      }}
      className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[hsl(var(--destructive))] hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function TogglePublishScenarioButton({
  id,
  isPublished,
}: {
  id: string;
  isPublished: boolean;
}) {
  const { pending, run } = useAdminAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        run(
          () => toggleAiScenarioPublished(id),
          isPublished ? "Scenario unpublished." : "Scenario published.",
        )
      }
      className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {pending ? "…" : isPublished ? "Unpublish" : "Publish"}
    </button>
  );
}

export function DeleteScenarioButton({ id }: { id: string }) {
  const { pending, run } = useAdminAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this AI-generated scenario permanently? Refused if any learner has responded.")) return;
        run(() => deleteAiScenario(id), "Scenario deleted.");
      }}
      className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[hsl(var(--destructive))] hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function DeleteWorkbookAssignmentButton({ id }: { id: string }) {
  const { pending, run } = useAdminAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this AI-generated workbook scenario permanently?")) return;
        run(() => deleteAiWorkbookAssignment(id), "Workbook scenario deleted.");
      }}
      className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[hsl(var(--destructive))] hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
