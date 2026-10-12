// Writes the made up example Drop used by the offline tests. Nothing here is a real Drop or a real person's wallet:
// every wallet, signature and blockhash below comes from hashing a fixed text, so anyone can rebuild the same files.
// Run it from the verify folder: node test/fixtures/make.mjs
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { encode } from "../../src/base58.mjs";
import { commitmentMemo, drawWinners, listFingerprint, sortList } from "../../src/draw.mjs";
import { ENGINE_WALLET, MEMO_PROGRAM_ID, REGISTRATIONS, registrationMemo } from "../../src/known.mjs";

const bytes = (text, n = 32) => {
  const out = Buffer.alloc(n);
  for (let i = 0; i < n; i += 32) createHash("sha256").update(`${text} ${i}`).digest().copy(out, i);
  return out;
};
const DROP = 7;
const dir = new URL("./", import.meta.url);
const write = (name, value) => writeFileSync(new URL(name, dir), JSON.stringify(value, null, 2) + "\n");

const list = sortList(Array.from({ length: 25 }, (_, i) => encode(bytes(`example wallet ${i}`))));
const fingerprint = listFingerprint(list);
const memo = commitmentMemo(DROP, fingerprint);
const commitSignature = encode(bytes("example commitment", 64));
const commitSlot = 400_000_000;
const seedSlot = commitSlot + 33; // slot commitSlot + 32 is skipped (no block), so the seed is the next one
const blockhash = encode(bytes("example seed block"));
const { winners } = drawWinners(list, blockhash);

write(`golden-${DROP}.json`, {
  mode: "live", version: 1, name: `Gumball Drop #${DROP}`, network: "mainnet-beta", turn: DROP, engineWallet: ENGINE_WALLET,
  list, fingerprint, commitment: { signature: commitSignature, slot: commitSlot, memo },
  seed: { slot: seedSlot, blockhash }, winners, verifiable: true,
});

write(`drop-${DROP}.json`, {
  mode: "live", turn: DROP, name: `Gumball Drop #${DROP}`, status: "finished", completed: true,
  thresholdsFingerprint: REGISTRATIONS.find((r) => r.kind === "thresholds").fingerprint,
  publicRulesFingerprint: REGISTRATIONS.find((r) => r.kind === "public rules").fingerprint,
  goldenNote: null,
  golden: {
    listSize: list.length, listFingerprint: fingerprint, commitmentMemo: memo, commitmentSignature: commitSignature,
    commitmentSlot: commitSlot, seedSlot, seedBlockhash: blockhash,
    winners: winners.map((wallet, i) => ({ rank: i + 1, wallet, prizeLamports: "1000000", handling: "coin_jar" })),
  },
});

// What a Solana RPC endpoint would answer for this example (only the fields the program reads).
const memoTx = (slot, blockTime, text) => ({
  slot, blockTime, meta: { err: null },
  transaction: { message: {
    accountKeys: [{ pubkey: ENGINE_WALLET, signer: true, writable: true, source: "transaction" }],
    instructions: [{ programId: MEMO_PROGRAM_ID, program: "spl-memo", parsed: text, stackHeight: null }],
  } },
});
const transactions = { [commitSignature]: memoTx(commitSlot, 1_792_000_000, memo) };
for (const r of REGISTRATIONS) {
  const landed = Date.parse(r.startsAt) / 1000 - 56 * 3600; // 56 hours ahead, like the real ones
  transactions[r.signature] = memoTx(368_000_000, landed, registrationMemo(r));
}
write(`chain-${DROP}.json`, {
  finalizedSlot: commitSlot + 5_000,
  blocks: [commitSlot + 33, commitSlot + 34, commitSlot + 35], // finalized blocks after the commitment
  blockhashes: { [seedSlot]: blockhash },
  transactions,
  // The engine wallet's history before the commitment: an older Drop's commitment and a payout, nothing for this Drop.
  signaturesBefore: [
    { signature: encode(bytes("example payout", 64)), slot: commitSlot - 10, err: null, memo: null },
    { signature: encode(bytes("example older commitment", 64)), slot: commitSlot - 216_000, err: null, memo: `[88] ${commitmentMemo(DROP - 1, "0".repeat(64))}` },
  ],
});
console.log(`wrote the example Drop #${DROP}: ${list.length} wallets, ${winners.length} winners`);
