# milsymbol-sidc

[![npm version](https://img.shields.io/npm/v/milsymbol-sidc.svg)](https://www.npmjs.com/package/milsymbol-sidc)
[![npm downloads](https://img.shields.io/npm/dm/milsymbol-sidc.svg)](https://www.npmjs.com/package/milsymbol-sidc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-%E2%89%A55.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A fluent TypeScript builder for **20-character numeric SIDC strings** — the
symbol identification code format used by [MIL-STD-2525E](https://en.wikipedia.org/wiki/MIL-STD-2525)
and [APP-6](https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology) — made
for constructing symbols with the
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
- **milsymbol-ready** — every generated 20-character string is accepted by
  milsymbol's numeric parser. Full rendering depends on the entity and
  modifier codes you supply, exactly as it does for any raw SIDC.

> **Coverage:** complete structural encoding for positions 1–20 of the numeric
> SIDC. Positions 8–10 have named universal codes; positions 11–20 accept
> validated raw entity and modifier codes. Symbol-set-specific entity and
> modifier catalogs remain future work.

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
  .version(Version.MilStd2525E)       // pos 1-2 → "13"
  .context(Context.Reality)           // pos 3   → "0"
  .identity(StandardIdentity.SuspectJoker) // pos 4   → "5"
  .symbolSet(SymbolSet.AirMissile)    // pos 5-6 → "02"
  .status(Status.Planned)             // pos 7   → "1"
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
13 0 3 10 0 2 16 123456 78 90
│  │ │ │  │ │ │  │      │  │
│  │ │ │  │ │ │  │      │  └   modifier 2 (19–20)
│  │ │ │  │ │ │  │      └  │   modifier 1 (17–18)
│  │ │ │  │ │ │  └      │  │   entity code (11–16)
│  │ │ │  │ │ └  │      │  │   amplifier (9–10)
│  │ │ │  │ └ │  │      │  │   HQ/task force/feint-dummy (8)
│  │ │ │  └ │ │  │      │  │   status (7)
│  │ │ └  │ │ │  │      │  │   symbol set (5–6)
│  │ └ │  │ │ │  │      │  │   standard identity (4)
│  └ │ │  │ │ │  │      │  │   context (3)
└  │ │ │  │ │ │  │      │  │   version / edition (1–2)
```

| Position | Field | API |
| -------- | ------------------ | ----------------- |
| 1–2 | Version / edition | `Version`, `version()` |
| 3 | Context | `Context`, `context()` |
| 4 | Standard identity | `StandardIdentity`, `identity()` |
| 5–6 | Symbol set | `SymbolSet`, `symbolSet()` |
| 7 | Status / condition | `Status`, `status()` |
| 8 | HQ/task force/feint-dummy | `HqTaskForceDummy`, `hqTaskForceDummy()` |
| 9–10 | Amplifier | `Amplifier`, `amplifier()` |
| 11–16 | Entity code | `entity()` — six raw digits |
| 17–18 | Modifier 1 | `modifier1()` — two raw digits |
| 19–20 | Modifier 2 | `modifier2()` — two raw digits |

## API

### `new Sidc(options?)`

Creates a builder preconfigured to 2525E / Reality / Unknown / Unknown set /
Present. This remains the default for backward compatibility; configure
`Standard.App6` to default to APP-6 E instead.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `strict` | `boolean` | `false` | Throw on invalid field combinations during `toString()` instead of warning. Invalid values always throw immediately regardless of this flag. |
| `standard` | `Standard` | Not configured (2525E behavior) | Select a standard family. `App6` defaults the version to APP-6 E (`"14"`); `MilStd2525` defaults it to MIL-STD-2525E (`"13"`). Explicit configuration also checks that later version choices belong to the selected family. |

### Methods

All setters validate their argument and return a new immutable `Sidc`.

| Method | Field | Accepts |
| ------ | ----- | ------- |
| `standard(s)` | Version default + validation rules | A `Standard` constant. It retains a compatible current version; otherwise it selects that family's latest edition. |
| `version(v)` | Positions 1–2 | A `Version` constant or any two-digit string (escape hatch for future editions) |
| `context(c)` | Position 3 | A `Context` constant |
| `identity(i)` | Position 4 | A `StandardIdentity` constant |
| `symbolSet(s)` | Positions 5–6 | A `SymbolSet` constant or any two-digit string |
| `status(s)` | Position 7 | A `Status` constant |
| `hqTaskForceDummy(v)` | Position 8 | An `HqTaskForceDummy` constant |
| `amplifier(v)` | Positions 9–10 | An `Amplifier` constant |
| `entity(v)` | Positions 11–16 | Any six-digit string; symbol-set-specific catalogs are not included |
| `modifier1(v)` | Positions 17–18 | Any two-digit string; symbol-set-specific catalogs are not included |
| `modifier2(v)` | Positions 19–20 | Any two-digit string; symbol-set-specific catalogs are not included |
| `toString()` | — | Validates combinations and renders the 20-character SIDC |

### Enum reference

#### `Standard`

Values match milsymbol's `standard` option and `ms.setStandard()` API, so the
same constant can configure both libraries.

| Constant | Value | Standard family |
| -------- | ----- | --------------- |
| `MilStd2525` | `"2525"` | US MIL-STD-2525 (**default behavior when omitted**) |
| `App6` | `"APP6"` | NATO APP-6 |

#### `HqTaskForceDummy`

Position 8 values identify headquarters, task force, and feint/dummy variants.

| Constant | Code | Meaning |
| -------- | ---- | ------- |
| `None` | `"0"` | None / not applicable |
| `FeintDummy` | `"1"` | Feint/dummy |
| `Headquarters` | `"2"` | Headquarters |
| `FeintDummyHeadquarters` | `"3"` | Feint/dummy headquarters |
| `TaskForce` | `"4"` | Task force |
| `FeintDummyTaskForce` | `"5"` | Feint/dummy task force |
| `TaskForceHeadquarters` | `"6"` | Task-force headquarters |
| `FeintDummyTaskForceHeadquarters` | `"7"` | Feint/dummy task-force headquarters |

#### `Amplifier`

Position 9–10 values identify echelon, mobility, leadership, or auxiliary
amplifiers. `None` writes the zero/no-amplifier code `"00"`.

| Constant | Code | Meaning |
| -------- | ---- | ------- |
| `None` | `"00"` | None / not specified |
| `TeamCrew` | `"11"` | Team/crew |
| `Squad` | `"12"` | Squad |
| `Section` | `"13"` | Section |
| `PlatoonDetachment` | `"14"` | Platoon/detachment |
| `CompanyBatteryTroop` | `"15"` | Company/battery/troop |
| `BattalionSquadron` | `"16"` | Battalion/squadron |
| `RegimentGroup` | `"17"` | Regiment/group |
| `Brigade` | `"18"` | Brigade |
| `Division` | `"21"` | Division |
| `CorpsMef` | `"22"` | Corps/MEF |
| `Army` | `"23"` | Army |
| `ArmyGroupFront` | `"24"` | Army group/front |
| `RegionTheater` | `"25"` | Region/theater |
| `Command` | `"26"` | Command |
| `WheeledLimitedCrossCountry` | `"31"` | Wheeled, limited cross-country |
| `WheeledCrossCountry` | `"32"` | Wheeled, cross-country |
| `Tracked` | `"33"` | Tracked |
| `WheeledTrackedCombination` | `"34"` | Wheeled and tracked combination |
| `Towed` | `"35"` | Towed |
| `Rail` | `"36"` | Rail |
| `PackAnimals` | `"37"` | Pack animals |
| `OverSnowPrimeMover` | `"41"` | Over snow, prime mover |
| `Sled` | `"42"` | Sled |
| `Barge` | `"51"` | Barge |
| `Amphibious` | `"52"` | Amphibious |
| `ShortTowedArray` | `"61"` | Short towed array |
| `LongTowedArray` | `"62"` | Long towed array |
| `LeaderIndividual` | `"71"` | Leader individual |
| `DeputyIndividual` | `"72"` | Deputy individual |

Entity and modifier setters intentionally accept raw digit strings so callers
can use codes specific to their symbol set and edition. They validate width and
ASCII digits but do not validate catalog membership.

#### `Version`

| Constant | Code | Standard |
| -------- | ---- | -------- |
| `MilStd2525D` | `"10"` | MIL-STD-2525D |
| `App6D` | `"11"` | APP-6 D |
| `MilStd2525E` | `"13"` | MIL-STD-2525E (**default**) |
| `App6E` | `"14"` | APP-6 E |

#### `Context`

| Constant | Code | Meaning |
| -------- | ---- | ------- |
| `Reality` | `"0"` | Real-world operation (**default**) |
| `Exercise` | `"1"` | Training/exercise |
| `Simulation` | `"2"` | Simulation |

#### `StandardIdentity`

| Constant | Code | Frame drawn |
| -------- | ---- | ----------- |
| `Pending` | `"0"` | Unknown shape, dashed |
| `Unknown` | `"1"` | Yellow octagonal frame (**default**) |
| `AssumedFriend` | `"2"` | Blue frame, dashed |
| `Friend` | `"3"` | Blue frame |
| `Neutral` | `"4"` | Green frame |
| `SuspectJoker` | `"5"` | Red frame, dashed — **Suspect** in reality, **Joker** in exercises |
| `HostileFaker` | `"6"` | Red frame — **Hostile** in reality, **Faker** in exercises |

#### `SymbolSet`

Only sets that milsymbol can render are listed.

| Constant | Code | Domain |
| -------- | ---- | ------ |
| `Unknown` | `"00"` | Unknown |
| `Air` | `"01"` | Air tracks |
| `AirMissile` | `"02"` | Air missiles |
| `Space` | `"05"` | Space |
| `SpaceMissile` | `"06"` | Space missiles |
| `LandUnit` | `"10"` | Land units |
| `LandCivilianUnit` | `"11"` | Land civilian units |
| `LandEquipment` | `"15"` | Land equipment |
| `Installation` | `"20"` | Installations |
| `ControlMeasure` | `"25"` | Tactical graphics / control measures |
| `LandDismountedIndividual` | `"27"` | Dismounted individuals |
| `SeaSurface` | `"30"` | Sea surface tracks |
| `SeaSubsurface` | `"35"` | Subsurface tracks |
| `MineWarfare` | `"36"` | Sea mines |
| `Activity` | `"40"` | Activities/events |
| `SignalsIntelligenceSpace` | `"50"` | SIGINT space |
| `SignalsIntelligenceAir` | `"51"` | SIGINT air |
| `SignalsIntelligenceLand` | `"52"` | SIGINT land |
| `SignalsIntelligenceSeaSurface` | `"53"` | SIGINT sea surface |
| `SignalsIntelligenceSubsurface` | `"54"` | SIGINT subsurface |
| `Cyberspace` | `"60"` | Cyberspace |

Codes `"12"` and `"39"` have no named constant but are recognized via the raw
string escape hatch.

#### `Status`

| Constant | Code | Meaning |
| -------- | ---- | ------- |
| `Present` | `"0"` | Present / actual (**default**) |
| `Planned` | `"1"` | Planned / anticipated (dashed frame) |
| `FullyCapable` | `"2"` | Condition bar: fully capable |
| `Damaged` | `"3"` | Condition bar: damaged |
| `Destroyed` | `"4"` | Condition bar: destroyed |
| `FullToCapacity` | `"5"` | Condition bar: full to capacity |

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
  const { Sidc, Standard, StandardIdentity, SymbolSet } = await import(
    "milsymbol-sidc"
  );

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
  import { Sidc, Standard, StandardIdentity, SymbolSet } from "https://unpkg.com/milsymbol-sidc/dist/src/index.js";

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
npm test     # compiles with tsc, then runs node --test against dist/
npm run build
```

Test coverage includes per-field offset encoding for every enum member,
defaults, immutability, setter validation errors, extended-field offsets,
all combination rules in both warn and strict modes, raw-code escape hatches,
and error class hierarchy.

## Roadmap

- Symbol-set-specific named entity and modifier catalogs with semantic
  validation.
- Official positions 21–30 / Set C extension data.
- Parsing/decoding SIDC strings back into structured fields.

## License

MIT
