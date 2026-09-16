import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import * as catalogModule from "../src/catalog.js";
import * as sidcModule from "../src/index.js";

/**
 * Guards README examples against drift: every trailing `// "..."` / `// true` /
 * `// false` / `// undefined` comment inside a ```ts block is executed against
 * the real library and compared to the documented value.
 *
 * Only the assertion expressions and the `const` initializers they depend on
 * are evaluated. Illustrative statements that intentionally throw (marked
 * `// SidcValidationError`), reference undefined helpers (`log.warn`), or use
 * TypeScript-only syntax (`as never`, `const x: string[]`) are skipped, so the
 * examples stay copy-pasteable without the test having to transpile TS.
 */

const README_PATH = fileURLToPath(new URL("../../README.md", import.meta.url));

interface CodeBlock {
  lang: string;
  startLine: number;
  content: string;
}

interface Statement {
  code: string;
  comment?: string;
  line: number;
}

type Expected = { matched: true; value: unknown } | { matched: false };

const BASE_SCOPE: Record<string, unknown> = {};
for (const source of [sidcModule, catalogModule]) {
  for (const [name, value] of Object.entries(source)) {
    if (/^[A-Za-z_$][\w$]*$/.test(name)) {
      BASE_SCOPE[name] = value;
    }
  }
}

function codeBlocks(markdown: string): CodeBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: CodeBlock[] = [];
  let open: { lang: string; startLine: number; body: string[] } | undefined;

  for (let i = 0; i < lines.length; i++) {
    const fence = /^```(\w*)\s*$/.exec(lines[i]);
    if (fence === null) {
      open?.body.push(lines[i]);
      continue;
    }
    if (open === undefined) {
      open = { lang: fence[1], startLine: i + 2, body: [] };
    } else {
      blocks.push({
        lang: open.lang,
        startLine: open.startLine,
        content: open.body.join("\n"),
      });
      open = undefined;
    }
  }
  return blocks;
}

function parseStatements(block: CodeBlock): Statement[] {
  const lines = block.content.split("\n");
  const statements: Statement[] = [];
  let buffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = block.startLine + i;
    const trailing = /^(.*);[ \t]*(\/\/.*)$/.exec(line);

    if (trailing !== null) {
      statements.push({
        code: [...buffer, trailing[1]].join("\n"),
        comment: trailing[2],
        line: lineNumber,
      });
      buffer = [];
      continue;
    }

    if (/;\s*$/.test(line) || /^\s*[})\]]\s*;?\s*$/.test(line)) {
      statements.push({ code: [...buffer, line].join("\n"), line: lineNumber });
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    statements.push({
      code: buffer.join("\n"),
      line: block.startLine + lines.length - 1,
    });
  }
  return statements;
}

/** Drops blank and comment-only lines so a statement starts at its code. */
function stripLeadingComments(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "" && !/^\s*\/\//.test(line))
    .join("\n");
}

function parseExpected(comment: string): Expected {
  const text = comment.replace(/^\/\/\s*/, "").trim();
  let match: RegExpExecArray | null;

  if ((match = /^"([^"]*)"/.exec(text)) !== null) {
    return { matched: true, value: match[1] };
  }
  if ((match = /^'([^']*)'/.exec(text)) !== null) {
    return { matched: true, value: match[1] };
  }
  if ((match = /^(true|false)\b/.exec(text)) !== null) {
    return { matched: true, value: match[1] === "true" };
  }
  if (/^undefined\b/.test(text)) {
    return { matched: true, value: undefined };
  }
  if ((match = /^(-?\d+(?:\.\d+)?)\b/.exec(text)) !== null) {
    return { matched: true, value: Number(match[1]) };
  }
  return { matched: false };
}

function evaluate(expression: string, scope: Record<string, unknown>): unknown {
  const names = Object.keys(scope);
  const values = names.map((name) => scope[name]);
  const run = new Function(...names, `"use strict"; return (${expression}\n);`);
  return run(...values);
}

describe("README examples", () => {
  const markdown = readFileSync(README_PATH, "utf8");
  const tsBlocks = codeBlocks(markdown).filter((block) => block.lang === "ts");

  it("match the library's real behavior", () => {
    const checked: number[] = [];
    const problems: string[] = [];
    const originalWarn = console.warn;
    console.warn = () => {};

    try {
      for (const block of tsBlocks) {
        const scope = { ...BASE_SCOPE };

        for (const statement of parseStatements(block)) {
          const code = stripLeadingComments(statement.code)
            .trim()
            .replace(/;$/, "")
            .trim();
          const expected = statement.comment
            ? parseExpected(statement.comment)
            : { matched: false as const };
          const binding =
            /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*)$/.exec(
              code,
            );

          if (binding !== null) {
            const [, name, initializer] = binding;
            let value: unknown;
            try {
              value = evaluate(initializer, scope);
            } catch {
              // Optional setup this test does not need (TS annotations, etc.).
              continue;
            }
            scope[name] = value;

            if (expected.matched) {
              checked.push(statement.line);
              try {
                assert.deepStrictEqual(value, expected.value);
              } catch {
                problems.push(
                  `README.md:${statement.line}: expected ${JSON.stringify(expected.value)} ` +
                    `from \`${name}\` but got ${JSON.stringify(value)}`,
                );
              }
            }
            continue;
          }

          if (!expected.matched) {
            continue;
          }

          const logged = /^console\.log\(\s*([\s\S]*?)\s*\)$/.exec(code);
          const expression = logged === null ? code : logged[1];
          let actual: unknown;
          try {
            actual = evaluate(expression, scope);
          } catch (error) {
            problems.push(
              `README.md:${statement.line}: could not evaluate \`${expression}\` ` +
                `(${(error as Error).message})`,
            );
            continue;
          }

          checked.push(statement.line);
          try {
            assert.deepStrictEqual(actual, expected.value);
          } catch {
            problems.push(
              `README.md:${statement.line}: expected ${JSON.stringify(expected.value)} ` +
                `from \`${expression}\` but got ${JSON.stringify(actual)}`,
            );
          }
        }
      }
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(
      problems.length,
      0,
      `README examples drifted from the library:\n${problems.join("\n")}`,
    );
    assert.ok(
      checked.length >= 20,
      `expected at least 20 documented assertions in README.md, checked ${checked.length}`,
    );
  });
});
