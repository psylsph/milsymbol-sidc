/**
 * Generates `src/names-2525d.generated.ts` from the committed JMSML snapshot
 * (`data/jmsml-2525d.json`, see import-jmsml.mjs) and the hand-maintained
 * `scripts/name-overrides.json`. Runs offline; CI checks the output is fresh.
 *
 * Run with: npm run generate:names
 */
import { readFileSync, writeFileSync } from "node:fs";

const snapshot = JSON.parse(
  readFileSync(new URL("../data/jmsml-2525d.json", import.meta.url), "utf8"),
);
const overrides = JSON.parse(
  readFileSync(new URL("./name-overrides.json", import.meta.url), "utf8"),
);

/** Export names follow the core `SymbolSet` enum (checked by the tests). */
const EXPORT_NAMES = {
  "00": "Unknown",
  "01": "Air",
  "02": "AirMissile",
  "05": "Space",
  "06": "SpaceMissile",
  10: "LandUnit",
  11: "LandCivilianUnit",
  15: "LandEquipment",
  20: "Installation",
  25: "ControlMeasure",
  30: "SeaSurface",
  35: "SeaSubsurface",
  36: "MineWarfare",
  40: "Activity",
  50: "SignalsIntelligenceSpace",
  51: "SignalsIntelligenceAir",
  52: "SignalsIntelligenceLand",
  53: "SignalsIntelligenceSeaSurface",
  54: "SignalsIntelligenceSubsurface",
  60: "Cyberspace",
};

const MAX_LENGTH = 40;
/** Keys a code node already uses for its own fields. */
const RESERVED = new Set(["code", "label", "kind", "symbolSet"]);
const usedOverrides = new Set();

