# Contributing

## Setup

1. Install [Bun](https://bun.sh) 1.4 or newer.
2. `bun install`. This also installs the git hooks (via [lefthook](https://lefthook.dev)).
3. `bun run dev` starts the worker on http://localhost:8787 and rebuilds when
   `src/` changes.

No Cloudflare account is needed for local development; you only need one to deploy.

## Rules

These are enforced, not suggestions. The git hooks catch them before you commit
or push, and CI rejects the pull request if anything slips through.

| Rule | Tool | Local check | Enforced by |
| --- | --- | --- | --- |
| Formatting | [Biome](https://biomejs.dev) | `bun run check` (`bun run fix` to apply) | pre-commit hook (auto-fixes staged files), CI |
| Lint | Biome | `bun run lint` | pre-commit hook, CI |
| Types | TypeScript, strict | `bun run typecheck` | pre-commit hook, CI |
| Tests | `bun test` | `bun test` | pre-push hook, CI |
| Commit messages | [commitlint](https://commitlint.js.org) | — | commit-msg hook, CI (commits and PR title) |

`bun run verify` runs everything CI runs, in the same order.

Editor setup: install the Biome extension for your editor and enable format on
save. `.vscode/` already configures this for VS Code.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
This isn't just style: release-please reads them to decide the next version
and to write the changelog.

```
<type>(<optional scope>): <summary in the imperative, lowercase, no period>

<optional body: what changed and why>

<optional footer, e.g. BREAKING CHANGE: ... or Closes #12>
```

| Type | Use for | Version bump | In changelog |
| --- | --- | --- | --- |
| `feat` | A new endpoint, parameter or user-visible capability | minor | yes |
| `fix` | A bug fix | patch | yes |
| `perf` | A performance improvement | patch | yes |
| `refactor` | Restructuring without behavior change | — | no |
| `test` | Adding or fixing tests | — | no |
| `docs` | Documentation only | — | no |
| `build` | Build scripts, dependencies | — | no |
| `ci` | GitHub workflows | — | no |
| `style` | Formatting only | — | no |
| `chore` | Anything else that doesn't touch behavior | — | no |

A `!` after the type (`feat!: ...`) or a `BREAKING CHANGE:` footer marks a
breaking change and bumps the major version. For this project that means
changing an existing endpoint's URL, parameters or response shape.

Useful scopes are the route or module you changed: `feat(ssl): ...`,
`fix(whois): ...`, `refactor(dns): ...`.

Good:

```
feat(ssl): add a provider for Google's CT log
fix(whois): resolve the registrable domain for .co.uk names
```

Rejected by the hook:

```
fixed something.
Update worker.js
```

## Pull requests

- Branch from `main`; name it after the change (`feat/ct-provider`, `fix/whois-co-uk`).
- Keep each pull request to one change.
- Pull requests are squash-merged, so the **PR title** becomes the commit on
  `main`. It must follow the same convention, and CI checks it.
- Add or update tests for any behavior you change. Pure logic belongs in
  `src/lib/` with unit tests; route behavior is tested through the router.

## Releasing

Nothing to do by hand:

1. Every push to `main` updates an open **release pull request**
   (`release(main): x.y.z`) with the next version and changelog.
2. Squash-merging that pull request tags `vx.y.z`, publishes the GitHub
   release with the built bundle attached (with a build provenance
   attestation), and deploys the worker to Cloudflare.

The workflows need these repository secrets:

| Secret | Used for |
| --- | --- |
| `APP_ID`, `APP_PRIVATE_KEY` | GitHub App token for release-please, so its pull requests trigger CI. |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Deploying the worker (the `production` environment). |
