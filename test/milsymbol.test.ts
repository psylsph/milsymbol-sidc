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
  isKnownExtendedModifier1Code,
  isKnownExtendedModifier2Code,
} from "../src/catalog.js";

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