/** PascalCase identifier from a label: "Fixed-Wing" -> "FixedWing". */
function identifier(text) {
  return (text.replace(/['’]/g, "").match(/[A-Za-z0-9]+/g) ?? [])
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Picks the identifier for a node: an explicit override, else the label,
 * else (when the label is too long) the source's shorter alias.
 */
function nameFor(key, node) {
  if (key in overrides) {
    usedOverrides.add(key);
    return overrides[key];
  }
  let name = identifier(node.label);
  if (name.length > MAX_LENGTH && node.alias !== undefined) {
    name = identifier(node.alias);
  }
  return name;
}

const problems = [];

/** Assigns unique, valid names to sibling nodes. */
function nameSiblings(path, nodes, keyFor) {
  const named = new Map();
  for (const node of nodes) {
    const key = keyFor(node);
    const name = nameFor(key, node);
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      problems.push(`${key}: "${name}" is not an identifier (${node.label})`);
    } else if (name.length > MAX_LENGTH) {
      problems.push(`${key}: "${name}" exceeds ${MAX_LENGTH} chars`);
    } else if (RESERVED.has(name)) {
      problems.push(`${key}: "${name}" is reserved`);
    } else if (named.has(name)) {
      problems.push(`${key}: "${name}" duplicates a sibling under ${path}`);
    }
    named.set(name, node);
  }
  return [...named];
}

const q = JSON.stringify;
const indent = (depth) => "  ".repeat(depth);

function entityTree(set) {
  const exportName = EXPORT_NAMES[set.code];
  const lines = [];
  const node = (depth, name, code, label, children) => {
    const head = `${indent(depth)}${name}: codeNode("entity", S, ${q(code)}, ${q(label)}`;
    if (children.length === 0) {
      lines.push(`${head}),`);
      return;
    }
    lines.push(`${head}, {`);
    for (const child of children) node(depth + 1, ...child);
    lines.push(`${indent(depth)}}),`);
  };
  const entities = nameSiblings(
    `${exportName}.Entity`,
    set.entities,
    (e) => `${set.code}/entity/${e.code}0000`,
  );
  for (const [entityName, entity] of entities) {
    const types = nameSiblings(
      `${exportName}.Entity.${entityName}`,
      entity.types,
      (t) => `${set.code}/entity/${entity.code}${t.code}00`,
    );
    node(
      2,
      entityName,
      `${entity.code}0000`,
      entity.label,
      types.map(([typeName, type]) => [
        typeName,
        `${entity.code}${type.code}00`,
        type.label,
        nameSiblings(
          `${exportName}.Entity.${entityName}.${typeName}`,
          type.subtypes,
          (s) => `${set.code}/entity/${entity.code}${type.code}${s.code}`,
        ).map(([subtypeName, subtype]) => [
          subtypeName,
          `${entity.code}${type.code}${subtype.code}`,
          subtype.label,
          [],
        ]),
      ]),
    );
  }
  return lines;
}

function flatGroup(set, groupName, kind, items) {
  const exportName = EXPORT_NAMES[set.code];
  return nameSiblings(
    `${exportName}.${groupName}`,
    items,
    (m) => `${set.code}/${kind}/${m.code}`,
  ).map(
    ([name, item]) =>
      `${indent(2)}${name}: codeNode(${q(kind)}, S, ${q(item.code)}, ${q(item.label)}),`,
  );
}

const blocks = [];
for (const set of snapshot.symbolSets) {
  const exportName = EXPORT_NAMES[set.code];
  if (exportName === undefined) {
    throw new Error(`No export name for symbol set ${set.code}`);
  }
  const body = [
    `/** ${set.label} (symbol set ${set.code}). */`,
    `export const ${exportName} = /* @__PURE__ */ ((S) =>`,
    `  symbolSetNode(${q(set.code)}, ${q(set.label)}, {`,
    `    Entity: group({`,
    ...entityTree(set).map((line) => `  ${line}`),
    `    }),`,
    `    SpecialSubtype: group({`,
    ...flatGroup(
      set,
      "SpecialSubtype",
      "specialSubtype",
      set.specialSubtypes,
    ).map((l) => `  ${l}`),
    `    }),`,
    `    Modifier1: group({`,
    ...flatGroup(set, "Modifier1", "modifier1", set.modifier1).map(
      (l) => `  ${l}`,
    ),
    `    }),`,
    `    Modifier2: group({`,
    ...flatGroup(set, "Modifier2", "modifier2", set.modifier2).map(
      (l) => `  ${l}`,
    ),
    `    }),`,
    `  }))(${q(set.code)});`,
  ];
  blocks.push(body.join("\n"));
}

for (const key of Object.keys(overrides)) {
  if (!usedOverrides.has(key)) problems.push(`${key}: unused override`);
}
if (problems.length > 0) {
  throw new Error(`Name generation failed:\n  ${problems.join("\n  ")}`);
}

const { source } = snapshot;
const output = `/**
 * GENERATED FILE - do not edit by hand.
 *
 * MIL-STD-2525D entity and modifier names derived from the Joint Military
 * Symbology Markup Language (JMSML), ${source.repository}
 * at commit ${source.commit}.
 * JMSML is licensed under the Apache License, Version 2.0; see
 * data/JMSML-LICENSE.txt. Names were converted to identifiers; labels and
 * codes are unchanged.
 *
 * Regenerate with \`npm run generate:names\`.
 */
import { codeNode, group, symbolSetNode } from "./named-code.js";

/** Source the names were generated from. */
export const NAMES_SOURCE = ${q({ name: "JMSML", repository: source.repository, commit: source.commit, license: source.license, standard: source.standard })} as const;

${blocks.join("\n\n")}

/** Every symbol set with names, in code order. */
export const SYMBOL_SETS = /* @__PURE__ */ Object.freeze([
${snapshot.symbolSets.map((set) => `  ${EXPORT_NAMES[set.code]},`).join("\n")}
] as const);
`;

writeFileSync(
  new URL("../src/names-2525d.generated.ts", import.meta.url),
  output,
  "utf8",
);
console.log(
  `names: ${snapshot.symbolSets.length} symbol sets (JMSML ${source.commit.slice(0, 7)})`,
);
