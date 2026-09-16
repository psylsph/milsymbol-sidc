# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Everything in this section is pending the next tagged release. Add entries here
as work lands on `main`, then move them under the new version heading when the
release is cut (see `AGENTS.md` → Releasing).

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

[Unreleased]: https://github.com/psylsph/milsymbol-sidc/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.5.0
[0.4.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.4.0
[0.3.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.3.0
[0.2.0]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.2.0
[0.1.2]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.1.2
[0.1.1]: https://github.com/psylsph/milsymbol-sidc/releases/tag/v0.1.1
