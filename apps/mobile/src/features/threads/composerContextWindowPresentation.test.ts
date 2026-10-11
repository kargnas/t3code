import { describe, expect, it } from "vite-plus/test";

import {
  COMPACT_CONTEXT_ACTION_ID,
  resolveComposerContextWindowPresentation,
} from "./composerContextWindowPresentation";

describe("resolveComposerContextWindowPresentation", () => {
  it("shows the share of a known window and offers compaction", () => {
    const presentation = resolveComposerContextWindowPresentation({
      usage: { usedTokens: 84_000, maxTokens: 200_000, usedPercentage: 42 },
      compact: { disabledReason: null },
    });

    expect(presentation.fillPercentage).toBe(42);
    expect(presentation.overloaded).toBe(false);
    expect(presentation.actions.map((action) => action.title)).toEqual([
      "42% · 84k / 200k",
      "Compact context",
    ]);
    expect(presentation.actions[1]?.attributes?.disabled).toBe(false);
  });

  it("falls back to a token count when the provider reports no window size", () => {
    const presentation = resolveComposerContextWindowPresentation({
      usage: { usedTokens: 1_500, maxTokens: null, usedPercentage: null },
      compact: null,
    });

    expect(presentation.fillPercentage).toBe(0);
    expect(presentation.accessibilityLabel).toBe("Context window 1.5k tokens used");
    expect(presentation.actions.map((action) => action.title)).toEqual(["1.5k tokens"]);
  });

  it("turns red past 90% and explains a blocked compaction", () => {
    const presentation = resolveComposerContextWindowPresentation({
      usage: { usedTokens: 190_000, maxTokens: 200_000, usedPercentage: 95 },
      compact: { disabledReason: "Compacting is unavailable right now" },
    });
    const compact = presentation.actions.find((action) => action.id === COMPACT_CONTEXT_ACTION_ID);

    expect(presentation.overloaded).toBe(true);
    expect(compact?.attributes?.disabled).toBe(true);
    expect(compact?.subtitle).toBe("Compacting is unavailable right now");
  });
});
