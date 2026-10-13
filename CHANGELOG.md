# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Everything in this section is pending the next tagged release. Add entries here
as work lands on `main`, then move them under the new version heading when the
release is cut (see `AGENTS.md` → Releasing).

## [0.7.0] - 2026-10-13

Named MIL-STD-2525D codes (optional `milsymbol-sidc/2525d` subpath) and a
structured `entity()` form. Purely additive: existing calls and output are
unchanged.

### Added

- **Named MIL-STD-2525D codes** in the new optional `milsymbol-sidc/2525d`
  subpath: one export per symbol set (`Air`, `LandUnit`, …) with hierarchical
  `Entity`, flat `Modifier1`, `Modifier2`, and `SpecialSubtype` names, each a
  frozen `{ code, label, kind, symbolSet }` object, plus `describe2525d()` for
  reverse lookup. Names are generated from Esri's JMSML (Apache-2.0, pinned
  commit in `NAMES_SOURCE`) and describe edition D only; symbol set 27 has none.
  The main entry point and its output are unchanged, and unused symbol sets
  tree-shake away (about 6 KB for a bundle importing only `Air`; using
  `describe2525d()` brings every set in). `describe2525d()` returns no names
  for edition E versions or three-digit extended modifiers.
- `symbolSet()`, `entity()`, `modifier1()`, and `modifier2()` also accept named
  codes (or any `{ code }` object; checked when applied, not re-checked if
  `symbolSet()` changes later, and the builder version is not checked). Raw strings behave exactly as before. A
  named code is rejected on another symbol set or the wrong setter; while the
  builder's symbol set is `"00"`, the named code's symbol set is adopted.
- `entity()` also accepts its levels, `{ entity: "12", type: "01" }` (omitted
  levels default to `"00"`, and a special subtype name is allowed), and
  `entityParts()` reads them back. Both are encoded identically to the string.
- `NOTICE` and `data/JMSML-LICENSE.txt` ship in the package with the Apache-2.0
  attribution for the JMSML-derived names.
- `examples/civil-airliner`: a MIL-STD-2525D sample (interactive browser page
  plus a Node script writing SVGs) that builds and renders a passenger air
  track, `10040100000000000900`, with milsymbol.

## [0.6.0] - 2026-10-13

Catalog correctness fixes (control measures, phantom codes), stricter and more
informative validation, MIL-STD-2525D documentation, and a GitHub Packages
mirror. Contains one breaking change, limited to `strict: true` builders.

### Breaking

- **Strict mode only:** `strict: true` now also rejects unrecognized
  field-record keys passed to the constructor or `with()`, throwing
  `SidcValidationError` (`Unknown field "…"`). A strict builder fed records
  that carry extra data, such as `with({ ...row })` where `row` has an `id`,
  worked in 0.5.0 and now throws; strip the extra keys first. Typos such as
  `with({ entitty: "123456" })` are caught even when the value is `undefined`.
  Builders without `strict` are unaffected: unknown keys are still accepted,
  and are now discarded instead of being stored and carried into later
  builders. Any truthy `strict` value enables the check on every path.

### Changed

- Field records are read the same way at the top level and in `extension`:
  own and custom-prototype keys count (so `Object.create({ entity: "…" })`
  now sets the entity instead of being silently ignored), while keys that
  exist only on `Object.prototype` are neither checked nor read.
- `Sidc.parse()` error messages now name the offending field: a well-formed
  SIDC with an unknown code throws
  `Invalid 20- or 23-character SIDC "…". Unknown amplifier code "99".`, and the
  original field error is attached as `cause`. The message still starts with
  the previous text. Non-string input now reports its type
  (`Invalid 20- or 23-character SIDC: expected a string, got bigint.`), and an
  invalid `options.standard` throws its own `Unknown standard "…"` error
  instead of blaming the SIDC. `parse()` throws only `SidcValidationError`;
  an unexpected failure while reading options is wrapped, with the original
  error as `cause`.
- `null` options are accepted by the constructor, `parse()`, and `tryParse()`
  and mean "use the defaults", like omitting them.
- `unsupported-extension-edition` is no longer reported for frame shape
  `NoFrame` (`A`) on D editions: milsymbol suppresses the frame for `A` in
  every edition. Extended modifier digits and frame shapes `1`–`9` on D
  editions still warn, and the message now says exactly that:
  `Extended modifier digits and frame shapes 1-9 are supported only for E
  editions; version "…" is a D edition.` (previously
  `Non-default SIDC extensions are supported only for E editions; …`).
- `SidcError`, `SidcValidationError`, and `SidcCombinationError` accept an
  optional standard `ErrorOptions` second argument (for `cause`).

