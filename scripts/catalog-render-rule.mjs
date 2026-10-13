/**
 * The single rule deciding whether a code belongs in the catalog: milsymbol
 * must report it as valid under at least one edition/standard combination.
 *
 * Shared by `generate-catalogs.mjs` (to filter) and `test/milsymbol.test.ts`
 * (to verify the committed catalog), so the two can never disagree.
 */

/** Every edition (D and E, both families) crossed with both standards. */
export const RENDER_VARIANTS = Object.freeze(
  ["10", "11", "13", "14"].flatMap((version) =>
    ["2525", "APP6"].map((standard) => Object.freeze({ version, standard })),
  ),
);

/** Kinds of catalog code the rule can check. */
export const CODE_KINDS = Object.freeze([
  "entity",
  "modifier1",
  "modifier2",
  "extendedModifier1",
  "extendedModifier2",
]);

const head = (version, symbolSet, entity, m1 = "00", m2 = "00") =>
  `${version}03${symbolSet}0000${entity}${m1}${m2}`;

/** SIDC that exercises `code` of `kind` on top of a base entity. */
const BUILDERS = {
  modifier1: (version, set, base, code) => head(version, set, base, code),
  modifier2: (version, set, base, code) => head(version, set, base, "00", code),
  // Hundreds digit at position 21 (or 22), final two digits at 17-18 (19-20).
  extendedModifier1: (version, set, base, code) =>
    `${head(version, set, base, code.slice(1))}${code[0]}00`,
  extendedModifier2: (version, set, base, code) =>
    `${head(version, set, base, "00", code.slice(1))}0${code[0]}0`,
};

/**
 * @param ms The milsymbol module.
 * @param entitiesFor Returns the (already filtered) entity codes of a set;
 *   modifiers are rendered on the first entity valid for each variant.
 * @returns `renders(kind, symbolSet, code)`.
 */
export function createRenderRule(ms, entitiesFor) {
  const isValid = (sidc, standard) =>
    new ms.Symbol(sidc, { standard }).isValid();
  const bases = new Map();
  const baseEntity = (version, standard, symbolSet) => {
    const key = `${version}|${standard}|${symbolSet}`;
    if (!bases.has(key)) {
      bases.set(
        key,
        [...entitiesFor(symbolSet)]
          .sort()
          .find((entity) =>
            isValid(head(version, symbolSet, entity), standard),
          ),
      );
    }
    return bases.get(key);
  };

  return function renders(kind, symbolSet, code) {
    if (!CODE_KINDS.includes(kind)) throw new Error(`Unknown kind ${kind}`);
    return RENDER_VARIANTS.some(({ version, standard }) => {
      if (kind === "entity") {
        return isValid(head(version, symbolSet, code), standard);
      }
      const base = baseEntity(version, standard, symbolSet);
      return (
        base !== undefined &&
        isValid(BUILDERS[kind](version, symbolSet, base, code), standard)
      );
    });
  };
}
