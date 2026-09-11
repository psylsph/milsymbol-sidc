---
title: Add Extended Numeric SIDC Fields
type: feat
status: completed
date: 2026-09-11
---

# Add Extended Numeric SIDC Fields

## Overview

Complete structural encoding for numeric SIDC positions 8–20. The builder will expose named constants for the universal headquarters/task-force/feint-dummy indicator and amplifier fields, plus raw digit setters for the six-digit entity and two two-digit modifiers. Existing consumers must continue to receive the same 20-character SIDCs, warnings, and errors when they use only the pre-existing API.

---

## Problem Frame

The package currently exposes positions 1–7 and fills positions 8–20 with zeroes. That allows basic milsymbol rendering but prevents callers from representing unit echelon, mobility, entity identity, and symbol modifiers. The feature should finish the structural 20-character builder without attempting to embed the large, symbol-set-specific entity and modifier catalogs.

---

## Requirements Trace

- R1. Encode positions 8–20 in the standard order and preserve exact 20-digit output.
- R2. Provide named, runtime-validated constants for the position-8 HQ/task-force/feint-dummy field and position-9–10 amplifier field.
- R3. Accept raw entity, modifier 1, and modifier 2 digit strings with exact widths and preserved leading zeroes.
- R4. Preserve immutable fluent chaining, last-setter-wins behavior, and strict-mode propagation.
- R5. Preserve every existing API call chain, default output, warning order/text, and error behavior.
- R6. Update the public README and examples to distinguish complete structural positions 1–20 support from deferred semantic catalogs.

---

## Scope Boundaries

- No named entity catalogs by symbol set.
- No named sector-modifier catalogs by symbol set.
- No parser/decoder for existing SIDC strings.
- No new semantic combination warnings for entity/modifier applicability.
- No dependency on milsymbol or external runtime data.
- No redesign of the technically visible internal two-argument constructor.

---

## Context & Research

### Relevant Code and Patterns

- `src/enums.ts` uses `as const` objects with same-name literal union types for public code tables.
- `src/sidc.ts` uses immutable setters and a private `with()` clone helper.
- `src/validate.ts` separates immediate shape/member validation from render-time combination warnings and strict-mode errors.
- `src/index.ts` is the package barrel for all public constants, types, builder APIs, and errors.
- `test/sidc.test.ts` verifies exact SIDCs, offsets, warning behavior, immutability, and error classes.
- `README.md` is the authoritative public API and usage documentation.

### External References

- The installed milsymbol numeric parser reads position 8 as the HQ/task-force/dummy indicator, positions 9–10 as echelon/mobility/amplifier, positions 11–20 as function/entity and modifiers, and positions 21–23 as separate optional rendering metadata.
- The verified amplifier code set follows milsymbol’s numeric mapping: `00`, `11`–`18`, `21`–`26`, `31`–`37`, `41`–`42`, `51`–`52`, `61`–`62`, `71`, and `72`.

---

## Key Technical Decisions

- Use `HqTaskForceDummy` / `hqTaskForceDummy`, `Amplifier` / `amplifier`, `entity`, `modifier1`, and `modifier2` as the sole public names; do not add aliases.
- Keep universal indicator and amplifier setters closed to their named tables. Invalid width and unknown members throw `SidcValidationError` immediately.
- Keep entity and modifier setters raw and shape-only: entity requires six ASCII digits; each modifier requires two ASCII digits. Correctly shaped raw values do not generate recognition warnings, including in strict mode.
- Store all codes as strings to preserve leading zeroes.
- Normalize missing tail fields in the exposed constructor field record to zero defaults before storage. This prevents old field objects from producing `undefined` output after explicit concatenation.
- Treat the exact-20-digit invariant as a constructor-level guarantee, not just a setter-level one. Every construction path runs the same centralized `checkFields` validation, so a supplied field record can never emit a malformed SIDC. A `null` record falls back to defaults (preserving prior behavior) and an invalid `standard` throws `SidcValidationError`.
- Require actual strings in the shared digit validator. This aligns runtime behavior with the declared API and avoids accidental numeric coercion; add coverage for the new setters and document the behavior.
- Replace reliance on `padEnd()` with explicit field concatenation while retaining the exact 20-character invariant through tests.
- Do not add field-specific render-time semantic checks in this release; existing warning order and text remain unchanged when no new setters are used.