### Added

- README: a "Working with MIL-STD-2525D" section with runnable, test-checked
  examples, and notes on how D-edition reports relate to milsymbol rendering.
  `test/milsymbol.test.ts` verifies the 2525D behavior against milsymbol.

### Fixed

- Catalogs: symbol set `25` (control measures) now lists its 270 entity codes.
  The generator expected milsymbol's entity map to be named `sId`, but
  `control-measure.js` names it `sidc`, so the set had no entity codes at all.
  Map names are now read from each module's `icons()` signature.
- Catalogs: codes inside commented-out milsymbol source are no longer
  harvested. This removes 57 phantom dismounted-individual entity codes
  (`110317`–`110364`, `110404`–`110412`), modifier 1 `56` for set `27`, and
  modifier 1 `01` for set `36`.
- Catalogs: codes milsymbol reports as invalid are excluded. The generator
  renders every entity, modifier, and extended modifier code and keeps it when
  any edition/standard combination is valid; this currently drops the
  placeholder `icn["TODO"]` entities `200600`, `200700`, and `280100` in set
  `25`. Empty-icon registrations such as `sIdm1["11"] = []` are kept, since
  milsymbol accepts them. Symbol sets left with no codes are omitted. A new
  test checks the catalog against milsymbol with the same rule.
- Enumerable properties added to `Object.prototype` (by a polyfill or
  prototype pollution) no longer affect builders: they are not rejected as
  unknown extension keys, and a polluted known name such as `frameShape` or
  `extension` is no longer read as a field value.
- Catalogs: lookups such as `isKnownEntityCode("constructor", …)` or
  `entityCodes("__proto__")` no longer throw or return non-array values;
  `Object.prototype` keys are treated as unknown symbol sets.
- Non-string `standard` values (for example a `Symbol`) now throw
  `SidcValidationError` instead of a `TypeError` from string conversion.
- README: removed duplicated modifier 1 / modifier 2 rows from the SIDC
  position table (the surviving rows already documented both the raw and
  extended setter forms).
- Clarified the `Amplifier` doc comment: unlisted code ranges are unused in
  MIL-STD-2525 and APP-6 rather than reserved.

### Tooling

- `npm run import:jmsml` (network; rarely) snapshots the pinned JMSML commit
  into `data/jmsml-2525d.json`; `npm run generate:names` builds
  `src/names-2525d.generated.ts` from it offline, with hand-picked short names
  in `scripts/name-overrides.json`. CI fails if the generated file is stale.
- `publish.yml` now also mirrors each release to GitHub Packages as
  `@psylsph/milsymbol-sidc`, in a separate job after the npm publish, so the
  package is listed on the repository page. npm (unscoped `milsymbol-sidc`)
  remains the primary registry.
- The catalog render rule lives in `scripts/catalog-render-rule.mjs`, shared
  by the generator and `test/milsymbol.test.ts`, so the two cannot drift. The
  generator also fails on an unguarded module that registers entities.
