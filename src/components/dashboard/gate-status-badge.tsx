type GateStatus = "pending" | "in_progress" | "complete" | "coming_soon";

const LABEL: Record<GateStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  complete: "Complete",
  coming_soon: "Coming soon",
};

// Maps to CSS pip variants — see globals.css .pip
const PIP_STATUS: Record<GateStatus, "not_started" | "in_progress" | "completed"> = {
  pending: "not_started",
  in_progress: "in_progress",
  complete: "completed",
  coming_soon: "not_started",
};

export function GateStatusBadge({
  name,
  status,
  detail,
}: {
  name: string;
  status: GateStatus;
  detail?: string;
}) {
  return (
    <div className="bg-paper p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg leading-tight text-ink">{name}</h3>
        <span className="pip" data-status={PIP_STATUS[status]}>
          {LABEL[status]}
        </span>
      </div>
      {detail && (
        <p className="mt-3 font-reading text-[1rem] italic leading-relaxed text-muted-foreground">
          {detail}
        </p>
      )}
    </div>
  );
}
