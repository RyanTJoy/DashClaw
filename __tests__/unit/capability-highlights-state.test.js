import { beforeEach, describe, expect, it } from 'vitest';

import {
  HIGHLIGHTS_DISMISS_KEY,
  HIGHLIGHTS_VERSION,
  dismissHighlights,
  isHighlightsDismissed,
} from '@/lib/capabilityHighlightsState.js';

describe('capabilityHighlightsState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('is false when no dismissal is stored', () => {
    expect(isHighlightsDismissed(window.localStorage)).toBe(false);
  });

  it('is true when current version is stored', () => {
    window.localStorage.setItem(HIGHLIGHTS_DISMISS_KEY, HIGHLIGHTS_VERSION);
    expect(isHighlightsDismissed(window.localStorage)).toBe(true);
  });

  it('is false when stale version is stored', () => {
    window.localStorage.setItem(HIGHLIGHTS_DISMISS_KEY, '2026-02-14-major-v1');
    expect(isHighlightsDismissed(window.localStorage)).toBe(false);
  });

  it('writes dismissal for current version', () => {
    dismissHighlights(window.localStorage);
    expect(window.localStorage.getItem(HIGHLIGHTS_DISMISS_KEY)).toBe(HIGHLIGHTS_VERSION);
  });
});
