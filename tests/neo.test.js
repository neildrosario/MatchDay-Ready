import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getViewTransitionDirection, runNeoViewTransition, isSourceUsable } from '../src/neo.js';

describe('Neo UI layer (src/neo.js)', () => {
  const views = ['pitch', 'splitter', 'stats', 'admin'];

  it('slides forward when moving right along the bottom dock', () => {
    assert.equal(getViewTransitionDirection('pitch', 'splitter', views), 'forward');
    assert.equal(getViewTransitionDirection('pitch', 'admin', views), 'forward');
  });

  it('slides back when moving left along the bottom dock', () => {
    assert.equal(getViewTransitionDirection('stats', 'pitch', views), 'back');
    assert.equal(getViewTransitionDirection('admin', 'splitter', views), 'back');
  });

  it('skips animation for same-view re-renders or unknown views', () => {
    assert.equal(getViewTransitionDirection('pitch', 'pitch', views), 'none');
    assert.equal(getViewTransitionDirection('pitch', 'admin', ['pitch', 'stats']), 'none');
    assert.equal(getViewTransitionDirection(undefined, 'pitch', views), 'none');
  });

  it('runs view updates synchronously when no DOM / View Transitions are available', () => {
    let ran = false;
    runNeoViewTransition(() => {
      ran = true;
    }, { direction: 'forward' });
    assert.equal(ran, true);
  });

  it('keeps FAB source buttons usable across view switches while respecting RBAC .hidden on toolbars', () => {
    // Source inside #view-pitch (even while view transition is switching from Splitter -> Pitch)
    const activePitchBtn = {
      disabled: false,
      closest: selector => {
        assert.equal(selector, '.hidden:not([id^="view-"])');
        return null;
      }
    };
    assert.equal(isSourceUsable(activePitchBtn), true);

    // Source inside RBAC-hidden #pitchActionToolbar (e.g. read-only viewer)
    const viewerRestrictedBtn = {
      disabled: false,
      closest: () => ({ id: 'pitchActionToolbar' })
    };
    assert.equal(isSourceUsable(viewerRestrictedBtn), false);
    assert.equal(isSourceUsable({ disabled: true, closest: () => null }), false);
  });
});
