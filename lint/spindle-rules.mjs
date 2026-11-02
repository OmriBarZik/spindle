/** House rules that oxlint has no built-in rule for (see `.claude/rules/code-style.md`). */

const isJsx = (node) => node.type === "JSXElement" || node.type === "JSXFragment";

const noJsxAnd = {
  meta: {
    type: "suggestion",
    docs: { description: "Render conditionally with `a ? <B /> : null`" },
  },
  create(context) {
    const message = "Use `condition ? <Thing /> : null` instead of `condition && <Thing />`.";
    return {
      LogicalExpression(node) {
        if (node.operator === "&&" && isJsx(node.right)) context.report({ node, message });
      },
      // `{a && b}` as a child, where `b` may hold JSX. A JSX `b` is reported above.
      JSXExpressionContainer(node) {
        const { expression, parent } = node;
        if (
          isJsx(parent) &&
          expression.type === "LogicalExpression" &&
          expression.operator === "&&" &&
          !isJsx(expression.right)
        ) {
          context.report({ node, message });
        }
      },
    };
  },
};

const noTypeofType = {
  meta: { type: "suggestion", docs: { description: "Use exported types, not `typeof` in types" } },
  create(context) {
    return {
      TSTypeQuery(node) {
        context.report({ node, message: "Name and export the type instead of using `typeof`." });
      },
    };
  },
};

const noDescribe = {
  meta: { type: "suggestion", docs: { description: "Keep tests flat, without `describe`" } },
  create(context) {
    const message = "Never use `describe`: write flat tests with a descriptive title.";
    return {
      Identifier(node) {
        const { parent } = node;
        const called =
          (parent.type === "CallExpression" && parent.callee === node) ||
          (parent.type === "MemberExpression" && parent.object === node);
        if (node.name === "describe" && called) {
          context.report({ node, message });
        }
      },
    };
  },
};

const VAGUE_NAME = /^(helpers?|utils?|utilities|common|shared|misc|index)$/i;

const specificFileName = {
  meta: { type: "suggestion", docs: { description: "Name files after what they hold" } },
  create(context) {
    return {
      Program(node) {
        const base = context.filename.split(/[\\/]/).pop().split(".")[0];
        if (VAGUE_NAME.test(base)) {
          context.report({
            node,
            message: `"${base}" says nothing about the file: name it after what it holds.`,
          });
        }
      },
    };
  },
};

const noBarrel = {
  meta: { type: "suggestion", docs: { description: "Import from the file that defines a thing" } },
  create(context) {
    const message = "No barrel files or re-exports: import from the file that defines it.";
    return {
      ExportAllDeclaration(node) {
        context.report({ node, message });
      },
      ExportNamedDeclaration(node) {
        if (node.source) context.report({ node, message });
      },
    };
  },
};

// ---------- Design tokens: no raw colours or off-scale sizes in code ----------

const RAW_COLOR =
  /(?:^|[\s(,:'"`])#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i;
const PALETTE_NAMES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
// Tailwind's own colours (`bg-white`, `text-red-300`): use a colour role instead.
const TAILWIND_COLOR = new RegExp(
  `^-?(?:bg|text|border(?:-[xyseltrb])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:white|black|(?:${PALETTE_NAMES})-\\d{2,3})(?:/\\d+)?$`,
);
// Arbitrary values (`text-[13px]`, `[animation-play-state:paused]`). `w-(--size-record)` is fine.
// (A bare `[data-gap]` is a CSS selector, not a class.)
const ARBITRARY = /-\[[^\]]*\]$|^\[[\w-]+:[^\]]*\]$/;
// Spacing utilities take the 100s scale (tokens.css), not Tailwind's numbers.
const SPACING_UTILITY =
  /^-?(?:p[xytbse]?|p[lr]|m[xytbse]?|m[lr]|gap(?:-[xy])?|space-[xy]|w|h|size|min-[wh]|max-[wh]|inset(?:-[xy])?|top|bottom|start|end|left|right|leading|scroll-[mp][xytbse]?|basis|translate-[xy])-([\d.]+)$/;
const SPACING_SCALE = new Set([
  0, 25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
  950, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600, 2800,
  3000, 3200,
]);

/** Why one Tailwind class breaks the design tokens, or null when it's fine. */
function classProblem(cls) {
  // Drop variants (`sm:`, `rtl:`, `hover:`), but not the colon inside `[prop:value]`.
  const base = cls.replace(/^(?:[\w/-]+:)*!?/, "");
  if (ARBITRARY.test(base)) {
    return `"${cls}" is an arbitrary value: add a token to src/app/styles/tokens.css and use it.`;
  }
  if (TAILWIND_COLOR.test(base)) {
    return `"${cls}" is a raw Tailwind colour: use a colour role (bg-surface, text-muted, …).`;
  }
  const spacing = SPACING_UTILITY.exec(base);
  if (spacing && !SPACING_SCALE.has(Number(spacing[1]))) {
    return `"${cls}" is off the spacing scale: use the 100s (100 = 0.5rem), e.g. p-100, gap-150.`;
  }
  return null;
}

const noRawStyle = {
  meta: {
    type: "suggestion",
    docs: { description: "Style with the design tokens, not raw colours or numbers" },
  },
  create(context) {
    const check = (node, text) => {
      if (RAW_COLOR.test(text)) {
        context.report({
          node,
          message: "Raw colour: use a colour role from src/app/styles/tokens.css.",
        });
        return;
      }
      for (const cls of text.split(/\s+/)) {
        const message = cls ? classProblem(cls) : null;
        if (message) {
          context.report({ node, message });
          return;
        }
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};

export default {
  meta: { name: "spindle" },
  rules: {
    "no-barrel": noBarrel,
    "no-describe": noDescribe,
    "no-jsx-and": noJsxAnd,
    "no-raw-style": noRawStyle,
    "no-typeof-type": noTypeofType,
    "specific-file-name": specificFileName,
  },
};
