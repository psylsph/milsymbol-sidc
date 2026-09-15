import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FrameShape,
  Sidc,
  SidcCombinationError,
  SidcValidationError,
  Standard,
  Version,
  type SidcExtension,
  type SidcFields,
} from "../src/index.js";

const ZERO = {
  modifier1Extension: "0",
  modifier2Extension: "0",
  frameShape: FrameShape.Default,
};

describe("SIDC extensions", () => {
  it("keeps old defaults and snapshots unchanged", () => {
    const base = new Sidc();
    assert.equal(base.toString(), "13010000000000000000");
    assert.equal("extension" in base.toObject(), false);
    assert.equal(base.clone().equals(base), true);
    assert.throws(() => base.modifier1("105"), SidcValidationError);
    assert.throws(() => base.modifier2("100"), SidcValidationError);
  });

  it("splits complete modifier codes across their physical positions", () => {
    const base = new Sidc();
    const value = base.extendedModifier1("105").extendedModifier2("123");
    const sidc = value.toString();
    assert.equal(sidc.length, 23);
    assert.equal(sidc.slice(0, 16), base.toString().slice(0, 16));
    assert.equal(sidc.slice(16), "0523110");
    assert.equal(base.toString().length, 20);
    assert.deepEqual(value.toObject().extension, {
      ...ZERO,
      modifier1Extension: "1",
      modifier2Extension: "1",
    });
    assert.equal(
      base.extendedModifier2("123").extendedModifier1("105").equals(value),
      true,
    );
  });

  it("encodes every frame selector and preserves explicit zero tails", () => {
    for (const shape of Object.values(FrameShape)) {
      const value = new Sidc().frameShape(shape);
      assert.equal(value.toString(), new Sidc().toString() + "00" + shape);
      assert.equal(Sidc.parse(value.toString()).equals(value), true);
    }
    const zero = new Sidc().with({ extension: {} });
    assert.equal(zero.toString(), new Sidc().toString() + "000");
    assert.equal(zero.equals(new Sidc()), false);
    assert.equal(new Sidc().equals(zero), false);
    assert.deepEqual(zero.toObject().extension, ZERO);
    const leading = new Sidc().extendedModifier1("005");
    assert.equal(leading.toString().slice(16), "0500000");
    assert.equal(leading.toObject().modifier1, "05");
  });

  it("retains representation through parse, clone and snapshot reconstruction", () => {
    for (const value of [
      new Sidc(),
      new Sidc().with({ extension: {} }),
      new Sidc({ standard: Standard.App6 })
        .extendedModifier1("105")
        .extendedModifier2("100")
        .frameShape(FrameShape.NoFrame),
    ]) {
      const text = value.toString();
      assert.equal(Sidc.parse(text).toString(), text);
      assert.equal(Sidc.tryParse(text)?.equals(value), true);
      assert.equal(value.clone().equals(value), true);
      assert.equal(new Sidc({}, value.toObject()).equals(value), true);
      assert.equal(new Sidc().with(value.toObject()).equals(value), true);
      assert.equal(
        new Sidc({}, JSON.parse(JSON.stringify(value))).equals(value),
        true,
      );
    }
  });

  it("copies nested inputs and outputs, and applies documented replacement semantics", () => {
    const extension: SidcExtension = { ...ZERO, modifier1Extension: "1" };
    const value = new Sidc({}, { extension });
    extension.modifier1Extension = "9";
    const snapshot = value.toObject();
    snapshot.extension!.modifier1Extension = "8";
    assert.equal(value.toString().slice(20), "100");
    assert.deepEqual(
      value.with({ extension: { frameShape: FrameShape.Air } }).toObject()
        .extension,
      { ...ZERO, frameShape: FrameShape.Air },
    );
    assert.deepEqual(
      value.with({ extension: { modifier1Extension: undefined } }).toObject()
        .extension,
      ZERO,
    );
    assert.equal(value.with({ extension: undefined }).toString().length, 20);
  });

  it("clears only the matching high digit when using an ordinary setter", () => {
    const value = new Sidc()
      .extendedModifier1("105")
      .extendedModifier2("123")
      .frameShape(FrameShape.Air);
    assert.equal(value.modifier1("06").toString().slice(16), "0623012");
    assert.equal(value.modifier2("07").toString().slice(16), "0507102");
    assert.equal(
      value.with({ modifier1: "06" }).toString().slice(16),
      "0623112",
    );
    const plain = value.withoutExtension();
    assert.equal(plain.toString().length, 20);
    assert.equal(plain.toString().slice(16), "0523");
    assert.equal("extension" in plain.toObject(), false);
    assert.equal(plain.withoutExtension().equals(plain), true);
    assert.equal(value.toString().length, 23);
  });

  it("validates complete modifiers at every width boundary", () => {
    for (const code of ["000", "099", "100", "999"]) {
      assert.equal(new Sidc().extendedModifier1(code).toString().length, 23);
      assert.equal(new Sidc().extendedModifier2(code).toString().length, 23);
    }
    for (const bad of [
      "",
      "1",
      "11",
      "1000",
      " 10",
      "1A0",
      "100\n",
      "١٠٠",
      100,
      null,
      undefined,
    ]) {
      assert.throws(
        () => new Sidc().extendedModifier1(bad as string),
        SidcValidationError,
      );
      assert.throws(
        () => new Sidc().extendedModifier2(bad as string),
        SidcValidationError,
      );
    }
  });

  it("rejects malformed nested fields via constructor and with", () => {
    for (const extension of [
      null,
      "000",
      0,
      [],
      { modifier1Extension: "10" },
      { modifier2Extension: "A" },
      { modifier1Extension: null },
      { modifier2Extension: 1 },
      { modifier1Extension: "١" },
      { frameShape: "a" },
      { frameShape: "B" },
      { frameShape: "10" },
      { frameShape: null },
      { frameShape: 0 },
      { modifier1Extention: "1" },
      { bogus: "1" },
      { modifier1Extension: "1", extra: "2" },
      Object.create({ bogus: "1" }),
      Object.create({ modifier1Extension: "9", bogus: "1" }),
    ]) {
      const fields = { extension } as Partial<SidcFields>;
      assert.throws(() => new Sidc({}, fields), SidcValidationError);
      assert.throws(() => new Sidc().with(fields), SidcValidationError);
    }
    for (const shape of ["a", "B", "00", "", 0, null, undefined]) {
      assert.throws(
        () => new Sidc().frameShape(shape as FrameShape),
        SidcValidationError,
      );
    }
  });

  it("copies inherited known fields and freezes them against later mutation", () => {
    const prototype: { frameShape: FrameShape } = {
      frameShape: FrameShape.Air,
    };
    const value = new Sidc({}, { extension: Object.create(prototype) });
    assert.equal(value.toString().slice(20), "002");
    prototype.frameShape = FrameShape.NoFrame;
    assert.equal(value.toString().slice(20), "002");
  });

  it("rejects unsupported lengths and misplaced nonnumeric characters", () => {
    const base = new Sidc().toString();
    const invalid = [
      base + "0",
      base + "00",
      base + "0000",
      base + "0000000000",
      base + "00a",
      base + "00B",
      base + "A00",
      base + "0A0",
      base.slice(0, 19) + "A000",
      base + "٠00",
      " " + base,
      base + "00 ",
      base + "\n",
      base + "000\n",
      123,
      null,
      undefined,
    ];
    for (const bad of invalid) {
      assert.equal(Sidc.tryParse(bad as string), undefined);
      assert.throws(() => Sidc.parse(bad as string), SidcValidationError);
    }
  });

  it("supports both E editions, and reports meaningful tails on D editions", () => {
    for (const version of [Version.MilStd2525E, Version.App6E]) {
      assert.deepEqual(
        new Sidc({ strict: true })
          .version(version)
          .extendedModifier1("105")
          .frameShape(FrameShape.NoFrame)
          .problems(),
        [],
      );
    }
    for (const version of [Version.MilStd2525D, Version.App6D, "12"]) {
      const warnings: string[] = [];
      const base = new Sidc({
        onWarning: (p) => warnings.push(p.code),
      }).version(version);
      for (const value of [
        base.extendedModifier1("100"),
        base.extendedModifier2("100"),
        base.frameShape(FrameShape.Air),
        base.frameShape(FrameShape.NoFrame),
      ]) {
        assert.deepEqual(
          value.problems().map((p) => p.code),
          ["unsupported-extension-edition"],
        );
        assert.equal(value.isValid(), false);
        assert.equal(value.toString().length, 23);
        assert.equal(
          Sidc.parse(value.toString(), { strict: true }).isValid(),
          false,
        );
        assert.throws(
          () => Sidc.parse(value.toString(), { strict: true }).toString(),
          SidcCombinationError,
        );
      }
      assert.ok(warnings.length > 0);
      assert.deepEqual(base.with({ extension: {} }).problems(), []);
      assert.deepEqual(base.extendedModifier1("005").problems(), []);
    }
  });

  it("retains tails across edition/family changes without side-effectful inspection", () => {
    const warnings: string[] = [];
    const value = new Sidc({
      onWarning: (p) => warnings.push(p.code),
    }).extendedModifier1("105");
    const d = value.version(Version.MilStd2525D);
    assert.deepEqual(d.toObject().extension, value.toObject().extension);
    d.problems();
    d.isValid();
    d.clone();
    d.equals(value);
    d.toObject();
    assert.deepEqual(warnings, []);
    const app6 = d.standard(Standard.App6);
    assert.equal(app6.toObject().version, Version.App6E);
    assert.deepEqual(app6.problems(), []);
    assert.deepEqual(
      value
        .version("99")
        .problems()
        .map((p) => p.code),
      ["unrecognized-version"],
    );
    assert.equal(
      new Sidc({ strict: true }).extendedModifier1("199").isValid(),
      true,
    );
  });
});
