# Release

Versioning and publishing run through [Changesets](https://github.com/changesets/changesets) and GitHub Actions.

## Flow

1. Add a changeset: `npm run changeset`, pick the bump, describe the change, commit the `.changeset/*.md` file with your PR.
2. Merge the PR into `main`.
3. `release.yml` opens (or refreshes) the `chore: version packages` PR, which bumps `package.json` and `CHANGELOG.md`.
4. Merge that PR; the same workflow builds and publishes to npm with provenance.

## Workflows

- `.github/workflows/ci.yml` — on push and PR: install, lint, typecheck, test, build.
- `.github/workflows/release.yml` — on push to `main`: `changesets/action` versions or publishes.

## One-time setup: npm trusted publishing

Publishing uses OIDC, so no `NPM_TOKEN` secret is needed.
Configure it once on npmjs.com:

- Package settings → Trusted publishing → GitHub Actions.
- Owner/repo: `janniks/mdtation`.
- Workflow file name: `release.yml`.
- Environment: leave empty.

The first publish of a brand-new package can't use OIDC yet; publish `0.0.x` once locally with `npm publish --access public`, then set up the trusted publisher.
