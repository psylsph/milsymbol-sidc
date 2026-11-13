# Civil airliner (MIL-STD-2525D)

A small sample showing a civil airliner symbol built with `milsymbol-sidc` and
drawn with [milsymbol](https://github.com/spatialillusions/milsymbol).

The SIDC is `10040100000000000900`, a passenger air track with no entity:

| Positions | Code     | Meaning                |
| --------- | -------- | ---------------------- |
| 1–2       | `10`     | MIL-STD-2525D          |
| 3         | `0`      | Reality                |
| 4         | `4`      | Neutral                |
| 5–6       | `01`     | Air                    |
| 7         | `0`      | Present                |
| 8         | `0`      | No HQ/task force/dummy |
| 9–10      | `00`     | No amplifier           |
| 11–16     | `000000` | No entity              |
| 17–18     | `09`     | Passenger              |
| 19–20     | `00`     | No modifier 2          |

## Colours

With no entity, nothing marks the track as civilian, so milsymbol fills it by
identity: assumed friend and friend are light blue, neutral green, pending and
unknown yellow, suspect and hostile red. Setting the civilian fixed-wing entity
(`.entity("120100")`, giving `10040100001201000900`) switches pending through
neutral to milsymbol's civilian magenta instead; pass milsymbol's
`civilianColor: false` option to keep identity colours with that entity.

## Starting from MIL-STD-2525C

Older systems often carry 2525C codes, where a civil fixed-wing aircraft is
function ID `CF` in the air battle dimension. The builder's `from2525c()` uses
the current symbol set (`Air`) as the dimension and sets the 2525D entity:

```js
airliner.from2525c("CF").modifier1(Air.Modifier1.Passenger).toString();
// "10040100001201000900"
```

`from2525c()` replaces both modifiers, so set passenger afterwards. Both
samples use it: the page has a "Start from a MIL-STD-2525C function ID" field
(try `C`, `CH`, or `CL`), and `render.mjs` writes an extra
`airliner-from-2525c.svg`. Identity and status still come from the builder.

## Browser (`index.html`)

An interactive page: pick the identity, toggle "heavy" or "hijacking", or enter
a 2525C function ID to see the SIDC, its breakdown, and the rendered symbol
update. It loads both libraries from the jsDelivr CDN (`milsymbol-sidc@0.9.1`;
`from2525c()` needs 0.8.0 or later), so it needs no build step, but browsers
block ES modules from `file://` pages; serve the folder over HTTP instead:

```bash
npx --yes serve examples/civil-airliner
# then open the printed URL
```

## Node (`render.mjs`)

Writes `airliner.svg`, `airliner-heavy.svg`, `airliner-hijacked.svg`, and
`airliner-from-2525c.svg` next to the script. From the repository root:

```bash
npm run build
node examples/civil-airliner/render.mjs
```
