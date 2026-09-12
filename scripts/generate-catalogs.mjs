/**
 * Generates `src/catalogs.generated.ts` from milsymbol's numeric symbol data.
 *
 * milsymbol stores entity/modifier codes as icon geometry, so we extract the
 * set of codes each symbol set registers (`sId`, `sIdm1`, `sIdm2`). The result
 * is a membership catalog: "which codes does milsymbol know for this symbol
 * set", not a semantic name catalog.
 *
 * Run with: npm run generate:catalogs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const milsymbolPkg = require("milsymbol/package.json");
const sourceDir = join(
  dirname(require.resolve("milsymbol/package.json")),
  "src",
  "numbersidc",
  "sidc",
);

/** @type {Map<string, Set<string>>} */
const entityCodes = new Map();
/** @type {Map<string, Set<string>>} */
const modifier1Codes = new Map();
/** @type {Map<string, Set<string>>} */
const modifier2Codes = new Map();
const commonModifier1 = new Set();
const commonModifier2 = new Set();

function add(map, symbolSet, code) {
  if (!map.has(symbolSet)) {
    map.set(symbolSet, new Set());
  }
  map.get(symbolSet).add(code);
}

function uniqueMatches(text, pattern) {
  return [...new Set([...text.matchAll(pattern)].map((match) => match[1]))];
}

for (const file of readdirSync(sourceDir).filter((f) => f.endsWith(".js"))) {
  const text = readFileSync(join(sourceDir, file), "utf8");
  const symbolSets = uniqueMatches(text, /symbolSet\s*==\s*"(\d{2})"/g);
  const entities = uniqueMatches(text, /sId\["(\d{6})"\]/g);
  const modifiers1 = uniqueMatches(text, /sIdm1\["(\d{2})"\]/g);
  const modifiers2 = uniqueMatches(text, /sIdm2\["(\d{2})"\]/g);

  if (symbolSets.length === 0) {
    // Modules without a symbol-set guard register codes shared by every set.
    modifiers1.forEach((code) => commonModifier1.add(code));
    modifiers2.forEach((code) => commonModifier2.add(code));
    continue;
  }

  for (const symbolSet of symbolSets) {
    entities.forEach((code) => add(entityCodes, symbolSet, code));
    modifiers1.forEach((code) => add(modifier1Codes, symbolSet, code));
    modifiers2.forEach((code) => add(modifier2Codes, symbolSet, code));
  }
}

for (const symbolSet of entityCodes.keys()) {
  commonModifier1.forEach((code) => add(modifier1Codes, symbolSet, code));
  commonModifier2.forEach((code) => add(modifier2Codes, symbolSet, code));
}

function serialize(map) {
  const entries = [...map.keys()].sort().map((symbolSet) => {
    const codes = [...map.get(symbolSet)].sort();
    const list = codes.map((code) => JSON.stringify(code)).join(", ");
    return `  ${JSON.stringify(symbolSet)}: Object.freeze([${list}]),`;
  });
  return `Object.freeze({\n${entries.join("\n")}\n})`;
}

const output = `/**
 * GENERATED FILE - do not edit by hand.
 *
 * Membership catalog derived from milsymbol ${milsymbolPkg.version} (MIT),
 * Copyright (c) 2017 Måns Beckman - https://www.spatialillusions.com
 *
 * Regenerate with \`npm run generate:catalogs\`.
 */

/** Package and version the catalog was generated from. */
export const CATALOG_SOURCE = ${JSON.stringify(
  { name: milsymbolPkg.name, version: milsymbolPkg.version },
  null,
  2,
)} as const;

/** Six-digit entity codes milsymbol registers, keyed by symbol set. */
export const ENTITY_CODES: Readonly<Record<string, readonly string[]>> =
  ${serialize(entityCodes)};

/** Two-digit modifier 1 codes milsymbol registers, keyed by symbol set. */
export const MODIFIER_1_CODES: Readonly<Record<string, readonly string[]>> =
  ${serialize(modifier1Codes)};

/** Two-digit modifier 2 codes milsymbol registers, keyed by symbol set. */
export const MODIFIER_2_CODES: Readonly<Record<string, readonly string[]>> =
  ${serialize(modifier2Codes)};
`;

writeFileSync(
  new URL("../src/catalogs.generated.ts", import.meta.url),
  output,
  "utf8",
);

const total = (map) => [...map.values()].reduce((sum, set) => sum + set.size, 0);
console.log(
  `catalogs: ${entityCodes.size} symbol sets, ` +
    `${total(entityCodes)} entity codes, ` +
    `${total(modifier1Codes)} modifier 1 codes, ` +
    `${total(modifier2Codes)} modifier 2 codes ` +
    `(milsymbol ${milsymbolPkg.version})`,
);
