import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  base64Decode,
  base64Encode,
  decodeJwt,
  hexDecode,
  hexEncode,
  md5,
  sha256,
  unicodeEscape,
  unicodeUnescape,
  urlDecode,
  urlEncode
} from '../src/codec.ts';

describe('shared codec core', () => {
  it('roundtrips text through every reversible codec', () => {
    const input = '你好 AT Codec';
    assert.equal(base64Decode(base64Encode(input)), input);
    assert.equal(base64Decode(base64Encode(input, true), true), input);
    assert.equal(urlDecode(urlEncode(input)), input);
    assert.equal(unicodeUnescape(unicodeEscape(input)), input);
    assert.equal(hexDecode(hexEncode(input, ':')), input);
  });

  it('matches known hash vectors and decodes JWT', async () => {
    assert.equal(md5(''), 'd41d8cd98f00b204e9800998ecf8427e');
    assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature';
    assert.match(decodeJwt(token).payload, /"sub": "123"/);
  });
});

