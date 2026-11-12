import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TermsPage, { metadata as termsMetadata } from "@/app/(marketing)/terms/page";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/(marketing)/privacy/page";
import { LegalLinks } from "@/components/legal/legal-links";
import { SUPPORT_EMAIL_PLACEHOLDER } from "@/lib/legal/support";
import { TERMS_DRAFT } from "@/lib/legal/terms";
import { PRIVACY_DRAFT } from "@/lib/legal/privacy";

const PAGES = [
  { name: "Terms of Service", path: "/terms", Page: TermsPage, metadata: termsMetadata },
  { name: "Privacy Policy", path: "/privacy", Page: PrivacyPage, metadata: privacyMetadata },
] as const;

describe.each(PAGES)("$path (draft)", ({ name, Page, metadata }) => {
  const html = renderToStaticMarkup(<Page />);

  it("is clearly marked as a draft, in the banner, the heading and the tab title", () => {
    expect(html).toContain("Draft — not yet in force");
    expect(html).toContain("has not been checked by a lawyer");
    expect(html).toContain(`${name} (DRAFT)</h1>`);
    expect(metadata.title).toContain("(DRAFT)");
  });

  it("is kept out of search results while it is a draft", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows the support email placeholder, and no real or clickable address", () => {
    expect(html).toContain("[SUPPORT EMAIL — TO BE ADDED BY OWNER]");
    expect(html).not.toContain("mailto:");
    expect(html).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  });

  it("renders its sections as headings, not raw markdown", () => {
    expect(html).toMatch(/<h2[^>]*>1\. /);
    expect(html).not.toContain("## ");
    expect(html).not.toContain("**");
  });

  it("links to both legal pages and back to the home page", () => {
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/"');
  });
});

describe("draft legal text", () => {
  it("the support placeholder is not an email address", () => {
    expect(SUPPORT_EMAIL_PLACEHOLDER).not.toContain("@");
    expect(SUPPORT_EMAIL_PLACEHOLDER).toMatch(/^\[.*TO BE ADDED BY OWNER\]$/);
  });

  it("leaves the decisions that are not ours to make as marked gaps", () => {
    // Refunds, liability and governing law must not be invented.
    for (const heading of ["## 6. Refunds", "## 13. Our liability", "## 16. Governing law"]) {
      const section = TERMS_DRAFT.split(heading)[1]?.split("\n## ")[0] ?? "";
      expect(section).toContain("[OWNER TO CONFIRM");
    }
    expect(PRIVACY_DRAFT).toContain("[OWNER TO CONFIRM");
  });

  it("states the price the purchase button charges", () => {
    expect(TERMS_DRAFT).toContain("US$749");
  });

  it("states the tutor chat retention the cron job enforces", () => {
    expect(PRIVACY_DRAFT).toContain("deleted automatically after 30 days");
  });
});

describe("LegalLinks", () => {
  it("links to /terms and /privacy", () => {
    const html = renderToStaticMarkup(<LegalLinks />);
    expect(html).toMatch(/href="\/terms">Terms<\/a>/);
    expect(html).toContain('href="/privacy">Privacy</a>');
  });
});
