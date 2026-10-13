/**
 * Generates `src/catalogs.generated.ts` from milsymbol's numeric symbol data.
 *
 * milsymbol stores entity/modifier codes as icon geometry, so we parse each
 * numeric module with acorn and collect the codes it assigns to the entity,
 * modifier 1, and modifier 2 maps (named by its `icons()` parameters), then
 * keep those milsymbol renders as valid (see catalog-render-rule.mjs). The
 * result is a membership catalog: "which codes does milsymbol know for this
 * symbol set", not a semantic name catalog.
 *
 * Run with: npm run generate:catalogs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { parse } from "acorn";
import ms from "milsymbol";
import { createRenderRule } from "./catalog-render-rule.mjs";

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
const extendedModifier1Codes = new Map();
const extendedModifier2Codes = new Map();
const commonExtendedModifier1 = new Set();
const commonExtendedModifier2 = new Set();
const commonModifier1 = new Set();
const commonModifier2 = new Set();

function add(map, symbolSet, code) {
  if (!map.has(symbolSet)) {
    map.set(symbolSet, new Set());
  }
  map.get(symbolSet).add(code);
}

/**
 * Collects every assignment `map["code"] = …` (including chained assignments)
 * whose target is one of the given parameter names. Parsing with acorn means
 * comments are never harvested and no literal can confuse the scan.
 */
function registrations(node, names, found = []) {
  if (node === null || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    for (const child of node) registrations(child, names, found);
    return found;
  }
  if (
    node.type === "AssignmentExpression" &&
    node.left.type === "MemberExpression" &&
    node.left.computed &&
    node.left.object.type === "Identifier" &&
    names.has(node.left.object.name) &&
    node.left.property.type === "Literal" &&
    typeof node.left.property.value === "string"
  ) {
    found.push({
      map: node.left.object.name,
      code: node.left.property.value,
    });
  }
  for (const key of Object.keys(node)) {
    if (key !== "type" && key !== "start" && key !== "end") {
      registrations(node[key], names, found);
    }
  }
  return found;
}

/** Symbol sets named by `symbolSet == "NN"` guards anywhere in the module. */
function guardedSymbolSets(node, found = new Set()) {
  if (node === null || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    for (const child of node) guardedSymbolSets(child, found);
    return found;
  }
  if (
    node.type === "BinaryExpression" &&
    (node.operator === "==" || node.operator === "===") &&
    node.left.type === "Identifier" &&
    node.left.name === "symbolSet" &&
    node.right.type === "Literal" &&
    /^\d{2}$/.test(String(node.right.value))
  ) {
    found.add(String(node.right.value));
  }
  for (const key of Object.keys(node)) {
    if (key !== "type" && key !== "start" && key !== "end") {
      guardedSymbolSets(node[key], found);
    }
  }
  return found;
}

/** The `icons: function (entities, modifier1, modifier2, …)` parameters. */
function iconsParameters(ast, file) {
  let params;
  (function find(node) {
    if (params !== undefined || node === null || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) return node.forEach(find);
    if (
      node.type === "Property" &&
      !node.computed &&
      (node.key.name ?? node.key.value) === "icons" &&
      node.value.type === "FunctionExpression"
    ) {
      params = node.value.params;
      return;
    }
    for (const key of Object.keys(node)) find(node[key]);
  })(ast);
  if (params === undefined || params.length < 3) {
    throw new Error(`Cannot find icons() signature in ${file}`);
  }
  return params.slice(0, 3).map((param, index) => {
    if (param.type !== "Identifier") {
      throw new Error(`Unexpected icons() parameter ${index} in ${file}`);
    }
    return param.name;
  });
}

