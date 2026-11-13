import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

const unsubscribe = vi.hoisted(() => vi.fn());
const verify = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email/unsubscribe", () => ({
  unsubscribeWeeklyDigest: unsubscribe,
  verifyUnsubscribeToken: verify,
}));

import { GET, POST } from "@/app/api/email/unsubscribe/route";
import UnsubscribePage from "@/app/(marketing)/unsubscribe/page";

const URL_ = "https://launchpad.example/api/email/unsubscribe?token=tok.sig";

function post(body?: string, url = URL_): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body,
    headers: body ? { "content-type": "application/x-www-form-urlencoded" } : {},
  });
}

beforeEach(() => {
  unsubscribe.mockReset().mockResolvedValue("unsubscribed");
  verify.mockReset().mockReturnValue("user-id");
});

describe("POST /api/email/unsubscribe", () => {
  it("unsubscribes on a mail client's one-click POST (RFC 8058)", async () => {
    const res = await POST(post("List-Unsubscribe=One-Click"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: "unsubscribed" });
    expect(unsubscribe).toHaveBeenCalledWith("tok.sig");
  });

  it("unsubscribes on a POST with no body", async () => {
    const res = await POST(post());
    expect(res.status).toBe(200);
  });

  it("answers 400 for an invalid token", async () => {
    unsubscribe.mockResolvedValue("invalid");
    expect((await POST(post("List-Unsubscribe=One-Click"))).status).toBe(400);
  });

  it("answers 400 when there is no token", async () => {
    unsubscribe.mockResolvedValue("invalid");
    const res = await POST(post(undefined, "https://launchpad.example/api/email/unsubscribe"));
    expect(res.status).toBe(400);
    expect(unsubscribe).toHaveBeenCalledWith(null);
  });

  it("answers 500 when the database fails, so the mail client can retry", async () => {
    unsubscribe.mockResolvedValue("error");
    expect((await POST(post("List-Unsubscribe=One-Click"))).status).toBe(500);
  });

  it("redirects the confirm page's button back to the page with the outcome", async () => {
    const res = await POST(post("source=page"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(
      "https://launchpad.example/unsubscribe?status=unsubscribed"
    );
  });

  it("keeps the token in the redirect after a server error, so the learner can retry", async () => {
    unsubscribe.mockResolvedValue("error");
    const res = await POST(post("source=page"));

    expect(res.headers.get("location")).toBe(
      "https://launchpad.example/unsubscribe?status=error&token=tok.sig"
    );
  });
});

describe("GET /api/email/unsubscribe", () => {
  it("never unsubscribes; it redirects to the confirm page", () => {
    const res = GET(new NextRequest(URL_));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://launchpad.example/unsubscribe?token=tok.sig");
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});

describe("/unsubscribe page", () => {
  const render = async (params: Record<string, string>) =>
    renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve(params) }));

  it("shows one confirm button that posts to the endpoint, and changes nothing itself", async () => {
    const html = await render({ token: "tok.sig" });

    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/email/unsubscribe?token=tok.sig"');
    expect(html).toContain('name="source" value="page"');
    expect(html).toContain("Unsubscribe</button>");
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("confirms once unsubscribed and points to the profile to switch back on", async () => {
    const html = await render({ status: "unsubscribed" });

    expect(html).toContain("unsubscribed");
    expect(html).toContain('href="/profile"');
    expect(html).not.toContain("<form");
  });

  it("offers the profile setting when the link is not valid", async () => {
    verify.mockReturnValue(null);
    const html = await render({ token: "bad" });

    expect(html).toContain("isn&#x27;t valid");
    expect(html).toContain('href="/profile"');
    expect(html).not.toContain("<form");
  });

  it("says the learner is still subscribed after a server error, with the button to retry", async () => {
    const html = await render({ token: "tok.sig", status: "error" });

    expect(html).toContain("still subscribed");
    expect(html).toContain("<form");
  });
});
