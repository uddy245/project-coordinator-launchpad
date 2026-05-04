import Link from "next/link";
import { CapstoneForm, EMPTY_CAPSTONE_DEFAULTS } from "@/components/admin/capstone-form";

export const metadata = { title: "New capstone — Admin" };

export default function NewCapstonePage() {
  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <Link href="/admin/capstones" className="kicker hover:underline">
          ← Capstones
        </Link>
        <h1 className="display-title mt-2 text-2xl">New capstone</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Slug is permanent. Brief is the case-study text the learner reads end-to-end.
        </p>
      </header>
      <CapstoneForm defaults={EMPTY_CAPSTONE_DEFAULTS} isEdit={false} />
    </div>
  );
}
