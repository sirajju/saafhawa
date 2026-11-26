import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
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

  return [...new Set(selectors)];
}

describe('CSS Selector Parity Verification', () => {
  it('preserves all selectors from submission-1-96.72 without regression', () => {
    const originalCss = execSync('git show submission-1-96.72:src/app/globals.css', {
      encoding: 'utf8',
    });
    const originalSelectors = extractSelectors(originalCss);

    const stylesDir = path.join(process.cwd(), 'src/app/styles');
    const cssFiles = fs
      .readdirSync(stylesDir)
      .filter((file) => file.endsWith('.css'))
      .sort();

    let combinedCurrentCss = '';
    for (const file of cssFiles) {
      combinedCurrentCss += fs.readFileSync(path.join(stylesDir, file), 'utf8') + '\n';
    }

    const currentSelectors = new Set(extractSelectors(combinedCurrentCss));

    // Explicit allowlist of intentionally removed selectors with justification
    const deliberatelyRemovedSelectors: Record<string, string> = {};

    const missingSelectors = originalSelectors.filter(
      (sel) => !currentSelectors.has(sel) && !(sel in deliberatelyRemovedSelectors)
    );

    expect(
      missingSelectors,
      `Missing original selectors from submission-1-96.72:\n${missingSelectors.join('\n')}`
    ).toEqual([]);
    expect(originalSelectors.length).toBeGreaterThan(100);
  });

  it('guarantees each split stylesheet remains under 200 lines', () => {
    const stylesDir = path.join(process.cwd(), 'src/app/styles');
    const cssFiles = fs.readdirSync(stylesDir).filter((file) => file.endsWith('.css'));

    for (const file of cssFiles) {
      const content = fs.readFileSync(path.join(stylesDir, file), 'utf8');
      const lineCount = content.split('\n').length;
      expect(lineCount, `${file} exceeds 200 line limit`).toBeLessThan(200);
    }
  });
});