---

## Open Questions

### Resolved During Planning

- **Which fields are in scope?** Positions 8–20 only; official positions 21–30 and milsymbol-specific positions 21–23 remain separate work.
- **How much catalog coverage is required?** Universal structural tables plus raw entity/modifier codes; named symbol-set catalogs are deferred.
- **What are the public names?** `HqTaskForceDummy`, `Amplifier`, `entity`, `modifier1`, and `modifier2`.
- **How are fields cleared?** The zero/none named member or all-zero raw code; repeated setters replace the prior value.
- **What is the compatibility target?** Every existing chain using only the old API remains byte-for-byte and warning-for-warning compatible.

### Deferred to Implementation

- Exact wording for new validation errors, following the existing field-name and received-value format.
- Whether the shared runtime string check requires small refactoring of the existing private validator; preserve existing documented error wording while avoiding unrelated behavioral changes.
- Final table comments for amplifier meanings after comparing each code against the installed milsymbol mapping and the project’s intended standard terminology.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```text
positions 1–7 existing fields
        + position 8 named indicator
        + positions 9–10 named amplifier
        + positions 11–16 raw entity
        + positions 17–18 raw modifier 1
        + positions 19–20 raw modifier 2
        = one 20-character numeric SIDC
```

Every setter creates a new builder carrying the complete field record. Constructor normalization ensures legacy records receive zero-valued tail fields. Render-time validation continues to process only the existing warning/strict rules unless a pre-existing combination is already invalid.

---

## Implementation Units

- [x] U1. **Extend public field tables and internal field state**

**Goal:** Define the new named universal code tables and extend the internal field record with zero-valued tail defaults while keeping the old constructor form compatible.

**Requirements:** R1, R2, R5

**Dependencies:** None

**Files:**

- Modify: `src/enums.ts`
- Modify: `src/validate.ts`
- Modify: `src/sidc.ts`
- Test: `test/sidc.test.ts`

**Approach:** Follow existing literal object/type exports. Define all eight position-8 indicator values and the verified amplifier table. Add optional tail properties to the internal constructor shape or normalize legacy records so old two-argument callers remain valid. Keep defaults as `0`, `00`, `000000`, `00`, and `00`.

**Patterns to follow:** Existing `Context`, `Status`, and `SymbolSet` tables; `SidcFields`; immutable `with()` cloning.

**Test scenarios:**

- Happy path: every indicator member is accepted and encoded at position 8.
- Happy path: every amplifier member is accepted and encoded at positions 9–10.
- Edge case: legacy constructor field objects that omit all tail fields render the prior zero-filled SIDC.
- Error path: malformed and unknown named indicator/amplifier values throw `SidcValidationError` immediately.

**Verification:** New public constants are available from the source barrel and generated declarations, and old constructor/default behavior remains unchanged.

---

- [x] U2. **Add immutable extended-field setters and rendering**

**Goal:** Expose fluent setters for all five tail fields and render positions 1–20 explicitly in the correct order.

**Requirements:** R1, R3, R4, R5

**Dependencies:** U1

**Files:**

- Modify: `src/sidc.ts`
- Modify: `src/validate.ts`
- Test: `test/sidc.test.ts`

**Approach:** Add setters for the position-8 indicator, amplifier, six-digit entity, and two two-digit modifiers. Reuse exact-width validation for raw fields, preserve leading zeroes, and carry every field through immutable clones. Replace tail padding with explicit concatenation and enforce the 20-character numeric invariant through tests.

**Test scenarios:**

- Happy path: an all-fields fixture has the expected exact 20-character string and every documented slice.
- Happy path: entity values `000000`, `000001`, and `999999` preserve leading zeroes and offsets.
- Happy path: modifier values `01` and `09` appear independently at positions 17–18 and 19–20.
- Edge case: repeated setter calls use only the last value and do not alter neighboring fields.
- Error path: entity rejects empty, short, long, alphanumeric, whitespace, punctuation, signed, and non-string values.
- Error path: each modifier rejects wrong-width and non-digit values.
- Integration: well-shaped raw entity/modifier values produce no warnings in normal or strict mode.

