import type { Wakeups } from "@t3tools/client-runtime/connection";

export const MOBILE_BACKGROUND_RECONNECT_AFTER_MS = 10_000;

export type MobileApplicationActiveWakeup = Extract<
  Wakeups.ConnectionWakeup,
  "application-active-probe" | "application-active-reconnect"
>;

export function mobileApplicationActiveWakeup(
  backgroundedAtMs: number | null,
  activeAtMs: number,
  heldUntilMs: number | null,
): MobileApplicationActiveWakeup {
  // A held connection kept its socket through the background, so confirm it
  // instead of replacing a session that still works.
  if (heldUntilMs !== null && activeAtMs < heldUntilMs) return "application-active-probe";
  return backgroundedAtMs !== null &&
    activeAtMs - backgroundedAtMs >= MOBILE_BACKGROUND_RECONNECT_AFTER_MS
    ? "application-active-reconnect"
    : "application-active-probe";
}
