// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";

const { getMyAccessMock, pushMock, refreshMock, router } = vi.hoisted(() => {
  const pushMock = vi.fn();
  const refreshMock = vi.fn();
  // Stable across renders, like Next's router; the poller's effect depends on it.
  return {
    getMyAccessMock: vi.fn(),
    pushMock,
    refreshMock,
    router: { push: pushMock, refresh: refreshMock },
  };
});

vi.mock("@/actions/access", () => ({ getMyAccess: getMyAccessMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

import { ActivationPoller } from "@/components/marketing/activation-poller";

/** Let the pending getMyAccess promise settle, then run the next poll timer. */
async function tick(ms = 1500) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  getMyAccessMock.mockReset().mockResolvedValue({ hasAccess: false });
  pushMock.mockReset();
  refreshMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ActivationPoller", () => {
  it("announces every status through the same live region", async () => {
    render(<ActivationPoller />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("Activating your account");

    getMyAccessMock.mockResolvedValue({ hasAccess: true });
    await tick();

    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("Account activated");
  });

  it("on timeout asks the learner to try again later, keeps the region, and does not mention email support", async () => {
    render(<ActivationPoller />);
    const region = screen.getByRole("status");

    for (let i = 0; i < 10; i++) await tick();

    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent(/taking longer than expected/i);
    expect(region).toHaveTextContent(/try again later/i);
    expect(region.textContent).not.toMatch(/email|support/i);
    expect(getMyAccessMock).toHaveBeenCalledTimes(10);
  });
});
