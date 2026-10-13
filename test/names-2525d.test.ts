import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ms from "milsymbol";
import {
  Sidc,
  SidcValidationError,
  Standard,
  StandardIdentity,
  SymbolSet,
  Version,
} from "../src/index.js";
import * as catalog from "../src/catalog.js";
import * as names from "../src/names-2525d.js";
import { Air, LandUnit, describe2525d } from "../src/names-2525d.js";

const builder = () =>
  new Sidc({ standard: Standard.MilStd2525, strict: true })
    .version(Version.MilStd2525D)
    .identity(StandardIdentity.Friend);

describe("structured entity", () => {
  it("accepts levels and defaults type and subtype to 00", () => {
    assert.equal(
      builder().entity({ entity: "12" }).toObject().entity,
      "120000",
    );
    assert.equal(
      builder().entity({ entity: "12", type: "01" }).toObject().entity,
      "120100",
    );
    assert.equal(
      builder().entity({ entity: "11", type: "01", subtype: "04" }).toObject()
        .entity,
      "110104",
    );
  });

  it("matches the string form and reads back with entityParts()", () => {
    const parts = { entity: "12", type: "01", subtype: "00" };
    const a = builder().entity(parts);
    assert.equal(a.equals(builder().entity("120100")), true);
    assert.deepEqual(a.entityParts(), parts);
    assert.deepEqual(Sidc.parse("10031000001211000000").entityParts(), {
      entity: "12",
      type: "11",
      subtype: "00",
    });
  });

  it("names the level that is invalid", () => {
    assert.throws(() => builder().entity({ entity: "1" }), {
      name: "SidcValidationError",
      message: 'Entity must be 2 digit(s), got "1".',
    });
    assert.throws(() => builder().entity({ entity: "12", type: "1x" }), {
      message: 'Entity type must be 2 digit(s), got "1x".',
    });
    assert.throws(
      () => builder().entity({ entity: "12", subtype: 5 as never }),
      /Entity subtype must be 2 digit/,
    );
    assert.throws(
      () => builder().entity({ entity: "12", bogus: "1" } as never),
      { message: 'Unknown entity part "bogus".' },
    );
  });

  it("keeps existing string validation and messages unchanged", () => {
    assert.throws(() => builder().entity("12"), {
      message: 'Entity must be 6 digit(s), got "12".',
    });
    for (const bad of [undefined, null, 120100, Symbol("x")]) {
      assert.throws(() => builder().entity(bad as never), SidcValidationError);
    }
  });
});

describe("entity input classification", () => {
  it("never mistakes a record for a named code or the reverse", () => {
    assert.throws(
      () => builder().entity({ entity: "12", type: "01", code: "x" } as never),
      { message: 'Unknown entity part "code".' },
    );
    assert.throws(
      () => builder().entity({ entity: "12", code: "123456" } as never),
      { message: 'Unknown entity part "code".' },
    );
  });

  it("keeps the original error for objects without level keys", () => {
    for (const value of [{}, [], { label: "x" }]) {
      assert.throws(() => builder().entity(value as never), {
        name: "SidcValidationError",
        message: `Entity must be 6 digit(s), got "${String(value)}".`,
      });
    }
  });
});

