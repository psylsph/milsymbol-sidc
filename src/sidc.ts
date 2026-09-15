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
import {
  checkAmplifier,
  checkContext,
  checkFields,
  checkFrameShape,
  checkHqTaskForceDummy,
  checkIdentity,
  checkSixDigitField,
  checkStandard,
  checkStatus,
  checkTwoDigitField,
  checkThreeDigitField,
  collectProblems,
  defaultVersionForStandard,
  SidcCombinationError,
  SidcValidationError,
  standardForVersion,
  type NormalizedSidcFields,
  type SidcExtension,
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
  /** Present for the 23-character form, including explicit zero tails. */
  extension?: SidcExtension;
  /** Present when a standard family is configured on the builder. */
  standard?: Standard;
}

/** 20 ASCII digits, optionally followed by two digits and a frame selector. */
const SIDC_PATTERN = /^\d{20}(?:\d{2}[0-9A])?$/;

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
 * Fluent builder for 20-character numeric SIDCs with opt-in positions 21–23
 * (MIL-STD-2525 / APP-6 coding structure as consumed by milsymbol).
 *
 * Extended output is 23 characters; only its frame selector may be `A`.
 * Results can be passed straight to milsymbol's `new ms.Symbol(sidc)`.
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
  private readonly fields: NormalizedSidcFields;
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

    this.fields = Object.freeze(
      checkFields({
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
      }),
    );

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

  /** Positions 17–18: two-digit modifier 1; clears its high digit if extended. */
  modifier1(value: string): Sidc {
    checkTwoDigitField("Modifier 1", value);
    return this.with({
      modifier1: value,
      extension:
        this.fields.extension === undefined
          ? undefined
          : { ...this.fields.extension, modifier1Extension: "0" },
    });
  }

  /** Positions 19–20: two-digit modifier 2; clears its high digit if extended. */
  modifier2(value: string): Sidc {
    checkTwoDigitField("Modifier 2", value);
    return this.with({
      modifier2: value,
      extension:
        this.fields.extension === undefined
          ? undefined
          : { ...this.fields.extension, modifier2Extension: "0" },
    });
  }

  /** Complete modifier 1 code: hundreds at 21, final two digits at 17–18. */
  extendedModifier1(value: string): Sidc {
    checkThreeDigitField("Extended modifier 1", value);
    return this.with({
      modifier1: value.slice(1),
      extension: { ...this.fields.extension, modifier1Extension: value[0]! },
    });
  }

  /** Complete modifier 2 code: hundreds at 22, final two digits at 19–20. */
  extendedModifier2(value: string): Sidc {
    checkThreeDigitField("Extended modifier 2", value);
    return this.with({
      modifier2: value.slice(1),
      extension: { ...this.fields.extension, modifier2Extension: value[0]! },
    });
  }

  /** Position 23: frame shape. Explicit use enables a complete 23-character code. */
  frameShape(value: FrameShape): Sidc {
    checkFrameShape(value);
    return this.with({
      extension: { ...this.fields.extension, frameShape: value },
    });
  }

  /** Drops the tail, preserving low modifier digits (potentially changing meaning). */
  withoutExtension(): Sidc {
    return this.with({ extension: undefined });
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
   * Validates combinations and renders a 20- or 23-character SIDC string.
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

    const extension = this.fields.extension;
    return extension === undefined
      ? head
      : head +
          extension.modifier1Extension +
          extension.modifier2Extension +
          extension.frameShape;
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
   * same SIDC, including length (a zero tail differs from no tail).
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
      this.fields.modifier2 === other.fields.modifier2 &&
      (this.fields.extension === undefined) ===
        (other.fields.extension === undefined) &&
      this.fields.extension?.modifier1Extension ===
        other.fields.extension?.modifier1Extension &&
      this.fields.extension?.modifier2Extension ===
        other.fields.extension?.modifier2Extension &&
      this.fields.extension?.frameShape === other.fields.extension?.frameShape
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
    if (this.fields.extension !== undefined) {
      snapshot.extension = { ...this.fields.extension };
    }
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
   * Patches raw encoded fields, preserving high modifier digits when only the
   * low digits change (unlike the ordinary fluent modifier setters). A supplied
   * extension replaces the whole tail, defaulting omitted members to zero.
   * Every supplied value is validated; undefined extension removes the tail.
   */
  with(fields: Partial<SidcFields>): Sidc {
    return new Sidc(
      { strict: this.strict, onWarning: this.onWarning },
      { ...this.fields, ...fields },
    );
  }

  /**
   * Parses a 20- or 23-character SIDC, preserving explicit zero tails.
   *
   * @throws {SidcValidationError} when shape or field values are invalid.
   * Only position 23 may contain `A`; all other characters must be ASCII digits.
   */
  static parse(sidc: string, options: SidcOptions = {}): Sidc {
    const parsed = Sidc.tryParse(sidc, options);
    if (parsed === undefined) {
      throw new SidcValidationError(
        `Invalid 20- or 23-character SIDC ${JSON.stringify(sidc)}.`,
      );
    }
    return parsed;
  }

  /**
   * Parses a supported 20- or 23-character SIDC, returning `undefined` for
   * malformed input instead of throwing. Combination problems remain inspectable.
   */
  static tryParse(sidc: string, options: SidcOptions = {}): Sidc | undefined {
    if (
      typeof sidc !== "string" ||
      (sidc.length !== 20 && sidc.length !== 23) ||
      !SIDC_PATTERN.test(sidc)
    ) {
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
        extension:
          sidc.length === 23
            ? {
                modifier1Extension: sidc.slice(20, 21),
                modifier2Extension: sidc.slice(21, 22),
                frameShape: sidc.slice(22, 23) as FrameShape,
              }
            : undefined,
      });
    } catch {
      return undefined;
    }
  }
}
