import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  Context,
  Sidc,
  SidcCombinationError,
  SidcValidationError,
  StandardIdentity,
  Status,
  SymbolSet,
  Version,
} from "../src/index.js";

/** Runs fn with console.warn captured; returns the captured messages. */
function captureWarnings(fn: () => void): string[] {
  const original = console.warn;
  const captured: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    captured.push(args);
  };
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return captured.map((args) => args.join(" "));
}

describe("Sidc defaults", () => {
  it("renders a zero-filled 2525E SIDC with unknown identity", () => {
    assert.equal(new Sidc().toString(), "13010000000000000000");
  });

  it("always renders exactly 20 characters", () => {
    const sidc = new Sidc()
      .version(Version.App6E)
      .context(Context.Simulation)
      .identity(StandardIdentity.Faker)
      .symbolSet(SymbolSet.SeaSubsurface)
      .status(Status.Destroyed)
      .toString();
    assert.equal(sidc.length, 20);
  });
});

describe("field encoding (positions 1-7)", () => {
  it("encodes version at positions 1-2", () => {
    assert.equal(new Sidc().version(Version.MilStd2525E).toString().slice(0, 2), "13");
    assert.equal(new Sidc().version(Version.App6E).toString().slice(0, 2), "14");
    assert.equal(new Sidc().version(Version.MilStd2525D).toString().slice(0, 2), "10");
    assert.equal(new Sidc().version(Version.App6D).toString().slice(0, 2), "11");
  });

  it("encodes context at position 3", () => {
    assert.equal(new Sidc().context(Context.Reality).toString().charAt(2), "0");
    assert.equal(new Sidc().context(Context.Exercise).toString().charAt(2), "1");
    assert.equal(new Sidc().context(Context.Simulation).toString().charAt(2), "2");
  });

  it("encodes standard identity at position 4", () => {
    assert.equal(
      new Sidc().identity(StandardIdentity.Pending).toString().charAt(3),
      "0"
    );
    assert.equal(
      new Sidc().identity(StandardIdentity.Unknown).toString().charAt(3),
      "1"
    );
    assert.equal(
      new Sidc().identity(StandardIdentity.AssumedFriend).toString().charAt(3),
      "2"
    );
    assert.equal(
      new Sidc().identity(StandardIdentity.Friend).toString().charAt(3),
      "3"
    );
    assert.equal(
      new Sidc().identity(StandardIdentity.Neutral).toString().charAt(3),
      "4"
    );
    assert.equal(
      new Sidc().identity(StandardIdentity.SuspectJoker).toString().charAt(3),
      "5"
    );
    assert.equal(
      new Sidc().identity(StandardIdentity.Faker).toString().charAt(3),
      "6"
    );
  });

  it("encodes symbol set at positions 5-6", () => {
    for (const code of Object.values(SymbolSet)) {
      const rendered = new Sidc().symbolSet(code).toString();
      assert.equal(rendered.slice(4, 6), code);
      assert.match(rendered, /^\d{20}$/);
    }
  });

  it("encodes status at position 7", () => {
    assert.equal(new Sidc().status(Status.Present).toString().charAt(6), "0");
    assert.equal(new Sidc().status(Status.Planned).toString().charAt(6), "1");
    assert.equal(new Sidc().status(Status.FullyCapable).toString().charAt(6), "2");
    assert.equal(new Sidc().status(Status.Damaged).toString().charAt(6), "3");
    assert.equal(new Sidc().status(Status.Destroyed).toString().charAt(6), "4");
    assert.equal(new Sidc().status(Status.FullToCapacity).toString().charAt(6), "5");
  });
});

describe("worked examples", () => {
  it("friendly present land unit in reality under 2525E", () => {
    const sidc = new Sidc()
      .version(Version.MilStd2525E)
      .context(Context.Reality)
      .identity(StandardIdentity.Friend)
      .symbolSet(SymbolSet.LandUnit)
      .status(Status.Present);
    assert.equal(sidc.toString(), "13031000000000000000");
  });

  it("neutral planned air missile under APP-6E", () => {
    const sidc = new Sidc({ strict: true })
      .version(Version.App6E)
      .identity(StandardIdentity.Neutral)
      .symbolSet(SymbolSet.AirMissile)
      .status(Status.Planned);
    assert.equal(sidc.toString(), "14040210000000000000");
  });
});

