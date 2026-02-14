import { describe, expect, it } from 'vitest';
import { canonicalJsonStringify } from '../../app/lib/canonical-json.js';

describe('canonicalJsonStringify', () => {
  it('sorts object keys deterministically', () => {
    const a = { b: 2, a: 1 };
    const b = { a: 1, b: 2 };
    expect(canonicalJsonStringify(a)).toBe('{"a":1,"b":2}');
    expect(canonicalJsonStringify(b)).toBe('{"a":1,"b":2}');
  });

  it('omits undefined object values and encodes undefined array entries as null', () => {
    const v = { a: undefined, b: 1, c: [undefined, 2] };
    expect(canonicalJsonStringify(v)).toBe('{"b":1,"c":[null,2]}');
  });

  it('canonicalizes nested objects', () => {
    const v = { z: { b: 2, a: 1 }, a: true };
    expect(canonicalJsonStringify(v)).toBe('{"a":true,"z":{"a":1,"b":2}}');
  });
});

