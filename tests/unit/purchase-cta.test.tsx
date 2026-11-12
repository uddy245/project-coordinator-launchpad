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

  it("keeps the button and shows a toast for any other error", async () => {
    checkoutMock.mockResolvedValue({ ok: false, error: "Stripe is down", code: "STRIPE_ERROR" });
    render(<PurchaseCTA />);

    await userEvent.click(screen.getByRole("button", { name: /get access/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Stripe is down"));
    expect(screen.getByRole("button", { name: /get access/i })).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