**Verification:** Every new field is chainable, immutable, explicitly rendered, and the result is always exactly 20 ASCII digits.

---

- [x] U3. **Harden compatibility and behavioral coverage**

**Goal:** Prove the extended model does not regress existing behavior and remains deterministic across branches and setter order.

**Requirements:** R4, R5

**Dependencies:** U2

**Files:**

- Modify: `test/sidc.test.ts`
- Inspect: `dist/src/index.d.ts` after build

**Approach:** Retain all existing golden tests and add targeted regression coverage for old-only chains, warning order/text, strict propagation, raw-code handling, constructor normalization, branch isolation, setter order, repeated rendering, and root exports.

**Test scenarios:**

- Happy path: `new Sidc()` and every existing worked example remain byte-for-byte unchanged.
- Happy path: old setters only still leave positions 8–20 as thirteen zeroes.
- Happy path: different setter orders produce identical full SIDCs.
- Happy path: repeated `toString()` calls do not mutate a fully configured builder.
- Edge case: branches from a fully configured base retain independent tail fields and strict mode.
- Error path: existing invalid combinations still emit the same warnings or throw the same `SidcCombinationError` after tail setters are used.
- Integration: every new public constant imports from `src/index.ts` and appears in emitted declarations.

**Verification:** Existing and new tests pass without changed legacy outputs, warning counts, warning text, or error classes.

---

- [x] U4. **Document structural positions 1–20 support**

**Goal:** Make the new API discoverable and remove stale claims that positions 8–20 are reserved or always zero-filled.

**Requirements:** R1, R2, R3, R6

**Dependencies:** U2

**Files:**

- Modify: `README.md`

**Approach:** Update the coverage statement, anatomy diagram/table, API methods, enum reference, validation behavior, recipes, milsymbol integration examples, development coverage statement, and roadmap. Clearly state that entity/modifier values are raw structural codes and named semantic catalogs are deferred.

**Test scenarios:**

- Documentation expectation: every public setter and constant name matches the source barrel and examples produce the documented offsets/strings.
- Documentation expectation: examples cover default zero tail, named indicator/amplifier, raw entity/modifiers, APP-6 configuration, and legacy compatibility.

**Verification:** No README section claims that positions 8–20 are unsupported, and the documented scope matches the actual API and tests.

---

## System-Wide Impact

- **API surface parity:** `src/enums.ts`, `src/sidc.ts`, `src/index.ts`, generated JavaScript, and generated declarations must expose the same names.
- **Error propagation:** malformed tail inputs fail in setters with `SidcValidationError`; existing render-time warnings and strict errors remain unchanged.
- **State lifecycle risks:** immutable clones must copy all five new primitive fields; constructor normalization must protect legacy two-argument callers.
- **Unchanged invariants:** no-options defaults, all old setter chains, exact 20-character output, warning order/text, ESM module layout, and zero runtime dependencies remain intact.
- **Integration coverage:** npm build/test must exercise emitted declarations and runtime output because `dist/` is the package entrypoint.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Off-by-one field concatenation shifts entity/modifier data | Use one all-fields golden fixture plus slice assertions for every field. |
| Leading zeroes are lost | Store and validate strings only; test zero-prefixed raw values. |
| Legacy constructor records omit new fields | Normalize missing fields to zero defaults before storage. |
| Incorrect amplifier literal or terminology becomes public API | Keep the table small, compare against the installed milsymbol numeric mapping, and test every member. |
| New validation changes observable legacy behavior | Preserve existing warning collection/order and retain exact legacy warning assertions. |
| Entity/modifier catalogs are mistaken for validated semantics | Use raw shape-only setters and state the limitation in README and JSDoc. |

---

## Documentation / Operational Notes

- This is an additive feature release; no migration is required for existing consumers.
- The package remains zero-runtime-dependency and release automation requires no workflow changes.
- The next catalog-focused change should be separately scoped by symbol set and edition rather than expanding this structural API implicitly.

---

## Sources & References

- `src/enums.ts`
- `src/sidc.ts`
- `src/validate.ts`
- `src/index.ts`
- `test/sidc.test.ts`
- `README.md`
- Installed milsymbol numeric mappings under `node_modules/milsymbol/src/numbersidc/` and `node_modules/milsymbol/src/ms/symbol/getmetadata.js`