- `generate:catalogs` now parses milsymbol's modules with
  [acorn](https://github.com/acornjs/acorn) (new devDependency) instead of
  regex-scanning source text. Comments can no longer be harvested, map names
  come from each module's real `icons()` parameters, chained assignments are
  handled, and a module with symbol-set guards but no recognized entity
  registrations fails the build instead of silently producing an empty set.
- README TypeScript examples are now executed by the test suite
  (`test/readme-examples.test.ts`): every trailing `// "..."` / `// true` /
  `// false` / `// undefined` comment is compared against the real library, so
  documented outputs can no longer drift silently.

## [0.5.0] - 2026-09-15

Opt-in SIDC positions 21–23 for MIL-STD-2525E / APP-6 E symbols — the three
extension positions milsymbol actually consumes.

### Added

- `extendedModifier1()` / `extendedModifier2()` — complete three-digit modifier
  codes (e.g. `"100"` UAV, `"105"` VTOL), split across positions 21/22 and 17–20
  exactly as milsymbol parses them.
- `frameShape()` — 11 named frame-shape selectors for position 23, including
  `NoFrame` (`A`, the SIDC's only letter-valued code).
- `withoutExtension()` — drops the tail, keeping the two-digit modifier slots.
- Extended modifier membership catalogs (`extendedModifier1Codes`,
  `isKnownExtendedModifier1Code`, …) behind the `milsymbol-sidc/catalogs`
  subpath; legacy two-digit APIs unchanged.

### Changed

- `Sidc.parse` / `tryParse` accept 20- and 23-character codes with exact
  round-trips; tail presence is data (`…000` ≠ 20-char).
- Non-default extensions on D editions (`10`/`11`/`12`) warn
  (`unsupported-extension-edition`) or throw in strict mode. Upstream consumes
  positions 21–22 and `A` on any edition while shape selectors 1–9 are E-gated.
- Extension records are fully validated at runtime, including rejection of
  unknown fields (own or inherited).
- Ordinary `modifier1()` / `modifier2()` reset only their own extension digit.

### Notes

- 20-character output is completely unchanged by default; explicit extension use
  produces exactly 23 characters (never 30).
- Rendering verified against milsymbol 3.0.4 for both 2525E and APP-6 E:
  extended modifier geometry, frame overrides, zero-tail identity, and
  structural-vs-renderer validity.
- 108 tests, ESLint, Prettier, markdownlint, coverage, and deterministic catalog
  generation all green.

## [0.4.0] - 2026-09-12

### Added

- `Sidc.problems()` and `Sidc.isValid()` — structured, side-effect-free problem
  reporting with stable codes.
- `SidcOptions.onWarning` — receive problems instead of `console.warn`
  (`strict` still throws).
- `toObject()` / `toJSON()` snapshots, plus public `with()`, `clone()`, and
  `equals()`.
- `Sidc.parse()` and `Sidc.tryParse()` — decode 20-character numeric SIDCs, with
  a guaranteed round trip.
- Opt-in `milsymbol-sidc/catalogs` subpath: a membership catalog of entity and
  modifier codes per symbol set, generated from milsymbol 3.0.4.

### Notes

- Backward compatible; the new APIs are additive. Rendered SIDCs, warning text,
  and strict-mode errors are unchanged. The catalog is never consulted by
  `toString()`, so raw entity and modifier values still encode without
  recognition warnings.

### Tooling

- CI workflow: test matrix on Node 18/20/22/24 plus lint, Prettier,
  markdownlint, coverage, and a generated-catalog drift check.
- Dependabot for npm dev dependencies and GitHub Actions.

## [0.3.0] - 2026-09-11

### Added

- Named `HqTaskForceDummy` (position 8) and `Amplifier` (positions 9–10) code
  tables covering all universal values.
- Raw, shape-validated setters for the six-digit entity code and the two
  two-digit modifiers, preserving leading zeroes.

### Changed

- Every construction path validates all 20 positions, so output is guaranteed to
  be exactly 20 ASCII digits.
- Field values must be strings; unstringifiable values throw
  `SidcValidationError`.
- README documents positions 1–20, the enum tables, raw-code semantics, and
  ESM/CJS usage.

### Fixed

- The internal field-record constructor can no longer emit malformed SIDCs;
  omitted or undefined tail fields default to zero.

### Tooling

- ESLint, Prettier, and markdownlint configs with lint/format scripts.
- Published package no longer ships compiled tests.
- GitHub Actions pinned to commit SHAs; npm pinned for trusted publishing.

### Notes

- Existing positions 1–7 chains produce byte-for-byte identical SIDCs; warning
  order, text, and error classes are unchanged.

## [0.2.0] - 2026-09-11

### Added

- `Standard.App6` and `Standard.MilStd2525` configurations.
- Immutable `standard()` builder method and `SidcOptions.standard`.
- Validation of configured standard/version consistency and APP-6 edition
  support.

### Changed

- APP-6 configurations default to APP-6 E while retaining compatible explicit
  editions.
- README examples expanded for Node.js, browsers, APP-6 D, and APP-6 E.

### Notes

- Existing MIL-STD-2525E defaults and legacy warning behavior are preserved.

## [0.1.2] - 2026-08-27

### Fixed

- Dual-use Suspect/Joker and Hostile/Faker identities (position 4 codes 5 and 6
  are valid in both reality and exercise context).

### Tooling

- Repository metadata added for npm provenance verification.

## [0.1.1] - 2026-08-26

Initial release: a fluent TypeScript builder for MIL-STD-2525E numeric
(20-character) SIDC strings, covering positions 1–7.

### Added

- `Sidc` builder with chainable setters for version, context, standard identity,
  symbol set, status, headquarters/task-force/dummy, and amplifiers.
- Strict/lenient field validation with `SidcValidationError`.
- GitHub Actions workflow to auto-publish to npm on release, using npm trusted
  publishing (OIDC) with provenance.

[Unreleased]: https://github.com/psylsph/milsymbol-sidc/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.7.0
[0.6.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.6.0
[0.5.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.5.0
[0.4.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.4.0
[0.3.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.3.0
[0.2.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.2.0
[0.1.2]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.1.2
[0.1.1]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.1.1
