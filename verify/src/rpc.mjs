// A tiny Solana JSON RPC client (read only) on top of Node's built in fetch.
// Only these read methods are used: getSlot, getBlocks, getBlock, getTransaction, getSignaturesForAddress.

// The free public Solana mainnet endpoint. It has rate limits; use --rpc to pick any other mainnet endpoint.
export const PUBLIC_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class RpcError extends Error {
  constructor(method, error) {
    super(`${method}: ${error?.message ?? JSON.stringify(error)}`);
    this.code = error?.code;
  }
}

// Returns call(method, params) that sends one JSON RPC request, with a few patient retries when the endpoint is busy.
export function rpcClient(url, { fetchFn = fetch, retries = 5, waitMs = 1500 } = {}) {
  let id = 0;
  return async function call(method, params = []) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetchFn(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
        });
      } catch (err) {
        if (attempt < retries) { await sleep(waitMs * (attempt + 1)); continue; }
        throw new Error(`${method}: could not reach the RPC endpoint (${err.message})`);
      }
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(waitMs * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${method}: the RPC endpoint answered HTTP ${res.status}`);
      const body = await res.json();
      if (body.error) throw new RpcError(method, body.error);
      return body.result;
    }
  };
}