for (const file of readdirSync(sourceDir).filter((f) => f.endsWith(".js"))) {
  const ast = parse(readFileSync(join(sourceDir, file), "utf8"), {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  const [entityMap, modifier1Map, modifier2Map] = iconsParameters(ast, file);
  const found = registrations(
    ast,
    new Set([entityMap, modifier1Map, modifier2Map]),
  );
  const codes = (map, digits) => [
    ...new Set(
      found
        .filter(
          (entry) =>
            entry.map === map &&
            new RegExp(`^\\d{${digits}}$`).test(entry.code),
        )
        .map((entry) => entry.code),
    ),
  ];
  const symbolSets = [...guardedSymbolSets(ast)];
  const entities = codes(entityMap, 6);
  const modifiers1 = codes(modifier1Map, 2);
  const modifiers2 = codes(modifier2Map, 2);
  const extendedModifiers1 = codes(modifier1Map, 3);
  const extendedModifiers2 = codes(modifier2Map, 3);

  if (symbolSets.length === 0) {
    if (entities.length > 0) {
      // Only modifier-only modules (common.js) are shared by every set; an
      // unguarded module with entities means a guard went unrecognized.
      throw new Error(
        `Entity registrations without a symbol-set guard in ${file}`,
      );
    }
    // Modules without a symbol-set guard register codes shared by every set.
    modifiers1.forEach((code) => commonModifier1.add(code));
    modifiers2.forEach((code) => commonModifier2.add(code));
    extendedModifiers1.forEach((code) => commonExtendedModifier1.add(code));
    extendedModifiers2.forEach((code) => commonExtendedModifier2.add(code));
    continue;
  }
  if (entities.length === 0) {
    // Guards with no entities would mean the map name was not recognized.
    throw new Error(`No entity registrations found in ${file}`);
  }

  for (const symbolSet of symbolSets) {
    entities.forEach((code) => add(entityCodes, symbolSet, code));
    modifiers1.forEach((code) => add(modifier1Codes, symbolSet, code));
    modifiers2.forEach((code) => add(modifier2Codes, symbolSet, code));
    extendedModifiers1.forEach((code) =>
      add(extendedModifier1Codes, symbolSet, code),
    );
    extendedModifiers2.forEach((code) =>
      add(extendedModifier2Codes, symbolSet, code),
    );
  }
}

for (const symbolSet of entityCodes.keys()) {
  commonModifier1.forEach((code) => add(modifier1Codes, symbolSet, code));
  commonModifier2.forEach((code) => add(modifier2Codes, symbolSet, code));
}

// Common extended modifiers apply to every set with any catalog data.
const catalogSets = new Set([
  ...entityCodes.keys(),
  ...modifier1Codes.keys(),
  ...modifier2Codes.keys(),
  ...extendedModifier1Codes.keys(),
  ...extendedModifier2Codes.keys(),
]);
for (const symbolSet of catalogSets) {
  commonExtendedModifier1.forEach((code) =>
    add(extendedModifier1Codes, symbolSet, code),
  );
  commonExtendedModifier2.forEach((code) =>
    add(extendedModifier2Codes, symbolSet, code),
  );
}

// Drop registrations milsymbol reports invalid, such as placeholder
// `icn["TODO"]` entries whose icon is undefined. milsymbol only rejects
// undefined lookups, so empty-array registrations (drawn as nothing) are
// valid and kept. The rule lives in catalog-render-rule.mjs, which
// test/milsymbol.test.ts uses to verify the generated catalog.
const renders = createRenderRule(
  ms,
  (symbolSet) => entityCodes.get(symbolSet) ?? [],
);
// Entities first: modifiers are rendered on a surviving base entity.
for (const [kind, map] of [
  ["entity", entityCodes],
  ["modifier1", modifier1Codes],
  ["modifier2", modifier2Codes],
  ["extendedModifier1", extendedModifier1Codes],
  ["extendedModifier2", extendedModifier2Codes],
]) {
  for (const [symbolSet, codes] of map) {
    for (const code of codes) {
      if (!renders(kind, symbolSet, code)) codes.delete(code);
    }
    // A set left with no codes would otherwise still report a catalog.
    if (codes.size === 0) map.delete(symbolSet);
  }
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

/** Registered three-digit modifier 1 codes, keyed by symbol set. */
export const EXTENDED_MODIFIER_1_CODES: Readonly<Record<string, readonly string[]>> =
  ${serialize(extendedModifier1Codes)};

/** Registered three-digit modifier 2 codes, keyed by symbol set. */
export const EXTENDED_MODIFIER_2_CODES: Readonly<Record<string, readonly string[]>> =
  ${serialize(extendedModifier2Codes)};
`;

writeFileSync(
  new URL("../src/catalogs.generated.ts", import.meta.url),
  output,
  "utf8",
);

const total = (map) =>
  [...map.values()].reduce((sum, set) => sum + set.size, 0);
const symbolSetCount = new Set(
  [
    entityCodes,
    modifier1Codes,
    modifier2Codes,
    extendedModifier1Codes,
    extendedModifier2Codes,
  ].flatMap((map) => [...map.keys()]),
).size;
console.log(
  `catalogs: ${symbolSetCount} symbol sets, ` +
    `${total(entityCodes)} entity codes, ` +
    `${total(modifier1Codes)} modifier 1 codes, ` +
    `${total(modifier2Codes)} modifier 2 codes ` +
    `(milsymbol ${milsymbolPkg.version})`,
);
