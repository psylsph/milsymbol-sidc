import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ms from "milsymbol";
import {
  FrameShape,
  Sidc,
  Standard,
  StandardIdentity,
  SymbolSet,
  Version,
} from "../src/index.js";
import {
  catalogSymbolSets,
  entityCodes,
  extendedModifier1Codes,
  extendedModifier2Codes,
  modifier1Codes,
  modifier2Codes,
  isKnownExtendedModifier1Code,
  isKnownExtendedModifier2Code,
} from "../src/catalog.js";

// The exact rule the generator filters with (scripts/catalog-render-rule.mjs).
// Imported by URL so tsc does not try to compile the plain-JS script.
const RULE_URL = new URL(
  "../../scripts/catalog-render-rule.mjs",
  import.meta.url,
).href;
const { createRenderRule } = (await import(RULE_URL)) as {
  createRenderRule: (
    milsymbol: typeof ms,
    entitiesFor: (symbolSet: string) => readonly string[],
  ) => (kind: string, symbolSet: string, code: string) => boolean;
};

describe("catalog codes", () => {
  it("are all rendered as valid symbols by milsymbol", () => {
    const renders = createRenderRule(ms, entityCodes);
    const invalid: string[] = [];
    for (const symbolSet of catalogSymbolSets()) {
      for (const [kind, codes] of [
        ["entity", entityCodes(symbolSet)],
        ["modifier1", modifier1Codes(symbolSet)],
        ["modifier2", modifier2Codes(symbolSet)],
        ["extendedModifier1", extendedModifier1Codes(symbolSet)],
        ["extendedModifier2", extendedModifier2Codes(symbolSet)],
      ] as const) {
        for (const code of codes) {
          if (!renders(kind, symbolSet, code)) {
            invalid.push(`${symbolSet} ${kind} ${code}`);
          }
        }
      }
    }
    assert.deepEqual(invalid, []);
  });

  it("lists every symbol set with at least one code", () => {
    for (const symbolSet of catalogSymbolSets()) {
      const total =
        entityCodes(symbolSet).length +
        modifier1Codes(symbolSet).length +
        modifier2Codes(symbolSet).length +
        extendedModifier1Codes(symbolSet).length +
        extendedModifier2Codes(symbolSet).length;
      assert.ok(total > 0, `symbol set ${symbolSet} has no codes`);
    }
  });
});

// Use only public rendering/metadata APIs. These fixtures work with registry
// 3.0.4 as well as the isolated suspect-color fix, without relying on that fix.
for (const [standard, version] of [
  [Standard.MilStd2525, Version.MilStd2525E],
  [Standard.App6, Version.App6E],
] as const) {
  describe(`milsymbol extension rendering (${version})`, () => {
    const base = new Sidc({ standard, strict: true })
      .identity(StandardIdentity.Friend)
      .symbolSet(SymbolSet.LandUnit)
      .entity("110000");
    const render = (sidc: Sidc) => new ms.Symbol(sidc.toString(), { standard });

    it("renders registered extended modifier 1 geometry", () => {
      const plain = render(base);
      assert.equal(plain.isValid(), true);
      const uav = render(base.extendedModifier1("100"));
      const vtol = render(base.extendedModifier1("105"));
      assert.equal(uav.isValid(), true);
      assert.equal(vtol.isValid(), true);
      assert.notEqual(uav.asSVG(), plain.asSVG());
      assert.notEqual(vtol.asSVG(), plain.asSVG());
      assert.notEqual(uav.asSVG(), vtol.asSVG());
      assert.equal(isKnownExtendedModifier1Code("10", "100"), true);
    });

    it("renders extended modifier 2 alone and combined with modifier 1", () => {
      const m1 = render(base.extendedModifier1("100"));
      const m2 = render(base.extendedModifier2("100"));
      const both = render(
        base.extendedModifier1("100").extendedModifier2("100"),
      );
      assert.equal(m2.isValid(), true);
      assert.equal(both.isValid(), true);
      assert.notEqual(m2.asSVG(), render(base).asSVG());
      assert.notEqual(both.asSVG(), m1.asSVG());
      assert.notEqual(both.asSVG(), m2.asSVG());
      assert.equal(isKnownExtendedModifier2Code("10", "100"), true);
    });

    it("renders zero tails and leading-zero modifiers like their ordinary form", () => {
      assert.equal(
        render(base).asSVG(),
        render(base.with({ extension: {} })).asSVG(),
      );
      const plain = base.modifier1("11");
      assert.equal(render(plain).isValid(), true);
      assert.equal(
        render(plain).asSVG(),
        render(base.extendedModifier1("011")).asSVG(),
      );
    });

    it("applies E frame overrides and supports the no-frame selector", () => {
      const normal = render(base);
      const air = render(base.frameShape(FrameShape.Air));
      assert.equal(air.getMetadata().dimension, "Air");
      assert.equal(air.isValid(), true);
      assert.notEqual(air.asSVG(), normal.asSVG());
      const noFrame = render(base.frameShape(FrameShape.NoFrame));
      assert.equal(noFrame.getMetadata().frame, false);
      assert.notEqual(noFrame.asSVG(), normal.asSVG());
    });

    it("distinguishes structural validity from unsupported modifier rendering", () => {
      const unknown = base.extendedModifier1("199");
      assert.equal(unknown.isValid(), true);
      assert.equal(isKnownExtendedModifier1Code("10", "199"), false);
      assert.equal(render(unknown).isValid(), false);
    });
  });
}

