import { Button } from "@/components/ui/button";

type Template = {
  file: string;
  title: string;
  kind: "starter" | "example";
  description: string;
};

const RAID_TEMPLATES: Template[] = [
  {
    file: "/templates/raid_log_starter.xlsx",
    title: "Starter RAID log",
    kind: "starter",
    description:
      "Empty template with the standard columns (ID, Type, Description, Trigger, Impact, Likelihood, Mitigation, Owner, Follow-up date, Status). Start here.",
  },
  {
    file: "/templates/raid_log_novice_example.xlsx",
    title: "Novice example",
    kind: "example",
    description:
      "Common early-career mistakes: vague mitigations, missing owners, no follow-up dates. Study the gaps.",
  },
  {
    file: "/templates/raid_log_intermediate_example.xlsx",
    title: "Intermediate example",
    kind: "example",
    description:
      "Most fields filled, owners named. Mitigations trend toward specific but some are still soft.",
  },
  {
    file: "/templates/raid_log_hire_ready_example.xlsx",
    title: "Hire-ready example",
    kind: "example",
    description:
      "What a steering-committee-grade RAID looks like. Specific, owned, dated, proportional mitigations.",
  },
];

export function WorkbookPanel() {
  const starter = RAID_TEMPLATES.find((t) => t.kind === "starter");
  const examples = RAID_TEMPLATES.filter((t) => t.kind === "example");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your template
        </h2>
        {starter && <TemplateRow t={starter} />}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reference examples
        </h2>
        <div className="space-y-3">
          {examples.map((t) => (
            <TemplateRow key={t.file} t={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TemplateRow({ t }: { t: Template }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-card p-4">
      <div className="space-y-1">
        <h3 className="font-medium">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <a href={t.file} download>
          Download
        </a>
      </Button>
    </div>
  );
}
