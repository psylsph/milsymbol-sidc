import {
  Amplifier,
  Context,
  HqTaskForceDummy,
  Standard,
  StandardIdentity,
  Status,
  SymbolSet,
  Version,
} from "./enums.js";
import {
  checkAmplifier,
  checkContext,
  checkFields,
  checkHqTaskForceDummy,
  checkIdentity,
  checkSixDigitField,
  checkStandard,
  checkStatus,
  checkTwoDigitField,
  collectProblems,
  defaultVersionForStandard,
  SidcCombinationError,
  SidcValidationError,
  standardForVersion,
  type SidcFields,
  type SidcProblem,
} from "./validate.js";

export interface SidcOptions {
  /**
   * Throw {@link SidcCombinationError} on invalid field combinations during
   * {@link Sidc.toString} instead of emitting console warnings.
   * Invalid individual values always throw immediately.
   */
  strict?: boolean;

  /**
   * Configure a standard family. This selects its latest edition by default
   * (APP-6 E or MIL-STD-2525E) and enables standard/version consistency checks.
   * Omit this option to preserve the original MIL-STD-2525E behavior.
   */
  standard?: Standard;

  /**
   * Receive non-fatal problems instead of the default `console.warn`.
   *
   * When provided, {@link Sidc.toString} calls this once per problem and never
   * writes to the console. `strict: true` still throws instead of reporting.
   */
  onWarning?: (problem: SidcProblem) => void;
}

/**
 * Plain, serializable snapshot of every encoded field.
 *
 * Returned by {@link Sidc.toObject} and {@link Sidc.toJSON}.
 */
export interface SidcSnapshot {
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
  /** Present when a standard family is configured on the builder. */
  standard?: Standard;
}

/** Exact shape of a supported numeric SIDC: 20 ASCII digits. */
const SIDC_PATTERN = /^\d{20}$/;

