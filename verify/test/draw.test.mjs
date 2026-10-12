import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { decode, decode32, encode, isValidAddress } from "../src/base58.mjs";
import { commitmentMemo, drawWinners, listFingerprint, pickIndex, sortList } from "../src/draw.mjs";
import { load } from "./mock.mjs";

test("base58: known addresses read back the same", () => {
  for (const a of ["11111111111111111111111111111111", "So11111111111111111111111111111111111111112", "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"]) {
    assert.equal(encode(decode32(a)), a);
  }
  assert.deepEqual([...decode("11111111111111111111111111111111")], new Array(32).fill(0));
});

test("base58: random bytes survive a round trip, leading zeros included", () => {
  for (let i = 0; i < 500; i++) {
    const b = randomBytes(32);
    if (i % 5 === 0) b[0] = 0;
    if (i % 10 === 0) b[1] = 0;
    assert.deepEqual([...decode(encode(b))], [...b]);
  }
});

test("base58: bad text is refused", () => {
  assert.equal(isValidAddress("not-an-address"), false);
  assert.equal(isValidAddress("0OIl"), false);
  assert.equal(isValidAddress("abc"), false); // too short
  assert.equal(isValidAddress("So111111111111111111111111111111111111111121"), false); // too long
  assert.equal(isValidAddress(""), false);
});

test("the list is sorted by character code and refuses repeats and bad addresses", () => {
  const known = [
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s", "So11111111111111111111111111111111111111112",
    "11111111111111111111111111111111", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  ];
  assert.deepEqual(sortList(known).map((a) => a.slice(0, 4)), ["1111", "ATok", "Memo", "So11", "Toke", "meta"]);
  assert.throws(() => sortList([known[0], known[0]]), /twice/);
  assert.throws(() => sortList(["not-an-address"]), /not a valid address/);
});

test("the fingerprint is SHA256 of the list file (every address plus a line break)", () => {
  const { list, fingerprint } = load("golden-7.json");
  const independent = createHash("sha256").update(list.join("\n") + "\n").digest("hex");
  assert.equal(listFingerprint(list), independent);
  assert.equal(listFingerprint(list), fingerprint);
  assert.notEqual(listFingerprint(list.slice(1)), fingerprint);
});

test("the commitment memo text", () => {
  assert.equal(commitmentMemo(12, "ab".repeat(32)), `GUMBALL Drop #12 list: ${"ab".repeat(32)}`);
});

test("pickIndex keeps every position equally likely", () => {
  const max = (1n << 64n) - 1n;
  assert.equal(pickIndex(0n, 3), 0);
  assert.equal(pickIndex(max, 3), null); // the one unfair number for 3 positions is thrown away
  assert.equal(pickIndex(max, 4), 3); // nothing is thrown away when n is a power of 2
  assert.throws(() => pickIndex(1n, 0));
});

test("the draw gives the same winners every time (known answer for the example Drop)", () => {
  const g = load("golden-7.json");
  const expected = [
    "7cw3qHJR9VJwo6576oP7GGXfHC3bGXnbbYKCqK8qmdZd", "Fe3w1o6bybBmxDuLF6BnLeccyLYkTBvRbJAbzZsJaYMw",
    "GLEcDJySsqwSzef1wewNokyL8YGAme8fk9pcMZ8AUzxg", "HsX8gko7aRMXLCYV776nZWQAv7xhLwsp1rJYJMB6g8Kk",
    "4Lkp3aTMcXMjC8YS7qJQJhQUnqijq6FKQ9uRY5X6qM8d", "5h6vfBStaUDex68rTSh4fD3DK9ZS2ngjBXf9CAFpJ51x",
    "EqDHdSjS1MiTvpfxhEVyV1ZyaDcK1MgUtF3xDo6a2YaR", "83oRdzzqDR7yrytLAe7niE3GUWE1Mest8BApzmoGh9vn",
    "35ULHpsCkGHgwtu49MDKY5N6GNdtbaZ1aDStrxbwBoUT", "4TvVA3RLhbiUYS2xxbNYiXZx1GKVWYJf8ECoFeu9qP4N",
  ];
  assert.deepEqual(drawWinners(g.list, g.seed.blockhash).winners, expected);
  assert.deepEqual(g.winners, expected);
});

test("the draw: different winners, never more than the list, a new seed changes the result", () => {
  const g = load("golden-7.json");
  const few = drawWinners(g.list.slice(0, 4), g.seed.blockhash);
  assert.equal(few.winners.length, 4);
  assert.equal(new Set(few.winners).size, 4);
  const other = encode(createHash("sha256").update("another seed").digest());
  assert.notDeepEqual(drawWinners(g.list, other).winners, g.winners);
});
