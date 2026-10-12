import { test } from "node:test";
import assert from "node:assert/strict";
import { encode } from "../src/base58.mjs";
import { commitmentMemo, listFingerprint, sortList } from "../src/draw.mjs";
import { verifyDropRules, verifyGolden, verifyRegistrations } from "../src/verify.mjs";
import { copy, load, mockCall } from "./mock.mjs";

const DROP = 7;
const base = () => ({ golden: load(`golden-${DROP}.json`), report: load(`drop-${DROP}.json`), chain: load(`chain-${DROP}.json`) });
const failed = (checks) => checks.filter((c) => !c.ok).map((c) => c.name);
const run = ({ golden, report, chain }) => verifyGolden(DROP, golden, report, mockCall(chain));

test("the example Drop passes every Golden check", async () => {
  const checks = await run(base());
  assert.deepEqual(failed(checks), []);
  assert.equal(checks.length, 10);
});

test("a changed winner is caught", async () => {
  const d = base();
  d.golden.winners[0] = d.golden.list.find((w) => !d.golden.winners.includes(w));
  assert.ok(failed(await run(d)).includes("the winners drawn again are the same"));
});

test("a changed list is caught by the fingerprint", async () => {
  const d = base();
  d.golden.list = sortList([...d.golden.list.slice(1), encode(Buffer.alloc(32, 7))]);
  assert.ok(failed(await run(d)).includes("the list matches its fingerprint"));
});

test("a list out of order is caught", async () => {
  const d = base();
  d.golden.list = [...d.golden.list].reverse();
  assert.ok(failed(await run(d)).includes("the list is valid and sorted"));
});

test("a file that names another engine wallet is caught", async () => {
  const d = base();
  d.golden.engineWallet = "So11111111111111111111111111111111111111112";
  assert.ok(failed(await run(d)).includes("the engine wallet is the public engine wallet"));
});

test("a commitment memo that does not match is caught", async () => {
  const d = base();
  d.chain.transactions[d.golden.commitment.signature].transaction.message.instructions[0].parsed = commitmentMemo(DROP, "0".repeat(64));
  assert.ok(failed(await run(d)).includes("the commitment was sent by the engine wallet, with the exact memo, at the stated slot"));
});

test("a commitment signed by someone else is caught", async () => {
  const d = base();
  d.chain.transactions[d.golden.commitment.signature].transaction.message.accountKeys[0].pubkey = "So11111111111111111111111111111111111111112";
  assert.ok(failed(await run(d)).includes("the commitment was sent by the engine wallet, with the exact memo, at the stated slot"));
});

test("a missing commitment is caught", async () => {
  const d = base();
  delete d.chain.transactions[d.golden.commitment.signature];
  assert.ok(failed(await run(d)).includes("the commitment is on chain"));
});

test("an earlier commitment for the same Drop (a second try) is caught", async () => {
  const d = base();
  d.chain.signaturesBefore.push({ signature: encode(Buffer.alloc(64, 9)), slot: d.golden.commitment.slot - 100, err: null,
    memo: `[88] ${commitmentMemo(DROP, listFingerprint(d.golden.list.slice(1)))}` });
  assert.ok(failed(await run(d)).includes("it is the first commitment for this Drop"));
});

test("a failed earlier transaction does not count as a commitment", async () => {
  const d = base();
  d.chain.signaturesBefore.push({ signature: encode(Buffer.alloc(64, 9)), slot: d.golden.commitment.slot - 100,
    err: { InstructionError: [0, "Custom"] }, memo: `[88] ${commitmentMemo(DROP, "1".repeat(64))}` });
  assert.deepEqual(failed(await run(d)), []);
});

test("a seed that is not the first finalized block is caught", async () => {
  const d = base();
  const later = d.golden.seed.slot + 1;
  d.chain.blockhashes[later] = d.golden.seed.blockhash;
  d.golden.seed.slot = later;
  d.report.golden.seedSlot = later;
  assert.ok(failed(await run(d)).some((n) => n.startsWith("the seed is the first finalized block")));
});

test("a seed taken too early is caught", async () => {
  const d = base();
  d.golden.seed.slot = d.golden.commitment.slot + 5;
  assert.ok(failed(await run(d)).some((n) => n.startsWith("the seed is the first finalized block")));
});

test("a wrong blockhash is caught", async () => {
  const d = base();
  d.chain.blockhashes[d.golden.seed.slot] = encode(Buffer.alloc(32, 3));
  assert.ok(failed(await run(d)).includes("the seed blockhash matches the chain"));
});

test("a Drop report that tells a different story is caught", async () => {
  const d = base();
  const [first, second] = d.report.golden.winners;
  [first.wallet, second.wallet] = [second.wallet, first.wallet]; // the report names the winners in another order
  assert.ok(failed(await run(d)).includes("the Drop report agrees with the Golden file"));
});

test("a practice run file is not accepted as a real draw", async () => {
  const d = base();
  d.golden.mode = "practice";
  assert.ok(failed(await run(d)).includes("the file is the live mainnet Golden file of this Drop"));
});

test("the rules used by the example Drop are the registered ones", () => {
  assert.deepEqual(failed(verifyDropRules(DROP, load(`drop-${DROP}.json`))), []);
  const report = copy(load(`drop-${DROP}.json`));
  report.thresholdsFingerprint = "f".repeat(64);
  assert.deepEqual(failed(verifyDropRules(DROP, report)), ["this Drop used the registered thresholds"]);
});

test("the rule registrations pass, and a late one is caught", async () => {
  const { chain } = base();
  assert.deepEqual(failed(await verifyRegistrations(mockCall(chain))), []);
  for (const tx of Object.values(chain.transactions)) tx.blockTime += 10 * 3600; // only 46 hours ahead now
  assert.deepEqual(failed(await verifyRegistrations(mockCall(chain))), [
    "public rules registration: landed at least 48 hours before Drop #1",
    "thresholds registration: landed at least 48 hours before Drop #1",
  ]);
});
