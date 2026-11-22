# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/gianagni/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/gianagni/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks every protocol in a sealed DefiLlama snapshot that records no token by what its launch would be worth, and shows how to farm each one. The value model (radar-2) multiplies TVL by the median mcap/TVL of token-bearing protocols in the same category, then adjusts for 7-day TVL growth, age since listing, and chain breadth — all from the snapshot's own figures, never from a hand-kept list of names. The board covers the snapshot's whole 40-protocol watchlist plus every rankable pre-token protocol below the floor, and the dashboard adds a detail view per protocol with the model's own inputs, a six-step farm plan with costs and times, and a separate Live view of protocols whose token already trades at the market's own value.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=pdjgt9c9&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