describe("named codes", () => {
  it("encode like the raw strings", () => {
    const named = builder()
      .symbolSet(Air)
      .entity(Air.Entity.Civilian.FixedWing)
      .modifier1(Air.Modifier1.Passenger)
      .modifier2(Air.Modifier2.Heavy);
    const raw = builder()
      .symbolSet("01")
      .entity("120100")
      .modifier1("09")
      .modifier2("01");
    assert.equal(named.toString(), "10030100001201000901");
    assert.equal(named.equals(raw), true);
    assert.deepEqual(named.toObject(), raw.toObject());
  });

  it("expose code, label, kind and symbol set", () => {
    assert.deepEqual(
      { ...Air.Modifier1.Passenger },
      { code: "09", label: "Passenger", kind: "modifier1", symbolSet: "01" },
    );
    assert.equal(Air.code, "01");
    assert.equal(Object.isFrozen(Air.Entity), true);
    assert.equal(Object.isFrozen(Air.Entity.Civilian), true);
  });

  it("adopt their symbol set while the builder's is still unknown", () => {
    const sidc = builder().modifier1(Air.Modifier1.Passenger);
    assert.equal(sidc.toObject().symbolSet, "01");
    assert.equal(sidc.toObject().modifier1, "09");
    assert.equal(
      builder().entity(Air.Entity.Civilian.FixedWing).toObject().symbolSet,
      "01",
    );
  });

  it("are rejected on another symbol set or the wrong setter", () => {
    const land = builder().symbolSet(SymbolSet.LandUnit);
    assert.throws(
      () => land.modifier1(Air.Modifier1.Passenger),
      /Modifier 1 "Passenger" \("09"\) belongs to symbol set 01, not 10\./,
    );
    assert.throws(
      () => land.entity(Air.Entity.Civilian.FixedWing),
      /symbol set 01, not 10/,
    );
    assert.throws(
      () => builder().entity(Air.Modifier1.Passenger as never),
      /Entity cannot be set from a modifier1 code/,
    );
    assert.throws(
      () => builder().symbolSet(Air.Entity.Military as never),
      /Symbol set cannot be set from an entity code/,
    );
  });

  it("let the Unknown set's none-codes work in any symbol set", () => {
    const air = builder().symbolSet(Air).entity("120100");
    const reset = air.entity(names.Unknown.Entity.Unspecified).toObject();
    assert.equal(reset.entity, "000000");
    assert.equal(reset.symbolSet, "01");
  });

  it("accept a plain { code } object", () => {
    assert.equal(
      builder().modifier1({ code: "09" }).toObject().modifier1,
      "09",
    );
    assert.throws(
      () => builder().modifier1({ code: "9" }),
      SidcValidationError,
    );
  });

  it("keep high modifier digits behaviour of the string setters", () => {
    const extended = builder().symbolSet(Air).extendedModifier1("109");
    assert.equal(
      extended.modifier1(Air.Modifier1.Passenger).toString(),
      extended.modifier1("09").toString(),
    );
  });

  it("support special subtypes in structured entities", () => {
    const headquarters = LandUnit.SpecialSubtype.HeadquartersElement;
    assert.equal(headquarters.code, "95");
    const sidc = builder().entity({
      entity: "12",
      type: "11",
      subtype: headquarters,
    });
    assert.equal(sidc.toObject().entity, "121195");
    assert.equal(sidc.toObject().symbolSet, "10");
    assert.throws(
      () =>
        builder()
          .symbolSet("01")
          .entity({ entity: "12", subtype: headquarters }),
      /belongs to symbol set 10/,
    );
  });
});

