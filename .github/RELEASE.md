# Release flow

Changesets + three small workflows for one package.

## Day to day

1. In your PR: `npm run changeset`, pick the bump, describe the change, commit the `.changeset/*.md` file.
   No user-facing change, no changeset.
2. Merge to `main`.
3. `version.yml` opens or refreshes the **`chore: version packages`** PR: bumps `package.json`, writes `CHANGELOG.md`, deletes the consumed changesets.
   It keeps absorbing merged changesets until you merge it.
4. Merge that PR.
   `publish.yml` sees the `chore: version packages` head commit, builds, publishes to npm as `latest`, pushes the `v*` tag, creates the GitHub Release.

Nothing else publishes on push.
A push to `main` without that commit subject only refreshes the version PR.

## PR canaries (manual)

Actions → **publish** → Run workflow → `pr` = the PR number.

- Publishes that PR's head as `<next version>-pr.<PR#>.<N>` under the `pr` dist-tag (`N` counts up per PR, read from npm).
- Pins `npx mdtation@<version>` to the top of the PR description.
- No git tag, no GitHub Release, never touches `latest`.
- Each run is one explicit click; there is no on-PR automation.

## Manual production release

Actions → **publish** → Run workflow → leave `pr` empty, from `main`.
Same as the merge path; `changeset publish` skips versions already on npm, so it is safe to re-run after a failed one.

## Skipping the version PR

Run `npm run version` locally, commit as **`chore: version packages`**, push to `main`.
The subject is what `publish.yml` keys on, so the exact text matters.

## Workflows

| file | trigger | does |
|---|---|---|
| `ci.yml` | push to `main`, every PR | `npm ci`, lint, fmt check, typecheck, test, build |
| `version.yml` | push to `main` | opens/refreshes the version PR; never publishes |
| `publish.yml` | version-PR merge, or manual | `latest` release, or a `pr` canary |

## Safety

- Only `publish.yml` has `id-token: write`; `version.yml` has no publish input at all.
- `latest` only from `main`, only for the version commit or an explicit empty-`pr` run.
- Every job is gated on `github.repository_owner == 'janniks'`, so forks never publish.
- Actions are pinned to commit SHAs.
- npm auth is OIDC trusted publishing with provenance; no `NPM_TOKEN` anywhere.
- The canary input must be a positive integer; anything else fails before checkout.
