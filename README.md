# milsymbol-sidc

A fluent TypeScript builder for **20-character numeric SIDC strings** — the
symbol identification code format used by [MIL-STD-2525E](https://en.wikipedia.org/wiki/MIL-STD-2525)
and [APP-6](https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology) — made
for constructing symbols with the
[milsymbol](https://github.com/spatialillusions/milsymbol) library.

```ts
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
- **milsymbol-ready** — positions 8–20 are zero-filled so every generated
  string is accepted by `new ms.Symbol(...)` out of the box.

> **Coverage:** positions 1–7 of the numeric SIDC (version, context, standard
> identity, symbol set, status). Positions 8–20 (HQ/task force/dummy, echelon,
> entity code, sector modifiers) are reserved for future releases.

## Installation

Requires Node.js >= 18.

```bash
npm install milsymbol-sidc
# or
yarn add milsymbol-sidc
# or
pnpm add milsymbol-sidc
```

The package ships ESM with bundled TypeScript declarations (`dist/`).

## Quick start

```ts
import {
  Sidc,
  Context,
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
const base = new Sidc().version(Version.App6E);

const friendly = base.identity(StandardIdentity.Friend).toString();
const hostile = base.identity(StandardIdentity.SuspectJoker).toString();
// base itself is unchanged
```

## Anatomy of the generated SIDC

```
1 3 0 3 1 0 | 0 0 0 0 0 0 0 0 0 0 0 0 0
└─┬─┘ │ │ └─┬─┘ └──────────┬───────────┘
  │   │ │   │              zero-filled (future fields)
  │   │ │   └ status (7)
  │   │ └ symbol set (5-6)
  │   └ standard identity (4)
  └ context (3)
  version (1-2)
```

| Position | Field | Enum |
| -------- | ------------------ | ----------------- |
| 1–2 | Version / edition | `Version` |
| 3 | Context | `Context` |
| 4 | Standard identity | `StandardIdentity` |
| 5–6 | Symbol set | `SymbolSet` |
| 7 | Status / condition | `Status` |

## API

### `new Sidc(options?)`

Creates a builder preconfigured to 2525E / Reality / Unknown / Unknown set /
Present.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `strict` | `boolean` | `false` | Throw on invalid field combinations during `toString()` instead of warning. Invalid values always throw immediately regardless of this flag. |

### Methods

All setters validate their argument and return a new immutable `Sidc`.

| Method | Field | Accepts |
| ------ | ----- | ------- |
| `version(v)` | Positions 1–2 | A `Version` constant or any two-digit string (escape hatch for future editions) |
| `context(c)` | Position 3 | A `Context` constant |
| `identity(i)` | Position 4 | A `StandardIdentity` constant |
| `symbolSet(s)` | Positions 5–6 | A `SymbolSet` constant or any two-digit string |
| `status(s)` | Position 7 | A `Status` constant |
| `toString()` | — | Validates combinations and renders the 20-character SIDC |

### Enum reference

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
   input (wrong number of digits) or unknown enum codes. This catches bugs at
   the call site rather than deep inside rendering code.
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
- Raw version/symbol-set codes outside milsymbol's known tables are reported.

```ts
import { Sidc, SidcValidationError, SidcCombinationError, Context, StandardIdentity, SymbolSet, Status } from "milsymbol-sidc";

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
import ms from "milsymbol"; // bundles all standards incl. 2525E icons
import { Sidc, StandardIdentity, SymbolSet } from "milsymbol-sidc";

ms.setStandard("2525"); // or "APP6"

const sidc = new Sidc()
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

```js
const ms = require("milsymbol");
// same API as above
```

### Browser

```html
<script src="https://unpkg.com/milsymbol@3/dist/milsymbol.js"></script>
<script type="module">
  import { Sidc, StandardIdentity, SymbolSet } from "https://unpkg.com/milsymbol-sidc/dist/src/index.js";

  const sidc = new Sidc()
    .identity(StandardIdentity.Neutral)
    .symbolSet(SymbolSet.SeaSurface)
    .toString();

  document.body.innerHTML = new ms.Symbol(sidc).asSVG();
</script>
```

### Recipes

```ts
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
new Sidc({ strict: true })
  .version("14")
  .context(Context.Exercise)
  .identity(StandardIdentity.SuspectJoker)
  .symbolSet(SymbolSet.SeaSubsurface)
  .toString(); // "14153500000000000000"
```

## Development

```bash
npm install
npm test     # compiles with tsc, then runs node --test against dist/
npm run build
```

Test coverage includes per-field offset encoding for every enum member,
defaults, immutability, setter validation errors, all combination rules in
both warn and strict modes, raw-code escape hatches, and error class
hierarchy.

## Roadmap

- Positions 8–20: HQ/task force/dummy, echelon/mobility, entity catalog with
  named icon codes, sector modifiers.
- Parsing/decoding SIDC strings back into structured fields.

## License

MIT
