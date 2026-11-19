import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSwipeNavigation } from '../src/swipe.js';

describe('Horizontal Swipe Tab Navigation (src/swipe.js)', () => {
  const fullViews = ['pitch', 'splitter', 'stats', 'admin'];

  it('moves Pitch -> Splitter on swipe left and Splitter -> Pitch on swipe right', () => {
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'pitch',
        dx: -90,
        dy: 10,
        durationMs: 220,
        visibleViews: fullViews
      }),
      'splitter'
    );
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'splitter',
        dx: 90,
        dy: -12,
        durationMs: 210,
        visibleViews: fullViews
      }),
      'pitch'
    );
  });

  it('respects RBAC-filtered visible views and stops cleanly at edges', () => {
    const pitchAndStatsOnly = ['pitch', 'stats'];
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'pitch',
        dx: -85,
        dy: 5,
        visibleViews: pitchAndStatsOnly
      }),
      'stats'
    );
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'pitch',
        dx: 85,
        dy: 5,
        visibleViews: pitchAndStatsOnly
      }),
      null
    );
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'stats',
        dx: -85,
        dy: 5,
        visibleViews: pitchAndStatsOnly
      }),
      null
    );
  });

  it('ignores short gestures, slow drags, and predominantly vertical scrolls', () => {
    // Too short
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'pitch',
        dx: -40,
        dy: 0,
        visibleViews: fullViews
      }),
      null
    );
    // Diagonal / vertical scroll
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'pitch',
        dx: -80,
        dy: 70,
        visibleViews: fullViews
      }),
      null
    );
    // Too slow
    assert.equal(
      resolveSwipeNavigation({
        currentView: 'pitch',
        dx: -100,
        dy: 0,
        durationMs: 900,
        visibleViews: fullViews
      }),
      null
    );
  });
});
