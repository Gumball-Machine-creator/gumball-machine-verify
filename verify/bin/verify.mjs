#!/usr/bin/env node
// Gumball Machine verify program. Read only: it never signs or sends anything.
//
//   node bin/verify.mjs drop <n> [--rpc <url>]
//       Downloads the public files of Drop number n and checks its Golden draw and the rules it used.
//   node bin/verify.mjs drop <n> --golden <file> --report <file> [--rpc <url>]
//       The same, with files you saved yourself (nothing is downloaded).
//   node bin/verify.mjs rules [--rpc <url>]
//       Checks the on chain rule registrations: engine wallet, exact memo, 48 hours of notice.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { downloadDrop, dropUrl, goldenUrl } from "../src/data.mjs";
import { PUBLIC_MAINNET_RPC, rpcClient } from "../src/rpc.mjs";
import { printChecks, verifyDropRules, verifyGolden, verifyRegistrations } from "../src/verify.mjs";

const USAGE = `Usage:
  node bin/verify.mjs drop <n> [--rpc <url>]
  node bin/verify.mjs drop <n> --golden <golden file> --report <drop report file> [--rpc <url>]
  node bin/verify.mjs rules [--rpc <url>]`;

function option(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
  return value;
}

export async function main(args, { log = console.log, fetchFn = fetch } = {}) {
  const [command, arg] = args;
  const rpc = option(args, "--rpc") ?? PUBLIC_MAINNET_RPC;
  const call = rpcClient(rpc, { fetchFn });

  if (command === "rules") {
    log(`Checking the rule registrations on Solana mainnet (RPC: ${new URL(rpc).host})\n`);
    return printChecks("Rule registrations", await verifyRegistrations(call), log) ? 0 : 1;
  }

  if (command === "drop") {
    const drop = Number(arg);
    if (!Number.isSafeInteger(drop) || drop < 1) throw new Error("the Drop number must be a whole number from 1 up");
    const goldenFile = option(args, "--golden");
    const reportFile = option(args, "--report");
    let golden, report;
    if (goldenFile || reportFile) {
      if (!goldenFile || !reportFile) throw new Error("use --golden and --report together");
      golden = JSON.parse(readFileSync(goldenFile, "utf8"));
      report = JSON.parse(readFileSync(reportFile, "utf8"));
    } else {
      log(`Downloading:\n  ${goldenUrl(drop)}\n  ${dropUrl(drop)}`);
      ({ golden, report } = await downloadDrop(drop, fetchFn));
    }
    if (!golden && !report) {
      log(`Nothing is published for Drop #${drop} yet.`);
      return 1;
    }
    log(`Checking Gumball Drop #${drop} on Solana mainnet (RPC: ${new URL(rpc).host})\n`);

    const rulesOk = printChecks("Rules used by this Drop", verifyDropRules(drop, report), log);
    log("");
    if (!golden) {
      log(`Golden draw\n  No Golden file is published for Drop #${drop}.`);
      log(report?.goldenNote ? `  The Drop report says: ${report.goldenNote}` : "  The Drop may not have happened yet, or it had no Golden draw.");
      return rulesOk ? 0 : 1;
    }
    const goldenOk = printChecks("Golden draw", await verifyGolden(drop, golden, report, call), log);
    return rulesOk && goldenOk ? 0 : 1;
  }

  log(USAGE);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(2);
    });
}
