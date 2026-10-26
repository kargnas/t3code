import { describe, expect, it } from "@effect/vitest";

import { mobileApplicationActiveWakeup } from "./app-state-wakeups";

describe("mobileApplicationActiveWakeup", () => {
  it("keeps a session the app held open through a long background", () => {
    expect(mobileApplicationActiveWakeup(20_000, 200_000, 620_000)).toBe(
      "application-active-probe",
    );
  });

  it("replaces the session once the hold ended before the return", () => {
    expect(mobileApplicationActiveWakeup(20_000, 700_000, 620_000)).toBe(
      "application-active-reconnect",
    );
  });
});
