// A pretend Solana RPC endpoint and data server for the offline tests. No network is used.
import { readFileSync } from "node:fs";
import { dropUrl, goldenUrl } from "../src/data.mjs";

export const TEST_RPC = "http://rpc.test/";
export const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
export const copy = (value) => JSON.parse(JSON.stringify(value));

// RPC answers built from a chain fixture. Returns call(method, params) like rpcClient.
export function mockCall(chain) {
  return async function call(method, params) {
    switch (method) {
      case "getTransaction": return chain.transactions[params[0]] ?? null;
      case "getSlot": return chain.finalizedSlot;
      case "getBlocks": return chain.blocks.filter((s) => s >= params[0] && s <= params[1] && s <= chain.finalizedSlot);
      case "getBlock": {
        const hash = chain.blockhashes[params[0]];
        return hash ? { blockhash: hash } : null;
      }
      case "getSignaturesForAddress": return chain.signaturesBefore;
      default: throw new Error(`unexpected RPC method ${method}`);
    }
  };
}

// A fetch that serves the data files and the RPC, and records every address it was asked for.
export function mockFetch({ chain, golden, report, drop }) {
  const call = mockCall(chain);
  const asked = [];
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  async function fetchFn(url, init = {}) {
    asked.push(url);
    if (url === TEST_RPC && init.method === "POST") {
      const { id, method, params } = JSON.parse(init.body);
      return reply(200, { jsonrpc: "2.0", id, result: await call(method, params) });
    }
    if (url === goldenUrl(drop)) return golden ? reply(200, golden) : reply(404, { error: "not published yet" });
    if (url === dropUrl(drop)) return report ? reply(200, report) : reply(404, { error: "not published yet" });
    return reply(404, { error: "not found" });
  }
  return { fetchFn, asked };
}
