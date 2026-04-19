// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { requestReviewMock, routerRefreshMock, toastSuccessMock, toastErrorMock } = vi.hoisted(
  () => ({
    requestReviewMock: vi.fn(),
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  })
);

vi.mock("@/actions/audit", () => ({ requestReview: requestReviewMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));
vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

import { RequestReviewButton } from "@/components/grading/request-review-button";

beforeEach(() => {
  requestReviewMock.mockReset();
  routerRefreshMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
});

describe("RequestReviewButton", () => {
  it("renders nothing when the submission has already been reviewed", () => {
    const { container } = render(
      <RequestReviewButton submissionId="sub-1" alreadyReviewed={true} alreadyQueued={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the pending notice (no button) when already queued", () => {
    render(
      <RequestReviewButton submissionId="sub-1" alreadyReviewed={false} alreadyQueued={true} />
    );
    expect(screen.getByText(/human review has been requested and is pending/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the request button when not reviewed and not queued", () => {
    render(
      <RequestReviewButton submissionId="sub-1" alreadyReviewed={false} alreadyQueued={false} />
    );
    expect(screen.getByRole("button", { name: /request human review/i })).toBeInTheDocument();
  });

  it("calls requestReview, shows success toast, and refreshes the router on click", async () => {
    const user = userEvent.setup();
    requestReviewMock.mockResolvedValueOnce({ ok: true, data: undefined });

    render(
      <RequestReviewButton submissionId="sub-42" alreadyReviewed={false} alreadyQueued={false} />
    );

    await user.click(screen.getByRole("button", { name: /request human review/i }));

    await waitFor(() => expect(requestReviewMock).toHaveBeenCalledWith("sub-42"));
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(routerRefreshMock).toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("surfaces the error via toast when the action fails, and does not refresh", async () => {
    const user = userEvent.setup();
    requestReviewMock.mockResolvedValueOnce({
      ok: false,
      error: "Not signed in.",
      code: "UNAUTHENTICATED",
    });

    render(
      <RequestReviewButton submissionId="sub-1" alreadyReviewed={false} alreadyQueued={false} />
    );

    await user.click(screen.getByRole("button", { name: /request human review/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Not signed in."));
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});
