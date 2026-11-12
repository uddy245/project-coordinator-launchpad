import { LegalPage } from "@/components/legal/legal-page";
import { TERMS_DRAFT, TERMS_LAST_EDITED } from "@/lib/legal/terms";

// Kept out of search results while it is a draft.
export const metadata = {
  title: "Terms of Service (DRAFT) — Launchpad",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return <LegalPage title="Terms of Service" lastEdited={TERMS_LAST_EDITED} body={TERMS_DRAFT} />;
}