describe("milsymbol D-edition no-frame selector", () => {
  it("suppresses the frame without reporting a problem", () => {
    for (const version of [Version.MilStd2525D, Version.App6D]) {
      const sidc = new Sidc({ strict: true })
        .version(version)
        .identity(StandardIdentity.Friend)
        .symbolSet(SymbolSet.LandUnit)
        .frameShape(FrameShape.NoFrame);
      const symbol = new ms.Symbol(sidc.toString());
      assert.equal(symbol.isValid(), true);
      assert.equal(symbol.getMetadata().frame, false);
    }
  });
});

describe("milsymbol MIL-STD-2525D (version 10)", () => {
  const unit = new Sidc({ standard: Standard.MilStd2525, strict: true })
    .version(Version.MilStd2525D)
    .identity(StandardIdentity.Friend)
    .symbolSet(SymbolSet.LandUnit)
    .entity("121100");
  // Renders without strict, so reported-but-encodable codes can be drawn.
  const render = (sidc: Sidc) =>
    new ms.Symbol(
      new Sidc({ onWarning: () => {} }, sidc.toObject()).toString(),
      { standard: Standard.MilStd2525 },
    );
  const edition = (sidc: Sidc) =>
    (render(sidc).getMetadata() as { edition?: string }).edition;

  it("renders valid D-edition symbols for every core field value", () => {
    for (const sidc of [
      unit,
      unit.status("3"),
      unit.hqTaskForceDummy("2"),
      unit.amplifier("15"),
      unit.identity(StandardIdentity.HostileFaker),
      unit.modifier1("01"),
    ]) {
      assert.equal(sidc.isValid(), true);
      assert.equal(render(sidc).isValid(), true, sidc.toString());
      assert.equal(edition(sidc), "D");
    }
  });

  it("matches the README's notes on D-edition reports", () => {
    // Reported as outside 2525D, yet milsymbol's default build draws it.
    const dismounted = unit
      .symbolSet(SymbolSet.LandDismountedIndividual)
      .entity("110000");
    assert.equal(dismounted.isValid(), false);
    assert.equal(render(dismounted).isValid(), true);
    // Frame shapes 1-9 really are ignored on D editions.
    const air = unit.frameShape(FrameShape.Air);
    assert.equal(air.isValid(), false);
    assert.equal(
      render(air).getMetadata().dimension,
      render(unit).getMetadata().dimension,
    );
  });
});
