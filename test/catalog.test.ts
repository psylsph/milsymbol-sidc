import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_SOURCE,
  catalogSymbolSets,
  entityCodes,
  hasCatalog,
  isKnownEntityCode,
  isKnownModifier1Code,
  isKnownModifier2Code,
  modifier1Codes,
  modifier2Codes,
} from "../src/catalog.js";

/** Returns a two-digit code that is not present in the given catalog. */
function absentTwoDigitCode(codes: readonly string[]): string {
  const present = new Set(codes);
  for (let index = 0; index < 100; index += 1) {
    const candidate = String(index).padStart(2, "0");
    if (!present.has(candidate)) {
      return candidate;
    }
  }
  throw new Error("every two-digit code is present");
}

describe("catalog metadata", () => {
  it("records the milsymbol source it was generated from", () => {
    assert.equal(CATALOG_SOURCE.name, "milsymbol");
    assert.match(CATALOG_SOURCE.version, /^\d+\.\d+\.\d+/);
  });

  it("covers the documented symbol sets", () => {
    const sets = catalogSymbolSets();
    for (const symbolSet of ["10", "11", "15", "20", "25", "30", "60"]) {
      assert.equal(
        hasCatalog(symbolSet),
        true,
        `missing catalog for ${symbolSet}`,
      );
      assert.equal(sets.includes(symbolSet), true);
    }
  });

  it("reports no catalog for unknown symbol sets", () => {
    assert.equal(hasCatalog("99"), false);
    assert.deepEqual(entityCodes("99"), []);
    assert.deepEqual(modifier1Codes("99"), []);
    assert.deepEqual(modifier2Codes("99"), []);
  });
});

describe("catalog lookups", () => {
  it("returns sorted, frozen six-digit entity codes", () => {
    const codes = entityCodes("10");
    assert.ok(codes.length > 100, "expected a substantial land-unit catalog");
    assert.equal(Object.isFrozen(codes), true);
    for (const code of codes) {
      assert.match(code, /^\d{6}$/);
    }
    assert.deepEqual([...codes], [...codes].sort());
  });

  it("recognizes known entity codes and rejects unknown ones", () => {
    const [first] = entityCodes("10");
    assert.ok(first !== undefined);
    assert.equal(isKnownEntityCode("10", first), true);
    assert.equal(isKnownEntityCode("10", "999999"), false);
    assert.equal(isKnownEntityCode("99", first), false);
  });

  it("recognizes modifier codes per symbol set", () => {
    const modifiers1 = modifier1Codes("10");
    assert.ok(modifiers1.length > 0);
    assert.equal(isKnownModifier1Code("10", modifiers1[0]!), true);
    assert.equal(
      isKnownModifier1Code("10", absentTwoDigitCode(modifiers1)),
      false,
    );

    const modifiers2 = modifier2Codes("10");
    assert.ok(modifiers2.length > 0);
    assert.equal(isKnownModifier2Code("10", modifiers2[0]!), true);
    assert.equal(
      isKnownModifier2Code("10", absentTwoDigitCode(modifiers2)),
      false,
    );
  });

  it("keeps symbol-set catalogs independent", () => {
    const landUnit = new Set(entityCodes("10"));
    const seaSurface = new Set(entityCodes("30"));
    assert.notDeepEqual([...landUnit].sort(), [...seaSurface].sort());
  });
});
