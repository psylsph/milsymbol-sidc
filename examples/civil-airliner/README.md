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

## Browser (`index.html`)

An interactive page: pick the identity and toggle "heavy" or "hijacking" to
see the SIDC, its breakdown, and the rendered symbol update. It loads both
libraries from the jsDelivr CDN, so it needs no build step, but browsers block
ES modules from `file://` pages; serve the folder over HTTP instead:

```bash
npx --yes serve examples/civil-airliner
# then open the printed URL
```

## Node (`render.mjs`)

Writes `airliner.svg`, `airliner-heavy.svg`, and `airliner-hijacked.svg` next
to the script. From the repository root:

```bash
npm run build
node examples/civil-airliner/render.mjs
```
