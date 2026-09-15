# milsymbol-sidc

[![CI](https://github.com/psylsph/milsymbol-sidc/actions/workflows/ci.yml/badge.svg)](https://github.com/psylsph/milsymbol-sidc/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/milsymbol-sidc.svg)](https://www.npmjs.com/package/milsymbol-sidc)
[![npm downloads](https://img.shields.io/npm/dm/milsymbol-sidc.svg)](https://www.npmjs.com/package/milsymbol-sidc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-%E2%89%A55.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A fluent TypeScript builder for **numeric SIDC strings** — 20 characters by
default, with opt-in positions 21–23 (extended modifiers and frame shape) for
[MIL-STD-2525E](https://en.wikipedia.org/wiki/MIL-STD-2525) and
[APP-6](https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology) symbols —
made for constructing symbols with the
[milsymbol](https://github.com/spatialillusions/milsymbol) library.

```ts
import ms from "milsymbol";
import { Sidc, StandardIdentity, SymbolSet } from "milsymbol-sidc";

const sidc = new Sidc()
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.LandUnit)
  .toString(); // "13031000000000000000"

new ms.Symbol(sidc).asSVG(); // friendly land unit icon
```

- **Zero runtime dependencies** — TypeScript types and digit-string logic only.
- **Typed field codes** — every value is a named constant carrying its literal
  SIDC digits, so typos are compile errors.
- **Validated output** — invalid values throw; inconsistent combinations warn
  (or throw in `strict` mode), using the same rules milsymbol applies when it
  parses a SIDC.
- **milsymbol-ready** — every generated string is accepted by
  milsymbol's numeric parser. Full rendering depends on the entity and
  modifier codes you supply, exactly as it does for any raw SIDC.

> **Coverage:** complete structural encoding for positions 1–20 of the numeric
> SIDC, plus opt-in positions 21–23 (extended modifiers and frame shape) that
> milsymbol consumes for 2525E/APP-6 E symbols. Positions 8–10 have named
> universal codes; positions 11–20 accept validated raw entity and modifier
> codes. A membership-only code catalog ships behind the `milsymbol-sidc/catalogs`
> subpath; semantic names remain future work.

## Installation

Published on npm as [`milsymbol-sidc`](https://www.npmjs.com/package/milsymbol-sidc).
Requires Node.js >= 18.

```bash
npm install milsymbol-sidc
# or
yarn add milsymbol-sidc
# or
pnpm add milsymbol-sidc
```

The rendering examples use [`milsymbol`](https://github.com/spatialillusions/milsymbol)
to draw the generated SIDC. It is **not** a dependency of this package —
`milsymbol-sidc` has zero runtime dependencies — so install it alongside when
you want to render symbols:

```bash
npm install milsymbol
```

The package ships ESM with bundled TypeScript declarations (`dist/`).

## Quick start

```ts
import {
  Sidc,
  Context,
  Standard,
  StandardIdentity,
  SymbolSet,
  Status,
  Version,
} from "milsymbol-sidc";

// A hostile planned air missile track under MIL-STD-2525E:
const sidc = new Sidc()
  .version(Version.MilStd2525E) // pos 1-2 → "13"
  .context(Context.Reality) // pos 3   → "0"
  .identity(StandardIdentity.SuspectJoker) // pos 4   → "5"
  .symbolSet(SymbolSet.AirMissile) // pos 5-6 → "02"
  .status(Status.Planned) // pos 7   → "1"
  .toString();

console.log(sidc); // "13050210000000000000"
```

The builder is **immutable**: each setter returns a new instance, so a base
configuration can be safely reused:

```ts
import { Sidc, Standard, StandardIdentity } from "milsymbol-sidc";

const base = new Sidc({ standard: Standard.App6 });

const friendly = base.identity(StandardIdentity.Friend).toString();
const hostile = base.identity(StandardIdentity.SuspectJoker).toString();
// base itself is unchanged; both derived SIDCs use APP-6 E (version "14")
```

## Anatomy of the generated SIDC

```text
13 0 3 10 0 2 16 123456 78 90 0 0 A
│  │ │ │  │ │ │  │      │  │ │ │ │
│  │ │ │  │ │ │  │      │  │ │ │ └   frame shape (23) — `A` = no frame
│  │ │ │  │ │ │  │      │  │ │ └ │   modifier 2 extension (22)
│  │ │ │  │ │ │  │      │  │ └ │ │   modifier 1 extension (21)
│  │ │ │  │ │ │  │      │  └ │ │ │   modifier 2 (19–20)
│  │ │ │  │ │ │  │      └  │ │ │ │   modifier 1 (17–18)
│  │ │ │  │ │ │  └      │  │ │ │ │   entity code (11–16)
│  │ │ │  │ │ └  │      │  │ │ │ │   amplifier (9–10)
│  │ │ │  │ └ │  │      │  │ │ │ │   HQ/task force/feint-dummy (8)
│  │ │ │  └ │ │  │      │  │ │ │ │   status (7)
│  │ │ └  │ │ │  │      │  │ │ │ │   symbol set (5–6)
│  │ └ │  │ │ │  │      │  │ │ │ │   standard identity (4)
│  └ │ │  │ │ │  │      │  │ │ │ │   context (3)
└  │ │ │  │ │ │  │      │  │ │ │ │   version / edition (1–2)
```

Positions 21–23 are emitted only when an extension field is set explicitly;
otherwise `toString()` produces the classic 20-character SIDC.

| Position | Field                     | API                                                          |
| -------- | ------------------------- | ------------------------------------------------------------ |
| 1–2      | Version / edition         | `Version`, `version()`                                       |
| 3        | Context                   | `Context`, `context()`                                       |
| 4        | Standard identity         | `StandardIdentity`, `identity()`                             |
| 5–6      | Symbol set                | `SymbolSet`, `symbolSet()`                                   |
| 7        | Status / condition        | `Status`, `status()`                                         |
| 8        | HQ/task force/feint-dummy | `HqTaskForceDummy`, `hqTaskForceDummy()`                     |
| 9–10     | Amplifier                 | `Amplifier`, `amplifier()`                                   |
| 11–16    | Entity code               | `entity()` — six raw digits                                  |
| 17–18    | Modifier 1                | `modifier1()` — two raw digits, or `extendedModifier1()`     |
| 19–20    | Modifier 2                | `modifier2()` — two raw digits, or `extendedModifier2()`     |
| 21       | Modifier 1 extension      | `extendedModifier1()` — hundreds digit of a three-digit code |
| 22       | Modifier 2 extension      | `extendedModifier2()` — hundreds digit of a three-digit code |
| 23       | Frame shape               | `frameShape()` — `0`–`9`, or `A` (no frame)                  |
| 17–18    | Modifier 1                | `modifier1()` — two raw digits                               |
| 19–20    | Modifier 2                | `modifier2()` — two raw digits                               |

## API

### `new Sidc(options?)`

Creates a builder preconfigured to 2525E / Reality / Unknown / Unknown set /
Present. This remains the default for backward compatibility; configure
`Standard.App6` to default to APP-6 E instead.

| Option      | Type                             | Default                         | Description                                                                                                                                                                                                                 |
| ----------- | -------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strict`    | `boolean`                        | `false`                         | Throw on invalid field combinations during `toString()` instead of warning. Invalid values always throw immediately regardless of this flag.                                                                                |
| `standard`  | `Standard`                       | Not configured (2525E behavior) | Select a standard family. `App6` defaults the version to APP-6 E (`"14"`); `MilStd2525` defaults it to MIL-STD-2525E (`"13"`). Explicit configuration also checks that later version choices belong to the selected family. |
| `onWarning` | `(problem: SidcProblem) => void` | `console.warn`                  | Receive non-fatal problems instead of writing to the console. `strict: true` still throws instead of reporting.                                                                                                             |

### Methods

All setters validate their argument and return a new immutable `Sidc`.

| Method                       | Field                              | Accepts                                                                                                            |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `standard(s)`                | Version default + validation rules | A `Standard` constant. It retains a compatible current version; otherwise it selects that family's latest edition. |
| `version(v)`                 | Positions 1–2                      | A `Version` constant or any two-digit string (escape hatch for future editions)                                    |
| `context(c)`                 | Position 3                         | A `Context` constant                                                                                               |
| `identity(i)`                | Position 4                         | A `StandardIdentity` constant                                                                                      |
| `symbolSet(s)`               | Positions 5–6                      | A `SymbolSet` constant or any two-digit string                                                                     |
| `status(s)`                  | Position 7                         | A `Status` constant                                                                                                |
| `hqTaskForceDummy(v)`        | Position 8                         | An `HqTaskForceDummy` constant                                                                                     |
| `amplifier(v)`               | Positions 9–10                     | An `Amplifier` constant                                                                                            |
| `entity(v)`                  | Positions 11–16                    | Any six-digit string; symbol-set-specific catalogs are not included                                                |
| `modifier1(v)`               | Positions 17–18                    | Any two-digit string; resets the modifier-1 extension digit to `0` when a tail exists                              |
| `modifier2(v)`               | Positions 19–20                    | Any two-digit string; resets the modifier-2 extension digit to `0` when a tail exists                              |
| `extendedModifier1(v)`       | Positions 17–18 + 21               | Any three-digit string; hundreds digit lands at position 21                                                        |
| `extendedModifier2(v)`       | Positions 19–20 + 22               | Any three-digit string; hundreds digit lands at position 22                                                        |
| `frameShape(v)`              | Position 23                        | A `FrameShape` constant                                                                                            |
| `withoutExtension()`         | Positions 21–23                    | Drops the tail, keeping the two-digit modifier slots (may change rendering)                                        |
| `toString()`                 | —                                  | Validates combinations and renders the 20- or 23-character SIDC                                                    |
| `problems()`                 | —                                  | Structured list of non-fatal problems; never throws                                                                |
| `isValid()`                  | —                                  | `true` when `problems()` is empty                                                                                  |
| `with(fields)`               | —                                  | Applies a partial field record immutably; validates like the setters                                               |
| `clone()`                    | —                                  | Copies the fields into an independent builder                                                                      |
| `equals(other)`              | —                                  | Compares encoded fields, ignoring `strict` and `standard`                                                          |
| `toObject()` / `toJSON()`    | —                                  | Plain, serializable snapshot of every encoded field                                                                |
| `Sidc.parse(s, options?)`    | —                                  | Parses a 20- or 23-character numeric SIDC; throws when invalid                                                     |
| `Sidc.tryParse(s, options?)` | —                                  | Parses a SIDC or returns `undefined`                                                                               |

### Enum reference

#### `Standard`

Values match milsymbol's `standard` option and `ms.setStandard()` API, so the
same constant can configure both libraries.

| Constant     | Value    | Standard family                                     |
| ------------ | -------- | --------------------------------------------------- |
| `MilStd2525` | `"2525"` | US MIL-STD-2525 (**default behavior when omitted**) |
| `App6`       | `"APP6"` | NATO APP-6                                          |

#### `HqTaskForceDummy`

Position 8 values identify headquarters, task force, and feint/dummy variants.

| Constant                          | Code  | Meaning                             |
| --------------------------------- | ----- | ----------------------------------- |
| `None`                            | `"0"` | None / not applicable               |
| `FeintDummy`                      | `"1"` | Feint/dummy                         |
| `Headquarters`                    | `"2"` | Headquarters                        |
| `FeintDummyHeadquarters`          | `"3"` | Feint/dummy headquarters            |
| `TaskForce`                       | `"4"` | Task force                          |
| `FeintDummyTaskForce`             | `"5"` | Feint/dummy task force              |
| `TaskForceHeadquarters`           | `"6"` | Task-force headquarters             |
| `FeintDummyTaskForceHeadquarters` | `"7"` | Feint/dummy task-force headquarters |

#### `Amplifier`

Position 9–10 values identify echelon, mobility, leadership, or auxiliary
amplifiers. `None` writes the zero/no-amplifier code `"00"`.

| Constant                     | Code   | Meaning                         |
| ---------------------------- | ------ | ------------------------------- |
| `None`                       | `"00"` | None / not specified            |
| `TeamCrew`                   | `"11"` | Team/crew                       |
| `Squad`                      | `"12"` | Squad                           |
| `Section`                    | `"13"` | Section                         |
| `PlatoonDetachment`          | `"14"` | Platoon/detachment              |
| `CompanyBatteryTroop`        | `"15"` | Company/battery/troop           |
| `BattalionSquadron`          | `"16"` | Battalion/squadron              |
| `RegimentGroup`              | `"17"` | Regiment/group                  |
| `Brigade`                    | `"18"` | Brigade                         |
| `Division`                   | `"21"` | Division                        |
| `CorpsMef`                   | `"22"` | Corps/MEF                       |
| `Army`                       | `"23"` | Army                            |
| `ArmyGroupFront`             | `"24"` | Army group/front                |
| `RegionTheater`              | `"25"` | Region/theater                  |
| `Command`                    | `"26"` | Command                         |
| `WheeledLimitedCrossCountry` | `"31"` | Wheeled, limited cross-country  |
| `WheeledCrossCountry`        | `"32"` | Wheeled, cross-country          |
| `Tracked`                    | `"33"` | Tracked                         |
| `WheeledTrackedCombination`  | `"34"` | Wheeled and tracked combination |
| `Towed`                      | `"35"` | Towed                           |
| `Rail`                       | `"36"` | Rail                            |
| `PackAnimals`                | `"37"` | Pack animals                    |
| `OverSnowPrimeMover`         | `"41"` | Over snow, prime mover          |
| `Sled`                       | `"42"` | Sled                            |
| `Barge`                      | `"51"` | Barge                           |
| `Amphibious`                 | `"52"` | Amphibious                      |
| `ShortTowedArray`            | `"61"` | Short towed array               |
| `LongTowedArray`             | `"62"` | Long towed array                |
| `LeaderIndividual`           | `"71"` | Leader individual               |
| `DeputyIndividual`           | `"72"` | Deputy individual               |

Entity and modifier setters intentionally accept raw digit strings so callers
can use codes specific to their symbol set and edition. They validate width and
ASCII digits but do not validate catalog membership.

#### `FrameShape`

Position 23, consumed by milsymbol for E-edition shape overrides (`1`–`9` are
ignored upstream unless the version is E; `A` applies on any edition).
Selectors are named after the frame they select; `NoFrame` (`A`) is the only
letter-valued code in the SIDC.

| Constant                   | Code  | Meaning                                            |
| -------------------------- | ----- | -------------------------------------------------- |
| `Default`                  | `"0"` | No override (**implied when no extension is set**) |
| `Space`                    | `"1"` | Space frame                                        |
| `Air`                      | `"2"` | Air frame                                          |
| `LandUnit`                 | `"3"` | Land unit frame                                    |
| `LandEquipmentSeaSurface`  | `"4"` | Land equipment / sea surface frame                 |
| `Installation`             | `"5"` | Installation frame                                 |
| `LandDismountedIndividual` | `"6"` | Dismounted individual frame                        |
| `SeaSubsurface`            | `"7"` | Sea subsurface frame                               |
| `ActivityEvent`            | `"8"` | Activity / event frame                             |
| `Cyberspace`               | `"9"` | Cyberspace frame                                   |
| `NoFrame`                  | `"A"` | Suppress the frame entirely                        |

#### `Version`

| Constant      | Code   | Standard                    |
| ------------- | ------ | --------------------------- |
| `MilStd2525D` | `"10"` | MIL-STD-2525D               |
| `App6D`       | `"11"` | APP-6 D                     |
| `MilStd2525E` | `"13"` | MIL-STD-2525E (**default**) |
| `App6E`       | `"14"` | APP-6 E                     |

#### `Context`

| Constant     | Code  | Meaning                            |
| ------------ | ----- | ---------------------------------- |
| `Reality`    | `"0"` | Real-world operation (**default**) |
| `Exercise`   | `"1"` | Training/exercise                  |
| `Simulation` | `"2"` | Simulation                         |

#### `StandardIdentity`

| Constant        | Code  | Frame drawn                                                        |
| --------------- | ----- | ------------------------------------------------------------------ |
| `Pending`       | `"0"` | Unknown shape, dashed                                              |
| `Unknown`       | `"1"` | Yellow octagonal frame (**default**)                               |
| `AssumedFriend` | `"2"` | Blue frame, dashed                                                 |
| `Friend`        | `"3"` | Blue frame                                                         |
| `Neutral`       | `"4"` | Green frame                                                        |
| `SuspectJoker`  | `"5"` | Red frame, dashed — **Suspect** in reality, **Joker** in exercises |
| `HostileFaker`  | `"6"` | Red frame — **Hostile** in reality, **Faker** in exercises         |

#### `SymbolSet`

Only sets that milsymbol can render are listed.

| Constant                        | Code   | Domain                               |
| ------------------------------- | ------ | ------------------------------------ |
| `Unknown`                       | `"00"` | Unknown                              |
| `Air`                           | `"01"` | Air tracks                           |
| `AirMissile`                    | `"02"` | Air missiles                         |
| `Space`                         | `"05"` | Space                                |
| `SpaceMissile`                  | `"06"` | Space missiles                       |
| `LandUnit`                      | `"10"` | Land units                           |
| `LandCivilianUnit`              | `"11"` | Land civilian units                  |
| `LandEquipment`                 | `"15"` | Land equipment                       |
| `Installation`                  | `"20"` | Installations                        |
| `ControlMeasure`                | `"25"` | Tactical graphics / control measures |
| `LandDismountedIndividual`      | `"27"` | Dismounted individuals               |
| `SeaSurface`                    | `"30"` | Sea surface tracks                   |
| `SeaSubsurface`                 | `"35"` | Subsurface tracks                    |
| `MineWarfare`                   | `"36"` | Sea mines                            |
| `Activity`                      | `"40"` | Activities/events                    |
| `SignalsIntelligenceSpace`      | `"50"` | SIGINT space                         |
| `SignalsIntelligenceAir`        | `"51"` | SIGINT air                           |
| `SignalsIntelligenceLand`       | `"52"` | SIGINT land                          |
| `SignalsIntelligenceSeaSurface` | `"53"` | SIGINT sea surface                   |
| `SignalsIntelligenceSubsurface` | `"54"` | SIGINT subsurface                    |
| `Cyberspace`                    | `"60"` | Cyberspace                           |

Codes `"12"` and `"39"` have no named constant but are recognized via the raw
string escape hatch.

#### `Status`

| Constant         | Code  | Meaning                              |
| ---------------- | ----- | ------------------------------------ |
| `Present`        | `"0"` | Present / actual (**default**)       |
| `Planned`        | `"1"` | Planned / anticipated (dashed frame) |
| `FullyCapable`   | `"2"` | Condition bar: fully capable         |
| `Damaged`        | `"3"` | Condition bar: damaged               |
| `Destroyed`      | `"4"` | Condition bar: destroyed             |
| `FullToCapacity` | `"5"` | Condition bar: full to capacity      |

## Validation and error handling

Two layers of validation run at different times:

1. **Setter-time (`SidcValidationError`)** — thrown immediately for malformed
   input (wrong number of digits) or unknown enum codes. Values must be
   strings: passing a number or other non-string value throws rather than
   being coerced. This catches bugs at the call site rather than deep inside
   rendering code.
2. **`toString()`-time combination checks** — cross-field rules mirroring
   milsymbol's parser. By default problems are emitted with `console.warn`;
   with `{ strict: true }` they throw `SidcCombinationError`.

Active combination rules:

- Condition statuses (fully capable … full to capacity) do not apply to
  control measures.
- Exercise symbols on the unknown symbol set lose their affiliation unless the
  identity is pending/unknown.
- Symbol set 27 is unsupported in MIL-STD-2525D; symbol set 60 is unsupported
  in APP-6 D.
- Non-default extension values (nonzero modifier extension digits or a frame
  shape other than `Default`) are reported for D-edition versions `"10"`,
  `"11"`, and `"12"`. This is the library's support policy, not a milsymbol
  restriction: upstream consumes positions 21–22 and `A` on any edition, while
  shape selectors `1`–`9` only take effect for E editions. Explicit all-zero
  tails never warn.
- When a `Standard` is explicitly configured, official version codes from the
  other standard family are reported.
- Raw version/symbol-set codes outside milsymbol's known tables are reported.

```ts
import {
  Amplifier,
  Context,
  HqTaskForceDummy,
  Sidc,
  SidcCombinationError,
  SidcValidationError,
  Standard,
  StandardIdentity,
  Status,
  SymbolSet,
} from "milsymbol-sidc";

// Throws immediately: "9" is not a valid identity code.
new Sidc().identity("9" as never); // SidcValidationError

// Suspect/Joker and Hostile/Faker are dual-use: valid in reality AND exercise.
new Sidc({ strict: true })
  .identity(StandardIdentity.SuspectJoker) // Suspect in reality, Joker in exercises
  .symbolSet(SymbolSet.LandUnit)
  .toString(); // "13051000000000000000", no warnings

new Sidc({ strict: true })
  .context(Context.Exercise)
  .identity(StandardIdentity.HostileFaker) // Faker in exercises
  .symbolSet(SymbolSet.LandUnit)
  .toString(); // "13161000000000000000", no warnings

// A complete structural 20-position SIDC using raw entity/modifier codes.
new Sidc({ standard: Standard.App6, strict: true })
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.LandUnit)
  .hqTaskForceDummy(HqTaskForceDummy.Headquarters)
  .amplifier(Amplifier.BattalionSquadron)
  .entity("123456")
  .modifier1("01")
  .modifier2("09")
  .toString(); // "14031002161234560109"

// A real combination problem: condition status on a control measure.
new Sidc({ strict: true })
  .symbolSet(SymbolSet.ControlMeasure)
  .status(Status.Destroyed)
  .toString(); // SidcCombinationError

// Capturing warnings programmatically (e.g. in tests):
const warnings: string[] = [];
const originalWarn = console.warn;
console.warn = (message: string) => warnings.push(message);
try {
  new Sidc()
    .symbolSet(SymbolSet.ControlMeasure)
    .status(Status.Destroyed)
    .toString();
} finally {
  console.warn = originalWarn;
}
```

Error classes: `SidcError` (base) → `SidcValidationError`,
`SidcCombinationError`.

### Reading and reporting problems

`console.warn` is only the default. Inspect problems without side effects with
`problems()` and `isValid()`, or route them anywhere with `onWarning`:

```ts
import { Sidc, SymbolSet, Status } from "milsymbol-sidc";

const sidc = new Sidc()
  .symbolSet(SymbolSet.ControlMeasure)
  .status(Status.Destroyed);

sidc.problems();
// [{ code: "condition-status-control-measure", message: "…" }]
sidc.isValid(); // false

new Sidc({ onWarning: (problem) => log.warn(problem.code) })
  .symbolSet(SymbolSet.ControlMeasure)
  .status(Status.Destroyed)
  .toString(); // no console output; onWarning is called once
```

Every problem carries a stable `code` and the exact legacy warning `message`.
`problems()` never throws, even for builders created with `{ strict: true }`;
`toString()` still throws `SidcCombinationError` in strict mode.

## Parsing a SIDC

`Sidc.parse()` turns a 20- or 23-character numeric SIDC back into a builder so
you can
validate, edit, and re-render existing codes. `Sidc.tryParse()` returns
`undefined` instead of throwing.

```ts
import { Sidc } from "milsymbol-sidc";

const sidc = Sidc.parse("14031002161234560109");
sidc.toObject().entity; // "123456"

sidc.with({ modifier1: "02" }).toString(); // "14031002161234560209"
Sidc.tryParse("not-a-sidc"); // undefined
```

Round-tripping is guaranteed: `Sidc.parse(s).toString() === s` for any string
this library produces, including explicit zero tails (`…000` stays 23
characters, because tail presence is data). A 20-character SIDC and the same
code padded with a zero tail render identically in milsymbol but compare as
unequal builders, mirroring the different strings. Only the 20- and
23-character numeric forms are supported; letter-based SIDCs, 21/22-character
input, and positions 24–30 are not.

## Catalogs (optional)

The `milsymbol-sidc/catalogs` subpath exposes a membership catalog generated from
milsymbol's numeric symbol data: which entity and modifier codes milsymbol
registers for each symbol set. It is a separate entry point, so the core builder
stays data-free unless you import it.

```ts
import { entityCodes, isKnownEntityCode } from "milsymbol-sidc/catalogs";

isKnownEntityCode("10", "121100"); // true — a registered land-unit entity
isKnownEntityCode("10", "999999"); // false
entityCodes("10").length; // number of registered land-unit codes

// Three-digit (extended) modifiers are exposed separately:
import {
  extendedModifier1Codes,
  isKnownExtendedModifier1Code,
} from "milsymbol-sidc/catalogs";

isKnownExtendedModifier1Code("10", "100"); // true — the common UAV modifier
isKnownExtendedModifier1Code("10", "199"); // false
extendedModifier1Codes("10").length; // registered three-digit modifier 1 codes
```

The catalog is **membership only**: it carries no semantic names and is never
consulted by `toString()`, so raw entity and modifier values still encode
without recognition warnings. Regenerate it with `npm run generate:catalogs`;
the milsymbol version it was derived from is exported as `CATALOG_SOURCE`.

## Using with milsymbol

milsymbol routes any SIDC whose first two characters are digits to its numeric
parser, so codes from this package work without any configuration. The
`standard` style option only selects NATO vs US styling details:

### Node.js (ESM)

```js
import ms from "milsymbol"; // bundles all numeric standards
import { Sidc, Standard, StandardIdentity, SymbolSet } from "milsymbol-sidc";

const standard = Standard.App6;
ms.setStandard(standard); // "APP6": use NATO styling

const sidc = new Sidc({ standard }) // defaults to APP-6 E (version "14")
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.LandUnit)
  .toString();

const symbol = new ms.Symbol(sidc, { size: 32 });
if (!symbol.isValid()) {
  console.warn(`milsymbol could not fully render ${sidc}`);
}
const svg = symbol.asSVG();
```

### Node.js (CommonJS)

`milsymbol-sidc` is ESM-only. From CommonJS, load it with dynamic `import()`.
`milsymbol` itself can be `require`d directly:

```js
const ms = require("milsymbol");

async function render() {
  const { Sidc, Standard, StandardIdentity, SymbolSet } =
    await import("milsymbol-sidc");

  const sidc = new Sidc({ standard: Standard.App6 })
    .identity(StandardIdentity.Friend)
    .symbolSet(SymbolSet.LandUnit)
    .toString();

  return new ms.Symbol(sidc, { size: 32 }).asSVG();
}
```

Node.js 20.19+ and 22.12+ can also `require("milsymbol-sidc")` directly via
`require(esm)`; earlier Node 18/20 releases must use `import()`.

### Browser

```html
<script src="https://unpkg.com/milsymbol@3/dist/milsymbol.js"></script>
<script type="module">
  import {
    Sidc,
    Standard,
    StandardIdentity,
    SymbolSet,
  } from "https://unpkg.com/milsymbol-sidc/dist/src/index.js";

  const sidc = new Sidc({ standard: Standard.App6 })
    .identity(StandardIdentity.Neutral)
    .symbolSet(SymbolSet.SeaSurface)
    .toString();

  document.body.innerHTML = new ms.Symbol(sidc, {
    standard: Standard.App6,
  }).asSVG();
</script>
```

### Recipes

```ts
import {
  Amplifier,
  Context,
  FrameShape,
  HqTaskForceDummy,
  Sidc,
  Standard,
  StandardIdentity,
  Status,
  SymbolSet,
  Version,
} from "milsymbol-sidc";

// Hostile planned armored unit
new Sidc()
  .identity(StandardIdentity.SuspectJoker)
  .symbolSet(SymbolSet.LandUnit)
  .status(Status.Planned)
  .toString(); // "13051010000000000000"

// Neutral damaged installation
new Sidc()
  .identity(StandardIdentity.Neutral)
  .symbolSet(SymbolSet.Installation)
  .status(Status.Damaged)
  .toString(); // "13042030000000000000"

// Friendly destroyed mine (mine warfare set)
new Sidc()
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.MineWarfare)
  .status(Status.Destroyed)
  .toString(); // "13033640000000000000"

// Exercise joker submarine under APP-6E
new Sidc({ standard: Standard.App6, strict: true })
  .context(Context.Exercise)
  .identity(StandardIdentity.SuspectJoker)
  .symbolSet(SymbolSet.SeaSubsurface)
  .toString(); // "14153500000000000000"

// APP-6 unit with structural entity and modifier fields
new Sidc({ standard: Standard.App6, strict: true })
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.LandUnit)
  .entity("123456")
  .modifier1("01")
  .modifier2("09")
  .toString(); // "14031000001234560109"

// 2525E UAV modifier (extended modifier 1 "100") plus the airborne modifier
new Sidc({ strict: true })
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.LandUnit)
  .entity("110000")
  .extendedModifier1("100")
  .extendedModifier2("100")
  .toString(); // "13031000001100000000110"

// Frame shape "A" suppresses the frame for E-edition symbols
new Sidc({ strict: true })
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.LandUnit)
  .frameShape(FrameShape.NoFrame)
  .toString(); // "1303100000000000000000A"

// APP-6 D configuration retains an explicitly selected compatible edition
new Sidc({ standard: Standard.App6, strict: true })
  .version(Version.App6D)
  .identity(StandardIdentity.Friend)
  .symbolSet(SymbolSet.LandDismountedIndividual)
  .toString(); // "11032700000000000000"
```

## Development

```bash
npm install
npm test                  # compiles with tsc, then runs node --test against dist/
npm run build
npm run lint              # eslint
npm run format:check      # prettier
npm run generate:catalogs # regenerate src/catalogs.generated.ts from milsymbol
```

CI runs the test suite on Node 18/20/22/24, plus lint, formatting, markdownlint,
coverage, and a check that the generated catalog is current.

Test coverage includes per-field offset encoding for every enum member,
defaults, immutability, setter validation errors, extended-field offsets,
all combination rules in both warn and strict modes, raw-code escape hatches,
and error class hierarchy.

## Roadmap

- Semantic entity and modifier names, layered on the membership catalog.
- Official positions 24–30 / Set C extension data (country codes and beyond).
  Positions 21–23 shipped: see `extendedModifier1()`, `extendedModifier2()`,
  and `frameShape()`.

## License

MIT
