import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import ms from "milsymbol";
import {
  Context,
  Sidc,
  SidcValidationError,
  Standard,
  StandardIdentity,
  SymbolSet,
  Version,
} from "../src/index.js";
import {
  DIMENSIONS_2525C,
  from2525c,
  from2525cFunction,
} from "../src/legacy-2525c.js";
import { LEGACY_2525C_ROWS } from "../src/legacy-2525c.generated.js";
import { describe2525d } from "../src/names-2525d.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { exports: Record<string, unknown> };

const pick = (sidc: string) => {
  const found = from2525c(sidc);
  return (
    found && [found.symbolSet, found.entity, found.modifier1, found.modifier2]
  );
};

describe("from2525c", () => {
  it("maps civil air function IDs to air civilian entities", () => {
    assert.deepEqual(pick("SFAPC-----*****"), ["01", "120000", "00", "00"]);
    assert.deepEqual(pick("SFAPCF----*****"), ["01", "120100", "00", "00"]);
    assert.deepEqual(pick("SFAPCH----*****"), ["01", "120200", "00", "00"]);
    assert.deepEqual(pick("SFAPCL----*****"), ["01", "120400", "00", "00"]);
  });

  it("maps 2525C function codes that became 2525D modifiers", () => {
    // Military fixed-wing cargo, light: CARGO subtype with modifier 2 "Light".
    assert.deepEqual(pick("SHAPMFCL--*****"), ["01", "110107", "00", "03"]);
  });

  it("accepts the 10-character form, any affiliation/status, and lower case", () => {
    const full = from2525c("SFAPCF----*****");
    assert.equal(from2525c("SFAPCF----"), full);
    assert.equal(from2525c("shapcf----"), full);
    assert.equal(from2525c("SUAACF----"), full);
    assert.equal(from2525c("  SFAPCF----***** "), full);
  });

  it("depends on the battle dimension", () => {
    // Same function letter "C" in air vs sea surface.
    assert.equal(from2525c("SFAPC-----")?.symbolSet, "01");
    assert.equal(from2525c("SFSPC-----")?.symbolSet, "30");
  });

  it("uses positions 11-15 and status to pick between variants", () => {
    const installation = from2525c("SFGPIMC---H****");
    assert.equal(installation?.symbolSet, "20");
    // Omitted installation indicator still finds the only variant.
    assert.equal(from2525c("SFGPIMC---"), installation);
    // FLOT: present vs anticipated (planned) lines are distinct 2525D codes.
    const present = from2525c("GFGPGLF---****X");
    const planned = from2525c("GFGAGLF---****X");
    assert.equal(present?.pattern, "G*GPGLF---****X");
    assert.equal(planned?.pattern, "GFGAGLF---****X");
    assert.notEqual(present?.entity, planned?.entity);
    // A hostile-only variant beats the wildcard one for hostile input.
    assert.equal(from2525c("GHGPGLF---****X")?.pattern, "GHGPGLF---****X");
  });

  it("prefers air missile for 2525C missile in flight", () => {
    assert.deepEqual(pick("SHAPW-----"), ["02", "110000", "00", "00"]);
  });

  it("returns undefined for unknown, malformed, or retired input", () => {
    assert.equal(from2525c("SFAPCV----"), undefined); // no such 2525C code
    assert.equal(from2525c("SFAP"), undefined);
    assert.equal(from2525c("10030100001201000901"), undefined);
    assert.equal(from2525c(""), undefined);
    assert.equal(from2525c(42 as never), undefined);
    assert.equal(from2525c("S*UPSS----"), undefined); // retired: no 2525D code
  });

  it("returns frozen results", () => {
    assert.ok(Object.isFrozen(from2525c("SFAPC-----")));
  });
});

describe("2525C table", () => {
  it("has unique, well-formed patterns", () => {
    const patterns = LEGACY_2525C_ROWS.map(([pattern]) => pattern);
    assert.equal(new Set(patterns).size, patterns.length);
    for (const [pattern, symbolSet, entity, m1, m2] of LEGACY_2525C_ROWS) {
      assert.match(
        pattern,
        /^[A-Z*][A-Z*-][A-Z][A-Z*-][A-Z0-9-]{6}[A-Z*-]{5}$/,
      );
      assert.match(symbolSet + entity + m1 + m2, /^\d{12}$/);
    }
  });

  it("resolves every row to itself", () => {
    for (const [pattern] of LEGACY_2525C_ROWS) {
      assert.equal(from2525c(pattern)?.pattern, pattern, pattern);
    }
  });

  it("maps to named 2525D entities", () => {
    const unnamed = LEGACY_2525C_ROWS.filter(([, symbolSet, entity]) => {
      const sidc = new Sidc({ standard: Standard.MilStd2525 })
        .version(Version.MilStd2525D)
        .with({ symbolSet, entity });
      return describe2525d(sidc).entity === undefined;
    });
    assert.deepEqual(unnamed, []);
  });

  it("produces 2525D codes milsymbol draws for drawable sets", () => {
    for (const [pattern, symbolSet, entity, m1, m2] of LEGACY_2525C_ROWS) {
      if (symbolSet === "25") continue; // line and area graphics
      const code = `1003${symbolSet}0000${entity}${m1}${m2}`;
      const symbol = new ms.Symbol(code);
      assert.ok(symbol.isValid(), `${pattern} -> ${code}`);
    }
  });
});

