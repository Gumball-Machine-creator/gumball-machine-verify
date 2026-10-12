// Public facts this program checks against. All of them are also shown on https://gumballmachine.fun.

// The engine (creator) wallet. It sends every Golden commitment and every rule registration.
export const ENGINE_WALLET = "HYkcD33zpBFnyhH2WDCW9sgTn6NYigZvAYZJibwnWU2q";

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// A rule change counts only if its memo landed at least this many hours before its first Drop.
export const RULE_NOTICE_HOURS = 48;

// The rule registrations written on chain by the engine wallet.
export const REGISTRATIONS = Object.freeze([
  {
    kind: "public rules",
    fingerprint: "0aaa602b55bbd735b24a2bf33d9d12b379de894dc2a572f338d814c67437d39e",
    fromDrop: 1,
    startsAt: "2026-10-06T16:00:00.000Z", // the scheduled time of Drop #1
    signature: "X4WhyMGnDkMFehmBq3nnUpNH3cRUZgjVdnpCEi7D4jvtNrcocMHmFW7BNU1gUqENRewNS6zEN9497s5L1LWNvva",
  },
  {
    kind: "thresholds",
    fingerprint: "c3b6d876b9227fcffc0b5fc3a4f4021b24c94773f1c514467bf738d16c12f4a0",
    fromDrop: 1,
    startsAt: "2026-10-06T16:00:00.000Z", // the scheduled time of Drop #1
    signature: "5oi5DxtPnCs8FcLHauEgEDmW8S37mN5Bmwn75JK4T6vxpZXzkP7b6UMMhkeVBHpxFyRCmdfQAFu3kNm3LgCDwwPf",
  },
]);

export const registrationMemo = (r) => `GUMBALL ${r.kind} ${r.fingerprint} from Drop #${r.fromDrop}`;

// The registration of this kind that applies to Drop number `drop` (the one with the highest starting Drop).
export function registrationFor(kind, drop) {
  return REGISTRATIONS.filter((r) => r.kind === kind && r.fromDrop <= drop).sort((a, b) => b.fromDrop - a.fromDrop)[0] ?? null;
}
