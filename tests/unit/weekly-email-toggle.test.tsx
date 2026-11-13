// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { setOptInMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  setOptInMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/actions/profile", () => ({ setWeeklyDigestOptIn: setOptInMock }));
vi.mock("sonner", () => ({ toast: { success: toastSuccessMock, error: toastErrorMock } }));

import { WeeklyEmailToggle } from "@/components/auth/weekly-email-toggle";

function deferred() {
  let resolve!: (value: { ok: true; data: null }) => void;
  const promise = new Promise<{ ok: true; data: null }>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  setOptInMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
});

describe("WeeklyEmailToggle", () => {
  it("keeps focus on the checkbox while saving, and ignores clicks until the save finishes", async () => {
    const save = deferred();
    setOptInMock.mockReturnValue(save.promise);
    render(<WeeklyEmailToggle initialOptIn={true} />);
    const checkbox = screen.getByRole("checkbox", { name: /weekly progress email/i });

    await userEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeEnabled();
    expect(checkbox).toHaveAttribute("aria-disabled", "true");
    expect(checkbox).toHaveFocus();

    await userEvent.click(checkbox);
    expect(setOptInMock).toHaveBeenCalledTimes(1);
    expect(checkbox).not.toBeChecked();

    save.resolve({ ok: true, data: null });

    await waitFor(() => expect(checkbox).toHaveAttribute("aria-disabled", "false"));
    expect(checkbox).toHaveFocus();
    expect(toastSuccessMock).toHaveBeenCalledWith("Weekly email switched off.");
  });

  it("reverts the checkbox and keeps focus when the save fails", async () => {
    setOptInMock.mockResolvedValue({ ok: false, error: "Could not save.", code: "DB_ERROR" });
    render(<WeeklyEmailToggle initialOptIn={false} />);
    const checkbox = screen.getByRole("checkbox", { name: /weekly progress email/i });

    await userEvent.click(checkbox);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Could not save."));
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveFocus();
  });
});
