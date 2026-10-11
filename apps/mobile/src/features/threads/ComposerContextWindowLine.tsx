import {
  deriveLatestContextWindowSnapshot,
  latestProviderTurnTokenUsage,
} from "@t3tools/client-runtime/context-window";
import { memo, useMemo } from "react";
import { View } from "react-native";

import { ControlPillMenu } from "../../components/ControlPill";
import { cn } from "../../lib/cn";
import {
  useSelectedThreadProjection,
  useSelectedThreadVisibleTurnItems,
} from "../../state/use-thread-detail";
import {
  COMPACT_CONTEXT_ACTION_ID,
  resolveComposerContextWindowPresentation,
} from "./composerContextWindowPresentation";

// The composer's corners are 26–27px round, so the line keeps to the straight
// stretch of its top edge, where 0% and 100% sit at visible ends.
const EDGE_INSET = 28;
// Touch slop on each side of the edge. Above, the composer has 6px of its own
// padding and the floating status pill starts 8px up, so 6px stays clear of it;
// below, the first 6px of the composer hold no editor text.
const TOUCH_SLOP = 6;

/**
 * Context window usage drawn along the composer's top edge. Tapping it opens
 * the numbers and a compact action in the platform's native menu. It reads the
 * selected thread's projection itself so streamed updates re-render this line
 * instead of the whole composer; the selection holds that subscription back
 * until a queued thread exists on the server.
 */
export const ComposerContextWindowLine = memo(function ComposerContextWindowLine(props: {
  readonly compactSupported: boolean;
  readonly compactDisabledReason: string | null;
  readonly onCompact: () => void;
}) {
  const thread = useSelectedThreadProjection();
  const turnItems = useSelectedThreadVisibleTurnItems();
  const usage = useMemo(() => {
    if (thread === null) return null;
    const { projection } = thread;
    return deriveLatestContextWindowSnapshot(
      turnItems,
      latestProviderTurnTokenUsage(projection.providerTurns),
      projection.providerThreads.find(
        (providerThread) => providerThread.id === projection.thread.activeProviderThreadId,
      ),
    );
  }, [thread, turnItems]);
  const usedTokens = usage?.usedTokens ?? null;
  const maxTokens = usage?.maxTokens ?? null;
  const usedPercentage = usage?.usedPercentage ?? null;
  // Keyed on the numbers rather than the snapshot object, so projection updates
  // that leave usage alone do not hand the native menu a new action list.
  const presentation = useMemo(
    () =>
      usedTokens === null
        ? null
        : resolveComposerContextWindowPresentation({
            usage: { usedTokens, maxTokens, usedPercentage },
            compact: props.compactSupported
              ? { disabledReason: props.compactDisabledReason }
              : null,
          }),
    [usedTokens, maxTokens, usedPercentage, props.compactSupported, props.compactDisabledReason],
  );
  if (presentation === null) return null;

  return (
    // A zero-height in-flow anchor lands exactly on the composer's top edge
    // whatever notices render above it; zIndex lifts the touch strip over the
    // composer surface that follows.
    <View style={{ height: 0, zIndex: 1 }}>
      <ControlPillMenu
        accessible
        accessibilityRole="button"
        accessibilityLabel={presentation.accessibilityLabel}
        title="Context window"
        actions={presentation.actions}
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === COMPACT_CONTEXT_ACTION_ID) props.onCompact();
        }}
        style={{
          position: "absolute",
          top: -TOUCH_SLOP,
          left: EDGE_INSET,
          right: EDGE_INSET,
          height: TOUCH_SLOP * 2,
        }}
      >
        {/* Android's anchored menu does not forward the label, so its button
            reads it from here. */}
        <View
          accessibilityLabel={presentation.accessibilityLabel}
          style={{ height: TOUCH_SLOP * 2 }}
        >
          <View
            className="absolute inset-x-0 h-[2px] overflow-hidden rounded-full bg-foreground-muted/20"
            style={{ top: TOUCH_SLOP }}
          >
            <View
              className={cn(
                "h-full rounded-full",
                presentation.overloaded ? "bg-danger-foreground" : "bg-foreground-muted",
              )}
              style={{ width: `${presentation.fillPercentage}%` }}
            />
          </View>
        </View>
      </ControlPillMenu>
    </View>
  );
});
