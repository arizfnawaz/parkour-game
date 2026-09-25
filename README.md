# Blob Universe

A browser-based platformer built with [Phaser](https://phaser.io/) and [Vite](https://vitejs.dev/) — three separate game modes starring the same blob, all running on synthesized audio and zero external art assets.

## Modes

| Mode | Description | Controls |
|---|---|---|
| **Blob Ascent** | Endless procedural climber. Platforms, hazards, and power-ups unlock in tiers as you climb higher. Double jump, dash, and combo multipliers reward momentum. | `A`/`D` move, `W` jump, `Shift` dash |
| **Rise of the Blob** | Jetpack straight up forever, dodging obstacles and asteroids. Four difficulty tiers scale hazard density. | `A`/`D` move, `W` jetpack |
| **Blob Attack** | Bullet-hell boss rush — 5 bosses, each with unique movement patterns and two-phase attacks that get meaner as their HP drops. Includes a practice mode to refight a single boss. | `WASD` fly, `Space` shoot |

Progress persists locally: high scores per mode/difficulty, 15 unlockable achievements, cosmetic blob skins, and mute state.

## Running locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (defaults to `http://localhost:5173`).

To build a production bundle:

```bash
npm run build
```

## Tech notes

- **Engine**: Phaser 4 (Arcade Physics) + Vite for dev server/bundling
- **Audio**: all sound effects are synthesized at runtime via the Web Audio API — no audio files shipped
- **Procedural generation**: weighted-random platform/hazard/power-up selection gated by player height, with difficulty configs (easy → insane) that scale boss HP, fire rate, and hazard frequency
- **Persistence**: `localStorage` for high scores, achievements, and settings — no backend required
