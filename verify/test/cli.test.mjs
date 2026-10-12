import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { main } from "../bin/verify.mjs";
import { dropUrl, goldenUrl } from "../src/data.mjs";
import { TEST_RPC, load, mockFetch } from "./mock.mjs";

const DROP = 7;
const fixtures = () => ({ drop: DROP, chain: load(`chain-${DROP}.json`), golden: load(`golden-${DROP}.json`), report: load(`drop-${DROP}.json`) });
const quiet = () => {
  const lines = [];
  return { lines, log: (line) => lines.push(line) };
};

test("verify drop <n> downloads only the two public Drop files and says VERIFIED", async () => {
  const { fetchFn, asked } = mockFetch(fixtures());
  const out = quiet();
  assert.equal(await main(["drop", String(DROP), "--rpc", TEST_RPC], { fetchFn, log: out.log }), 0);
  assert.deepEqual([...new Set(asked.filter((u) => u !== TEST_RPC))].sort(), [dropUrl(DROP), goldenUrl(DROP)].sort());
  assert.equal(goldenUrl(DROP), "https://data.gumballmachine.fun/v1/golden/7.json");
  assert.equal(dropUrl(DROP), "https://data.gumballmachine.fun/v1/drops/7.json");
  assert.equal(out.lines.filter((l) => l.includes("RESULT: VERIFIED")).length, 2);
  assert.ok(!out.lines.some((l) => l.includes("FAIL")));
});

test("verify drop <n> with saved files downloads nothing", async () => {
  const { fetchFn, asked } = mockFetch(fixtures());
  const file = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
  const args = ["drop", String(DROP), "--golden", file(`golden-${DROP}.json`), "--report", file(`drop-${DROP}.json`), "--rpc", TEST_RPC];
  assert.equal(await main(args, { fetchFn, log: quiet().log }), 0);
  assert.ok(asked.every((u) => u === TEST_RPC));
});

test("a changed file makes the program exit with 1", async () => {
  const f = fixtures();
  f.golden.winners.reverse();
  const out = quiet();
  assert.equal(await main(["drop", String(DROP), "--rpc", TEST_RPC], { fetchFn: mockFetch(f).fetchFn, log: out.log }), 1);
  assert.ok(out.lines.some((l) => l.includes("RESULT: NOT VERIFIED")));
});

test("a Drop that is not published yet is reported plainly", async () => {
  const out = quiet();
  const { fetchFn } = mockFetch({ ...fixtures(), golden: null, report: null });
  assert.equal(await main(["drop", String(DROP), "--rpc", TEST_RPC], { fetchFn, log: out.log }), 1);
  assert.ok(out.lines.some((l) => l.includes("Nothing is published for Drop #7 yet.")));
});

test("verify rules checks the registrations", async () => {
  const { fetchFn } = mockFetch(fixtures());
  assert.equal(await main(["rules", "--rpc", TEST_RPC], { fetchFn, log: quiet().log }), 0);
});

test("a bad command prints the usage", async () => {
  const out = quiet();
  assert.equal(await main([], { log: out.log }), 2);
  assert.ok(out.lines[0].startsWith("Usage:"));
});
