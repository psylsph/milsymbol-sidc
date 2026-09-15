/**
 * Optional membership catalogs derived from milsymbol's numeric symbol data.
 *
 * Import from the `milsymbol-sidc/catalogs` subpath. This module is deliberately
 * **not** part of the main entry point, so bundlers that only use the builder
 * never include the catalog data.
 *
 * These catalogs answer "which codes does milsymbol register for this symbol
 * set?". They intentionally carry no semantic names, and they are never
 * consulted by `Sidc.toString()` - raw entity and modifier values continue to
 * encode without recognition warnings.
 *
 * ```ts
 * import { isKnownEntityCode } from "milsymbol-sidc/catalogs";
 *
 * isKnownEntityCode("10", "121100"); // true for land units
 * isKnownEntityCode("10", "999999"); // false
 * ```
 */
import {
  CATALOG_SOURCE,
  ENTITY_CODES,
  EXTENDED_MODIFIER_1_CODES,
  EXTENDED_MODIFIER_2_CODES,
  MODIFIER_1_CODES,
  MODIFIER_2_CODES,
} from "./catalogs.generated.js";

export { CATALOG_SOURCE };
export type CatalogSource = typeof CATALOG_SOURCE;

const EMPTY: readonly string[] = Object.freeze([]);

const SYMBOL_SETS: ReadonlySet<string> = new Set([
  ...Object.keys(ENTITY_CODES),
  ...Object.keys(MODIFIER_1_CODES),
  ...Object.keys(MODIFIER_2_CODES),
  ...Object.keys(EXTENDED_MODIFIER_1_CODES),
  ...Object.keys(EXTENDED_MODIFIER_2_CODES),
]);

function codesFor(
  table: Readonly<Record<string, readonly string[]>>,
  symbolSet: string,
): readonly string[] {
  return table[symbolSet] ?? EMPTY;
}

/** Every symbol set the catalog covers, sorted ascending. */
export function catalogSymbolSets(): readonly string[] {
  return Object.freeze([...SYMBOL_SETS].sort());
}

/** `true` when any catalog data exists for the symbol set. */
export function hasCatalog(symbolSet: string): boolean {
  return SYMBOL_SETS.has(symbolSet);
}

/** Six-digit entity codes milsymbol registers for a symbol set. */
export function entityCodes(symbolSet: string): readonly string[] {
  return codesFor(ENTITY_CODES, symbolSet);
}

/** `true` when the entity code is registered for the symbol set. */
export function isKnownEntityCode(symbolSet: string, entity: string): boolean {
  return entityCodes(symbolSet).includes(entity);
}

/** Two-digit modifier 1 codes milsymbol registers for a symbol set. */
export function modifier1Codes(symbolSet: string): readonly string[] {
  return codesFor(MODIFIER_1_CODES, symbolSet);
}

/** `true` when modifier 1 is registered for the symbol set. */
export function isKnownModifier1Code(
  symbolSet: string,
  modifier: string,
): boolean {
  return modifier1Codes(symbolSet).includes(modifier);
}

/** Two-digit modifier 2 codes milsymbol registers for a symbol set. */
export function modifier2Codes(symbolSet: string): readonly string[] {
  return codesFor(MODIFIER_2_CODES, symbolSet);
}

/** `true` when modifier 2 is registered for the symbol set. */
export function isKnownModifier2Code(
  symbolSet: string,
  modifier: string,
): boolean {
  return modifier2Codes(symbolSet).includes(modifier);
}

/** Registered three-digit modifier 1 codes, not zero-prefixed two-digit aliases. */
export function extendedModifier1Codes(symbolSet: string): readonly string[] {
  return codesFor(EXTENDED_MODIFIER_1_CODES, symbolSet);
}

/** Membership only: neither edition validation nor a rendering guarantee. */
export function isKnownExtendedModifier1Code(
  symbolSet: string,
  modifier: string,
): boolean {
  return extendedModifier1Codes(symbolSet).includes(modifier);
}

/** Registered three-digit modifier 2 codes, not zero-prefixed two-digit aliases. */
export function extendedModifier2Codes(symbolSet: string): readonly string[] {
  return codesFor(EXTENDED_MODIFIER_2_CODES, symbolSet);
}

/** Membership only: neither edition validation nor a rendering guarantee. */
export function isKnownExtendedModifier2Code(
  symbolSet: string,
  modifier: string,
): boolean {
  return extendedModifier2Codes(symbolSet).includes(modifier);
}
