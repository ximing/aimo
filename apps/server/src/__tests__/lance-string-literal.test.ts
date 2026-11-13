import { lanceStringLiteral } from '../utils/lance-string.js';

describe('lanceStringLiteral', () => {
  it('wraps an unquoted id the same way as manual concatenation', () => {
    const suffix = '0123456789abcdefghijklm';
    const id = `m${suffix}`;

    expect(suffix).toMatch(/^[a-z0-9]{23}$/);
    expect(id).toMatch(/^m[a-z0-9]{23}$/);
    expect(lanceStringLiteral(id)).toBe(`'${id}'`);
    expect(lanceStringLiteral(id)).toBe("'m0123456789abcdefghijklm'");
  });

  it('doubles internal quotes so the literal does not end early', () => {
    const value = "a' OR uid != 'u1";

    expect(lanceStringLiteral(value)).toBe("'a'' OR uid != ''u1'");
    expect(lanceStringLiteral(value)).not.toBe(`'${value}'`);
  });

  it('keeps an existing uid filter byte-for-byte', () => {
    expect(`uid = ${lanceStringLiteral('uabc')} AND deletedAt = 0`).toBe(
      "uid = 'uabc' AND deletedAt = 0"
    );
  });
});
