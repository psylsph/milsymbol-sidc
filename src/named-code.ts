/**
 * Named codes: objects that carry a SIDC field code together with its label
 * from the standard. Generated catalogs (for example `milsymbol-sidc/2525d`)
 * are built from these; the builder setters accept them wherever they accept
 * the raw code string.
 */

/** Which builder setter a named code belongs to. */
export type NamedCodeKind =
  "symbolSet" | "entity" | "specialSubtype" | "modifier1" | "modifier2";

/**
 * A field code with its label. `kind` and `symbolSet` are optional so a plain
 * `{ code: "09" }` is accepted too; when present, the builder uses them to
 * reject a code passed to the wrong setter or used with another symbol set.
 */
export interface NamedCode<
  K extends NamedCodeKind = NamedCodeKind,
  C extends string = string,
> {
  readonly code: C;
  readonly label?: string;
  readonly kind?: K;
  /** Symbol set the code belongs to (absent on symbol-set codes). */
  readonly symbolSet?: string;
}

/** Entity code as its three two-digit levels (positions 11–16). */
export interface SidcEntityParts {
  /** Positions 11–12. */
  entity: string;
  /** Positions 13–14; defaults to `"00"`. */
  type?: string;
  /** Positions 15–16; defaults to `"00"`. */
  subtype?: string | NamedCode<"specialSubtype">;
}

/** @internal `true` for an object carrying a string `code`. */
export function isNamedCode(value: unknown): value is NamedCode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { code?: unknown }).code === "string"
  );
}

type Node<K extends NamedCodeKind, C extends string> = {
  readonly code: C;
  readonly label: string;
  readonly kind: K;
  readonly symbolSet: string;
};

/** @internal Builds a frozen symbol-set node holding its catalog groups. */
export function symbolSetNode<
  const C extends string,
  const T extends Record<string, unknown>,
>(
  code: C,
  label: string,
  groups: T,
): Readonly<{ code: C; label: string; kind: "symbolSet" }> & Readonly<T> {
  return Object.freeze({
    code,
    label,
    kind: "symbolSet" as const,
    ...groups,
  });
}

/** @internal Builds a frozen named code, optionally with child nodes. */
export function codeNode<
  K extends NamedCodeKind,
  const C extends string,
  const T extends Record<string, unknown> = Record<never, never>,
>(
  kind: K,
  symbolSet: string,
  code: C,
  label: string,
  children?: T,
): Node<K, C> & Readonly<T> {
  return Object.freeze({
    code,
    label,
    kind,
    symbolSet,
    ...(children as T),
  });
}

/** @internal Freezes a plain group object of nodes. */
export function group<const T extends Record<string, unknown>>(
  nodes: T,
): Readonly<T> {
  return Object.freeze(nodes);
}