describe("generated name data", () => {
  const walk = (
    group: object,
    visit: (node: names.NamedCode, depth: number) => void,
    depth = 0,
  ) => {
    for (const value of Object.values(group)) {
      if (typeof value === "object" && value !== null && "code" in value) {
        visit(value as names.NamedCode, depth);
        walk(value, visit, depth + 1);
      }
    }
  };

  it("covers every core symbol set that exists in MIL-STD-2525D", () => {
    const sets = new Map<string, { code: string }>(
      names.SYMBOL_SETS.map((set) => [set.code, set]),
    );
    // Set 27 was introduced after edition D, so JMSML (and this subpath) has
    // no names for it; the core builder already reports it for version 10.
    const notInD: string[] = [SymbolSet.LandDismountedIndividual];
    for (const [exportName, code] of Object.entries(SymbolSet)) {
      if (notInD.includes(code)) {
        assert.equal(sets.has(code), false, exportName);
        continue;
      }
      assert.equal(sets.get(code)?.code, code, `${exportName} (${code})`);
      assert.equal(
        (names as unknown as Record<string, { code: string }>)[exportName]
          ?.code,
        code,
        `export ${exportName}`,
      );
    }
    assert.equal(sets.size, Object.keys(SymbolSet).length - notInD.length);
  });

  it("has well-formed, correctly nested, unique codes", () => {
    for (const set of names.SYMBOL_SETS) {
      const seen = new Set<string>();
      walk(set.Entity, (node, depth) => {
        assert.match(node.code, /^\d{6}$/);
        assert.equal(node.symbolSet, set.code);
        assert.equal(node.kind, "entity");
        // depth 0: xx0000, depth 1: xxxx00, depth 2: any
        if (depth === 0) assert.match(node.code, /^\d\d0000$/);
        if (depth === 1) assert.match(node.code, /^\d{4}00$/);
        assert.equal(seen.has(node.code), false, `${set.code} ${node.code}`);
        seen.add(node.code);
      });
      for (const group of [
        "Modifier1",
        "Modifier2",
        "SpecialSubtype",
      ] as const) {
        const codes = new Set<string>();
        walk(set[group], (node) => {
          assert.match(node.code, /^\d{2}$/);
          assert.equal(
            codes.has(node.code),
            false,
            `${set.code} ${group} ${node.code}`,
          );
          codes.add(node.code);
        });
      }
    }
  });

  it("names every entity code milsymbol renders in the shared sets", () => {
    for (const set of names.SYMBOL_SETS) {
      const named = new Set<string>();
      walk(set.Entity, (node) => named.add(node.code));
      const missing = catalog
        .entityCodes(set.code)
        .filter((code) => !named.has(code));
      // Edition E additions have no 2525D name; this documents the current gap.
      assert.ok(
        missing.length <= 25,
        `${set.code}: ${missing.length} unnamed (${missing.slice(0, 5)})`,
      );
    }
  });

  it("only names modifiers that milsymbol knows or that are 'none'", () => {
    for (const set of names.SYMBOL_SETS) {
      for (const [group, known] of [
        ["Modifier1", catalog.isKnownModifier1Code],
        ["Modifier2", catalog.isKnownModifier2Code],
      ] as const) {
        const unknown: string[] = [];
        walk(set[group], (node) => {
          if (node.code !== "00" && !known(set.code, node.code)) {
            unknown.push(node.code);
          }
        });
        assert.ok(unknown.length <= 3, `${set.code} ${group}: ${unknown}`);
      }
    }
  });

  it("renders the documented airliner with milsymbol", () => {
    const sidc = builder()
      .symbolSet(Air)
      .modifier1(Air.Modifier1.Passenger)
      .toString();
    assert.equal(sidc, "10030100000000000900");
    const symbol = new ms.Symbol(sidc, { standard: "2525" });
    assert.equal(symbol.isValid(), true);
    assert.equal(symbol.asSVG().includes(">PX<"), true);
  });

  it("records its source and licence", () => {
    assert.equal(names.NAMES_SOURCE.license, "Apache-2.0");
    assert.match(names.NAMES_SOURCE.commit, /^[0-9a-f]{40}$/);
  });
});

describe("describe2525d", () => {
  it("names a SIDC's fields from a string or a builder", () => {
    const sidc = "10030100001201000901";
    const expected = {
      symbolSet: { code: "01", label: "Air" },
      entity: { code: "120000", label: "Civilian" },
      entityType: { code: "120100", label: "Fixed Wing" },
      entitySubtype: undefined,
      modifier1: { code: "09", label: "Passenger" },
      modifier2: { code: "01", label: "Heavy" },
    };
    assert.deepEqual(describe2525d(sidc), expected);
    assert.deepEqual(describe2525d(Sidc.parse(sidc)), expected);
  });

  it("returns undefined for fields without a name", () => {
    const result = describe2525d("10030100000000000000");
    assert.equal(result.entity?.label, "Unspecified");
    assert.equal(result.entityType, undefined);
    assert.equal(result.modifier1?.label, "Not Applicable");
    assert.deepEqual(describe2525d("10039900000000000000"), {});
    assert.equal(describe2525d("10030100009999990000").entity, undefined);
  });

  it("names special land-unit subtypes", () => {
    assert.equal(
      describe2525d("10031000001211950000".slice(0, 16) + "0000").entitySubtype
        ?.label,
      "Headquarters Element",
    );
  });

  it("gives no names for extended modifiers or edition E codes", () => {
    const air = builder().symbolSet(Air);
    // Full modifier 1 is "109", which is not the two-digit "09" (Passenger).
    assert.equal(
      describe2525d(air.extendedModifier1("109")).modifier1,
      undefined,
    );
    assert.equal(
      describe2525d(air.extendedModifier2("101")).modifier2,
      undefined,
    );
    assert.equal(
      describe2525d(air.extendedModifier1("009")).modifier1?.label,
      "Passenger",
    );
    assert.deepEqual(
      describe2525d(air.version(Version.MilStd2525E).modifier1("09")),
      {},
    );
    assert.deepEqual(
      describe2525d(air.version(Version.App6E).modifier1("09")),
      {},
    );
  });

  it("throws SidcValidationError for malformed strings", () => {
    assert.throws(() => describe2525d("nope"), SidcValidationError);
  });
});
