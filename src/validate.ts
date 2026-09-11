import {
  Context,
  Standard,
  StandardIdentity,
  Status,
  SymbolSet,
  Version,
} from "./enums.js";

/** Fields encoded by the builder, keyed by SIDC position. */
export interface SidcFields {
  version: string;
  context: string;
  identity: string;
  symbolSet: string;
  status: string;
  /** Optional standard-family configuration used for defaults and validation. */
  standard?: Standard;
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

const STANDARD_DEFAULT_VERSIONS: Readonly<Record<Standard, Version>> = {
  [Standard.MilStd2525]: Version.MilStd2525E,
  [Standard.App6]: Version.App6E,
};

const VERSION_STANDARDS: Readonly<Partial<Record<string, Standard>>> = {
  [Version.MilStd2525D]: Standard.MilStd2525,
  [Version.App6D]: Standard.App6,
  [Version.MilStd2525E]: Standard.MilStd2525,
  [Version.App6E]: Standard.App6,
};

const STANDARD_NAMES: Readonly<Record<Standard, string>> = {
  [Standard.MilStd2525]: "MIL-STD-2525",
  [Standard.App6]: "APP-6",
};

const EDITION_NAMES: Readonly<Partial<Record<string, string>>> = {
  [Version.MilStd2525D]: "MIL-STD-2525D",
  [Version.App6D]: "APP-6 D",
  [Version.MilStd2525E]: "MIL-STD-2525E",
  [Version.App6E]: "APP-6 E",
};

// Symbol sets omitted from milsymbol's handler bundle for each legacy edition.
const UNSUPPORTED_SYMBOL_SETS: Readonly<
  Partial<Record<string, readonly string[]>>
> = {
  [Version.MilStd2525D]: [SymbolSet.LandDismountedIndividual],
  [Version.App6D]: [SymbolSet.Cyberspace],
};

const SYMBOL_SET_NAMES: Readonly<Partial<Record<string, string>>> = {
  [SymbolSet.LandDismountedIndividual]: "dismounted individual",
  [SymbolSet.Cyberspace]: "cyberspace",
};

/** Returns the latest supported version for a configured standard family. */
export function defaultVersionForStandard(standard: Standard): Version {
  return STANDARD_DEFAULT_VERSIONS[standard];
}

/** Returns the standard family for a known official version code. */
export function standardForVersion(version: string): Standard | undefined {
  return VERSION_STANDARDS[version];
}

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
  const { version, context, identity, symbolSet, status, standard } = fields;

  const versionStandard = standardForVersion(version);
  if (
    standard !== undefined &&
    versionStandard !== undefined &&
    versionStandard !== standard
  ) {
    problems.push(
      `Version "${version}" (${EDITION_NAMES[version]}) belongs to ${STANDARD_NAMES[versionStandard]}, not the configured ${STANDARD_NAMES[standard]} standard.`
    );
  }

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
  if (UNSUPPORTED_SYMBOL_SETS[version]?.includes(symbolSet)) {
    problems.push(
      `Symbol set ${symbolSet} (${SYMBOL_SET_NAMES[symbolSet]}) is not supported by ${EDITION_NAMES[version]}.`
    );
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