describe("from2525cFunction", () => {
  it("uses the symbol set as the battle dimension", () => {
    assert.equal(from2525cFunction("CF", "01")?.entity, "120100");
    assert.equal(from2525cFunction("cf----", "01")?.entity, "120100");
    assert.equal(from2525cFunction("C", "30")?.symbolSet, "30");
  });

  it('treats an empty function ID as "------"', () => {
    assert.deepEqual(
      from2525cFunction("", "01"),
      from2525cFunction("------", "01"),
    );
    assert.equal(from2525cFunction("  ", "30")?.pattern, "S*SP------*****");
  });

  it("falls back to 2525C special operations forces for land units", () => {
    assert.equal(from2525cFunction("AF", "10")?.pattern, "S*FPAF----*****");
  });

  it("returns undefined for bad input or unsupported symbol sets", () => {
    assert.equal(from2525cFunction("CV", "01"), undefined);
    assert.equal(from2525cFunction("CF", "25"), undefined);
    assert.equal(from2525cFunction("CF", "constructor"), undefined);
    assert.equal(from2525cFunction("CFXXXXX", "01"), undefined);
    assert.equal(from2525cFunction("C*", "01"), undefined);
  });

  it("lists only symbol sets that exist", () => {
    for (const symbolSet of Object.keys(DIMENSIONS_2525C)) {
      assert.ok(Object.values(SymbolSet).includes(symbolSet as SymbolSet));
    }
  });
});

describe("Sidc.from2525c", () => {
  const air = new Sidc({ standard: Standard.MilStd2525, strict: true })
    .version(Version.MilStd2525D)
    .identity(StandardIdentity.Neutral)
    .symbolSet(SymbolSet.Air);

  it("sets entity and modifiers from a function ID", () => {
    assert.equal(air.from2525c("C").toString(), "10040100001200000000");
    assert.equal(air.from2525c("CF").toString(), "10040100001201000000");
    assert.equal(air.from2525c("MFCL").toString(), "10040100001101070003");
  });

  it('treats an empty function ID as "------"', () => {
    const cf = air.from2525c("CF");
    assert.equal(cf.from2525c("").toString(), air.toString());
    assert.equal(
      cf.from2525c("").toString(),
      cf.from2525c("------").toString(),
    );
  });

  it("keeps other fields and replaces earlier modifiers", () => {
    const sidc = air.status("1").modifier1("09").from2525c("CF").toObject();
    assert.equal(sidc.identity, "4");
    assert.equal(sidc.status, "1");
    assert.equal(sidc.modifier1, "00");
    assert.equal(
      air.from2525c("CF").modifier1("09").toObject().modifier1,
      "09",
    );
  });

  it("adopts the mapped symbol set", () => {
    assert.equal(air.from2525c("W").toObject().symbolSet, "02");
    assert.equal(
      air.symbolSet(SymbolSet.LandEquipment).from2525c("UCI").toObject()
        .symbolSet,
      "10",
    );
  });

  it("leaves context alone: Reality by default, otherwise as set", () => {
    // 2525C has no context, so conversion must neither add nor change one.
    assert.equal(air.from2525c("MF").toObject().context, Context.Reality);
    assert.equal(air.from2525c("MF").toString().slice(0, 3), "100");
    assert.equal(
      air.context(Context.Exercise).from2525c("MF").toObject().context,
      Context.Exercise,
    );
  });

  it("clears extended modifier digits", () => {
    const extended = air.extendedModifier1("109").from2525c("CF");
    assert.equal(extended.toObject().extension?.modifier1Extension, "0");
  });

  it("is immutable", () => {
    air.from2525c("CF");
    assert.equal(air.toObject().entity, "000000");
  });

  it("throws SidcValidationError for unusable input", () => {
    assert.throws(() => air.from2525c("CV"), SidcValidationError);
    assert.throws(() => air.from2525c("TOOLONG"), SidcValidationError);
    assert.throws(() => air.from2525c(7 as never), SidcValidationError);
    assert.throws(
      () => air.symbolSet(SymbolSet.ControlMeasure).from2525c("CF"),
      SidcValidationError,
    );
  });
});

describe("package exports", () => {
  it("exposes the 2525c subpath", () => {
    assert.deepEqual(packageJson.exports["./2525c"], {
      types: "./dist/src/legacy-2525c.d.ts",
      default: "./dist/src/legacy-2525c.js",
    });
  });
});
