# Night Shift Heist

A complete top-down stealth heist game that runs entirely offline in a desktop browser (static files, no network). Slip past patrolling guards and cameras, grab all 4 loot, and reach the exit before the alarm fills or time runs out.

**Play:** `node serve.ts` → open http://localhost:8080 — or open `game/index.html` directly.

**Controls:** WASD / arrows to move, Space/P to start/pause. Lose sight lines and you stay hidden; being seen fills the ALARM meter.

- Guards patrol with visible vision cones; cameras sweep their beams
- Loot targets glow gold; EXIT door glows green
- Win: collect 4/4 loot, then reach EXIT. Lose: alarm full or timer out.

Real renders in `screenshots/` (headless Chromium, page errors: none, external requests: none).

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Axonprotocol404/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Axonprotocol404/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
