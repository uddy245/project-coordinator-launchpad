type GateStatus = "pending" | "in_progress" | "complete" | "coming_soon";

const LABEL: Record<GateStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  complete: "Complete",
  coming_soon: "Coming soon",
};

const CLASS: Record<GateStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-800",
  complete: "bg-green-100 text-green-800",
  coming_soon: "bg-muted/50 text-muted-foreground italic",
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
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASS[status]}`}>
          {LABEL[status]}
        </span>
      </div>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}
