import { World } from '../sim/engine'
import { E } from '../sim/elements'
import { placeStamp, STAMPS } from '../sim/stamps'

// Challenges are pre-built puzzle worlds with a win condition. Some restrict the
// palette to a few elements; others hand you everything and the puzzle is
// working out *which* element the situation needs. Win conditions are checked
// about once a second and latch on success.

export interface Challenge {
  id: string
  name: string
  /** the objective shown to the player */
  objective: string
  /** a nudge revealed on demand */
  hint: string
  /** element ids the palette is limited to (eraser is always available); null = everything */
  allowed: number[] | null
  /** construct the starting world */
  build: (world: World) => void
  /** return progress 0..1 and whether the objective is met */
  check: (world: World) => { progress: number; done: boolean; status: string }
}

// ---- helpers ----------------------------------------------------------------
function fillRect(world: World, x0: number, y0: number, x1: number, y1: number, id: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) world.set(x, y, id)
}
function countId(world: World, id: number): number {
  let c = 0
  const cells = world.cells
  for (let i = 0; i < cells.length; i++) if (cells[i] === id) c++
  return c
}
function countRegion(world: World, id: number, x0: number, y0: number, x1: number, y1: number): number {
  let c = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (world.get(x, y) === id) c++
  return c
}
function ground(world: World, topId: number, soilDepth: number, soilId: number, baseId: number) {
  const w = world.width
  const h = world.height
  const surface = Math.floor(h * 0.7)
  for (let x = 0; x < w; x++) {
    world.set(x, surface, topId)
    for (let y = surface + 1; y < h; y++) {
      world.set(x, y, y - surface <= soilDepth ? soilId : baseId)
    }
  }
  return surface
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'forest',
    name: 'Grow a Forest',
    objective: 'Cover the land in greenery — grow 220 plants.',
    hint: 'Drop seeds onto damp soil near the pond. Plants sprout and spread when watered.',
    allowed: [E.SEED, E.WATER, E.DIRT],
    build: (world) => {
      world.clear()
      const surface = ground(world, E.DIRT, 8, E.DIRT, E.STONE)
      // a central pond for moisture
      const cx = (world.width / 2) | 0
      for (let x = cx - 14; x <= cx + 14; x++) {
        for (let y = surface; y <= surface + 5; y++) {
          const dx = (x - cx) / 14
          const dy = (y - (surface + 2)) / 5
          if (dx * dx + dy * dy <= 1) world.set(x, y, y < surface + 5 ? E.WATER : E.MUD)
        }
      }
      // a couple of starter sprouts
      world.set(cx - 20, surface - 1, E.PLANT)
      world.set(cx + 20, surface - 1, E.PLANT)
      world.wakeAll()
    },
    check: (world) => {
      const n = countId(world, E.PLANT)
      const goal = 220
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} plants` }
    },
  },
  {
    id: 'well',
    name: 'Fill the Well',
    objective: 'Fill the stone well to the brim with water.',
    hint: 'Pour water straight down the open shaft — it settles and fills from the bottom.',
    allowed: [E.WATER],
    build: (world) => {
      world.clear()
      const surface = ground(world, E.STONE, 6, E.DIRT, E.STONE)
      const cx = (world.width / 2) | 0
      const top = surface - 2
      const bottom = world.height - 4
      const wallL = cx - 7
      const wallR = cx + 7
      // well walls + floor
      fillRect(world, wallL - 2, top, wallL, bottom, E.STONE)
      fillRect(world, wallR, top, wallR + 2, bottom, E.STONE)
      fillRect(world, wallL, bottom, wallR, bottom + 1, E.STONE)
      // hollow interior
      fillRect(world, wallL + 1, top, wallR - 1, bottom - 1, E.EMPTY)
      world.wakeAll()
      // remember the interior for the check
      ;(world as any)._wellRegion = [wallL + 1, top + 2, wallR - 1, bottom - 1]
    },
    check: (world) => {
      const [x0, y0, x1, y1] = (world as any)._wellRegion ?? [0, 0, 0, 0]
      const total = (x1 - x0 + 1) * (y1 - y0 + 1)
      const water = countRegion(world, E.WATER, x0, y0, x1, y1)
      const goal = Math.floor(total * 0.85)
      return { progress: water / goal, done: water >= goal, status: `well ${Math.min(100, Math.round((water / goal) * 100))}% full` }
    },
  },
  {
    id: 'firefighter',
    name: 'Save the Cabin',
    objective: 'Put out the fire before the cabin burns down. Keep most of the wood.',
    hint: 'Water smothers fire instantly. Sand can smother it too. Act fast — flames spread!',
    allowed: [E.WATER, E.SAND],
    build: (world) => {
      world.clear()
      const surface = ground(world, E.PLANT, 6, E.DIRT, E.STONE)
      const cx = (world.width / 2) | 0
      const house = STAMPS.find((s) => s.id === 'house')!
      placeStamp(world, house, cx, surface)
      // set the lower corner of the cabin alight
      for (let i = 0; i < 14; i++) {
        const x = cx - 6 + (Math.random() * 4) | 0
        const y = surface - 3 - ((Math.random() * 3) | 0)
        if (world.get(x, y) === E.WOOD) world.set(x, y, E.FIRE, 700)
      }
      ;(world as any)._fireStartWood = countId(world, E.WOOD)
      world.wakeAll()
    },
    check: (world) => {
      const fire = countId(world, E.FIRE) + countId(world, E.EMBER)
      const wood = countId(world, E.WOOD)
      const goalWood = 40
      const done = fire === 0 && wood >= goalWood
      return {
        progress: wood >= goalWood ? (fire === 0 ? 1 : 0.7) : 0.3,
        done,
        status: fire > 0 ? `${fire} flames left · ${wood} wood` : `fire out · ${wood} wood saved`,
      }
    },
  },
  {
    id: 'freeze',
    name: 'Freeze the Lake',
    objective: 'Turn the lake to solid ice.',
    hint: 'Snow and ice chill the water around them. Bury the surface and let the cold spread.',
    allowed: [E.SNOW, E.ICE],
    build: (world) => {
      world.clear()
      const w = world.width
      const h = world.height
      const surface = Math.floor(h * 0.55)
      // basin walls
      for (let x = 0; x < w; x++)
        for (let y = surface; y < h; y++) {
          const edge = x < 6 || x > w - 7
          world.set(x, y, edge ? E.STONE : E.WATER)
        }
      ;(world as any)._lakeStart = countId(world, E.WATER)
      world.wakeAll()
    },
    check: (world) => {
      const ice = countId(world, E.ICE)
      const start = (world as any)._lakeStart ?? 1000
      const goal = Math.floor(start * 0.6)
      return { progress: ice / goal, done: ice >= goal, status: `${ice} / ${goal} ice` }
    },
  },
  {
    id: 'glass',
    name: 'Forge Glass',
    objective: 'Fuse the sand bed into 140 panes of glass.',
    hint: 'Sand melts into glass when it gets blazing hot. Pour lava across the dunes.',
    allowed: [E.LAVA],
    build: (world) => {
      world.clear()
      const h = world.height
      const surface = Math.floor(h * 0.45)
      // a deep sand bed on a stone floor
      fillRect(world, 0, surface, world.width - 1, h - 1, E.SAND)
      fillRect(world, 0, h - 3, world.width - 1, h - 1, E.STONE)
      world.wakeAll()
    },
    check: (world) => {
      const n = countId(world, E.GLASS)
      const goal = 140
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} glass` }
    },
  },
  {
    id: 'obsidian',
    name: 'Quench the Lava',
    objective: 'Cool the lava lake into 120 blocks of obsidian.',
    hint: 'Water quenches lava on contact, hardening it into obsidian (and a puff of steam).',
    allowed: [E.WATER],
    build: (world) => {
      world.clear()
      const w = world.width
      const h = world.height
      const surface = Math.floor(h * 0.55)
      for (let x = 0; x < w; x++)
        for (let y = surface; y < h; y++) {
          const edge = x < 5 || x > w - 6 || y > h - 4
          world.set(x, y, edge ? E.ROCK : E.LAVA)
        }
      world.wakeAll()
    },
    check: (world) => {
      const n = countId(world, E.OBSIDIAN)
      const goal = 120
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} obsidian` }
    },
  },
]
