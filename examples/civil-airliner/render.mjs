/**
 * Renders a MIL-STD-2525D civil airliner to SVG files.
 *
 * From the repository root:
 *   npm run build
 *   node examples/civil-airliner/render.mjs
 *
 * `milsymbol-sidc` resolves to this repository's build through the package's
 * own `exports`; in your app it resolves to the installed npm package.
 */
import { writeFileSync } from "node:fs";
import ms from "milsymbol";
import { Sidc, Standard, StandardIdentity, Version } from "milsymbol-sidc";
import { Air, describe2525d } from "milsymbol-sidc/2525d";

// Neutral passenger air track (modifier 1 "09") in the Air symbol set of
// MIL-STD-2525D. No entity is set, so the fill follows the identity; add
// .entity("120100") for a civilian fixed-wing drawn in civilian magenta.
const airliner = new Sidc({ standard: Standard.MilStd2525, strict: true })
  .version(Version.MilStd2525D)
  .identity(StandardIdentity.Neutral)
  .symbolSet(Air)
  .modifier1(Air.Modifier1.Passenger);

const variants = {
  airliner,
  "airliner-heavy": airliner.modifier2(Air.Modifier2.Heavy),
  "airliner-hijacked": airliner.modifier1(Air.Modifier1.Hijacking),
};

let failed = false;
for (const [name, builder] of Object.entries(variants)) {
  const sidc = builder.toString(); // strict: throws on any problem
  const symbol = new ms.Symbol(sidc, { size: 60, standard: "2525" });
  const file = new URL(`${name}.svg`, import.meta.url);
  writeFileSync(file, symbol.asSVG());
  const { modifier1, modifier2 } = describe2525d(builder);
  console.log(
    `${name.padEnd(18)} ${sidc}  valid=${symbol.isValid()}  ` +
      `${modifier1?.label}${modifier2?.code === "00" ? "" : ` / ${modifier2?.label}`}`,
  );
  failed ||= !symbol.isValid();
}
process.exitCode = failed ? 1 : 0;
