/**
 * Imports MIL-STD-2525D names from Esri's Joint Military Symbology Markup
 * Language (JMSML, Apache-2.0) at a pinned commit and writes the normalized
 * snapshot `data/jmsml-2525d.json` plus the upstream license.
 *
 * Needs network access; run rarely (only to change the pinned commit):
 *   npm run import:jmsml
 * `npm run generate:names` then builds the TypeScript offline from the
 * committed snapshot.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const JMSML_REPOSITORY = "Esri/joint-military-symbology-xml";
export const JMSML_COMMIT = "094e7647f0bdd001e42fd2a73ba802c995af20aa";

/**
 * Symbol-set files to import. METOC (45/46/47) is left out: milsymbol cannot
 * render it and the core SymbolSet enum does not list it.
 */
const FILES = [
  "Unknown.xml",
  "Air.xml",
  "Air_Missile.xml",
  "Space.xml",
  "Space_Missile.xml",
  "Land_Unit.xml",
  "Land_Civilian.xml",
  "Land_Equipment.xml",
  "Land_Installation.xml",
  "Control_Measure.xml",
  "Sea_Surface.xml",
  "Sea_Subsurface.xml",
  "Mine_Warfare.xml",
  "Activity.xml",
  "SIGINT_Space.xml",
  "SIGINT_Air.xml",
  "SIGINT_Land.xml",
  "SIGINT_Surface.xml",
  "SIGINT_Subsurface.xml",
  "Cyberspace.xml",
];

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name) => {
    if (name[0] === "#") {
      return String.fromCodePoint(
        name[1].toLowerCase() === "x"
          ? parseInt(name.slice(2), 16)
          : parseInt(name.slice(1), 10),
      );
    }
    if (!(name in ENTITIES)) throw new Error(`Unknown entity ${match}`);
    return ENTITIES[name];
  });

/**
 * Minimal parser for JMSML's machine-generated XML: elements, double- or
 * single-quoted attributes, text, comments, and the XML declaration. Anything
 * else (CDATA, DOCTYPE, mismatched tags) throws rather than mis-parsing.
 */
export function parseXml(xml) {
  const root = { name: "#document", attributes: {}, children: [], text: "" };
  const stack = [root];
  const tag =
    /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  const attribute = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    const text = xml.slice(i, lt === -1 ? xml.length : lt);
    if (text.trim() !== "") stack.at(-1).text += decode(text.trim());
    if (lt === -1) break;
    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt);
      if (end === -1) throw new Error(`Unterminated declaration at ${lt}`);
      i = end + 2;
    } else if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt);
      if (end === -1) throw new Error(`Unterminated comment at ${lt}`);
      i = end + 3;
    } else if (xml.startsWith("<!", lt)) {
      throw new Error(`Unsupported markup at ${lt}`);
    } else {
      tag.lastIndex = lt;
      const match = tag.exec(xml);
      if (match === null) throw new Error(`Malformed tag at ${lt}`);
      const [, closing, name, attrs, selfClosing] = match;
      if (closing) {
        const open = stack.pop();
        if (open.name !== name) {
          throw new Error(`</${name}> closes <${open.name}> at ${lt}`);
        }
      } else {
        const element = { name, attributes: {}, children: [], text: "" };
        for (const [, key, double, single] of attrs.matchAll(attribute)) {
          element.attributes[key.replace(/^.*:/, "")] = decode(
            double ?? single,
          );
        }
        stack.at(-1).children.push(element);
        if (!selfClosing) stack.push(element);
      }
      i = tag.lastIndex;
    }
  }
  if (stack.length !== 1) throw new Error(`Unclosed <${stack.at(-1).name}>`);
  return root;
}

const child = (element, name) =>
  element.children.find((node) => node.name === name);
const children = (element, name) => child(element, name)?.children ?? [];
const digits = (element, name) => {
  const code = child(element, name);
  if (code === undefined) throw new Error(`Missing ${name}`);
  const value = child(code, "DigitOne").text + child(code, "DigitTwo").text;
  if (!/^\d{2}$/.test(value)) throw new Error(`Bad ${name} ${value}`);
  return value;
};
const named = (element, code, extra = {}) => {
  const { Label: label, LabelAlias: alias } = element.attributes;
  if (!label) throw new Error(`Missing label for ${code}`);
  return { code, label, ...(alias ? { alias } : {}), ...extra };
};

/**
 * Upstream ID typos in `<LegacySymbol>` references, mapped to the ID the
 * referenced element actually has.
 */
const LEGACY_ID_FIXES = {
  FEDERAL_BUREAU_NVESTIGATION_FBI: "FEDERAL_BUREAU_INVESTIGATION_FBI",
};

/**
 * MIL-STD-2525C (and 2525B change 2) symbols mapped to this symbol set. Each
 * `<LegacySymbol>` Label is the full 15-character letter SIDC pattern (`*`
 * marks a free position); its ID references are resolved to the six-digit
 * entity and two-digit modifier codes. Symbols with no 2525D equivalent (no
 * entity reference, usually retired) are left out.
 */
