import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UI_THEMES, normalizeUiTheme, resolveUiTheme } from '../src/theme.js';

describe('UI Theme Preview Toggle (src/theme.js)', () => {
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

  it('respects stored user preference when no URL override is present', () => {
    assert.equal(resolveUiTheme({ storedTheme: 'glass-turf' }), UI_THEMES.GLASS);
    assert.equal(resolveUiTheme({ storedTheme: 'classic' }), UI_THEMES.CLASSIC);
  });

  it('lets shareable URL ?ui= query params override stored preference', () => {
    assert.equal(
      resolveUiTheme({ search: '?ui=glass', storedTheme: 'classic' }),
      UI_THEMES.GLASS
    );
    assert.equal(
      resolveUiTheme({ search: '?code=STRAFFAN-2026&ui=glass', storedTheme: 'classic' }),
      UI_THEMES.GLASS
    );
    assert.equal(
      resolveUiTheme({ search: '?ui=classic', storedTheme: 'glass-turf' }),
      UI_THEMES.CLASSIC
    );
  });
});
