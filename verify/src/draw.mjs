// The Golden Gumball draw. Pure maths: no network and no randomness of its own.
// Anyone who repeats these steps with the published list and seed gets the same winners.
import { createHash } from "node:crypto";
import { decode32, isValidAddress } from "./base58.mjs";

export const GOLDEN = Object.freeze({
  winners: 10, // up to 10 Golden Gumballs per Drop
  hashDomain: "GUMBALL-GOLDEN-v1", // text at the start of every draw hash
  commitMemoPrefix: "GUMBALL Drop #", // commitment memo: "GUMBALL Drop #<n> list: <fingerprint>"
  seedSlotGap: 32, // the seed is the first finalized block at least this many slots after the commitment
});

const TWO_64 = 1n << 64n;
const sha256 = (data) => createHash("sha256").update(data).digest();

// Sort by character code (digits, then "A" to "Z", then "a" to "z"). Refuses bad or repeated addresses.
export function sortList(addresses) {
  if (!Array.isArray(addresses)) throw new Error("the list is not a list");
  for (const a of addresses) if (!isValidAddress(a)) throw new Error(`not a valid address: ${a}`);
  if (new Set(addresses).size !== addresses.length) throw new Error("the list has the same address twice");
  return [...addresses].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// The list file: every address followed by a line break.
export const listFileText = (sorted) => sorted.map((a) => a + "\n").join("");

// SHA256 of the list file as 64 lowercase hex characters (the same as "sha256sum" of that file).
export const listFingerprint = (sorted) => sha256(listFileText(sorted)).toString("hex");

export const commitmentMemo = (drop, fingerprint) => `${GOLDEN.commitMemoPrefix}${drop} list: ${fingerprint}`;

// Turns a 64 bit number into a position from 0 to n minus 1, or null when the number must be thrown away.
// Throwing away the few numbers at the very top keeps every position's chance exactly equal.
export function pickIndex(x, n) {
  if (n <= 0) throw new Error("cannot pick from an empty list");
  const limit = TWO_64 - (TWO_64 % BigInt(n));
  return x >= limit ? null : Number(x % BigInt(n));
}

// Picks up to `count` different winners from the sorted list, using the seed blockhash.
export function drawWinners(sorted, blockhash, count = GOLDEN.winners) {
  const seed = Buffer.from(decode32(blockhash));
  const domain = Buffer.from(GOLDEN.hashDomain, "utf8");
  const remaining = [...sorted];
  const winners = [];
  const steps = [];
  let counter = 0;
  while (winners.length < count && remaining.length > 0) {
    const counterBytes = Buffer.alloc(4);
    counterBytes.writeUInt32BE(counter);
    const x = sha256(Buffer.concat([domain, seed, counterBytes])).readBigUInt64BE(0);
    const listSize = remaining.length;
    const index = pickIndex(x, listSize);
    const winner = index === null ? null : remaining.splice(index, 1)[0];
    steps.push({ counter, x: x.toString(), listSize, index, winner });
    if (winner) winners.push(winner);
    counter++;
  }
  return { winners, steps };
}
