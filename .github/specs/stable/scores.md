
## One shot: 56 pairs, 4123 old lines

| mapper                 | same | edit | edit≤3 | gone | wrong section | silent wrong | false lost | false found | blank | ms |
|---|---|---|---|---|---|---|---|---|---|---|
| now (exact text or n)  |  99% |  49% |  65% |  41% |   7% |   1% |  23% |   5% |  59% |  |
| A lcs diff             |  96% |  78% |  82% |  90% |   6% |   0% |   6% |   8% |  92% |  |
| B fingerprint          | 100% |  81% |  86% |  41% |   4% |   0% |   7% |  10% |  91% |  |
| track, whole old text  | 100% |  97% |  99% |  97% |   0% |   0% |   3% |   1% |  95% |  |
| track, stored ±2 lines |  99% |  80% |  83% |   7% |   8% |   1% |   6% |   8% |  91% |  |

## By edit kind: hit on non-blank lines (kept, reworded and gone together)

| mapper | above | drop | light | heavy | order | tick | flow | table | tail | mix | para | above+heavy | order+light | drop+para | order+para |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| now (exact text or n) |  99% |  79% | 100% |  99% |  98% | 100% |  94% |  97% |  99% |  96% |  79% |  62% |  88% |  40% |  63% |
| A lcs diff | 100% | 100% | 100% |  99% |  81% | 100% |  98% |  97% | 100% |  99% |  96% |  84% |  80% |  78% |  73% |
| B fingerprint | 100% |  79% | 100% |  99% | 100% | 100% | 100% |  99% |  99% |  98% |  92% |  81% | 100% |  64% |  86% |
| track, whole old text | 100% | 100% | 100% |  99% | 100% | 100% | 100% | 100% | 100% | 100% |  98% |  99% | 100% |  96% |  96% |
| track, stored ±2 lines | 100% |  78% | 100% |  87% | 100% | 100% | 100% |  98% |  81% |  95% |  87% |  87% | 100% |  65% |  86% |

## Tuning `track`: one-shot pairs plus the live chains

| mapper                 | same | edit | edit≤3 | gone | wrong section | silent wrong | false lost | false found | blank | ms |
|---|---|---|---|---|---|---|---|---|---|---|
| bigram min 0.4         | 100% |  92% |  95% |  69% |   1% |   0% |   2% |  10% |  96% |  |
| bigram min 0.5         | 100% |  93% |  96% |  96% |   0% |   0% |   3% |   6% |  96% |  |
| bigram min 0.6         | 100% |  97% |  99% |  96% |   0% |   0% |   2% |   1% |  96% |  |
| bigram min 0.7         | 100% |  97% |  99% |  96% |   0% |   0% |   3% |   1% |  96% |  |
| bigram min 0.8         | 100% |  95% |  98% |  95% |   0% |   0% |   4% |   1% |  95% |  |
| words min 0.4          | 100% |  96% |  98% |  96% |   0% |   0% |   2% |   3% |  97% |  |
| words min 0.5          | 100% |  96% |  98% |  96% |   0% |   0% |   2% |   1% |  97% |  |
| words min 0.6          | 100% |  96% |  97% |  95% |   0% |   0% |   3% |   1% |  97% |  |
| words min 0.7          | 100% |  94% |  96% |  95% |   1% |   0% |   4% |   1% |  95% |  |
| same-size hole not sure | 100% |  97% |  99% |  96% |   0% |   0% |   9% |   0% |  96% |  |
| heads off              | 100% |  92% |  96% |  99% |   1% |   0% |   2% |   1% |  96% |  |
| lost up                | 100% |  64% |  88% |  87% |   3% |   0% |   2% |   1% |  96% |  |
| lost down              | 100% |  64% |  91% |  79% |   1% |   0% |   2% |   1% |  96% |  |
| no fuzzy (min 2)       | 100% |  85% |  93% |  95% |   1% |   0% |   7% |   2% |  95% |  |

## Live session: 5 edits in a row (insert above, light reword, reorder, mixed revision, heavy reword), scored after every step against the first text

| mapper                 | same | edit | edit≤3 | gone | wrong section | silent wrong | false lost | false found | blank | ms |
|---|---|---|---|---|---|---|---|---|---|---|
| track, step by step    | 100% |  96% | 100% |  92% |   0% |   0% |   1% |   8% |  99% |  |
| A lcs, step by step    |  89% |  84% |  84% |  85% |  12% |   0% |  12% |  31% |  91% |  |
| B, re-fingerprint/step | 100% | 100% | 100% |  65% |   0% |   1% |   3% |  46% |  98% |  |
| track, first text kept | 100% |  93% |  94% |  31% |   2% |   0% |   3% |   8% |  87% |  |
| track, stored ±2       | 100% |  90% |  90% |   4% |   4% |   1% |   3% |  35% |  84% |  |
| B fingerprint, stored  | 100% |  83% |  83% |  23% |   3% |   1% |   4% |  42% |  83% |  |
| now, stored            |  98% |   8% |   9% |  19% |  15% |   2% |  24% |  23% |  21% |  |

Last step only (after all 5 edits):

| mapper                 | same | edit | edit≤3 | gone | wrong section | silent wrong | false lost | false found | blank | ms |
|---|---|---|---|---|---|---|---|---|---|---|
| track, step by step    | 100% |  90% |  99% |  93% |   0% |   0% |   5% |   7% |  97% |  |
| B, re-fingerprint/step | 100% |  99% | 100% |  64% |   0% |   1% |  16% |  43% |  94% |  |
| track, first text kept | 100% |  83% |  85% |  14% |   9% |   0% |  17% |   7% |  62% |  |
| track, stored ±2       | 100% |  73% |  74% |   7% |  16% |   1% |  17% |  36% |  59% |  |
| B fingerprint, stored  | 100% |  56% |  56% |  21% |  15% |   1% |  22% |  36% |  53% |  |

## What `sure` means in practice (`track`, one-shot pairs plus live chains, non-blank lines)

| sure | lines | right line | within 3 | truly gone | wrong section |
|---|---|---|---|---|---|
| 1 (same) | 3178 | 100% | 100% |   0% |   0% |
| 0.6 to 1 (reworded) | 594 |  99% |  99% |   0% |   1% |
| 0.5 (replaced in place) | 260 |  99% | 100% |   1% |   0% |
| 0 (gone) | 303 |  90% |  98% |  66% |   2% |

One-shot sample: 2303 kept, 695 reworded, 177 gone non-blank lines.

track.ts equals lab.ts defaults on every pair: true
