export function base64Encode(input: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary);
  return urlSafe ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') : encoded;
}

export function base64Decode(input: string, urlSafe = false): string {
  let value = input.trim();
  if (urlSafe) {
    value = value.replace(/-/g, '+').replace(/_/g, '/');
    while (value.length % 4) value += '=';
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export const urlEncode = (input: string, component = true) =>
  component ? encodeURIComponent(input) : encodeURI(input);
export const urlDecode = (input: string, component = true) =>
  component ? decodeURIComponent(input) : decodeURI(input);

export function unicodeEscape(input: string): string {
  let output = '';
  for (const character of input) {
    const code = character.codePointAt(0)!;
    if (code < 0x80) output += character;
    else if (code <= 0xffff) output += `\\u${code.toString(16).padStart(4, '0')}`;
    else {
      const high = 0xd800 + ((code - 0x10000) >> 10);
      const low = 0xdc00 + ((code - 0x10000) & 0x3ff);
      output += `\\u${high.toString(16).padStart(4, '0')}\\u${low.toString(16).padStart(4, '0')}`;
    }
  }
  return output;
}

export const unicodeUnescape = (input: string) =>
  input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));

export function hexEncode(input: string, separator = ''): string {
  return Array.from(new TextEncoder().encode(input), (byte) => byte.toString(16).padStart(2, '0')).join(separator);
}

export function hexDecode(input: string): string {
  const clean = input.replace(/[\s:-]+/g, '').replace(/^0x/i, '');
  if (clean.length % 2) throw new Error('Hex 字符串长度必须为偶数');
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('包含非 Hex 字符');
  const bytes = new Uint8Array(clean.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

async function digest(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512', input: string) {
  const buffer = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const sha1 = (input: string) => digest('SHA-1', input);
export const sha256 = (input: string) => digest('SHA-256', input);
export const sha512 = (input: string) => digest('SHA-512', input);

export function md5(input: string): string {
  const message = Array.from(new TextEncoder().encode(input));
  const originalLength = message.length;
  message.push(0x80);
  while (message.length % 64 !== 56) message.push(0);
  const bitLength = originalLength * 8;
  const low = bitLength >>> 0;
  const high = Math.floor(bitLength / 0x100000000) >>> 0;
  for (let index = 0; index < 4; index++) message.push((low >>> (8 * index)) & 0xff);
  for (let index = 0; index < 4; index++) message.push((high >>> (8 * index)) & 0xff);
  const constants = [
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391
  ];
  const shifts = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const rotate = (value: number, amount: number) => ((value << amount) | (value >>> (32 - amount))) >>> 0;
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let chunk = 0; chunk < message.length; chunk += 64) {
    const words = new Array<number>(16);
    for (let index = 0; index < 16; index++) {
      const offset = chunk + index * 4;
      words[index] = (message[offset] | (message[offset + 1] << 8) | (message[offset + 2] << 16) | (message[offset + 3] << 24)) >>> 0;
    }
    let a = a0, b = b0, c = c0, d = d0;
    for (let index = 0; index < 64; index++) {
      let value: number;
      let word: number;
      if (index < 16) { value = (b & c) | (~b & d); word = index; }
      else if (index < 32) { value = (d & b) | (~d & c); word = (5 * index + 1) % 16; }
      else if (index < 48) { value = b ^ c ^ d; word = (3 * index + 5) % 16; }
      else { value = c ^ (b | ~d); word = (7 * index) % 16; }
      value = (value + a + constants[index] + words[word]) >>> 0;
      a = d; d = c; c = b; b = (b + rotate(value, shifts[index])) >>> 0;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  const littleEndian = (value: number) => Array.from({ length: 4 }, (_, index) => ((value >>> (index * 8)) & 0xff).toString(16).padStart(2, '0')).join('');
  return littleEndian(a0) + littleEndian(b0) + littleEndian(c0) + littleEndian(d0);
}

export interface JwtParts { header: string; payload: string; signature: string }

export function decodeJwt(input: string): JwtParts {
  const parts = input.trim().split('.');
  if (parts.length !== 3) throw new Error('JWT 应有 3 段');
  const decode = (value: string) => {
    const text = base64Decode(value, true);
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  };
  return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2] };
}
