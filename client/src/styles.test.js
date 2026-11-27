import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Regression (Sprint 40): <main> wraps every page. If its enter animation
// keeps a transform after it ends (fill-mode both/forwards), position:fixed
// modals inside the page are positioned against <main>, not the viewport,
// and the admin recipe editor opened far below the screen.
describe('page enter animation', () => {
  it('does not keep a transform after it finishes', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const rule = css.match(/\.animate-fade-up\s*\{([^}]*)\}/)[1];
    expect(rule).toContain('animation:');
    expect(rule).not.toMatch(/\b(both|forwards)\b/);
  });
});
