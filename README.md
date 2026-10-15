# Red Chalice

A personal toolkit for running Pathfinder 2e sessions. It runs in the browser and keeps everything in local storage, so there is no server or account.

Live site: https://vitor-a14.github.io/red_chalice/ (deployed by GitHub Actions on every push to `main`).

## Features

**Combat**
- Create actors (name, max HP, initiative modifier, player / ally / enemy) and keep them in a saved list.
- Drag actors into the combat order (or click the arrow). The same actor can be added several times; copies are numbered.
- Drag combatants to reorder them.
- Roll initiative for everyone at once (d20 + modifier, sorted, enemies win ties), or roll / type one at a time.
- Track HP with quick ±1 buttons or a damage / heal amount (Enter damages, Shift+Enter heals).
- Four dying dots per combatant; at dying 4 the combatant is marked dead and skipped in the turn order.
- Add conditions with a name, a color and an optional value (e.g. Frightened 2). Recently used conditions are remembered.
- Round and turn tracking with Start / Next / Prev.

**Dice**
- Build a pool by clicking dice (right-click removes one), adjust the modifier, or type a formula like `2d6+1d8+4`.
- Range and average shown while you build.
- Fortune / misfortune for single d20 rolls, and an optional DC that shows the degree of success (including nat 20 / nat 1).
- Animated rolls with a live running total, plus a roll history.

**Music**
- Session folders for YouTube sounds. Paste a video or playlist link, name it, and file it as Ambience, Music, Combat or Effects. Drag a sound onto another folder to move it.
- Ambience layers: several can play at once, each with its own volume and loop toggle.
- Music and Combat share one slot and crossfade: starting a combat song fades out the tavern tune. When a song ends it repeats, moves to the next song in the folder, or shuffles.
- Effects play once over everything else.
- Audio keeps playing while you switch tabs, with a now-playing bar at the bottom for pausing, skipping, volume and stop all.
- Videos whose owners block embedding can't play outside YouTube; the app says so when that happens.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for dice and encounter logic
npm run build    # static build in dist/
```
