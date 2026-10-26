"""Synthetic dedupe threshold trade-off. All numbers are made up for illustration.
Stdlib only. Run: /usr/bin/python3 dedupe_tradeoff.py

Model: a synthetic roll of N entries. Blocking (same district, similar name/age) yields
candidate pairs. Each pair gets a similarity score. True-duplicate pairs score
~ Normal(MU_DUP, SD); different-person pairs score ~ Normal(MU_OTHER, SD).
A pair at or above the threshold is flagged. Expected counts are computed
analytically (normal tail), so there is no randomness.
"""
import math

N = 1_000_000                 # synthetic roll size
OTHER_PAIRS_PER_ENTRY = 0.5   # synthetic: non-duplicate candidate pairs per entry after blocking
MU_OTHER = 0.40
MU_DUP = 0.80

def tail(x, mu, sd):  # P(score >= x)
    return 0.5 * math.erfc((x - mu) / (sd * math.sqrt(2)))

def run(label, dup_rate, sd, thresholds):
    dups = N * dup_rate                    # true duplicate pairs
    others = N * OTHER_PAIRS_PER_ENTRY     # different-person candidate pairs
    print(f"\n{label}: dup_rate={dup_rate:.1%}, score noise sd={sd}")
    print("| Threshold | Flagged | Real voters wrongly flagged | Duplicates missed | Share of flags that are real voters |")
    print("|---|---|---|---|---|")
    for t in thresholds:
        tp = dups * tail(t, MU_DUP, sd)
        fp = others * tail(t, MU_OTHER, sd)
        fn = dups - tp
        flagged = tp + fp
        print(f"| {t:.2f} | {flagged:,.0f} | {fp:,.0f} | {fn:,.0f} | {fp/flagged:.1%} |")

ths = [0.50, 0.60, 0.70, 0.80, 0.90]
for dup_rate in (0.005, 0.03):
    for sd in (0.08, 0.15):
        run("Scenario", dup_rate, sd, ths)
