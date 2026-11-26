import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Extracts distinct CSS selectors from stylesheet contents.
 */
function extractSelectors(css: string): string[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors: string[] = [];
  let buffer = '';

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '{') {
      const candidate = buffer.trim();
      buffer = '';
      if (
        !candidate.startsWith('@media') &&
        !candidate.startsWith('@supports') &&
        !candidate.startsWith('@keyframes')
      ) {
        candidate.split(',').forEach((s) => {
          const sel = s.trim().replace(/\s+/g, ' ');
          if (sel && !sel.startsWith('@')) {
            selectors.push(sel);
          }
        });
      }
    } else if (ch === '}' || ch === ';') {
      buffer = '';
    } else {
      buffer += ch;
    }
  }

  return [...new Set(selectors)].sort();
}

describe('CSS Selector Parity', () => {
  it('preserves every reference selector from the original globals.css', () => {
    const fixturePath = path.join(process.cwd(), 'src/test/fixtures/css-selectors.json');
    const referenceSelectors: string[] = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const stylesDir = path.join(process.cwd(), 'src/app/styles');
    const cssFiles = fs
      .readdirSync(stylesDir)
      .filter((file) => file.endsWith('.css'))
      .sort();

    let combinedCss = '';
    for (const file of cssFiles) {
      combinedCss += fs.readFileSync(path.join(stylesDir, file), 'utf8') + '\n';
    }

    const currentSelectors = new Set(extractSelectors(combinedCss));

    const missing = referenceSelectors.filter(
      (sel) => !currentSelectors.has(sel)
    );

    expect(
      missing,
      `Missing selectors:\n${missing.join('\n')}`
    ).toEqual([]);
    expect(referenceSelectors.length).toBeGreaterThan(100);
  });
});
