/**
 * Quote a value as a LanceDB string literal.
 * Only single quotes are escaped (`'` → `''`). Unquoted IDs stay byte-identical.
 */
export function lanceStringLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
