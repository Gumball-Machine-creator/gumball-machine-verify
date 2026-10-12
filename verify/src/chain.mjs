// Reads what the checks need from the Solana blockchain. Read only: nothing is ever signed or sent.
import { MEMO_PROGRAM_ID } from "./known.mjs";
import { GOLDEN } from "./draw.mjs";

const FINALIZED = { commitment: "finalized" };

// One transaction: did it succeed, who signed it, which memo(s) it carries, its slot and time.
export async function readMemoTransaction(call, signature) {
  const tx = await call("getTransaction", [signature, { ...FINALIZED, encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
  if (!tx) return null;
  const message = tx.transaction.message;
  const memos = message.instructions
    .filter((ix) => ix.programId === MEMO_PROGRAM_ID && typeof ix.parsed === "string")
    .map((ix) => ix.parsed);
  return {
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    succeeded: tx.meta?.err == null,
    signers: message.accountKeys.filter((k) => k.signer).map((k) => k.pubkey),
    memos,
  };
}

// Successful Golden commitments for Drop number `drop` that the engine wallet sent BEFORE the given transaction.
// Looks back `lookbackSlots` slots before it (about 4 to 5 days by default; Drops are one day apart).
export async function earlierCommitments(call, engineWallet, drop, signature, commitSlot, lookbackSlots = 1_000_000) {
  const needle = `${GOLDEN.commitMemoPrefix}${drop} list:`;
  const found = [];
  let before = signature;
  for (;;) {
    const page = await call("getSignaturesForAddress", [engineWallet, { ...FINALIZED, before, limit: 1000 }]);
    for (const s of page) {
      if (s.err == null && typeof s.memo === "string" && s.memo.includes(needle)) found.push({ signature: s.signature, slot: s.slot });
    }
    const last = page.at(-1);
    if (page.length < 1000 || !last || last.slot < commitSlot - lookbackSlots) break;
    before = last.signature;
  }
  return found;
}

export const finalizedSlot = (call) => call("getSlot", [FINALIZED]);

// Slots that have a finalized block, from `from` to `to` (both included).
export const finalizedBlocks = (call, from, to) => call("getBlocks", [from, to, FINALIZED]);

// The blockhash of a finalized block.
export async function blockhashOf(call, slot) {
  const block = await call("getBlock", [slot, {
    ...FINALIZED, encoding: "json", transactionDetails: "none", rewards: false, maxSupportedTransactionVersion: 0,
  }]);
  if (!block) throw new Error(`block ${slot} not found (skipped or not finalized)`);
  return block.blockhash;
}
