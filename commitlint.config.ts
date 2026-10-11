import type { UserConfig } from "@commitlint/types";

/**
 * Conventional Commits, enforced by the commit-msg hook and in CI.
 * release-please reads these messages to pick the next version and write
 * the changelog, so the type matters: `feat` -> minor, `fix` -> patch,
 * `!` or a `BREAKING CHANGE:` footer -> major.
 */
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        // release-please titles its release pull requests `release(main): x.y.z`.
        "release",
        "revert",
        "style",
        "test",
      ],
    ],
  },
};

export default config;
