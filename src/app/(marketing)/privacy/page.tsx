import { LegalPage } from "@/components/legal/legal-page";
import { PRIVACY_DRAFT, PRIVACY_LAST_EDITED } from "@/lib/legal/privacy";

// Kept out of search results while it is a draft.
export const metadata = {
  title: "Privacy Policy (DRAFT) — Launchpad",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" lastEdited={PRIVACY_LAST_EDITED} body={PRIVACY_DRAFT} />;
}
