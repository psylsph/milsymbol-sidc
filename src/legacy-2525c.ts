/**
 * MIL-STD-2525C letter SIDCs mapped to their MIL-STD-2525D numeric codes.
 *
 * Import from the `milsymbol-sidc/2525c` subpath. Like the 2525D names, this
 * module is **not** part of the main entry point, so apps that never import
 * it never bundle the mapping table.
 *
 * ```ts
 * import { from2525c } from "milsymbol-sidc/2525c";
 *
 * from2525c("SFAPCF----*****")?.entity; // "120100" (civilian fixed wing)
 * ```
 *
 * Mappings come from the `<LegacySymbol>` tables of Esri's Joint Military
 * Symbology Markup Language (JMSML, Apache-2.0; see `data/JMSML-LICENSE.txt`).
 */
import { LEGACY_2525C_ROWS } from "./legacy-2525c.generated.js";

/** The 2525D codes for a 2525C symbol, as returned by {@link from2525c}. */
export interface Mapping2525C {
  /**
   * The matched 15-character 2525C pattern; `*` marks a position the mapping
   * does not depend on (usually affiliation and status).
   */
  readonly pattern: string;
  /** 2525D symbol set (positions 5–6). */
  readonly symbolSet: string;
  /** 2525D six-digit entity code (positions 11–16). */
  readonly entity: string;
  /** 2525D sector 1 modifier (positions 17–18). */
  readonly modifier1: string;
  /** 2525D sector 2 modifier (positions 19–20). */
  readonly modifier2: string;
}

/** Coding scheme, battle dimension and function ID: what a pattern pins. */
const keyOf = (sidc: string): string => sidc[0] + sidc[2] + sidc.slice(4, 10);

let index: Map<string, Mapping2525C[]> | undefined;

/** Builds the lookup index on first use. */
function lookupIndex(): Map<string, Mapping2525C[]> {
  if (index === undefined) {
    index = new Map();
    for (const [
      pattern,
      symbolSet,
      entity,
      modifier1,
      modifier2,
    ] of LEGACY_2525C_ROWS) {
      const mapping = Object.freeze({
        pattern,
        symbolSet,
        entity,
        modifier1,
        modifier2,
      });
      const key = keyOf(pattern);
      const rows = index.get(key);
      if (rows === undefined) index.set(key, [mapping]);
      else rows.push(mapping);
    }
  }
  return index;
}

/** Positions a pattern may leave free: affiliation, status, and 11–15. */
const IDENTITY_AND_STATUS = [1, 3];
const TAIL = [10, 11, 12, 13, 14];

/** Whether one position matches; `*` on either side matches anything. */
const fits = (input: string, pattern: string, position: number): boolean =>
  input[position] === "*" ||
  pattern[position] === "*" ||
  input[position] === pattern[position];

/**
 * Ranks a candidate: matching affiliation and status first, then matching
 * positions 11–15, then the number of positions it pins that equal the input
 * (so a hostile-only variant beats a wildcard one for hostile input).
 */
function score(input: string, pattern: string): number {
  const all = (positions: number[]) =>
    positions.every((position) => fits(input, pattern, position));
  let pinned = 0;
  for (const position of [...IDENTITY_AND_STATUS, ...TAIL]) {
    if (pattern[position] !== "*" && pattern[position] === input[position]) {
      pinned++;
    }
  }
  return (all(IDENTITY_AND_STATUS) ? 200 : 0) + (all(TAIL) ? 100 : 0) + pinned;
}

const SHAPE = /^[A-Z][A-Z*-][A-Z][A-Z*-][A-Z0-9-]{6}[A-Z0-9*-]{5}$/;

/**
 * Finds the MIL-STD-2525D symbol set, entity and modifiers equivalent to a
 * MIL-STD-2525C (or 2525B) letter SIDC. Pass the full 15 characters or just
 * the first 10 (coding scheme through function ID); case is ignored. Returns
 * `undefined` when the input is not shaped like a letter SIDC or the symbol
 * has no 2525D equivalent (for example a retired 2525C symbol).
 *
 * The coding scheme (position 1), battle dimension (3) and function ID (5–10)
 * select the symbol, so the same function letters can map differently per
 * dimension. Affiliation, status and positions 11–15 are used only to pick
 * between variants that the standard distinguishes (for example installation
 * `H` at position 11, or hostile and planned control-measure lines): the most
 * specific matching variant wins, and when none matches exactly the closest
 * variant for the function ID is returned.
 * Affiliation, status, echelon and other amplifiers are not converted.
 *
 * ```ts
 * from2525c("SFAPC-----*****")?.entity; // "120000" (civilian air)
 * from2525c("SHGPUCI---")?.symbolSet; // "10" (land unit)
 * ```
 */
export function from2525c(sidc: string): Mapping2525C | undefined {
  if (typeof sidc !== "string") return undefined;
  const input = sidc.trim().toUpperCase().padEnd(15, "*");
  if (!SHAPE.test(input)) return undefined;
  const candidates = lookupIndex().get(keyOf(input));
  if (candidates === undefined) return undefined;
  let best = candidates[0];
  let bestScore = -1;
  for (const candidate of candidates) {
    const candidateScore = score(input, candidate.pattern);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }
  return best;
}

/**
 * The MIL-STD-2525C warfighting battle dimensions (position 3) searched for
 * each 2525D symbol set, in order. 2525C special operations forces (`F`)
 * became land units with a modifier, so land units fall back to them.
 */
export const DIMENSIONS_2525C: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    "00": ["Z"],
    "01": ["A"],
    "02": ["A"],
    "05": ["P"],
    "06": ["P"],
    "10": ["G", "F"],
    "11": ["G"],
    "15": ["G"],
    "20": ["G"],
    "30": ["S"],
    "35": ["U"],
    "36": ["U"],
  });

const FUNCTION_ID = /^[A-Z0-9-]{0,6}$/;

/**
 * Finds the MIL-STD-2525D codes for a MIL-STD-2525C warfighting (coding
 * scheme `S`) function ID, such as `"CF"` for a civil fixed-wing aircraft.
 * The 2525D symbol set selects the 2525C battle dimension (see
 * {@link DIMENSIONS_2525C}); the result's own `symbolSet` can differ from it
 * (a land equipment code found under 2525C ground, for example). The function
 * ID is padded with `-` to six characters (so an empty string means
 * `"------"`, the dimension itself) and case is ignored. Returns
 * `undefined` for a malformed function ID, a symbol set with no 2525C
 * warfighting dimension, or a function ID with no 2525D equivalent.
 *
 * ```ts
 * from2525cFunction("CF", "01")?.entity; // "120100"
 * ```
 */
export function from2525cFunction(
  functionId: string,
  symbolSet: string,
): Mapping2525C | undefined {
  if (typeof functionId !== "string") return undefined;
  const code = functionId.trim().toUpperCase();
  if (!FUNCTION_ID.test(code)) return undefined;
  const dimensions = Object.prototype.hasOwnProperty.call(
    DIMENSIONS_2525C,
    symbolSet,
  )
    ? DIMENSIONS_2525C[symbolSet]
    : [];
  for (const dimension of dimensions) {
    const found = from2525c(`S*${dimension}*${code.padEnd(6, "-")}`);
    if (found !== undefined) return found;
  }
  return undefined;
}
