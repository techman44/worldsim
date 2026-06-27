# World Sim

A **falling-sand world simulator** that installs as a Progressive Web App on phones, iPads and desktop. It is equally at home with **touch, mouse and keyboard** — draw with a finger, a mouse, or hotkeys; pinch, wheel or trackpad to zoom. Paint a living world out of sand, water, stone, lava, plant, fire and acid, watch it react under entertaining physics, drop in preset stamps (castles, cars, monster trucks), and trigger spectacle events — volcanoes, tornadoes, lightning, earthquakes and more.

> 2D Minecraft meets The Powder Toy / Sandspiel — cozy, reactive, and smooth on a phone. Fully client-side, no backend, works offline.

## Features

- **Cellular-automaton engine** — a grid of cells with powders, liquids, gases, energy and life, each driven by data-defined behavior and pairwise reactions.
- **Temperature model** — heat from lava/fire and cold from ice/snow drive melting, freezing, boiling, igniting and the water→steam→cloud→rain loop.
- **30+ elements** — sand, dirt, stone, rock, wood, metal, glass, water, lava, acid, oil, fire, smoke, steam, ash, snow, ice, plant, vine, seed, gunpowder, salt, cloud, spark, obsidian, mud, slime, sandstone, methane, crystal, gold, ember, lightning…
- **Tools** — paint, erase, adjustable brush, drag/line painting, flood fill, eyedropper, and a vertical **mirror** mode for fast symmetric builds.
- **Stamps** — castle, house, car, monster truck, tree, pond, volcano cone, rocket — authored as ASCII art, trivial to extend.
- **Events** — volcano, tornado, lightning, snowstorm, rain, earthquake, meteor — with screen shake, flash, haptics and synthesized sound.
- **Challenges** — **30 puzzle levels across 6 difficulty tiers** (grow a forest, fill the well, freeze the lake, quench lava, dissolve a vault, breach a wall…), built on a validated *archetype* system. Early tiers restrict the palette; later tiers hand you everything and the puzzle is working out *which* element to use. Plus a free-play sandbox.
- **Procedural terrain** generator for instant starting worlds.
- **Mobile-first UI** — icon palette, tool rail, time controls (pause/play/step/speed), one-finger draw, two-finger pan & pinch-zoom.
- **Looks good** — per-cell color noise, emissive glow/bloom on lava & fire, a particle overlay, a sky gradient and an optional day/night cycle.
- **Save / load / share** — localStorage slots, file export/import, PNG screenshots. No server, fully private.
- **God powers** — zero-G / inverted gravity, wind, adaptive resolution.
- **Optional play mode** — a small platformer character that lives in the sim (water slows it, lava is deadly). Clearly a side feature.
- **Installable PWA** — manifest, offline service worker, iOS/iPadOS safe-area & standalone support.

## Run & build

Requires Node 18+.

```bash
npm install
npm run dev       # local dev server (Vite)
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
npm run validate  # run every challenge level through the real engine, headless
```

App icons (PNG + SVG favicon) are generated with zero dependencies by
`scripts/gen-icons.mjs`, which runs automatically before `dev` and `build`.

To install as an app: open the site, then "Add to Home Screen" (iOS/iPadOS) or
the install button (desktop Chrome/Edge). It then launches standalone and runs
offline.

## Architecture

```
scripts/gen-icons.mjs   # dependency-free PNG/SVG app-icon generator
public/                 # generated icons (manifest is produced by vite-plugin-pwa)
src/
  sim/                  # the simulation — no DOM, no rendering
    types.ts            #   Element/Category/Reaction interfaces + SimView
    elements.ts         #   the element REGISTRY (data + behavior hooks)  ← start here
    engine.ts           #   World grid, chunked step loop, movement, temperature
    paint.ts            #   brush / line / flood-fill / mirror
    stamps.ts           #   ASCII-art preset structures
    events.ts           #   scripted environmental events
    terrain.ts          #   procedural terrain generator
  game/
    archetypes.ts       #   tested, parameterised level mechanics (build + win check)
    levels.ts           #   level DATA (30 levels = archetype + params + flavour)
    challenges.ts       #   binds levels to archetypes -> runtime challenges
  render/
    renderer.ts         #   ImageData draw + per-cell noise + emissive glow + sky
    particles.ts        #   particle overlay
  ui/
    icons.ts            #   cohesive inline-SVG icon set (every element/tool/event)
    camera.ts           #   screen<->world transform, pan & pinch-zoom
    input.ts            #   Pointer Events: draw / pan / zoom
    ui.ts               #   palette, tool rail, time controls, menu panel
    challengeui.ts      #   mode/challenge launcher + objective HUD
  player.ts             #   optional platformer character
  audio.ts              #   tiny WebAudio synth for event sounds
  persist.ts            #   save/load/export/import/screenshot
  state.ts              #   shared app state
  main.ts               #   wiring + sim/render loop
```

