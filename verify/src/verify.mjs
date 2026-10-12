// The checks. Each check is { name, ok, detail }. A result is VERIFIED only when every check passes.
import { GOLDEN, commitmentMemo, drawWinners, listFingerprint, sortList } from "./draw.mjs";
import { blockhashOf, earlierCommitments, finalizedBlocks, finalizedSlot, readMemoTransaction } from "./chain.mjs";
import { ENGINE_WALLET, REGISTRATIONS, RULE_NOTICE_HOURS, registrationFor, registrationMemo } from "./known.mjs";

const HOUR = 3_600_000;
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

function collector() {
  const checks = [];
  const add = (name, ok, detail = "") => { checks.push({ name, ok: !!ok, detail }); return !!ok; };
  return { checks, add };
}

// Golden draw of one Drop. `golden` is the Golden file, `report` the Drop report (or null), `call` the RPC.
export async function verifyGolden(drop, golden, report, call) {
  const { checks, add } = collector();

  // 1. The file is the live mainnet Golden file of this Drop, sent by the public engine wallet.
  add("the file is the live mainnet Golden file of this Drop",
    golden.version === 1 && golden.turn === drop && golden.network === "mainnet-beta" && (golden.mode ?? "live") === "live" && golden.verifiable !== false,
    `Drop #${golden.turn}, ${golden.network}, ${golden.mode ?? "live"}`);
  add("the engine wallet is the public engine wallet", golden.engineWallet === ENGINE_WALLET, String(golden.engineWallet));

  // 2. The list: valid addresses, no repeats, sorted by character code.
  const list = Array.isArray(golden.list) ? golden.list : [];
  let listOk = false;
  try {
    listOk = sameList(sortList(list), list);
    add("the list is valid and sorted", listOk, listOk ? `${list.length} wallets` : "the list is not in the required order");
  } catch (err) {
    add("the list is valid and sorted", false, err.message);
  }

  // 3. Fingerprint of the list.
  const fp = listFingerprint(list);
  add("the list matches its fingerprint", fp === golden.fingerprint, fp === golden.fingerprint ? fp : `SHA256 of the list is ${fp}`);

  // 4. The Drop report tells the same story as the Golden file.
  const g = report?.golden;
  if (!g) {
    add("the Drop report agrees with the Golden file", false, report ? "the Drop report has no Golden section" : "the Drop report was not found");
  } else {
    const ranked = [...(g.winners ?? [])].sort((a, b) => a.rank - b.rank).map((w) => w.wallet);
    // The report lists the winners once their prizes are recorded; until then its winner list is empty.
    const winnersOk = ranked.length === 0 || sameList(ranked, golden.winners ?? []);
    const ok = report.turn === drop && g.listFingerprint === golden.fingerprint && g.listSize === list.length
      && g.commitmentSignature === golden.commitment?.signature && g.commitmentSlot === golden.commitment?.slot
      && g.seedSlot === golden.seed?.slot && g.seedBlockhash === golden.seed?.blockhash && winnersOk;
    add("the Drop report agrees with the Golden file", ok,
      !ok ? "the Drop report and the Golden file do not match"
        : ranked.length === 0 ? "same list, commitment and seed (the report lists no winners yet)" : "same list, commitment, seed and winners");
  }

  // 5. The commitment transaction on chain.
  const expectedMemo = commitmentMemo(drop, golden.fingerprint);
  const c = golden.commitment;
  const tx = c?.signature ? await readMemoTransaction(call, c.signature) : null;
  if (!tx) {
    add("the commitment is on chain", false, c?.signature ? "transaction not found (or not finalized yet)" : "the file has no commitment");
  } else {
    const signed = tx.signers.includes(ENGINE_WALLET);
    const ok = tx.succeeded && signed && tx.memos.includes(expectedMemo) && tx.slot === c.slot && c.memo === expectedMemo;
    add("the commitment was sent by the engine wallet, with the exact memo, at the stated slot", ok,
      ok ? `slot ${tx.slot}: "${expectedMemo}"`
        : `succeeded ${tx.succeeded}, engine signed ${signed}, memo on chain ${JSON.stringify(tx.memos)}, slot on chain ${tx.slot}`);

    // 6. It must be the first commitment for this Drop: no second chance at a different list.
    const others = await earlierCommitments(call, ENGINE_WALLET, drop, c.signature, tx.slot);
    add("it is the first commitment for this Drop", others.length === 0,
      others.length === 0 ? "no earlier commitment found" : `earlier commitment(s): ${others.map((o) => `${o.signature} at slot ${o.slot}`).join(", ")}`);
  }

  // 7. The seed: the first finalized block at least GOLDEN.seedSlotGap slots after the commitment.
  const seedName = `the seed is the first finalized block at least ${GOLDEN.seedSlotGap} slots after the commitment`;
  const seedSlot = golden.seed?.slot;
  if (!c || !Number.isInteger(c.slot) || !Number.isInteger(seedSlot)) {
    add(seedName, false, "the file has no commitment slot or seed slot");
  } else {
    const from = c.slot + GOLDEN.seedSlotGap;
    if (seedSlot < from) {
      add(seedName, false, `seed slot ${seedSlot} is before slot ${from}`);
    } else if (seedSlot > (await finalizedSlot(call))) {
      add(seedName, false, `seed slot ${seedSlot} is not finalized yet`);
    } else {
      const blocks = await finalizedBlocks(call, from, seedSlot);
      add(seedName, blocks[0] === seedSlot,
        blocks[0] === seedSlot ? `slot ${seedSlot} (${seedSlot - c.slot} slots after the commitment)`
          : `the first finalized block from slot ${from} is ${blocks[0]}, not ${seedSlot}`);
    }
    // 8. The blockhash of that block.
    try {
      const blockhash = await blockhashOf(call, seedSlot);
      add("the seed blockhash matches the chain", blockhash === golden.seed.blockhash, blockhash);
    } catch (err) {
      add("the seed blockhash matches the chain", false, err.message);
    }
  }

  // 9. Do the draw again.
  if (listOk) {
    try {
      const { winners } = drawWinners(list, golden.seed.blockhash);
      const same = sameList(winners, golden.winners ?? []);
      add("the winners drawn again are the same", same, same ? winners.join(", ") : `drawn again: ${winners.join(", ")}`);
    } catch (err) {
      add("the winners drawn again are the same", false, err.message);
    }
  } else {
    add("the winners drawn again are the same", false, "the list is not valid, so the draw cannot be repeated");
  }
  return checks;
}

