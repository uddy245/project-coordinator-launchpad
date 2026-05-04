import Link from "next/link";
import { ScenarioForm, EMPTY_SCENARIO_DEFAULTS } from "@/components/admin/scenario-form";

export const metadata = { title: "New scenario — Admin" };

export default function NewScenarioPage() {
  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <Link href="/admin/scenarios" className="kicker hover:underline">
          ← Scenarios
        </Link>
        <h1 className="display-title mt-2 text-2xl">New scenario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Slug is permanent (joins to learner responses). Prompt is what the learner sees.
        </p>
      </header>
      <ScenarioForm defaults={EMPTY_SCENARIO_DEFAULTS} isEdit={false} />
    </div>
  );
}
