import {
  Context,
  StandardIdentity,
  Status,
  SymbolSet,
  Version,
} from "./enums.js";
import {
  checkOneDigitField,
  checkTwoDigitField,
  findCombinationProblems,
  knownSymbolSets,
  knownVersions,
  SidcCombinationError,
  SidcValidationError,
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
}

const SIDC_LENGTH = 20;

const CONTEXTS: ReadonlySet<string> = new Set(Object.values(Context));
const IDENTITIES: ReadonlySet<string> = new Set(Object.values(StandardIdentity));
const STATUSES: ReadonlySet<string> = new Set(Object.values(Status));

/**
 * Fluent builder for 20-character numeric SIDC strings
 * (MIL-STD-2525E / APP-6 coding structure).
 *
 * Covers positions 1-7; positions 8-20 are zero-filled so the result can be
 * passed straight to milsymbol's `new ms.Symbol(sidc)`.
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
   */
  constructor(options: SidcOptions = {}, fields?: SidcFields) {
    this.fields = fields ?? {
      version: Version.MilStd2525E,
      context: Context.Reality,
      identity: StandardIdentity.Unknown,
      symbolSet: SymbolSet.Unknown,
      status: Status.Present,
    };
    this.strict = options.strict ?? false;
  }

  /** Positions 1-2: standard edition. Accepts known codes or a raw two-digit code. */
  version(version: Version | (string & {})): Sidc {
    checkTwoDigitField("Version", version);
    return this.with({ version });
  }

  /** Position 3: context. */
  context(context: Context): Sidc {
    checkOneDigitField("Context", context);
    if (!CONTEXTS.has(context)) {
      throw new SidcValidationError(`Unknown context code "${context}".`);
    }
    return this.with({ context });
  }

  /** Position 4: standard identity (affiliation). */
  identity(identity: StandardIdentity): Sidc {
    checkOneDigitField("Standard identity", identity);
    if (!IDENTITIES.has(identity)) {
      throw new SidcValidationError(
        `Unknown standard identity code "${identity}".`
      );
    }
    return this.with({ identity });
  }

  /** Positions 5-6: symbol set. Accepts known codes or a raw two-digit code. */
  symbolSet(symbolSet: SymbolSet | (string & {})): Sidc {
    checkTwoDigitField("Symbol set", symbolSet);
    return this.with({ symbolSet });
  }

  /** Position 7: status / condition. */
  status(status: Status): Sidc {
    checkOneDigitField("Status", status);
    if (!STATUSES.has(status)) {
      throw new SidcValidationError(`Unknown status code "${status}".`);
    }
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
        knownSymbolSets
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
      this.fields.status;
    return head.padEnd(SIDC_LENGTH, "0");
  }

  private with(fields: Partial<SidcFields>): Sidc {
    return new Sidc({ strict: this.strict }, { ...this.fields, ...fields });
  }
}
