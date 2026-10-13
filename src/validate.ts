import {
  Amplifier,
  Context,
  FrameShape,
  HqTaskForceDummy,
  Standard,
  StandardIdentity,
  Status,
  SymbolSet,
  Version,
} from "./enums.js";

/** Complete optional tail at positions 21–23. */
export interface SidcExtension {
  modifier1Extension: string;
  modifier2Extension: string;
  frameShape: FrameShape;
}

/** Fields encoded by the builder, keyed by SIDC position. */
export interface SidcFields {
  version: string;
  context: string;
  identity: string;
  symbolSet: string;
  status: string;
  hqTaskForceDummy: string;
  amplifier: string;
  entity: string;
  modifier1: string;
  modifier2: string;
  /** Presence enables 23-character output; omitted members default to zero. */
  extension?: Partial<SidcExtension>;
  /** Optional standard-family configuration used for defaults and validation. */
  standard?: Standard;
}

export class SidcError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SidcError";
  }
}

/** Thrown when a field value is not a valid code. */
export class SidcValidationError extends SidcError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SidcValidationError";
  }
}

/** Thrown in strict mode when field values conflict with each other. */
export class SidcCombinationError extends SidcError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SidcCombinationError";
  }
}

const SIX_DIGITS = /^\d{6}$/;
const TWO_DIGITS = /^\d{2}$/;
const THREE_DIGITS = /^\d{3}$/;
const ONE_DIGIT = /^\d$/;

// Codes milsymbol's number-based parser recognizes, including ones without
// dedicated named constants (e.g. "12"/"39" appear in its dimension mapping).
const KNOWN_VERSIONS: readonly string[] = ["10", "11", "12", "13", "14"];
const KNOWN_SYMBOL_SETS: readonly string[] = [
  ...Object.values(SymbolSet),
  "12",
  "39",
];

const KNOWN_HQ_TASK_FORCE_DUMMY: readonly string[] =
  Object.values(HqTaskForceDummy);
const KNOWN_AMPLIFIERS: readonly string[] = Object.values(Amplifier);
const KNOWN_STANDARDS: readonly string[] = Object.values(Standard);
const KNOWN_CONTEXTS: readonly string[] = Object.values(Context);
const KNOWN_IDENTITIES: readonly string[] = Object.values(StandardIdentity);
const KNOWN_STATUSES: readonly string[] = Object.values(Status);

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

// `satisfies` makes a field added to `SidcFields` but missing here a compile error.
const FIELD_KEYS = {
  version: true,
  context: true,
  identity: true,
  symbolSet: true,
  status: true,
  hqTaskForceDummy: true,
  amplifier: true,
  entity: true,
  modifier1: true,
  modifier2: true,
  extension: true,
  standard: true,
} as const satisfies Record<keyof SidcFields, true>;
const KNOWN_FIELD_KEYS: ReadonlySet<string> = new Set(Object.keys(FIELD_KEYS));

const KNOWN_EXTENSION_KEYS: ReadonlySet<string> = new Set([
  "modifier1Extension",
  "modifier2Extension",
  "frameShape",
]);

/** Returns the latest supported version for a configured standard family. */
export function defaultVersionForStandard(standard: Standard): Version {
  return STANDARD_DEFAULT_VERSIONS[standard];
}

/** Returns the standard family for a known official version code. */
export function standardForVersion(version: string): Standard | undefined {
  return VERSION_STANDARDS[version];
}

