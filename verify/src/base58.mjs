// Base58 (the Bitcoin alphabet), the text format Solana uses for addresses, blockhashes and signatures.
// Written out here so this program needs no outside packages.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INDEX = new Map([...ALPHABET].map((c, i) => [c, BigInt(i)]));

export function decode(text) {
  if (typeof text !== "string" || text.length === 0) throw new Error("empty base58 text");
  let n = 0n;
  for (const c of text) {
    const v = INDEX.get(c);
    if (v === undefined) throw new Error(`not a base58 character: ${JSON.stringify(c)}`);
    n = n * 58n + v;
  }
  const bytes = [];
  while (n > 0n) {
    bytes.push(Number(n & 0xffn));
    n >>= 8n;
  }
  // Every leading "1" stands for one leading zero byte.
  for (const c of text) {
    if (c !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

export function encode(bytes) {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

// 32 bytes written in base58, in its one normal (canonical) form: an address or a blockhash.
export function decode32(text) {
  const bytes = decode(text);
  if (bytes.length !== 32) throw new Error(`expected 32 bytes, got ${bytes.length}: ${text}`);
  if (encode(bytes) !== text) throw new Error(`not in normal base58 form: ${text}`);
  return bytes;
}

export function isValidAddress(text) {
  try {
    decode32(text);
    return true;
  } catch {
    return false;
  }
}
