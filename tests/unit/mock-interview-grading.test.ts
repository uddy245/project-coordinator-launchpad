/**
 * Tests for the mock-interview grader prompt construction.
 *
 * The grader's behaviour we care about here is NOT what it returns (that's
 * a function of what Claude says), but what it SENDS to Claude — specifically
 * whether the scenario-specific rubric_summary is incorporated into the user
 * message. Without that, scoring drifts because every scenario's "5" is
 * re-invented by the model from scratch.
 *
 * Strategy: mock @/lib/anthropic/client so messages.create is a spy. Make it
 * return a valid grader-shaped response so the grader's own parsing/validation
 * doesn't throw. Then assert on the message the spy was called with.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { messagesCreateMock, checkSpendCapMock } = vi.hoisted(() => ({
  messagesCreateMock: vi.fn(),
  checkSpendCapMock: vi.fn(),
}));

vi.mock("@/lib/anthropic/client", () => ({
  anthropic: { messages: { create: messagesCreateMock } },
  GRADING_MODEL: "claude-sonnet-4-5",
}));

vi.mock("@/lib/grading/spend-guard", () => ({ checkSpendCap: checkSpendCapMock }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { gradeMockInterviewResponse } from "@/lib/grading/mock-interview";

function validClaudeResponse() {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          overall_score: 4,
          pass: true,
          feedback_summary:
            "Strong, specific response demonstrating judgment under pressure. One sharpening point: name a concrete return time in the closing sentence.",
        }),
      },
    ],
  };
}

function getUserMessageFromCall(): string {
  expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  const call = messagesCreateMock.mock.calls[0][0];
  // messages.create takes { system, messages: [{ role, content }] }
  const content = call.messages[0].content;
  return typeof content === "string" ? content : JSON.stringify(content);
}

describe("gradeMockInterviewResponse — rubricSummary plumbing", () => {
  beforeEach(() => {
    checkSpendCapMock.mockReset();
    messagesCreateMock.mockReset();
    checkSpendCapMock.mockResolvedValue({
      ok: true,
      spendTodayUsd: 0,
      capUsd: 100,
      projectedUsd: 0.01,
    });
    messagesCreateMock.mockResolvedValue(validClaudeResponse());
  });

  it("includes the SCENARIO-SPECIFIC RUBRIC block when rubricSummary is provided", async () => {
    await gradeMockInterviewResponse({
      prompt: "How do you handle an amber rating from a sponsor?",
      response:
        "I would first verify the underlying numbers, then prep a written response with the variance breakdown before the call back. I'd set a return time of end-of-day and avoid defensive framing.",
      competency: "stakeholder management",
      rubricSummary:
        "A strong answer names the verification step before the response, sets a concrete return time, and avoids defensive framing.",
    });

    const userMessage = getUserMessageFromCall();
    expect(userMessage).toContain("SCENARIO-SPECIFIC RUBRIC");
    expect(userMessage).toContain("names the verification step before the response");
  });

  it("omits the rubric block when rubricSummary is null", async () => {
    await gradeMockInterviewResponse({
      prompt: "Walk me through your first week as a coordinator.",
      response:
        "The first thing I'd do is set up a 1:1 with the PM to understand what they actually expect of the role on this project before I touched any artifacts. Then I'd read the charter and last three status reports.",
      competency: "role_understanding",
      rubricSummary: null,
    });

    const userMessage = getUserMessageFromCall();
    expect(userMessage).not.toContain("SCENARIO-SPECIFIC RUBRIC");
  });

  it("omits the rubric block when rubricSummary is whitespace only", async () => {
    await gradeMockInterviewResponse({
      prompt: "Tell me about a time you escalated a risk.",
      response:
        "Two weeks into a cloud migration I noticed the vendor's go-live date had slipped without an updated RAID entry, so I pulled the timeline impact and brought it to the PM the same afternoon with a one-page summary.",
      competency: "risk_identification",
      rubricSummary: "   ",
    });

    const userMessage = getUserMessageFromCall();
    expect(userMessage).not.toContain("SCENARIO-SPECIFIC RUBRIC");
  });

  it("omits the rubric block when rubricSummary is undefined (backward-compatible call)", async () => {
    await gradeMockInterviewResponse({
      prompt: "Tell me about a time you escalated a risk.",
      response:
        "Two weeks into a cloud migration I noticed the vendor's go-live date had slipped without an updated RAID entry, so I pulled the timeline impact and brought it to the PM the same afternoon.",
      competency: "risk_identification",
    });

    const userMessage = getUserMessageFromCall();
    expect(userMessage).not.toContain("SCENARIO-SPECIFIC RUBRIC");
  });

  it("propagates the grader's parsed result back to the caller", async () => {
    const result = await gradeMockInterviewResponse({
      prompt: "How do you respond when a stakeholder sends a sharp email?",
      response:
        "I respond to the substance not the tone, name what I know and don't know, and set a return time. No defending. The director's heat isn't the data — the missed deliverable is.",
      competency: "professional_mindset",
      rubricSummary: "Strong answers respond to substance, not tone, and set a concrete next step.",
    });

    expect(result.overallScore).toBe(4);
    expect(result.pass).toBe(true);
    expect(result.feedbackSummary).toContain("Strong, specific response");
  });
});