describe("immutability", () => {
  it("leaves the base instance untouched after chaining", () => {
    const base = new Sidc();
    const derived = base.identity(StandardIdentity.Friend).status(Status.Damaged);
    assert.notEqual(base, derived);
    assert.equal(base.toString(), "13010000000000000000");
    assert.equal(derived.toString(), "13030030000000000000");
  });

  it("carries strict mode through clones", () => {
    const strict = new Sidc({ strict: true }).identity(StandardIdentity.Faker);
    assert.throws(() => strict.toString(), SidcCombinationError);
  });
});

describe("value validation", () => {
  it("throws on malformed or unknown codes", () => {
    assert.throws(() => new Sidc().version("9X"), SidcValidationError);
    assert.throws(() => new Sidc().version("1"), SidcValidationError);
    assert.throws(() => new Sidc().context("9" as never), SidcValidationError);
    assert.throws(
      () => new Sidc().identity("9" as never),
      SidcValidationError
    );
    assert.throws(() => new Sidc().symbolSet("1"), SidcValidationError);
    assert.throws(() => new Sidc().status("9" as never), SidcValidationError);
  });

  it("accepts raw two-digit version and symbol set codes", () => {
    const warnings = captureWarnings(() => {
      const sidc = new Sidc().version("12").symbolSet("12");
      const rendered = sidc.toString();
      assert.equal(rendered.slice(0, 2), "12");
      assert.equal(rendered.slice(4, 6), "12");
    });
    // Raw but recognized codes encode silently.
    assert.deepEqual(warnings, []);
  });

  it("warns on unrecognized raw codes", () => {
    const warnings = captureWarnings(() => {
      new Sidc().version("99").toString();
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /Unrecognized version code "99"/);
  });
});

describe("combination validation", () => {
  it("suspect identity is valid in reality context", () => {
    const warnings = captureWarnings(() => {
      new Sidc({ strict: true })
        .identity(StandardIdentity.SuspectJoker)
        .symbolSet(SymbolSet.LandUnit)
        .toString();
    });
    assert.deepEqual(warnings, []);
  });

  it("faker outside exercise context warns by default", () => {
    const warnings = captureWarnings(() => {
      new Sidc().identity(StandardIdentity.Faker).toString();
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /exercise context/);
  });

  it("suspect identity inside exercise context is clean", () => {
    const sidc = new Sidc({ strict: true })
      .context(Context.Exercise)
      .identity(StandardIdentity.SuspectJoker)
      .symbolSet(SymbolSet.LandUnit);
    assert.doesNotThrow(() => sidc.toString());
  });

  it("strict mode throws instead of warning", () => {
    const sidc = new Sidc({ strict: true }).identity(StandardIdentity.Faker);
    assert.throws(() => sidc.toString(), SidcCombinationError);
  });

  it("condition status on control measures warns", () => {
    const warnings = captureWarnings(() => {
      new Sidc()
        .symbolSet(SymbolSet.ControlMeasure)
        .status(Status.Destroyed)
        .toString();
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /control measure/);
  });

  it("exercise symbols on unknown sets need pending/unknown identity", () => {
    const warnings = captureWarnings(() => {
      new Sidc()
        .context(Context.Exercise)
        .identity(StandardIdentity.Neutral)
        .toString();
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /unknown symbol set/);
  });

  it("flags symbol sets unsupported by legacy standards", () => {
    const warnings = captureWarnings(() => {
      new Sidc()
        .version(Version.MilStd2525D)
        .symbolSet(SymbolSet.LandDismountedIndividual)
        .toString();
      new Sidc().version(Version.App6D).symbolSet(SymbolSet.Cyberspace).toString();
    });
    assert.equal(warnings.length, 2);
    assert.match(warnings[0]!, /2525D/);
    assert.match(warnings[1]!, /APP-6 D/);
  });

  it("valid combinations produce no warnings", () => {
    const warnings = captureWarnings(() => {
      new Sidc({ strict: true })
        .context(Context.Exercise)
        .identity(StandardIdentity.Friend)
        .symbolSet(SymbolSet.MineWarfare)
        .status(Status.Planned)
        .toString();
    });
    assert.deepEqual(warnings, []);
  });

  it("stacks multiple combination problems", () => {
    const warnings = captureWarnings(() => {
      new Sidc()
        .identity(StandardIdentity.Faker)
        .symbolSet(SymbolSet.ControlMeasure)
        .status(Status.Damaged)
        .toString();
    });
    assert.equal(warnings.length, 2);
  });
});

describe("builder ergonomics", () => {
  it("defaults to MIL-STD-2525E", () => {
    assert.equal(new Sidc().toString().slice(0, 2), "13");
  });

  it("accepts an empty options object as non-strict", () => {
    const warnings = captureWarnings(() => {
      new Sidc({}).identity(StandardIdentity.Faker).toString();
    });
    assert.equal(warnings.length, 1);
  });

  it("is order independent", () => {
    const a = new Sidc({ strict: true })
      .identity(StandardIdentity.Friend)
      .status(Status.Damaged)
      .symbolSet(SymbolSet.Air);
    const b = new Sidc({ strict: true })
      .symbolSet(SymbolSet.Air)
      .status(Status.Damaged)
      .identity(StandardIdentity.Friend);
    assert.equal(a.toString(), b.toString());
  });

  it("returns the same string on repeated calls", () => {
    const sidc = new Sidc().identity(StandardIdentity.Neutral).symbolSet(SymbolSet.Space);
    assert.equal(sidc.toString(), sidc.toString());
  });

  it("zero-fills positions 8-20", () => {
    const rendered = new Sidc({ strict: true })
      .version("14")
      .context(Context.Simulation)
      .identity(StandardIdentity.Neutral)
      .symbolSet(SymbolSet.MineWarfare)
      .status(Status.FullToCapacity)
      .toString();
    assert.equal(rendered.slice(7), "0".repeat(13));
  });

  it("accepts every enum member through its setter", () => {
    for (const context of Object.values(Context)) {
      assert.doesNotThrow(() => new Sidc({ strict: false }).context(context));
    }
    for (const identity of Object.values(StandardIdentity)) {
      assert.doesNotThrow(() => new Sidc({ strict: false }).identity(identity));
    }
    for (const status of Object.values(Status)) {
      assert.doesNotThrow(() => new Sidc({ strict: false }).status(status));
    }
    for (const symbolSet of Object.values(SymbolSet)) {
      assert.doesNotThrow(() =>
        new Sidc({ strict: false }).symbolSet(symbolSet)
      );
    }
  });
});

describe("raw code escape hatch", () => {
  it("recognizes codes milsymbol parses but that have no named constant", () => {
    const warnings = captureWarnings(() => {
      const rendered = new Sidc().symbolSet("39").toString();
      assert.equal(rendered.slice(4, 6), "39");
      assert.doesNotThrow(() =>
        new Sidc().version("12").toString()
      );
    });
    assert.deepEqual(warnings, []);
  });

  it("warns on unrecognized raw symbol sets", () => {
    const warnings = captureWarnings(() => {
      new Sidc().symbolSet("99").toString();
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /Unrecognized symbol set code "99"/);
  });

  it("throws in strict mode on unrecognized raw codes", () => {
    assert.throws(
      () => new Sidc({ strict: true }).version("99").toString(),
      SidcCombinationError
    );
  });
});

describe("error types", () => {
  it("validation errors extend SidcError and TypeError semantics", () => {
    assert.throws(
      () => new Sidc().identity("9" as never),
      (error: unknown) =>
        error instanceof SidcValidationError && error instanceof Error
    );
  });

  it("combination errors extend SidcError", () => {
    assert.throws(
      () => new Sidc({ strict: true }).identity(StandardIdentity.Faker).toString(),
      (error: unknown) =>
        error instanceof SidcCombinationError && error instanceof Error
    );
  });

  it("names its errors", () => {
    try {
      new Sidc().identity("9" as never);
      assert.fail("expected throw");
    } catch (error) {
      assert.equal((error as Error).name, "SidcValidationError");
    }
  });
});
