import { EnvironmentRegistry } from "@t3tools/client-runtime/connection";
import type { EnvironmentId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface ConnectionHoldModule {
  holdConnection?(title: string, text: string, holdMs: number): boolean;
  releaseConnection?(): void;
}

const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<ConnectionHoldModule>("T3AgentNotifications")
    : null;

// Long enough to answer a message elsewhere and come back, short enough that a
// forgotten app stops keeping the radio awake for socket pings every 5 seconds.
const HOLD_MS = 10 * 60_000;

let connectedLabel: string | null = null;
let heldUntilMs: number | null = null;

/** Android only: keeps the sockets alive after the app leaves the foreground. */
export function holdConnection(nowMs: number): void {
  const held =
    connectedLabel !== null &&
    native?.holdConnection?.(
      `Connected to ${connectedLabel}`,
      `Stays connected for ${HOLD_MS / 60_000} minutes so T3 Code opens ready.`,
      HOLD_MS,
    ) === true;
  heldUntilMs = held ? nowMs + HOLD_MS : null;
}

/**
 * Ends the hold and returns when it would have ended, or null when nothing was
 * held. Every wakeup subscriber runs its own AppState listener, so reading
 * leaves the value for the others; the next hold replaces it.
 */
export function releaseConnection(): number | null {
  native?.releaseConnection?.();
  return heldUntilMs;
}

export const layerConnectedObserver = Layer.effectDiscard(
  Effect.gen(function* () {
    const registry = yield* EnvironmentRegistry.EnvironmentRegistry;
    yield* SubscriptionRef.changes(registry.entries).pipe(
      Stream.switchMap((entries) => {
        const connected = new Map<EnvironmentId, string>();
        connectedLabel = null;
        return Stream.mergeAll(
          Array.from(entries.values(), ({ target }) =>
            registry.stateChanges(target.environmentId).pipe(
              Stream.tap((state) =>
                Effect.sync(() => {
                  if (state.phase === "connected")
                    connected.set(target.environmentId, target.label);
                  else connected.delete(target.environmentId);
                  connectedLabel = connected.values().next().value ?? null;
                }),
              ),
              Stream.ignore,
            ),
          ),
          { concurrency: "unbounded" },
        );
      }),
      Stream.runDrain,
      Effect.forkScoped,
    );
  }),
);