/** Drops explicitly-undefined entries so omitted and undefined values both default. */
function dropUndefined(
  fields: Partial<SidcFields> | null | undefined,
): Partial<SidcFields> {
  if (fields == null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Partial<SidcFields>;
}

/**
 * Fluent builder for 20-character numeric SIDC strings
 * (MIL-STD-2525E / APP-6 coding structure).
 *
 * Covers all positions 1-20 of the numeric SIDC so the result can be passed
 * straight to milsymbol's `new ms.Symbol(sidc)`.
 *
 * All setters are immutable: they return a new `Sidc` and leave the original
 * untouched.
 *
 * ```ts
 * const sidc = new Sidc()
 *   .context(Context.Reality)
 *   .identity(StandardIdentity.Friend)
 *   .symbolSet(SymbolSet.LandUnit)
 *   .status(Status.Present)
 *   .toString(); // "13031000000000000000"
 * ```
 */
export class Sidc {
  private readonly fields: SidcFields;
  private readonly strict: boolean;
  private readonly onWarning?: (problem: SidcProblem) => void;

  /**
   * @param options Builder behaviour flags.
   * @param fields Initial field values. Internal; used for immutable clones.
   * Legacy records may omit the newly supported tail fields; omitted and
   * explicitly-undefined values are normalized to their zero defaults. Every
   * supplied value is validated, so this path cannot produce a malformed SIDC.
   */
  constructor(options: SidcOptions = {}, fields?: Partial<SidcFields> | null) {
    if (options.standard !== undefined) {
      checkStandard(options.standard);
    }

    const provided = dropUndefined(fields);
    const standard = provided.standard ?? options.standard;

    this.fields = Object.freeze({
      version:
        standard === undefined
          ? Version.MilStd2525E
          : defaultVersionForStandard(standard),
      context: Context.Reality,
      identity: StandardIdentity.Unknown,
      symbolSet: SymbolSet.Unknown,
      status: Status.Present,
      hqTaskForceDummy: HqTaskForceDummy.None,
      amplifier: Amplifier.None,
      entity: "000000",
      modifier1: "00",
      modifier2: "00",
      standard,
      ...provided,
    });

    checkFields(this.fields);
    this.strict = options.strict ?? false;
    this.onWarning = options.onWarning;
  }

  /**
   * Configures the standard family and its validation rules.
   *
   * A version already belonging to the selected family is retained. Otherwise
   * it is reset to that family's latest edition (APP-6 E or MIL-STD-2525E).
   */
  standard(standard: Standard): Sidc {
    checkStandard(standard);

    const version =
      standardForVersion(this.fields.version) === standard
        ? this.fields.version
        : defaultVersionForStandard(standard);
    return this.with({ standard, version });
  }

  /**
   * Position 8: headquarters, task force, and feint/dummy indicator.
   */
  hqTaskForceDummy(value: HqTaskForceDummy): Sidc {
    checkHqTaskForceDummy(value);
    return this.with({ hqTaskForceDummy: value });
  }

  /**
   * Positions 9-10: echelon, mobility, leadership, or auxiliary amplifier.
   */
  amplifier(value: Amplifier): Sidc {
    checkAmplifier(value);
    return this.with({ amplifier: value });
  }

  /** Positions 11-16: six-digit entity code. */
  entity(value: string): Sidc {
    checkSixDigitField("Entity", value);
    return this.with({ entity: value });
  }

  /** Positions 17-18: two-digit modifier 1 code. */
  modifier1(value: string): Sidc {
    checkTwoDigitField("Modifier 1", value);
    return this.with({ modifier1: value });
  }

  /** Positions 19-20: two-digit modifier 2 code. */
  modifier2(value: string): Sidc {
    checkTwoDigitField("Modifier 2", value);
    return this.with({ modifier2: value });
  }

  /** Positions 1-2: standard edition. Accepts known codes or a raw two-digit code. */
  version(version: Version | (string & {})): Sidc {
    checkTwoDigitField("Version", version);
    return this.with({ version });
  }

  /** Position 3: context. */
  context(context: Context): Sidc {
    checkContext(context);
    return this.with({ context });
  }

  /** Position 4: standard identity (affiliation). */
  identity(identity: StandardIdentity): Sidc {
    checkIdentity(identity);
    return this.with({ identity });
  }

  /** Positions 5-6: symbol set. Accepts known codes or a raw two-digit code. */
  symbolSet(symbolSet: SymbolSet | (string & {})): Sidc {
    checkTwoDigitField("Symbol set", symbolSet);
    return this.with({ symbolSet });
  }

  /** Position 7: status / condition. */
  status(status: Status): Sidc {
    checkStatus(status);
    return this.with({ status });
  }

  /**
   * Validates combinations and renders the 20-character SIDC string.
   *
   * - Invalid values already throw in the setters.
   * - Unrecognized raw codes and invalid combinations are reported through
   *   `onWarning`, as `console.warn`, or thrown when built with
   *   `{ strict: true }`.
   */
  toString(): string {
    const problems = this.problems();

    if (problems.length > 0) {
      if (this.strict) {
        throw new SidcCombinationError(
          problems.map((problem) => problem.message).join(" "),
        );
      }
      for (const problem of problems) {
        if (this.onWarning !== undefined) {
          this.onWarning(problem);
        } else {
          console.warn(`[milsymbol-sidc] ${problem.message}`);
        }
      }
    }

    const head =
      this.fields.version +
      this.fields.context +
      this.fields.identity +
      this.fields.symbolSet +
      this.fields.status +
      this.fields.hqTaskForceDummy +
      this.fields.amplifier +
      this.fields.entity +
      this.fields.modifier1 +
      this.fields.modifier2;

    if (head.length !== 20) {
      throw new SidcValidationError(
        `Internal error: rendered SIDC has ${head.length} characters instead of 20.`,
      );
    }

    return head;
  }

  /**
   * Every non-fatal problem for the current field values, without rendering or
   * producing any side effects. An empty array means the SIDC is valid.
   */
  problems(): SidcProblem[] {
    return collectProblems(this.fields);
  }

  /** `true` when the current field values produce no problems. */
  isValid(): boolean {
    return this.problems().length === 0;
  }

  /**
   * Copies the current field values into a new builder. The copy shares the
   * `strict` flag and `onWarning` callback but is independent thereafter.
   */
  clone(): Sidc {
    return this.with({});
  }

  /**
   * Compares the encoded field values of two builders, ignoring `strict` and
   * the configured standard family. Two builders are equal when they render the
   * same 20-character SIDC.
   */
  equals(other: Sidc): boolean {
    return (
      this.fields.version === other.fields.version &&
      this.fields.context === other.fields.context &&
      this.fields.identity === other.fields.identity &&
      this.fields.symbolSet === other.fields.symbolSet &&
      this.fields.status === other.fields.status &&
      this.fields.hqTaskForceDummy === other.fields.hqTaskForceDummy &&
      this.fields.amplifier === other.fields.amplifier &&
      this.fields.entity === other.fields.entity &&
      this.fields.modifier1 === other.fields.modifier1 &&
      this.fields.modifier2 === other.fields.modifier2
    );
  }

  /** A fresh, plain-object snapshot of the encoded fields. */
  toObject(): SidcSnapshot {
    const snapshot: SidcSnapshot = {
      version: this.fields.version,
      context: this.fields.context,
      identity: this.fields.identity,
      symbolSet: this.fields.symbolSet,
      status: this.fields.status,
      hqTaskForceDummy: this.fields.hqTaskForceDummy,
      amplifier: this.fields.amplifier,
      entity: this.fields.entity,
      modifier1: this.fields.modifier1,
      modifier2: this.fields.modifier2,
    };
    if (this.fields.standard !== undefined) {
      snapshot.standard = this.fields.standard;
    }
    return snapshot;
  }

  /** Enables `JSON.stringify(builder)`. Alias of {@link Sidc.toObject}. */
  toJSON(): SidcSnapshot {
    return this.toObject();
  }

  /**
   * Applies a partial field record immutably.
   *
   * Every supplied value is validated exactly like the matching setter, so
   * `with()` cannot produce a malformed SIDC.
   */
  with(fields: Partial<SidcFields>): Sidc {
    return new Sidc(
      { strict: this.strict, onWarning: this.onWarning },
      { ...this.fields, ...fields },
    );
  }

  /**
   * Parses a 20-character numeric SIDC into a builder.
   *
   * @throws {SidcValidationError} when the input is not exactly 20 ASCII digits
   * or contains an unknown enum code.
   */
  static parse(sidc: string, options: SidcOptions = {}): Sidc {
    const parsed = Sidc.tryParse(sidc, options);
    if (parsed === undefined) {
      throw new SidcValidationError(
        `Invalid 20-character numeric SIDC ${JSON.stringify(sidc)}.`,
      );
    }
    return parsed;
  }

  /**
   * Parses a 20-character numeric SIDC, returning `undefined` for any input
   * that is not a valid numeric SIDC instead of throwing.
   */
  static tryParse(sidc: string, options: SidcOptions = {}): Sidc | undefined {
    if (typeof sidc !== "string" || !SIDC_PATTERN.test(sidc)) {
      return undefined;
    }
    try {
      return new Sidc(options, {
        version: sidc.slice(0, 2),
        context: sidc.slice(2, 3),
        identity: sidc.slice(3, 4),
        symbolSet: sidc.slice(4, 6),
        status: sidc.slice(6, 7),
        hqTaskForceDummy: sidc.slice(7, 8),
        amplifier: sidc.slice(8, 10),
        entity: sidc.slice(10, 16),
        modifier1: sidc.slice(16, 18),
        modifier2: sidc.slice(18, 20),
      });
    } catch {
      return undefined;
    }
  }
}
