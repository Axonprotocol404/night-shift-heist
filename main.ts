// heist3 entry for make.fun bounty best-heist-game-20261122-0559.
// Node 22 static-entry program: copies game/ + screenshots/ to /output and
// writes the dossier.json summary with the vendored make.fun library.
// Run locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The game itself lives in game/: "VANILLA HEIST" — a top-down stealth
// canvas game. Steal 4 glowing loot bags past patrolling guards with
// vision cones and sweeping cameras, then reach the green EXIT door
// before the 2:00 timer runs out or the alarm meter fills.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage the hand-in tree: the playable game plus its cover screenshots.
mkdirSync(out, { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Mirror the scorer's gate caps exactly; anything we refuse here, it would refuse too.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log('heist3 dossier written to', join(out, 'dossier.json'));