// Which rules this Drop used: its report must name the fingerprints registered for it.
export function verifyDropRules(drop, report) {
  const { checks, add } = collector();
  for (const [kind, field] of [["public rules", "publicRulesFingerprint"], ["thresholds", "thresholdsFingerprint"]]) {
    const reg = registrationFor(kind, drop);
    const used = report?.[field] ?? null;
    add(`this Drop used the registered ${kind}`, reg !== null && used === reg.fingerprint,
      reg === null ? `no ${kind} registration is known for Drop #${drop}` : used === reg.fingerprint ? used : `the report says ${used}, the registration says ${reg.fingerprint}`);
  }
  return checks;
}

// The rule registrations themselves: on chain, from the engine wallet, exact memo, at least 48 hours early.
export async function verifyRegistrations(call) {
  const { checks, add } = collector();
  for (const r of REGISTRATIONS) {
    const memo = registrationMemo(r);
    const tx = await readMemoTransaction(call, r.signature);
    if (!tx) {
      add(`${r.kind} registration is on chain`, false, `transaction ${r.signature} not found`);
      continue;
    }
    add(`${r.kind} registration: sent by the engine wallet with the exact memo`,
      tx.succeeded && tx.signers.includes(ENGINE_WALLET) && tx.memos.includes(memo),
      tx.memos.includes(memo) ? `"${memo}"` : `memo on chain ${JSON.stringify(tx.memos)}`);
    const landed = tx.blockTime === null ? null : tx.blockTime * 1000;
    const deadline = Date.parse(r.startsAt) - RULE_NOTICE_HOURS * HOUR;
    add(`${r.kind} registration: landed at least ${RULE_NOTICE_HOURS} hours before Drop #${r.fromDrop}`,
      landed !== null && landed <= deadline,
      landed === null ? "no block time" : `landed ${new Date(landed).toISOString()}, Drop #${r.fromDrop} at ${r.startsAt}, ${((Date.parse(r.startsAt) - landed) / HOUR).toFixed(1)} hours ahead`);
  }
  return checks;
}

export function printChecks(title, checks, log = console.log) {
  log(title);
  for (const c of checks) log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ": " + c.detail : ""}`);
  const ok = checks.length > 0 && checks.every((c) => c.ok);
  log(ok ? "  RESULT: VERIFIED" : "  RESULT: NOT VERIFIED");
  return ok;
}
