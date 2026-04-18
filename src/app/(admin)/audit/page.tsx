export const metadata = { title: "Audit queue — Launchpad" };

export default function AuditPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Audit queue</h1>
      <p className="text-muted-foreground">
        Human review queue for sampled submissions. Populated once grading ships (M4).
      </p>
    </div>
  );
}
