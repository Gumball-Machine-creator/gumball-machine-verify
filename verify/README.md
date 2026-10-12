# Golden draw verify program

Check the Golden Gumball draw of any Drop yourself, and the rules that Drop used.
The program only reads: it never signs or sends anything, and it needs no wallet and no keys.

## How the Golden draw stays fair

1. **The list is locked first.** Before the draw, the machine sorts the wallets of all eligible holders into a list and computes the list's fingerprint (SHA256 of the list, one address per line). The engine wallet writes that fingerprint on the Solana blockchain in a memo: `GUMBALL Drop #<n> list: <fingerprint>`. From then on the list cannot change without the fingerprint changing.
2. **Only the first lock counts.** If there were ever a second memo for the same Drop, the first one wins. So nobody can try again with a different list.
3. **The random seed comes later.** The seed is the blockhash of the first finalized Solana block at least 32 slots (about 13 seconds) after the memo. Nobody knows that blockhash when the list is locked, not even us.
4. **The winners follow from list and seed alone.** For counter 0, 1, 2 and so on, the program computes SHA256 of the text `GUMBALL-GOLDEN-v1`, then the 32 seed bytes, then the counter as 4 bytes (big endian). The first 8 bytes of that hash, read as a number, pick a position in the list (numbers in the small unfair top range are thrown away, so every position has exactly the same chance). The wallet at that position wins and leaves the list. This repeats until there are 10 winners, or fewer if the list is shorter.

Anyone who repeats these steps gets the same winners.

## Install

You need [Node.js](https://nodejs.org) version 20 or newer. Check with `node --version`.

```
git clone https://github.com/Gumball-Machine-creator/gumball-machine-verify.git
cd gumball-machine-verify/verify
```

There is nothing else to install: the program uses no outside packages, only what comes with Node.js. (`npm install` is safe to run, and installs nothing.)

## Verify any Drop by number

```
node bin/verify.mjs drop 12
```

Replace `12` with the Drop you want to check. The program:

1. Downloads exactly two public files for that Drop:
   1. the Golden file: `https://data.gumballmachine.fun/v1/golden/<n>.json`
   2. the Drop report: `https://data.gumballmachine.fun/v1/drops/<n>.json`
2. Reads the blockchain through a Solana RPC endpoint (by default Solana's free public mainnet endpoint).
3. Prints every check with PASS or FAIL, and a result for each part.

Example output (shortened):

```
Rules used by this Drop
  PASS  this Drop used the registered public rules: 0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e
  PASS  this Drop used the registered thresholds: c3b6d876b9227fcffc0b5fc3a4f4021b24c94773f1c514467bf738d16c12f4a0
  RESULT: VERIFIED

Golden draw
  PASS  the file is the live mainnet Golden file of this Drop: ...
  PASS  the engine wallet is the public engine wallet: HYkcD33zpBFnyhH2WDCW9sgTn6NYigZvAYZJibwnWU2q
  ...
  PASS  the winners drawn again are the same: ...
  RESULT: VERIFIED
```

The program ends with exit code 0 when everything is verified, 1 when a check fails, and 2 when it could not run (for example, no internet).

### Use your own RPC endpoint

The free public endpoint has rate limits. If it is slow or refuses requests, use any Solana mainnet RPC endpoint you like:

```
node bin/verify.mjs drop 12 --rpc <your mainnet RPC address>
```

The program prints only the host name of the endpoint, never the rest of the address.

### Use files you saved yourself

If you saved the two files of a Drop earlier, the program can use them instead of downloading:

```
node bin/verify.mjs drop 12 --golden golden-12.json --report drop-12.json
```

### Check the rule registrations

```
node bin/verify.mjs rules
```

This reads the two registration memos on chain and checks that each was sent by the engine wallet, holds exactly the expected memo text, and landed at least 48 hours before Drop #1.

## What each Golden check means

1. **The file is the live mainnet Golden file of this Drop.** Right Drop number, Solana mainnet, real (not a practice run).
2. **The engine wallet is the public engine wallet.** `HYkcD33zpBFnyhH2WDCW9sgTn6NYigZvAYZJibwnWU2q`, the one listed on the website.
3. **The list is valid and sorted.** Real Solana addresses, no address twice, sorted by character code.
4. **The list matches its fingerprint.** SHA256 of the list is the published fingerprint.
5. **The Drop report agrees with the Golden file.** Same list, commitment, seed and winners in both files.
6. **The commitment was sent by the engine wallet, with the exact memo, at the stated slot.** Read from the blockchain.
7. **It is the first commitment for this Drop.** No earlier memo from the engine wallet locked a list for the same Drop (the program looks back about 4 to 5 days before the commitment).
8. **The seed is the first finalized block at least 32 slots after the commitment.** Read from the blockchain.
9. **The seed blockhash matches the chain.** Read from the blockchain.
10. **The winners drawn again are the same.** The program repeats the draw and compares, winner by winner, in order.

## What this program does not check

It checks that the list was locked before the seed existed, and that the winners came from that list fairly. It does not work out again who was eligible, because that depends on every holder's balance during the day. The full list is published with every Drop, so you can look up any wallet in it on a blockchain explorer.

## Run the tests

The tests run offline on a made up example Drop in `test/fixtures/` (no real wallets; every value comes from hashing a fixed text, see `test/fixtures/make.mjs`). They also try many kinds of cheating and check that each one is caught.

```
npm test
```

## Files

1. `bin/verify.mjs`: the command line program.
2. `src/draw.mjs`: the draw itself (sorting, fingerprint, picking winners).
3. `src/verify.mjs`: the checks.
4. `src/chain.mjs` and `src/rpc.mjs`: reading the blockchain.
5. `src/data.mjs`: downloading the two public Drop files.
6. `src/known.mjs`: the public engine wallet and the rule registrations.
7. `src/base58.mjs`: the Solana address format.
8. `test/`: the offline tests and the example Drop.