**The single most important design decision is that elements are data.** The
engine knows nothing about "sand" or "lava"; it reads a registry of config
objects and applies generic behavior selected by `category` plus a few
declarative properties, with optional bespoke `update` hooks for the handful of
elements that need custom logic. Adding content does not mean touching the
engine.

**Performance.** The world is stored in typed arrays (`Uint8Array` cells,
`Int16Array` temperature, `Uint8Array` per-cell life). The grid is divided into
16×16 chunks; only chunks with recent activity are simulated each frame
(Noita-style), so a settled world costs almost nothing. Gravity is processed
bottom-up and the horizontal scan direction alternates each frame to avoid drift
bias. Resolution is selectable (240×135 / 320×180 / 480×270) and the canvas is
scaled up with `image-rendering: pixelated`. The sim currently runs on the main
thread; the engine is a self-contained module with no DOM access, so moving it
into a Web Worker is a contained change.

## Extending it

### Add an element

In `src/sim/elements.ts`, give it an id in the `E` map and a `def({...})` entry:

```ts
def({
  id: E.SLUSH,
  name: 'Slush',
  category: Category.Powder,        // Powder | Liquid | Gas | Solid | Energy | Life
  color: [200, 220, 235],
  colorNoise: 0.1,
  density: 24,
  meltsAt: 4, meltsInto: E.WATER,   // declarative temperature transitions
  icon: 'snow',                     // a key from src/ui/icons.ts
  reactions: [                      // declarative adjacency reactions
    { with: E.SALT, become: E.WATER, chance: 0.1 },
  ],
  // optional bespoke per-cell logic:
  update(v, x, y) { /* read/write via the SimView */ },
})
```

Add the id to the `PALETTE` array to show it in the UI, and (optionally) add a
glyph to `src/ui/icons.ts`. Generic movement, temperature and reactions are
handled for you.

### Add a reaction

Either declaratively on an element via `reactions: [{ with, become,
neighbourBecomes, chance }]`, or via temperature thresholds
(`meltsAt/Into`, `freezesAt/Into`, `boilsAt/Into`, `flammable + igniteTemp +
burnsInto`). For chain reactions or movement-coupled logic, use the element's
`update` hook.

### Add a stamp

Add an entry to `STAMPS` in `src/sim/stamps.ts` as ASCII art. Each glyph maps to
an element via `LEGEND`; a space leaves existing cells untouched. It shows up in
the Stamp tool automatically.

### Add an event

Add an `EventDef` to `EVENTS` and a `make…()` factory in `src/sim/events.ts`.
An event is a short scripted sequence with an `age`/`life` that manipulates
cells and spawns particles each frame; set `placed: true` to let the player tap
where it happens. It appears in the Event tool automatically.

### Add a challenge level

Challenges are split into **archetypes** (tested mechanics) and **levels**
(data). To add a level, append an entry to `LEVELS` in `src/game/levels.ts`:

```ts
{
  id: 't3-my-puzzle',
  name: 'My Puzzle',
  objective: 'Fuse the sand into 150 panes of glass.',
  hint: 'Heat fuses sand into glass — pour lava across it.',
  tier: 3,                 // difficulty 1..6
  archetype: 'forgeGlass', // a mechanic from archetypes.ts
  params: { goal: 150 },
  allowed: [E.LAVA],       // omit for the archetype default; null = all elements
}
```

Because the mechanic is a tested archetype, the level is guaranteed to compile,
start un-solved and be solvable. To add a brand-new *mechanic*, add an
`Archetype` (a `build(world, params)` + `check(world, params)`) to
`src/game/archetypes.ts`.

Run `npm run validate` to prove every level builds, starts un-solved, isn't
winnable by doing nothing, and has a reachable goal — it runs the real engine
headlessly in Node (`scripts/validate-levels.ts`). The 30 levels here were
authored by a multi-agent workflow and gated by this validator.

## Modes

- **Free Play** — the full sandbox with every element, stamp and event.
- **Challenges** — bite-size puzzles in pre-built worlds. Some restrict which
  elements you may use; others hand you everything and the puzzle is working out
  *which* tool the situation needs (physics, heat, water flow, growth…).

## Controls

World Sim is touch-, mouse- **and** keyboard-enabled — use whichever you like.

| Action | Touch | Mouse | Keyboard |
| --- | --- | --- | --- |
| Draw | one finger drag | drag | — |
| Pan | two fingers | two-finger trackpad | — |
| Zoom | pinch | wheel | — |
| Select element | tap palette | click palette | `1`–`0` |
| Paint / Erase / Fill | tap tool | click tool | `B` / `E` / `F` |
| Pick / Stamp / Event | tap tool | click tool | `K` / `T` / `V` |
| Mirror mode | tap tool | click | `X` |
| Brush size | slider | slider | `[` / `]` |
| Pause / Step | buttons | buttons | `Space` / `.` |
| Toggle HUD | button | button | `H` |
| Move character (play mode) | on-screen pad | — | arrows / `WASD`, jump = `W`/`↑`/`Space` |

Within a challenge the digit keys select from that challenge's allowed elements.

## License

MIT. Build worlds, share screenshots, have fun.
