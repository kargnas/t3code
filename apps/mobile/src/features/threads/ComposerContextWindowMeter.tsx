import {
  deriveLatestContextWindowSnapshot,
  latestProviderTurnTokenUsage,
} from "@t3tools/client-runtime/context-window";
import { memo, useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { withUniwind } from "uniwind";

import { Menu } from "../../components/ui/Menu";
import { useAndroidControlSizing } from "../../components/ui/useAndroidControlSizing";
import {
  useSelectedThreadProjection,
  useSelectedThreadVisibleTurnItems,
} from "../../state/use-thread-detail";
import {
  COMPACT_CONTEXT_ACTION_ID,
  resolveComposerContextWindowPresentation,
} from "./composerContextWindowPresentation";

// The web meter's geometry: in a 24-unit box this radius keeps the 3-unit
// stroke inside the edge.
const RING_RADIUS = 9.75;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ThemedCircle = withUniwind(Circle);

/**
 * Reads the selected thread's projection itself, so streamed updates re-render this ring
 * instead of the whole composer. The selection holds that subscription back until a
 * queued thread exists on the server.
 */
export const ComposerContextWindowMeter = memo(function ComposerContextWindowMeter(props: {
  readonly compactSupported: boolean;
  readonly compactDisabledReason: string | null;
  readonly onCompact: () => void;
}) {
  const { scale } = useAndroidControlSizing();
  const thread = useSelectedThreadProjection();
  const turnItems = useSelectedThreadVisibleTurnItems();
  const usage = useMemo(() => {
    if (thread === null) return null;
    const { projection } = thread;
    const activeProviderThread = projection.providerThreads.find(
      (providerThread) => providerThread.id === projection.thread.activeProviderThreadId,
    );
    return deriveLatestContextWindowSnapshot(
      turnItems,
      latestProviderTurnTokenUsage(projection.providerTurns, projection, activeProviderThread),
      activeProviderThread,
    );
  }, [thread, turnItems]);
  const usedTokens = usage?.usedTokens ?? null;
  const maxTokens = usage?.maxTokens ?? null;
  const usedPercentage = usage?.usedPercentage ?? null;
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

  const ringSize = Math.round(20 * scale);
  return (
    <Menu
      accessible
      accessibilityRole="button"
      accessibilityLabel={presentation.accessibilityLabel}
      title="Context window"
      actions={presentation.actions}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === COMPACT_CONTEXT_ACTION_ID) props.onCompact();
      }}
    >
      <View
        accessibilityLabel={presentation.accessibilityLabel}
        className="size-[44px] shrink-0 items-center justify-center"
      >
        {/* Rotated so the fill starts at 12 o'clock, like the web ring. */}
        <Svg
          width={ringSize}
          height={ringSize}
          viewBox="0 0 24 24"
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <ThemedCircle
            cx={12}
            cy={12}
            r={RING_RADIUS}
            fill="none"
            colorClassName="accent-foreground-muted"
            stroke="currentColor"
            strokeOpacity={0.24}
            strokeWidth={3}
          />
          <ThemedCircle
            cx={12}
            cy={12}
            r={RING_RADIUS}
            fill="none"
            colorClassName={
              presentation.overloaded ? "accent-danger-foreground" : "accent-foreground-muted"
            }
            stroke="currentColor"
            strokeOpacity={presentation.overloaded ? 1 : 0.72}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - presentation.fillPercentage / 100)}
          />
        </Svg>
      </View>
    </Menu>
  );
});
