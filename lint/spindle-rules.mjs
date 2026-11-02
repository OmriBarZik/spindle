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

export default {
  meta: { name: "spindle" },
  rules: {
    "no-barrel": noBarrel,
    "no-describe": noDescribe,
    "no-jsx-and": noJsxAnd,
    "no-typeof-type": noTypeofType,
    "specific-file-name": specificFileName,
  },
};
