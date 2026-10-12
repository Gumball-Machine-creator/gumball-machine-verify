#!/usr/bin/env node
// Recomputes the fingerprint (SHA256) of the public rules file and says whether it matches the registered one.
// Usage (needs only Node.js 20 or newer): node rules/check.mjs [file]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const REGISTERED = "0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e";
const file = process.argv[2] ?? new URL("./public_rules.json", import.meta.url);

const fingerprint = createHash("sha256").update(readFileSync(file)).digest("hex");
console.log(`Fingerprint of the file: ${fingerprint}`);
console.log(`Registered on chain:     ${REGISTERED}`);
if (fingerprint === REGISTERED) {
  console.log("MATCH: this is exactly the public rules file that was registered.");
} else {
  console.log("NO MATCH: this file is not the registered public rules file.");
  process.exitCode = 1;
}
