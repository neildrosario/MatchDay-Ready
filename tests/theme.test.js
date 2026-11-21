import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UI_THEMES,
  UI_THEME_OPTIONS,
  normalizeUiTheme,
  resolveUiTheme,
  getNextUiTheme
} from '../src/theme.js';

describe('UI Theme Picker (src/theme.js)', () => {
  it('defaults safely to classic when no query param or stored preference exists', () => {
    assert.equal(resolveUiTheme({}), UI_THEMES.CLASSIC);
    assert.equal(resolveUiTheme({ search: '', storedTheme: null }), UI_THEMES.CLASSIC);
    assert.equal(resolveUiTheme({ search: '?code=STRAFFAN-2026', storedTheme: 'unknown' }), UI_THEMES.CLASSIC);
  });

  it('normalizes glass and classic aliases case-insensitively', () => {
    assert.equal(normalizeUiTheme('glass'), UI_THEMES.GLASS);
    assert.equal(normalizeUiTheme('GLASS-TURF'), UI_THEMES.GLASS);
    assert.equal(normalizeUiTheme('new'), UI_THEMES.GLASS);
    assert.equal(normalizeUiTheme('v2'), UI_THEMES.GLASS);
    assert.equal(normalizeUiTheme('classic'), UI_THEMES.CLASSIC);
    assert.equal(normalizeUiTheme('v1'), UI_THEMES.CLASSIC);
    assert.equal(normalizeUiTheme('invalid'), null);
  });

  it('normalizes neo-bank aliases case-insensitively', () => {
    assert.equal(normalizeUiTheme('neo'), UI_THEMES.NEO);
    assert.equal(normalizeUiTheme(' NEO '), UI_THEMES.NEO);
    assert.equal(normalizeUiTheme('bank'), UI_THEMES.NEO);
    assert.equal(normalizeUiTheme('neo-bank'), UI_THEMES.NEO);
    assert.equal(normalizeUiTheme('light'), UI_THEMES.NEO);
    assert.equal(normalizeUiTheme('v3'), UI_THEMES.NEO);
  });

  it('respects stored user preference when no URL override is present', () => {
    assert.equal(resolveUiTheme({ storedTheme: 'glass-turf' }), UI_THEMES.GLASS);
    assert.equal(resolveUiTheme({ storedTheme: 'classic' }), UI_THEMES.CLASSIC);
    assert.equal(resolveUiTheme({ storedTheme: 'neo' }), UI_THEMES.NEO);
  });

  it('lets shareable URL ?ui= query params override stored preference', () => {
    assert.equal(resolveUiTheme({ search: '?ui=glass', storedTheme: 'classic' }), UI_THEMES.GLASS);
    assert.equal(
      resolveUiTheme({ search: '?code=STRAFFAN-2026&ui=glass', storedTheme: 'classic' }),
      UI_THEMES.GLASS
    );
    assert.equal(resolveUiTheme({ search: '?ui=classic', storedTheme: 'glass-turf' }), UI_THEMES.CLASSIC);
    assert.equal(resolveUiTheme({ search: '?ui=neo', storedTheme: 'glass-turf' }), UI_THEMES.NEO);
    assert.equal(resolveUiTheme({ search: 'ui=bank' }), UI_THEMES.NEO);
  });

  it('exposes exactly three picker options in Classic -> Glass -> Neo order', () => {
    assert.deepEqual(
      UI_THEME_OPTIONS.map(o => o.id),
      [UI_THEMES.CLASSIC, UI_THEMES.GLASS, UI_THEMES.NEO]
    );
  });

  it('cycles themes in picker order and wraps around', () => {
    assert.equal(getNextUiTheme('classic'), UI_THEMES.GLASS);
    assert.equal(getNextUiTheme('glass-turf'), UI_THEMES.NEO);
    assert.equal(getNextUiTheme('neo'), UI_THEMES.CLASSIC);
    assert.equal(getNextUiTheme('garbage'), UI_THEMES.GLASS);
  });
});
