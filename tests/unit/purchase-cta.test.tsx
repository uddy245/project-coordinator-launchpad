// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { checkoutMock, toastErrorMock } = vi.hoisted(() => ({
  checkoutMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/actions/checkout", () => ({ createCheckoutSession: checkoutMock }));
vi.mock("sonner", () => ({ toast: { error: toastErrorMock } }));

import { PurchaseCTA } from "@/components/marketing/purchase-cta";

const PENDING = "Your payment is still being processed by your bank.";

beforeEach(() => {
  checkoutMock.mockReset();
  toastErrorMock.mockReset();
});

describe("PurchaseCTA", () => {
  it("replaces the button with a lasting notice while a payment is pending", async () => {
    checkoutMock.mockResolvedValue({ ok: false, error: PENDING, code: "PAYMENT_PENDING" });
    render(<PurchaseCTA />);

    await userEvent.click(screen.getByRole("button", { name: /get access/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(PENDING));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("announces the notice through a live region that exists before it appears", async () => {
    checkoutMock.mockResolvedValue({ ok: false, error: PENDING, code: "PAYMENT_PENDING" });
    render(<PurchaseCTA />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole("button", { name: /get access/i }));

    await waitFor(() => expect(region).toHaveTextContent(PENDING));
    expect(screen.getByRole("status")).toBe(region);
  });

  it("moves focus from the removed button to the notice", async () => {
    checkoutMock.mockResolvedValue({ ok: false, error: PENDING, code: "PAYMENT_PENDING" });
    render(<PurchaseCTA />);

    await userEvent.click(screen.getByRole("button", { name: /get access/i }));

    await waitFor(() => expect(screen.getByText(PENDING)).toHaveFocus());
  });

  it("keeps the button for a failed payment check, so the learner can try again later", async () => {
    const message = "We're still checking your payment. Please try again in a few minutes.";
    checkoutMock.mockResolvedValue({ ok: false, error: message, code: "PAYMENT_CHECK_FAILED" });
    render(<PurchaseCTA />);

    await userEvent.click(screen.getByRole("button", { name: /get access/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(message));
    expect(screen.getByRole("button", { name: /get access/i })).toBeEnabled();
  });

  it("keeps the button and shows a toast for any other error", async () => {
    checkoutMock.mockResolvedValue({ ok: false, error: "Stripe is down", code: "STRIPE_ERROR" });
    render(<PurchaseCTA />);

    await userEvent.click(screen.getByRole("button", { name: /get access/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Stripe is down"));
    expect(screen.getByRole("button", { name: /get access/i })).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
