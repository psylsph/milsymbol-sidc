# AGENTS.md

Guidance for agents and contributors working in `milsymbol-sidc`. It is the
project's own instructions; the global `~/.pi/agent/AGENTS.md` does not cover
this repo.

## Project overview

Fluent TypeScript builder for MIL-STD-2525E / APP-6 numeric (20-character) SIDC
strings, intended for use with [milsymbol](https://github.com/spatialillusions/milsymbol).

- Package: `milsymbol-sidc` (ESM, `"type": "module"`)
- Source: `src/` (`sidc.ts`, `enums.ts`, `validate.ts`, `catalog.ts`, `catalogs.generated.ts`)
- Tests: `test/*.test.ts`, compiled and run from `dist/test/*.test.js`
- Build: `tsc` → `dist/`; published files are limited to `dist/src`
- Docs: `README.md` (user-facing), `docs/plans/` (historical plans — do not rewrite)

## Commands

```bash
npm ci                     # clean install (what CI uses)
npm run build              # tsc → dist/
npm test                   # build + node --test dist/test/*.test.js
npm run lint               # eslint
npm run format             # prettier --write
npm run format:check       # prettier --check
npm run generate:catalogs  # regenerate src/catalogs.generated.ts, then format it
```

Run `npm run format` (or `npx prettier --write`) after editing `.ts`, `.json`, or
`.yml` files so `format:check` stays green. Markdownlint covers `README.md`,
`docs/plans/*.md`, `CHANGELOG.md`, and `AGENTS.md`.

## Conventions

- Keep the public builder API immutable — setters return a new instance.
- All 20/23 positions are validated at construction; raw escape hatches are
  shape-checked but must preserve leading zeroes.
- Warning text, problem codes, and error classes are part of the public
  contract. Do not change them without a changelog note and a major/minor bump
  as appropriate.
- Backward compatibility matters: default output must stay byte-for-byte
  identical across releases. Additive APIs are preferred over changed behavior.
- `src/catalogs.generated.ts` is generated from the pinned `milsymbol` version.
  Never hand-edit it; run `npm run generate:catalogs`. CI fails if it is stale.
- Follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html): breaking →
  major, new features → minor, fixes → patch. Pre-1.0, breaking changes may ship
  in a minor, but call them out clearly.

## Changelog

**Every release must update `CHANGELOG.md`.** This is a release-blocking step,
not optional.

- The file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- Add work to the `## [Unreleased]` section as it lands on `main`, using the
  standard headings (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
  `Security`) plus `Notes`/`Tooling` where useful.
- When cutting a release, move the `Unreleased` entries under a new
  `## [x.y.z] - YYYY-MM-DD` heading, leave `Unreleased` empty, and update the
  comparison links at the bottom so `[Unreleased]` points at
  `compare/vX.Y.Z...HEAD`.
- Mirror the entry into the GitHub release notes so the published release and
  the changelog agree.

## Releasing

`publish.yml` publishes to npm when a **GitHub release is published** (it also
supports manual `workflow_dispatch`). It uses npm trusted publishing (OIDC) with
automatic provenance, so no token or `.npmrc` is needed. The version in
`package.json` is what gets published — the git tag must match it.

Do the following in order, from an up-to-date `main` with a clean working tree.

### 1. Sync and verify the base

```bash
git checkout main
git pull --ff-only
git status --short          # must be empty
```

### 2. Run the full suite locally

Mirror CI, do not rely on CI alone:

```bash
npm ci
npm test                    # build + all tests
npm run lint
npm run format:check
npx --yes markdownlint-cli@0.43.0 README.md docs/plans/*.md CHANGELOG.md AGENTS.md
npm run build
npm run generate:catalogs && git diff --exit-code -- src/catalogs.generated.ts
node --test --experimental-test-coverage dist/test/*.test.js
```

Everything must pass. If `generate:catalogs` leaves a diff, commit the
regenerated catalog before releasing.

### 3. Roll the version everywhere

`npm version` updates both `package.json` and the two version fields in
`package-lock.json` (`version` and `packages[""].version`) — do not edit those by
hand:

```bash
npm version <major|minor|patch> --no-git-tag-version
```

Then grep for stragglers and confirm nothing else hardcodes the old version:

```bash
grep -rn "0\.x\.y" --include='*.ts' --include='*.json' --include='*.md' \
  --include='*.mjs' --include='*.yml' . | grep -v node_modules
```

`README.md` uses npm badges (dynamic) and `docs/plans/` is historical, so neither
should normally need a version edit. The `milsymbol` version pin in
`src/catalogs.generated.ts` / `package.json` is a dependency version, not this
package's version — leave it alone.

### 4. Finalize CHANGELOG.md

Move the `Unreleased` entries under `## [x.y.z] - YYYY-MM-DD` and update the link
definitions at the bottom of the file (see Changelog above).

### 5. Re-check and commit

Re-run the checks from step 2 after the version/changelog edits, then commit —
use the version as the message to match existing history:

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "x.y.z"
git push origin main
```

Wait for CI to go green on `main`.

### 6. Tag and create the GitHub release

The tag format is `vX.Y.Z` and must match `package.json`:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
gh release create vX.Y.Z --title "x.y.z" --notes-file -   # paste changelog section
```

Publishing the release triggers `publish.yml`.

### 7. Verify the publish

Watch the workflow and confirm the npm package and provenance:

```bash
gh run watch
npm view milsymbol-sidc version
```

Also confirm the release notes on GitHub match the changelog section.

If the publish workflow fails, fix the cause, and re-run it with
`gh workflow run publish.yml` (or re-publish the release) rather than tagging a
new version.
