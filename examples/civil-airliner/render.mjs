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

// Coming from MIL-STD-2525C? A civil fixed-wing aircraft there is function ID
// "CF" in the air battle dimension. from2525c() reads the dimension from the
// builder's symbol set (Air) and sets entity "120100" (civilian fixed wing).
// It replaces the modifiers, so passenger is set again afterwards.
const fromLegacy = airliner.from2525c("CF").modifier1(Air.Modifier1.Passenger);

const variants = {
  airliner,
  "airliner-heavy": airliner.modifier2(Air.Modifier2.Heavy),
  "airliner-hijacked": airliner.modifier1(Air.Modifier1.Hijacking),
  "airliner-from-2525c": fromLegacy,
};

let failed = false;
for (const [name, builder] of Object.entries(variants)) {
  const sidc = builder.toString(); // strict: throws on any problem
  const symbol = new ms.Symbol(sidc, { size: 60, standard: "2525" });
  const file = new URL(`${name}.svg`, import.meta.url);
  writeFileSync(file, symbol.asSVG());
  const { entity, entityType, entitySubtype, modifier1, modifier2 } =
    describe2525d(builder);
  const labels = [
    entity?.code === "000000"
      ? undefined
      : (entitySubtype ?? entityType ?? entity)?.label,
    modifier1?.label,
    modifier2?.code === "00" ? undefined : modifier2?.label,
  ].filter(Boolean);
  console.log(
    `${name.padEnd(20)} ${sidc}  valid=${symbol.isValid()}  ${labels.join(" / ")}`,
  );
  failed ||= !symbol.isValid();
}
process.exitCode = failed ? 1 : 0;
