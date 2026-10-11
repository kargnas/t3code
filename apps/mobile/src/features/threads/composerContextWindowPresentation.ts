import type { MenuAction } from "@react-native-menu/menu";
import {
  formatContextWindowPercentage,
  formatContextWindowTokens,
} from "@t3tools/client-runtime/context-window";

// Same threshold as the web meter, which turns red past 90%.
const OVERLOADED_PERCENTAGE = 90;

export const COMPACT_CONTEXT_ACTION_ID = "compact-context";

/**
 * What the composer's context meter draws and what its menu lists. Native menus
 * on both platforms render only action rows, so the usage numbers ride in a
 * disabled row under the menu title.
 */
export function resolveComposerContextWindowPresentation(input: {
  readonly usage: {
    readonly usedTokens: number;
    readonly maxTokens: number | null;
    readonly usedPercentage: number | null;
  };
  /** Null when the provider has no /compact command. */
  readonly compact: { readonly disabledReason: string | null } | null;
}) {
  const used = formatContextWindowTokens(input.usage.usedTokens);
  // Null whenever the provider did not report a window size to measure against.
  const percentage = formatContextWindowPercentage(input.usage.usedPercentage);
  const fillPercentage = Math.max(0, Math.min(100, input.usage.usedPercentage ?? 0));
  const actions: MenuAction[] = [
    {
      id: "usage",
      title:
        percentage === null
          ? `${used} tokens`
          : `${percentage} · ${used} / ${formatContextWindowTokens(input.usage.maxTokens)}`,
      attributes: { disabled: true },
    },
  ];
  if (input.compact !== null) {
    actions.push({
      id: COMPACT_CONTEXT_ACTION_ID,
      title: "Compact context",
      image: "arrow.down.right.and.arrow.up.left",
      ...(input.compact.disabledReason === null ? {} : { subtitle: input.compact.disabledReason }),
      attributes: { disabled: input.compact.disabledReason !== null },
    });
  }
  return {
    fillPercentage,
    overloaded: fillPercentage > OVERLOADED_PERCENTAGE,
    accessibilityLabel:
      percentage === null
        ? `Context window ${used} tokens used`
        : `Context window ${percentage} used`,
    actions,
  };
}
