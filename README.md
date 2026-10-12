# Gumball Machine: verify it yourself

This repository lets anyone check two things about Gumball Machine without trusting us:

1. **Our rules did not change in secret.** The rules are registered on the Solana blockchain by fingerprint, and you can recompute the fingerprint yourself.
2. **The Golden draw is fair.** For any Drop, a small program downloads the public Drop data and checks the draw against the blockchain, step by step.

Website: https://gumballmachine.fun
X: https://x.com/gumballonfun
Telegram: https://t.me/Gumballonfun

## What is Gumball Machine?

Gumball Machine is the $GUMBALL token on Solana with a machine behind it. When people trade $GUMBALL, the token earns creator fees. The machine gives 90% of those fees back to the people who hold $GUMBALL, every day, under public rules.

$GUMBALL token address (mint): `8tFL1rau45spqcf7Gf82knrXyPQp71ww2tbRoTjtMv56`
([Solscan](https://solscan.io/token/8tFL1rau45spqcf7Gf82knrXyPQp71ww2tbRoTjtMv56))

## How a Drop works

A Drop happens every day at 16:00 UTC. Each Drop has a number: Drop #1, Drop #2 and so on. In each Drop the machine:

1. Counts the new creator fees since the last Drop.
2. Splits them: **80%** to the reward pool of eligible holders, **10%** to the Golden Gumball pot, **10%** to the Ops wallet.
3. Adds each eligible holder's share to their **Coin Jar**. To be eligible you hold at least the Drop minimum (about $50 of $GUMBALL) in a normal wallet. Your share is your average balance divided by the total of all eligible holders.
4. Picks the **Flavor**: one new token from StonkFun that passed Quality Control.
5. Draws up to **10 Golden Gumballs** from the eligible holders. Each one wins 1% of the new fees.
6. Buys the Flavor in one swap and sends it out. A Coin Jar is paid out in the Flavor once it is worth about $2 or more; smaller ones keep growing.
7. Publishes a full report of everything it did.

## Public project wallets

These are the same wallets shown on the Transparency page of https://gumballmachine.fun.

1. **Engine (creator) wallet**: `HYkcD33zpBFnyhH2WDCW9sgTn6NYigZvAYZJibwnWU2q` ([Solscan](https://solscan.io/account/HYkcD33zpBFnyhH2WDCW9sgTn6NYigZvAYZJibwnWU2q))
   Launched $GUMBALL, receives the creator fees, buys and sends every Flavor. It also sends the Golden commitments and the rule registrations.
2. **Pause wallet**: `7MJBeLW2A9a3fCBqhzMmvmPceGWEikY7FPjsS2LRAWpc` ([Solscan](https://solscan.io/account/7MJBeLW2A9a3fCBqhzMmvmPceGWEikY7FPjsS2LRAWpc))
   Can only stop or restart the machine with a PAUSE or RESUME memo. It has no access to any funds.
3. **Ops wallet**: `4PdzKxCpxivuvKSJTVFFBiBUrH2GsnWyvK3QJP6aFEyt` ([Solscan](https://solscan.io/account/4PdzKxCpxivuvKSJTVFFBiBUrH2GsnWyvK3QJP6aFEyt))
   Receives the 10% Ops share of creator fees and splits it into these four wallets:
   1. **Team pay** (4% of creator fees): `95sZWivfCiXUJu3yadw5n7Ub8TQ1c88EKY1zKUUWP4KS` ([Solscan](https://solscan.io/account/95sZWivfCiXUJu3yadw5n7Ub8TQ1c88EKY1zKUUWP4KS))
   2. **Services** (2%): `EPjAKoqtf5bNAsw8nK5c2sJtJdJ2jYscNzcSWZkfLp4F` ([Solscan](https://solscan.io/account/EPjAKoqtf5bNAsw8nK5c2sJtJdJ2jYscNzcSWZkfLp4F))
   3. **Safety reserve** (2%): `AwgwLTc1wKFeEAWnH6SrBorLS8xhakjodURFw2DvPkD5` ([Solscan](https://solscan.io/account/AwgwLTc1wKFeEAWnH6SrBorLS8xhakjodURFw2DvPkD5))
   4. **Community** (2%): `6ngSEWbJmu7xqfGiLqyQTsD9ZPxNbGpDTkvHq2cxyonR` ([Solscan](https://solscan.io/account/6ngSEWbJmu7xqfGiLqyQTsD9ZPxNbGpDTkvHq2cxyonR))
4. **Team wallet**: `3bmQ3tkCkftkavcUiKC1pipzrCVWxhCCpuiComYMj43k` ([Solscan](https://solscan.io/account/3bmQ3tkCkftkavcUiKC1pipzrCVWxhCCpuiComYMj43k))
   Receives the locked 3% team tokens as they unlock.

**Team lock (Jupiter Lock):** the team bought 3% of the supply at launch, in the same transaction that created the token, and locked all of it with Jupiter Lock. Nothing unlocks for the first 30 days. Then 12.5% unlocks every week, 8 times, the first on day 30, so everything is unlocked about day 79. Nobody can cancel the lock or change who receives it.
[Open the lock transaction on Solscan](https://solscan.io/tx/3WxXFDSmSai6ZrJY9zQ2jLPzvYc5mC75nLPsmHsLqxt9TvgpwQi7hTUrgWYowdTw7jzyKiedzwWkzAbsT54TSdaG)

## Rule registrations on chain

Before Drop #1, the engine wallet wrote two memos on the Solana blockchain. Each memo holds only a fingerprint (a SHA256 hash) and the Drop number it starts from.

1. **Public rules**
   Fingerprint: `0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e`
   Memo: `GUMBALL public rules 0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e from Drop #1`
   Registered 2026-10-04 at 07:38:23 UTC: [memo transaction on Solscan](https://solscan.io/tx/X4WhyMGnDkMFehmBq3nnUpNH3cRUZgjVdnpCEi7D4jvtNrcocMHmFW7BNU1gUqENRewNS6zEN9497s5L1LWNvva)
2. **Quality Control thresholds**
   Fingerprint: `c3b6d876b9227fcffc0b5fc3a4f4021b24c94773f1c514467bf738d16c12f4a0`
   Memo: `GUMBALL thresholds c3b6d876b9227fcffc0b5fc3a4f4021b24c94773f1c514467bf738d16c12f4a0 from Drop #1`
   Registered 2026-10-04 at 07:37:17 UTC: [memo transaction on Solscan](https://solscan.io/tx/5oi5DxtPnCs8FcLHauEgEDmW8S37mN5Bmwn75JK4T6vxpZXzkP7b6UMMhkeVBHpxFyRCmdfQAFu3kNm3LgCDwwPf)

Drop #1 was scheduled for 2026-10-06 at 16:00 UTC, so both landed more than 48 hours ahead. Our promise:

1. Any rule change is announced on chain **at least 48 hours** before it takes effect, with the Drop number it starts from.
2. Changes never apply to past Drops.
3. Every Drop report names the two fingerprints it used, so you can see which rules each Drop followed.

The public rules file is in [rules/](rules/), together with a tiny script that recomputes its fingerprint.

### A short, honest note about the thresholds file

Quality Control checks every candidate token before the machine buys it. The exact limits it uses are in the thresholds file, and **that file stays private**. If token creators knew the exact limits, they could shape their token to slip just past them, and Quality Control would stop protecting you.

What we publish instead is the file's fingerprint. A fingerprint locks the file: changing even one character gives a completely different fingerprint, and a new fingerprint must be registered on chain 48 hours before any Drop can use it. So you cannot read the limits, but you can check that they never changed in secret: every Drop report must name `c3b6d876…` (or a newer fingerprint that was registered on chain in time).

## Check the Golden draw of any Drop

The [verify/](verify/) folder holds a small program with no outside packages. You need [Node.js](https://nodejs.org) version 20 or newer.

```
git clone https://github.com/Gumball-Machine-creator/gumball-machine-verify.git
cd gumball-machine-verify/verify
node bin/verify.mjs drop 1
```

Replace `1` with any Drop number. The full steps, and what each check means, are in [verify/README.md](verify/README.md).

## What is in this repository

1. [rules/](rules/): the public rules file exactly as registered, and `check.mjs`, which recomputes its fingerprint.
2. [verify/](verify/): the Golden draw verify program, with offline tests.
3. [LICENSE](LICENSE): MIT.

This repository holds only public material. It does not contain the machine's engine, its private settings or any keys.