function legacySymbols(set, file) {
  const fix = (id) => LEGACY_ID_FIXES[id] ?? id;
  const entities = new Map();
  for (const entity of children(set, "Entities")) {
    const types = new Map();
    for (const type of children(entity, "EntityTypes")) {
      const subtypes = new Map(
        children(type, "EntitySubTypes").map((subtype) => [
          subtype.attributes.ID,
          digits(subtype, "EntitySubTypeCode"),
        ]),
      );
      types.set(type.attributes.ID, {
        code: digits(type, "EntityTypeCode"),
        subtypes,
      });
    }
    entities.set(entity.attributes.ID, {
      code: digits(entity, "EntityCode"),
      types,
    });
  }
  const specialSubtypes = new Map(
    children(set, "SpecialEntitySubTypes").map((subtype) => [
      subtype.attributes.ID,
      digits(subtype, "EntitySubTypeCode"),
    ]),
  );
  const modifiers = (sector) =>
    new Map(
      children(set, sector).map((modifier) => [
        modifier.attributes.ID,
        digits(modifier, "ModifierCode"),
      ]),
    );
  const modifier1 = modifiers("SectorOneModifiers");
  const modifier2 = modifiers("SectorTwoModifiers");
  const resolve = (map, id, what, symbol) => {
    const code = map?.get(fix(id));
    if (code === undefined) {
      throw new Error(`${file}: ${symbol} references unknown ${what} ${id}`);
    }
    return code;
  };

  const legacy = [];
  for (const symbol of children(set, "LegacySymbols")) {
    const {
      ID: id,
      Label: pattern,
      EntityID: entityId,
      EntityTypeID: typeId,
      EntitySubTypeID: subtypeId,
      ModifierOneID: modifierOneId,
      ModifierTwoID: modifierTwoId,
      IsDuplicate: isDuplicate,
    } = symbol.attributes;
    if (!/^[A-Z*][A-Z*-][A-Z][A-Z*-][A-Z0-9-]{6}[A-Z*-]{5}$/.test(pattern)) {
      throw new Error(`${file}: ${id} has bad legacy pattern ${pattern}`);
    }
    if (entityId === undefined) continue;
    const entity = entities.get(fix(entityId));
    if (entity === undefined) {
      throw new Error(`${file}: ${id} references unknown entity ${entityId}`);
    }
    const type =
      typeId === undefined ? undefined : entity.types.get(fix(typeId));
    if (typeId !== undefined && type === undefined) {
      throw new Error(`${file}: ${id} references unknown type ${typeId}`);
    }
    const subtype =
      subtypeId === undefined
        ? "00"
        : (type?.subtypes.get(fix(subtypeId)) ??
          resolve(specialSubtypes, subtypeId, "subtype", id));
    // A symbol is 2525B change 2 only when none of its codes is for 2525C.
    const codes = symbol.children.filter(
      (node) => node.name === "LegacyFunctionCode",
    );
    const bc2Only = codes.every(
      (code) =>
        code.attributes.Name?.toUpperCase() !== "2525C" ||
        code.attributes.LimitUseTo?.toUpperCase() === "2525BC2",
    );
    legacy.push({
      pattern,
      entity: `${entity.code}${type?.code ?? "00"}${subtype}`,
      modifier1:
        modifierOneId === undefined
          ? "00"
          : resolve(modifier1, modifierOneId, "modifier 1", id),
      modifier2:
        modifierTwoId === undefined
          ? "00"
          : resolve(modifier2, modifierTwoId, "modifier 2", id),
      ...(isDuplicate === "true" ? { duplicate: true } : {}),
      ...(bc2Only ? { bc2Only: true } : {}),
    });
  }
  return legacy;
}

/** Normalizes one symbol-set document. */
export function normalizeSymbolSet(document, file) {
  const set = child(document, "SymbolSet");
  if (set === undefined) throw new Error(`${file}: no <SymbolSet>`);
  return named(set, digits(set, "SymbolSetCode"), {
    file,
    entities: children(set, "Entities").map((entity) =>
      named(entity, digits(entity, "EntityCode"), {
        types: children(entity, "EntityTypes").map((type) =>
          named(type, digits(type, "EntityTypeCode"), {
            subtypes: children(type, "EntitySubTypes").map((subtype) =>
              named(subtype, digits(subtype, "EntitySubTypeCode")),
            ),
          }),
        ),
      }),
    ),
    specialSubtypes: children(set, "SpecialEntitySubTypes").map((subtype) =>
      named(subtype, digits(subtype, "EntitySubTypeCode")),
    ),
    modifier1: children(set, "SectorOneModifiers").map((modifier) =>
      named(modifier, digits(modifier, "ModifierCode")),
    ),
    modifier2: children(set, "SectorTwoModifiers").map((modifier) =>
      named(modifier, digits(modifier, "ModifierCode")),
    ),
    legacy2525c: legacySymbols(set, file),
  });
}

async function download(path) {
  const url = `https://raw.githubusercontent.com/${JMSML_REPOSITORY}/${JMSML_COMMIT}/${path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const symbolSets = [];
  for (const file of FILES) {
    symbolSets.push(
      normalizeSymbolSet(parseXml(await download(`instance/${file}`)), file),
    );
  }
  symbolSets.sort((a, b) => a.code.localeCompare(b.code));
  const snapshot = {
    source: {
      repository: `https://github.com/${JMSML_REPOSITORY}`,
      commit: JMSML_COMMIT,
      license: "Apache-2.0",
      standard: "MIL-STD-2525D",
    },
    symbolSets,
  };
  const dataDir = new URL("../data/", import.meta.url);
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    new URL("jmsml-2525d.json", dataDir),
    `${JSON.stringify(snapshot, null, 1)}\n`,
  );
  writeFileSync(
    new URL("JMSML-LICENSE.txt", dataDir),
    await download("license.txt"),
  );
  console.log(
    `jmsml: ${symbolSets.length} symbol sets from ${JMSML_REPOSITORY}@${JMSML_COMMIT.slice(0, 7)}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
