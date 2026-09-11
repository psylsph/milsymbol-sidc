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
  defaultVersionForStandard,
  findCombinationProblems,
  knownSymbolSets,
  knownVersions,
  SidcCombinationError,
  SidcValidationError,
  standardForVersion,
  unrecognizedCodeWarning,
  type SidcFields,
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
}

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
   * - Unrecognized raw codes and invalid combinations emit console warnings,
   *   or throw when built with `{ strict: true }`.
   */
  toString(): string {
    const warnings: (string | undefined)[] = [
      unrecognizedCodeWarning("version", this.fields.version, knownVersions),
      unrecognizedCodeWarning(
        "symbol set",
        this.fields.symbolSet,
        knownSymbolSets,
      ),
      ...findCombinationProblems(this.fields),
    ];
    const problems = warnings.filter((w): w is string => w !== undefined);

    if (problems.length > 0) {
      if (this.strict) {
        throw new SidcCombinationError(problems.join(" "));
      }
      for (const problem of problems) {
        console.warn(`[milsymbol-sidc] ${problem}`);
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

  private with(fields: Partial<SidcFields>): Sidc {
    return new Sidc({ strict: this.strict }, { ...this.fields, ...fields });
  }
}
