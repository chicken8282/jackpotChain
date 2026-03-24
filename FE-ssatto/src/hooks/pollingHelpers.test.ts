import { describe, expect, it } from "vitest";
import { shouldRunPolling, toPollingErrorMessage } from "./pollingHelpers";

describe("polling helpers", () => {
  it("returns false when polling is disabled", () => {
    expect(
      shouldRunPolling({
        enabled: false,
        pauseWhenHidden: true,
        visibilityState: "visible",
      }),
    ).toBe(false);
  });

  it("returns false when the document is hidden and hidden-tab pause is enabled", () => {
    expect(
      shouldRunPolling({
        enabled: true,
        pauseWhenHidden: true,
        visibilityState: "hidden",
      }),
    ).toBe(false);
  });

  it("returns true when polling is enabled and the document is visible", () => {
    expect(
      shouldRunPolling({
        enabled: true,
        pauseWhenHidden: true,
        visibilityState: "visible",
      }),
    ).toBe(true);
  });

  it("falls back to the default message when the error is unknown", () => {
    expect(toPollingErrorMessage(null, "fallback-message")).toBe("fallback-message");
  });
});
