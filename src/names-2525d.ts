/**
 * Named MIL-STD-2525D entity and modifier codes, scoped by symbol set.
 *
 * Import from the `milsymbol-sidc/2525d` subpath. Like the catalogs, this
 * module is **not** part of the main entry point, so apps that never import
 * it never bundle the name data. Each symbol set is a separate export, so
 * bundlers keep only the sets an app uses.
 *
 * ```ts
 * import { Air } from "milsymbol-sidc/2525d";
 *
 * new Sidc()
 *   .version(Version.MilStd2525D)
 *   .symbolSet(Air)
 *   .modifier1(Air.Modifier1.Passenger)
 *   .toString(); // "10010100000000000900"
 * ```
 *
 * Names come from Esri's Joint Military Symbology Markup Language (JMSML,
 * Apache-2.0; see `data/JMSML-LICENSE.txt`). They describe edition D only.
 */
import { isNamedCode, type NamedCode } from "./named-code.js";
import { Sidc } from "./sidc.js";
import { SYMBOL_SETS } from "./names-2525d.generated.js";

export * from "./names-2525d.generated.js";
export type { NamedCode, NamedCodeKind } from "./named-code.js";

/** A named code as returned by {@link describe2525d}. */
export interface NamedCodeInfo {
  readonly code: string;
  readonly label: string;
}

/** Names for the fields of a SIDC, `undefined` where none is defined. */
export interface Description2525D {
  /** Positions 5–6. */
  readonly symbolSet?: NamedCodeInfo;
  /** Positions 11–12 (as the six-digit `xx0000` code). */
  readonly entity?: NamedCodeInfo;
  /** Positions 13–14 (as the six-digit `xxxx00` code). */
  readonly entityType?: NamedCodeInfo;
  /** Positions 15–16: a full six-digit subtype, or a special subtype. */
  readonly entitySubtype?: NamedCodeInfo;
  /** Positions 17–18. */
  readonly modifier1?: NamedCodeInfo;
  /** Positions 19–20. */
  readonly modifier2?: NamedCodeInfo;
}

interface SetIndex {
  readonly info: NamedCodeInfo;
  readonly entities: ReadonlyMap<string, NamedCodeInfo>;
  readonly specialSubtypes: ReadonlyMap<string, NamedCodeInfo>;
  readonly modifier1: ReadonlyMap<string, NamedCodeInfo>;
  readonly modifier2: ReadonlyMap<string, NamedCodeInfo>;
}

const info = (node: NamedCode): NamedCodeInfo =>
  Object.freeze({ code: node.code, label: node.label ?? node.code });

/** Every node below a group, keyed by code. */
function collect(
  group: object,
  into = new Map<string, NamedCodeInfo>(),
): Map<string, NamedCodeInfo> {
  for (const value of Object.values(group)) {
    if (isNamedCode(value)) {
      into.set(value.code, info(value));
      collect(value, into);
    }
  }
  return into;
}

const EDITION_E: readonly string[] = ["13", "14"];

const indexes = new Map<string, SetIndex>();

/** Indexes one symbol set on first use, so unused sets cost nothing. */
function indexFor(code: string): SetIndex | undefined {
  let found = indexes.get(code);
  if (found === undefined) {
    const set = SYMBOL_SETS.find((candidate) => candidate.code === code);
    if (set === undefined) return undefined;
    found = {
      info: info(set),
      entities: collect(set.Entity),
      specialSubtypes: collect(set.SpecialSubtype),
      modifier1: collect(set.Modifier1),
      modifier2: collect(set.Modifier2),
    };
    indexes.set(code, found);
  }
  return found;
}

/**
 * Looks up the MIL-STD-2525D names for a SIDC's symbol set, entity levels,
 * and modifiers. Accepts a builder or a 20/23-character SIDC string (parsed
 * with {@link Sidc.parse}, so a malformed string throws
 * `SidcValidationError`). Returns no names (an empty object) for edition E
 * versions (`"13"`, `"14"`), and no modifier name for a three-digit extended
 * modifier, because this catalog names edition D's two-digit codes only.
 * Other versions are not checked.
 *
 * ```ts
 * describe2525d("10030100001201000901").modifier1?.label; // "Passenger"
 * ```
 */
export function describe2525d(sidc: Sidc | string): Description2525D {
  const builder = typeof sidc === "string" ? Sidc.parse(sidc) : sidc;
  const fields = builder.toObject();
  // Names describe the two-digit codes of edition D. Edition E codes can mean
  // something else, and a three-digit (extended) modifier has no entry here.
  if (EDITION_E.includes(fields.version)) return Object.freeze({});
  const set = indexFor(fields.symbolSet);
  if (set === undefined) return Object.freeze({});
  const extension = fields.extension;

  const entity = fields.entity;
  const parts = builder.entityParts();
  const level1 = `${parts.entity}0000`;
  const level2 = `${parts.entity}${parts.type}00`;
  const hasType = parts.type !== "00";
  const hasSubtype = parts.subtype !== "00";

  return Object.freeze({
    symbolSet: set.info,
    entity: set.entities.get(level1),
    entityType: hasType ? set.entities.get(level2) : undefined,
    entitySubtype: hasSubtype
      ? (set.entities.get(entity) ??
        // Special subtypes (e.g. land unit 95-98) qualify any named entity.
        (set.entities.has(level1)
          ? set.specialSubtypes.get(parts.subtype)
          : undefined))
      : undefined,
    modifier1:
      extension?.modifier1Extension === "0" || extension === undefined
        ? set.modifier1.get(fields.modifier1)
        : undefined,
    modifier2:
      extension?.modifier2Extension === "0" || extension === undefined
        ? set.modifier2.get(fields.modifier2)
        : undefined,
  });
}
