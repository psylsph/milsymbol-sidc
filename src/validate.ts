import { Context, StandardIdentity, Status, SymbolSet, Version } from "./enums.js";

/** Fields encoded by the builder, keyed by SIDC position. */
export interface SidcFields {
  version: string;
  context: string;
  identity: string;
  symbolSet: string;
  status: string;
}

export class SidcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SidcError";
  }
}

/** Thrown when a field value is not a valid code. */
export class SidcValidationError extends SidcError {
  constructor(message: string) {
    super(message);
    this.name = "SidcValidationError";
  }
}

/** Thrown in strict mode when field values conflict with each other. */
export class SidcCombinationError extends SidcError {
  constructor(message: string) {
    super(message);
    this.name = "SidcCombinationError";
  }
}

const TWO_DIGITS = /^\d{2}$/;
const ONE_DIGIT = /^\d$/;

// Codes milsymbol's number-based parser recognizes, including ones without
// dedicated named constants (e.g. "12"/"39" appear in its dimension mapping).
const KNOWN_VERSIONS: readonly string[] = ["10", "11", "12", "13", "14"];
const KNOWN_SYMBOL_SETS: readonly string[] = [
  ...Object.values(SymbolSet),
  "12",
  "39",
];

function assertDigits(name: string, value: string, pattern: RegExp, length: number): void {
  if (!pattern.test(value)) {
    throw new SidcValidationError(
      `${name} must be ${length} digit(s), got "${value}".`
    );
  }
}

/** @internal Validates and stores a two-digit field (version or symbol set). */
export function checkTwoDigitField(name: string, value: string): void {
  assertDigits(name, value, TWO_DIGITS, 2);
}

/** @internal Validates a single-digit field (context, identity, status). */
export function checkOneDigitField(name: string, value: string): void {
  assertDigits(name, value, ONE_DIGIT, 1);
}

/**
 * Cross-field consistency checks mirroring milsymbol's number-based SIDC
 * parsing. Returns human-readable problem descriptions; an empty array means
 * the combination is valid.
 */
export function findCombinationProblems(fields: SidcFields): string[] {
  const problems: string[] = [];
  const { version, context, identity, symbolSet, status } = fields;

  // Condition statuses do not apply to control measures (tactical graphics).
  if (
    (Object.values(Status) as readonly string[]).includes(status) &&
    parseInt(status, 10) >= 2 &&
    symbolSet === SymbolSet.ControlMeasure
  ) {
    problems.push(
      `Condition status "${status}" does not apply to the control measure symbol set.`
    );
  }

  // milsymbol drops the affiliation for exercise symbols on unknown sets.
  if (
    symbolSet === SymbolSet.Unknown &&
    context === Context.Exercise &&
    identity !== StandardIdentity.Pending &&
    identity !== StandardIdentity.Unknown
  ) {
    problems.push(
      "Exercise symbols on the unknown symbol set render without affiliation unless identity is pending/unknown."
    );
  }

  // Symbol sets missing from specific standards' handler lists.
  if (version === Version.MilStd2525D && symbolSet === SymbolSet.LandDismountedIndividual) {
    problems.push("Symbol set 27 (dismounted individual) is not supported by MIL-STD-2525D.");
  }
  if (version === Version.App6D && symbolSet === SymbolSet.Cyberspace) {
    problems.push("Symbol set 60 (cyberspace) is not supported by APP-6 D.");
  }

  return problems;
}

/**
 * Checks that a raw version/symbol-set code is at least recognized by
 * milsymbol's parser; returns a warning message when it is not.
 */
export function unrecognizedCodeWarning(name: string, value: string, known: readonly string[]): string | undefined {
  if (!known.includes(value)) {
    return `Unrecognized ${name} code "${value}".`;
  }
  return undefined;
}

export const knownVersions = KNOWN_VERSIONS;
export const knownSymbolSets = KNOWN_SYMBOL_SETS;
