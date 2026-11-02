/**
 * Stylelint rules that keep every style on the design tokens (src/app/styles/tokens.css).
 *
 * - `spindle/tokens-only`: raw values live only in the token that defines them.
 *   Colours (hex, rgb(), hsl(), …) only in `--palette-*`. Lengths only in the spacing
 *   scale (`--spacing-*`, rem), the type scale (`--text-*`, rem), the hairlines
 *   (`--border-thin`, `--border-thick`, px) and letter-spacing (`--tracking-*`, em).
 *   Durations only in `--duration-*`. Everything else uses var(), calc() of vars,
 *   percentages and plain numbers.
 * - `spindle/spacing-grid`: the spacing scale is named in hundreds, 100 = 0.5rem, and
 *   stays on the 4px grid (25 = 2px is the one half step).
 */
import stylelint from "stylelint";

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

// Strip strings and url()s so their contents aren't read as values.
const clean = (value) =>
  value.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""').replace(/url\([^)]*\)/g, "");

const COLOR = /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const LENGTH = /(?<![\w-])-?(?:\d*\.)?\d+(px|rem|em|ch|ex|vmin|vmax|cm|mm|in|pt|pc|q|lh|rlh)\b/gi;
const TIME = /(?<![\w-])-?(?:\d*\.)?\d+(m?s)\b/gi;

/** Which raw length unit a token may hold. */
function allowedUnit(prop) {
  if (/^--spacing-\d+$/.test(prop) || /^--text-[\w-]+$/.test(prop)) {
    return "rem";
  }
  if (prop === "--border-thin" || prop === "--border-thick") {
    return "px";
  }
  if (/^--tracking-[\w-]+$/.test(prop)) {
    return "em";
  }
  return null;
}

const tokensOnlyName = "spindle/tokens-only";
const tokensOnlyMessages = ruleMessages(tokensOnlyName, {
  color: (prop) =>
    `Raw colour in "${prop}": only --palette-* holds raw colours. Use a colour role (var(--color-…)).`,
  length: (prop, unit) =>
    `Raw length (${unit}) in "${prop}": use the spacing tokens, e.g. var(--spacing-100) (100 = 0.5rem).`,
  time: (prop) => `Raw duration in "${prop}": use a --duration-* token.`,
});

const tokensOnly = createPlugin(tokensOnlyName, (on) => (root, result) => {
  if (!on) {
    return;
  }
  root.walkDecls((decl) => {
    const { prop } = decl;
    const value = clean(decl.value);
    const flag = (message) => report({ result, ruleName: tokensOnlyName, node: decl, message });
    if (COLOR.test(value) && !prop.startsWith("--palette-")) {
      flag(tokensOnlyMessages.color(prop));
      return;
    }
    for (const [, unit] of value.matchAll(LENGTH)) {
      if (unit.toLowerCase() !== allowedUnit(prop)) {
        flag(tokensOnlyMessages.length(prop, unit));
        return;
      }
    }
    if (TIME.test(value) && !prop.startsWith("--duration-")) {
      flag(tokensOnlyMessages.time(prop));
    }
    TIME.lastIndex = 0;
  });
});

const gridName = "spindle/spacing-grid";
const gridMessages = ruleMessages(gridName, {
  name: (prop, value, expected) =>
    `"${prop}: ${value}" breaks the scale: --spacing-N is N / 200 rem (expected ${expected}).`,
  grid: (prop) => `"${prop}" is off the 4px grid: use a multiple of 50 (25 for hairlines only).`,
});

const spacingGrid = createPlugin(gridName, (on) => (root, result) => {
  if (!on) {
    return;
  }
  root.walkDecls(/^--spacing-\d+$/, (decl) => {
    const n = Number(decl.prop.slice("--spacing-".length));
    const expected = n === 0 ? "0" : `${n / 200}rem`;
    if (decl.value !== expected) {
      report({
        result,
        ruleName: gridName,
        node: decl,
        message: gridMessages.name(decl.prop, decl.value, expected),
      });
    } else if (n % 50 !== 0 && n !== 25) {
      report({ result, ruleName: gridName, node: decl, message: gridMessages.grid(decl.prop) });
    }
  });
});

export default [tokensOnly, spacingGrid];