/** Renders any runtime value for an error message without ever throwing. */
function describeValue(value: unknown): string {
  try {
    return `"${String(value)}"`;
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function assertDigits(
  name: string,
  value: string,
  pattern: RegExp,
  length: number,
): void {
  if (
    typeof value !== "string" ||
    value.length !== length ||
    !pattern.test(value)
  ) {
    throw new SidcValidationError(
      `${name} must be ${length} digit(s), got ${describeValue(value)}.`,
    );
  }
}

/** @internal Validates and stores a two-digit field (version or symbol set). */
export function checkTwoDigitField(name: string, value: string): void {
  assertDigits(name, value, TWO_DIGITS, 2);
}

/** @internal Validates a complete three-digit modifier code. */
export function checkThreeDigitField(name: string, value: string): void {
  assertDigits(name, value, THREE_DIGITS, 3);
}

/** @internal Validates a frame-shape selector, including no-frame `A`. */
export function checkFrameShape(value: string): void {
  if (!Object.values(FrameShape).includes(value as FrameShape)) {
    throw new SidcValidationError(
      `Unknown frame shape ${describeValue(value)}.`,
    );
  }
}

/**
 * `true` when the nearest object owning `key` on the record's prototype chain
 * is `Object.prototype`, i.e. the key exists only because of an enumerable
 * addition there (a polyfill or pollution). Such keys are neither checked nor
 * read; keys owned by the record or its own custom prototype are.
 */
function isGlobalPrototypeKey(record: object, key: string): boolean {
  let owner: object | null = record;
  while (owner !== null && !Object.prototype.hasOwnProperty.call(owner, key)) {
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  return owner === Object.prototype;
}

/**
 * @internal Every key/value a field record provides: own and custom-prototype
 * enumerable keys, excluding `Object.prototype` additions. Values may be
 * `undefined`.
 */
export function recordEntries(record: object): [string, unknown][] {
  const entries: [string, unknown][] = [];
  for (const key in record) {
    if (!isGlobalPrototypeKey(record, key)) {
      entries.push([key, (record as Record<string, unknown>)[key]]);
    }
  }
  return entries;
}

/** @internal Copies, defaults, validates, and freezes an optional tail. */
export function normalizeExtension(
  value: Partial<SidcExtension> | undefined,
): Readonly<SidcExtension> | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SidcValidationError("Extension must be a field record.");
  }
  // Null prototype: absent members read as undefined, never as pollution.
  const provided = Object.create(null) as Partial<SidcExtension>;
  for (const [key, member] of recordEntries(value)) {
    if (!KNOWN_EXTENSION_KEYS.has(key)) {
      throw new SidcValidationError(`Unknown extension field "${key}".`);
    }
    (provided as Record<string, unknown>)[key] = member;
  }
  const extension = {
    modifier1Extension:
      provided.modifier1Extension === undefined
        ? "0"
        : provided.modifier1Extension,
    modifier2Extension:
      provided.modifier2Extension === undefined
        ? "0"
        : provided.modifier2Extension,
    frameShape:
      provided.frameShape === undefined
        ? FrameShape.Default
        : provided.frameShape,
  };
  checkOneDigitField("Modifier 1 extension", extension.modifier1Extension);
  checkOneDigitField("Modifier 2 extension", extension.modifier2Extension);
  checkFrameShape(extension.frameShape);
  return Object.freeze(extension);
}

/** @internal Validates a single-digit field (context, identity, status). */
export function checkOneDigitField(name: string, value: string): void {
  assertDigits(name, value, ONE_DIGIT, 1);
}

/** @internal Validates a six-digit entity field. */
export function checkSixDigitField(name: string, value: string): void {
  assertDigits(name, value, SIX_DIGITS, 6);
}

/** @internal Validates a named position-8 value. */
export function checkHqTaskForceDummy(value: string): void {
  checkOneDigitField("HQ/task force/feint-dummy", value);
  if (!KNOWN_HQ_TASK_FORCE_DUMMY.includes(value)) {
    throw new SidcValidationError(
      `Unknown HQ/task force/feint-dummy code "${value}".`,
    );
  }
}

/** @internal Validates a named amplifier value. */
export function checkAmplifier(value: string): void {
  checkTwoDigitField("Amplifier", value);
  if (!KNOWN_AMPLIFIERS.includes(value)) {
    throw new SidcValidationError(`Unknown amplifier code "${value}".`);
  }
}

/** @internal Validates a standard-family value. */
export function checkStandard(standard: string): void {
  if (!KNOWN_STANDARDS.includes(standard)) {
    throw new SidcValidationError(
      `Unknown standard ${describeValue(standard)}.`,
    );
  }
}

/** @internal Validates a context value. */
export function checkContext(value: string): void {
  checkOneDigitField("Context", value);
  if (!KNOWN_CONTEXTS.includes(value)) {
    throw new SidcValidationError(`Unknown context code "${value}".`);
  }
}

/** @internal Validates a standard-identity value. */
export function checkIdentity(value: string): void {
  checkOneDigitField("Standard identity", value);
  if (!KNOWN_IDENTITIES.includes(value)) {
    throw new SidcValidationError(`Unknown standard identity code "${value}".`);
  }
}

/** @internal Validates a status/condition value. */
export function checkStatus(value: string): void {
  checkOneDigitField("Status", value);
  if (!KNOWN_STATUSES.includes(value)) {
    throw new SidcValidationError(`Unknown status code "${value}".`);
  }
}

/**
 * @internal Keys of a field record that are not `SidcFields` members, using
 * the same rule as extension records (see {@link recordEntries}).
 */
export function unknownFieldKeys(fields: object): string[] {
  return recordEntries(fields)
    .map(([key]) => key)
    .filter((key) => !KNOWN_FIELD_KEYS.has(key));
}

/** @internal `true` for a `SidcFields` member name. */
export function isFieldKey(key: string): key is keyof SidcFields {
  return KNOWN_FIELD_KEYS.has(key);
}

/** Fields after constructor normalization: complete, frozen extension tail. */
export type NormalizedSidcFields = Omit<SidcFields, "extension"> & {
  readonly extension?: Readonly<SidcExtension>;
};

/**
 * @internal Validates a complete field record and returns it with the
 * extension tail defaulted, validated, and frozen.
 *
 * The constructor uses this so every construction path enforces the same
 * digit-width and enum-membership invariants as the fluent setters, and
 * normalizes the tail exactly once.
 */
export function checkFields(fields: SidcFields): NormalizedSidcFields {
  if (fields.standard !== undefined) {
    checkStandard(fields.standard);
  }
  checkTwoDigitField("Version", fields.version);
  checkContext(fields.context);
  checkIdentity(fields.identity);
  checkTwoDigitField("Symbol set", fields.symbolSet);
  checkStatus(fields.status);
  checkHqTaskForceDummy(fields.hqTaskForceDummy);
  checkAmplifier(fields.amplifier);
  checkSixDigitField("Entity", fields.entity);
  checkTwoDigitField("Modifier 1", fields.modifier1);
  checkTwoDigitField("Modifier 2", fields.modifier2);
  return { ...fields, extension: normalizeExtension(fields.extension) };
}

/** A non-fatal problem detected while rendering a SIDC. */
export interface SidcProblem {
  /** Stable machine-readable identifier for the problem category. */
  readonly code: string;
  /**
   * Human-readable description. Identical to the text emitted as a
   * `console.warn` by `Sidc.toString()`.
   */
  readonly message: string;
}

function unrecognizedCodeProblem(
  code: string,
  name: string,
  value: string,
  known: readonly string[],
): SidcProblem | undefined {
  if (known.includes(value)) {
    return undefined;
  }
  return { code, message: `Unrecognized ${name} code "${value}".` };
}

/**
 * Cross-field consistency checks mirroring milsymbol's number-based SIDC
 * parsing.
 */
function combinationProblems(fields: SidcFields): SidcProblem[] {
  const problems: SidcProblem[] = [];
  const { version, context, identity, symbolSet, status, standard } = fields;

  const versionStandard = standardForVersion(version);
  if (
    standard !== undefined &&
    versionStandard !== undefined &&
    versionStandard !== standard
  ) {
    problems.push({
      code: "version-standard-mismatch",
      message:
        `Version "${version}" (${EDITION_NAMES[version]}) belongs to ` +
        `${STANDARD_NAMES[versionStandard]}, not the configured ` +
        `${STANDARD_NAMES[standard]} standard.`,
    });
  }

  // Condition statuses do not apply to control measures (tactical graphics).
  if (
    KNOWN_STATUSES.includes(status) &&
    parseInt(status, 10) >= 2 &&
    symbolSet === SymbolSet.ControlMeasure
  ) {
    problems.push({
      code: "condition-status-control-measure",
      message: `Condition status "${status}" does not apply to the control measure symbol set.`,
    });
  }

  // milsymbol drops the affiliation for exercise symbols on unknown sets.
  if (
    symbolSet === SymbolSet.Unknown &&
    context === Context.Exercise &&
    identity !== StandardIdentity.Pending &&
    identity !== StandardIdentity.Unknown
  ) {
    problems.push({
      code: "exercise-unknown-symbol-set",
      message:
        "Exercise symbols on the unknown symbol set render without affiliation " +
        "unless identity is pending/unknown.",
    });
  }

  // Symbol sets missing from specific standards' handler lists.
  if (UNSUPPORTED_SYMBOL_SETS[version]?.includes(symbolSet)) {
    problems.push({
      code: "unsupported-symbol-set",
      message:
        `Symbol set ${symbolSet} (${SYMBOL_SET_NAMES[symbolSet]}) is not ` +
        `supported by ${EDITION_NAMES[version]}.`,
    });
  }

  // milsymbol honors the no-frame selector "A" in every edition; only the
  // extended modifier digits and frame shapes 1-9 are E-edition features.
  const extension = fields.extension;
  const frameShape = extension?.frameShape ?? FrameShape.Default;
  if (
    ["10", "11", "12"].includes(version) &&
    extension !== undefined &&
    ((extension.modifier1Extension ?? "0") !== "0" ||
      (extension.modifier2Extension ?? "0") !== "0" ||
      (frameShape !== FrameShape.Default && frameShape !== FrameShape.NoFrame))
  ) {
    problems.push({
      code: "unsupported-extension-edition",
      message:
        `Extended modifier digits and frame shapes 1-9 are supported only ` +
        `for E editions; ` +
        `version "${version}" is a D edition.`,
    });
  }

  return problems;
}

/**
 * Collects every non-fatal problem for a field record, in render order:
 * unrecognized raw codes first, then cross-field consistency checks.
 *
 * An empty array means the record is valid. Messages are the canonical warning
 * text used by `Sidc.toString()`.
 */
export function collectProblems(fields: SidcFields): SidcProblem[] {
  const problems: SidcProblem[] = [];

  const versionProblem = unrecognizedCodeProblem(
    "unrecognized-version",
    "version",
    fields.version,
    KNOWN_VERSIONS,
  );
  if (versionProblem !== undefined) {
    problems.push(versionProblem);
  }

  const symbolSetProblem = unrecognizedCodeProblem(
    "unrecognized-symbol-set",
    "symbol set",
    fields.symbolSet,
    KNOWN_SYMBOL_SETS,
  );
  if (symbolSetProblem !== undefined) {
    problems.push(symbolSetProblem);
  }

  problems.push(...combinationProblems(fields));
  return problems;
}

export const knownVersions: readonly string[] = Object.freeze(KNOWN_VERSIONS);
export const knownSymbolSets: readonly string[] =
  Object.freeze(KNOWN_SYMBOL_SETS);
