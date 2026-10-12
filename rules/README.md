# Public rules

`public_rules.json` is the public rules file exactly as it was registered on chain for Drop #1.

Registered fingerprint (SHA256 of the file):
`0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e`

Memo transaction: [on Solscan](https://solscan.io/tx/X4WhyMGnDkMFehmBq3nnUpNH3cRUZgjVdnpCEi7D4jvtNrcocMHmFW7BNU1gUqENRewNS6zEN9497s5L1LWNvva)

## What the rules say

```json
{"gasReserveSol":0.1,"minBalance":{"averageHours":24,"roundUpTo":1000,"startTokens":500000,"usd":50},"rankingRule":"shortlist","slippageBps":300}
```

1. `gasReserveSol: 0.1`: 0.1 SOL always stays in the engine wallet to pay network fees. It is not shared out.
2. `minBalance`: how much $GUMBALL you must hold to be eligible for a Drop.
   1. `usd: 50`: about $50 worth of $GUMBALL.
   2. `averageHours: 24`: the price used is the average of the last 24 hours.
   3. `roundUpTo: 1000`: the result is rounded up to the next whole 1,000 tokens.
   4. `startTokens: 500000`: Drop #1, which had no price history yet, used 500,000 tokens.
3. `rankingRule: "shortlist"`: the name of the rule that ranks the tokens that passed Quality Control, to choose the Flavor.
4. `slippageBps: 300`: the Flavor purchase accepts at most 3% slippage (300 basis points). If the price would end up more than 3% worse than the quote, the swap does not go through.

The file has no spaces and no line break at the end. Any change, even one extra space, gives a different fingerprint.

## Check it yourself

Pick any one of these:

1. With Node.js 20 or newer, from the top folder of this repository:
   ```
   node rules/check.mjs
   ```
   It prints the fingerprint it computed and `MATCH` or `NO MATCH`.
2. On Linux or macOS:
   ```
   sha256sum rules/public_rules.json
   ```
   (on macOS you can also use `shasum -a 256 rules/public_rules.json`)
3. On Windows:
   ```
   certutil -hashfile rules\public_rules.json SHA256
   ```

The result must be `0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e`.

To check that this fingerprint really is the one on chain, open the memo transaction above and read its memo:
`GUMBALL public rules 0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e from Drop #1`
or run `node bin/verify.mjs rules` in the [verify](../verify/) folder.
