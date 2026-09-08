import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ".next/**" only matches the repo-root build dir. A Claude Code
    // agent worktree under .claude/worktrees/<name>/ is a full separate
    // checkout with its own .next dev-build cache nested arbitrarily
    // deep — without this, that generated JS gets linted as if it were
    // source (require()/module-assignment/@ts-ignore errors that have
    // nothing to do with this project's own code).
    "**/.next/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
