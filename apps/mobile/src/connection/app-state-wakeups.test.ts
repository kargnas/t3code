import { describe, expect, it } from "@effect/vitest";

import {
  MOBILE_BACKGROUND_RECONNECT_AFTER_MS,
  mobileApplicationActiveWakeup,
} from "./app-state-wakeups";

describe("mobileApplicationActiveWakeup", () => {
  it("uses a fast probe after a short interruption", () => {
    expect(mobileApplicationActiveWakeup(null, 20_000, null)).toBe("application-active-probe");
    expect(
      mobileApplicationActiveWakeup(
        20_000,
        20_000 + MOBILE_BACKGROUND_RECONNECT_AFTER_MS - 1,
        null,
      ),
    ).toBe("application-active-probe");
  });

  it("replaces the session after a meaningful background suspension", () => {
    expect(
      mobileApplicationActiveWakeup(20_000, 20_000 + MOBILE_BACKGROUND_RECONNECT_AFTER_MS, null),
    ).toBe("application-active-reconnect");
  });

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
