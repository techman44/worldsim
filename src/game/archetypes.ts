import { World } from '../sim/engine'
import { E } from '../sim/elements'

// ----------------------------------------------------------------------------
// Archetypes are tested, correct-by-construction level mechanics. A Level is
// just data that picks an archetype and supplies params; the archetype provides
// the build() and check() so every generated level is guaranteed to compile,
// start un-solved, and be solvable with the intended elements.
//
// Both build() and check() derive their geometry deterministically from params
// and the world size. build() may stash a measured baseline into params (e.g.
// `params._base`) for ratio goals — params is a live runtime object.
// ----------------------------------------------------------------------------

export interface LevelCheck {
  progress: number
  done: boolean
  status: string
}

export interface Archetype {
  id: string
  build: (world: World, p: any) => void
  check: (world: World, p: any) => LevelCheck
  /** the elements this mechanic is intended to be solved with */
  defaultAllowed: number[]
  /**
   * Elements that must NEVER be in the palette — typically the result element,
   * so the puzzle can't be solved by simply painting the answer. Stripped from
   * any level's palette (the win must come from physics).
   */
  forbidInPalette?: number[]
}

// --- shared helpers ----------------------------------------------------------
function fillRect(w: World, x0: number, y0: number, x1: number, y1: number, id: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (w.inBounds(x, y)) w.set(x, y, id)
}
function countId(w: World, id: number): number {
  let c = 0
  const cells = w.cells
  for (let i = 0; i < cells.length; i++) if (cells[i] === id) c++
  return c
}
function countRegion(w: World, id: number, x0: number, y0: number, x1: number, y1: number): number {
  let c = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (w.get(x, y) === id) c++
  return c
}
function flatGround(w: World, topId: number, soilDepth: number, soilId: number, baseId: number, topFrac = 0.7) {
  const surface = Math.floor(w.height * topFrac)
  for (let x = 0; x < w.width; x++) {
    w.set(x, surface, topId)
    for (let y = surface + 1; y < w.height; y++) w.set(x, y, y - surface <= soilDepth ? soilId : baseId)
  }
  return surface
}
function pct(n: number, goal: number) {
  return Math.max(0, Math.min(100, Math.round((n / Math.max(1, goal)) * 100)))
}

// ============================================================================
export const ARCHETYPES: Record<string, Archetype> = {
  // Grow N plants on damp soil. params: { goal, pond, topFrac }
  growForest: {
    id: 'growForest',
    defaultAllowed: [E.SEED, E.WATER, E.DIRT],
    build(w, p) {
      w.clear()
      const surface = flatGround(w, E.DIRT, 8, E.DIRT, E.STONE, p.topFrac ?? 0.7)
      const cx = (w.width / 2) | 0
      const pond = p.pond ?? 14
      for (let x = cx - pond; x <= cx + pond; x++)
        for (let y = surface; y <= surface + 5; y++) {
          const dx = (x - cx) / pond
          const dy = (y - (surface + 2)) / 5
          if (dx * dx + dy * dy <= 1) w.set(x, y, y < surface + 5 ? E.WATER : E.MUD)
        }
      // no starter plants — the player must sow seeds and grow the forest
      w.wakeAll()
    },
    check(w, p) {
      const goal = p.goal ?? 200
      const n = countId(w, E.PLANT)
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} plants` }
    },
  },

  // Fill a hollow container with a fluid. params: { fluid, depth, width, ratio }
  fillVessel: {
    id: 'fillVessel',
    defaultAllowed: [E.WATER],
    build(w, p) {
      w.clear()
      const fluid = p.fluid ?? E.WATER
      void fluid
      const surface = flatGround(w, E.STONE, 6, E.DIRT, E.STONE, 0.32)
      const cx = (w.width / 2) | 0
      const half = Math.max(4, (p.width ?? 14) / 2) | 0
      const top = surface - 2
      const bottom = w.height - 4
      fillRect(w, cx - half - 2, top, cx - half, bottom, E.STONE)
      fillRect(w, cx + half, top, cx + half + 2, bottom, E.STONE)
      fillRect(w, cx - half, bottom, cx + half, bottom + 1, E.STONE)
      fillRect(w, cx - half + 1, top, cx + half - 1, bottom - 1, E.EMPTY)
      p._region = [cx - half + 1, top + 2, cx + half - 1, bottom - 1]
      w.wakeAll()
    },
    check(w, p) {
      const fluid = p.fluid ?? E.WATER
      const [x0, y0, x1, y1] = p._region ?? [0, 0, 0, 0]
      const total = (x1 - x0 + 1) * (y1 - y0 + 1)
      const goal = Math.floor(total * (p.ratio ?? 0.85))
      const n = countRegion(w, fluid, x0, y0, x1, y1)
      return { progress: n / goal, done: n >= goal, status: `vessel ${pct(n, goal)}% full` }
    },
  },

  // Freeze a lake. params: { ratio }. Solved with SNOW — cold propagates through
  // the water and freezes it; ICE is never paintable (no cheating).
  freezeLake: {
    id: 'freezeLake',
    defaultAllowed: [E.SNOW],
    forbidInPalette: [E.ICE],
    build(w, p) {
      w.clear()
      const surface = Math.floor(w.height * (p.topFrac ?? 0.5))
      for (let x = 0; x < w.width; x++)
        for (let y = surface; y < w.height; y++) w.set(x, y, x < 6 || x > w.width - 7 ? E.STONE : E.WATER)
      p._base = countId(w, E.WATER)
      w.wakeAll()
    },
    check(w, p) {
      const goal = Math.floor((p._base ?? 1000) * (p.ratio ?? 0.6))
      const n = countId(w, E.ICE)
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} ice` }
    },
  },

  // Melt a sand bed into glass. params: { goal, depthFrac }
  forgeGlass: {
    id: 'forgeGlass',
    defaultAllowed: [E.LAVA],
    forbidInPalette: [E.GLASS],
    build(w, p) {
      w.clear()
      const surface = Math.floor(w.height * (p.depthFrac ?? 0.45))
      fillRect(w, 0, surface, w.width - 1, w.height - 1, E.SAND)
      fillRect(w, 0, w.height - 3, w.width - 1, w.height - 1, E.STONE)
      w.wakeAll()
    },
    check(w, p) {
      const goal = p.goal ?? 140
      const n = countId(w, E.GLASS)
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} glass` }
    },
  },

  // Quench a lava lake into obsidian. params: { goal }
  quenchLava: {
    id: 'quenchLava',
    defaultAllowed: [E.WATER],
    forbidInPalette: [E.OBSIDIAN],
    build(w, p) {
      w.clear()
      const h = w.height
      const wd = w.width
      const surface = Math.floor(h * (p.topFrac ?? 0.58))
      const depth = p.depth ?? 3
      // a thin, wide lava sheet on a stone basin — shallow enough that water
      // poured on top reaches (and quenches) it instead of crusting over a deep pool
      fillRect(w, 0, surface + depth, wd - 1, h - 1, E.STONE)
      fillRect(w, 5, surface - 1, 6, surface + depth, E.ROCK)
      fillRect(w, wd - 7, surface - 1, wd - 6, surface + depth, E.ROCK)
      fillRect(w, 7, surface, wd - 8, surface + depth - 1, E.LAVA)
      w.wakeAll()
    },
    check(w, p) {
      const goal = p.goal ?? 120
      const n = countId(w, E.OBSIDIAN)
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} obsidian` }
    },
  },

  // Put out a burning wooden store-house and save most of its timber. It's an
  // OPEN-TOP enclosure so poured water can actually reach the flames inside.
  // params: { keep, width }
  extinguish: {
    id: 'extinguish',
    defaultAllowed: [E.WATER, E.SAND],
    build(w, p) {
      w.clear()
      const surface = flatGround(w, E.PLANT, 6, E.DIRT, E.STONE, 0.7)
      const cx = (w.width / 2) | 0
      const bw = p.width ?? 24
      const bh = 16
      const left = cx - (bw >> 1)
      const right = cx + (bw >> 1)
      const top = surface - bh
      const bottom = surface - 1
      // a hollow wooden cabin: single-thickness walls + floor, fully open top so
      // water poured inside reaches every wall cell (each has interior water on
      // one side) and douses it.
      fillRect(w, left, top, left, bottom, E.WOOD)
      fillRect(w, right, top, right, bottom, E.WOOD)
      fillRect(w, left, bottom, right, bottom, E.WOOD)
      const total = countId(w, E.WOOD)
      p._keep = Math.floor(total * (p.keep ?? 0.5))
      // start a fire low on one wall
      let lit = 0
      for (let attempt = 0; attempt < 400 && lit < 5; attempt++) {
        const y = bottom - 2 - ((Math.abs(Math.cos(attempt * 7.3)) * 8) | 0)
        if (w.get(left, y) === E.WOOD) {
          w.set(left, y, E.FIRE, 700)
          lit++
        }
      }
      w.wakeAll()
    },
    check(w, p) {
      const fire = countId(w, E.FIRE) + countId(w, E.EMBER)
      const fuel = countId(w, E.WOOD)
      const keep = p._keep ?? 30
      const done = fire === 0 && fuel >= keep
      return {
        progress: fuel >= keep ? (fire === 0 ? 1 : 0.7) : 0.2,
        done,
        status: fire > 0 ? `${fire} flames · ${fuel} left` : `out · saved ${fuel}`,
      }
    },
  },

  // Dissolve a solid barrier with acid. params: { barrier, leave }
  dissolveBarrier: {
    id: 'dissolveBarrier',
    defaultAllowed: [E.ACID],
    build(w, p) {
      w.clear()
      flatGround(w, E.STONE, 4, E.DIRT, E.STONE, 0.7)
      const cx = (w.width / 2) | 0
      const surface = Math.floor(w.height * 0.7)
      const barrier = p.barrier ?? E.STONE
      const halfW = Math.floor((p.width ?? 10) / 2)
      const top = surface - (p.height ?? 22)
      fillRect(w, cx - halfW, top, cx + halfW, surface - 1, barrier)
      p._region = [cx - halfW, top, cx + halfW, surface - 1]
      p._base = countRegion(w, barrier, cx - halfW, top, cx + halfW, surface - 1)
      w.wakeAll()
    },
    check(w, p) {
      const [x0, y0, x1, y1] = p._region ?? [0, 0, 0, 0]
      const barrier = p.barrier ?? E.STONE
      const remain = countRegion(w, barrier, x0, y0, x1, y1)
      const goal = Math.floor((p._base ?? 100) * (1 - (p.leave ?? 0.15)))
      const removed = (p._base ?? 100) - remain
      return { progress: removed / goal, done: removed >= goal, status: `dissolved ${pct(removed, goal)}%` }
    },
  },

  // Blow a hole through a wall with gunpowder. params: { goal }
  blastWall: {
    id: 'blastWall',
    defaultAllowed: [E.GUNPOWDER, E.FIRE],
    build(w, p) {
      w.clear()
      const surface = flatGround(w, E.STONE, 4, E.DIRT, E.STONE, 0.78)
      const cx = (w.width / 2) | 0
      const halfW = Math.floor((p.width ?? 6) / 2)
      const top = surface - (p.height ?? 30)
      fillRect(w, cx - halfW, top, cx + halfW, surface - 1, E.ROCK)
      p._region = [cx - halfW, top, cx + halfW, surface - 1]
      p._base = countRegion(w, E.ROCK, cx - halfW, top, cx + halfW, surface - 1)
      w.wakeAll()
    },
    check(w, p) {
      const [x0, y0, x1, y1] = p._region ?? [0, 0, 0, 0]
      const remain = countRegion(w, E.ROCK, x0, y0, x1, y1)
      const removed = (p._base ?? 100) - remain
      const goal = Math.floor((p._base ?? 100) * (p.clear ?? 0.4))
      return { progress: removed / goal, done: removed >= goal, status: `breach ${pct(removed, goal)}%` }
    },
  },

  // Boil water into steam — produce N steam at once. params: { goal }
  boilOff: {
    id: 'boilOff',
    defaultAllowed: [E.LAVA],
    forbidInPalette: [E.STEAM],
    build(w, _p) {
      w.clear()
      const surface = Math.floor(w.height * 0.5)
      // a shallow pan of water with stone walls
      for (let x = 8; x < w.width - 8; x++)
        for (let y = surface; y < w.height - 6; y++) w.set(x, y, E.WATER)
      fillRect(w, 6, surface - 1, 8, w.height - 1, E.STONE)
      fillRect(w, w.width - 9, surface - 1, w.width - 7, w.height - 1, E.STONE)
      fillRect(w, 6, w.height - 6, w.width - 7, w.height - 4, E.STONE)
      w.wakeAll()
    },
    check(w, p) {
      const goal = p.goal ?? 120
      const n = countId(w, E.STEAM)
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} steam` }
    },
  },

  // Grow crystals in a cavern basin. The basin starts DRY with crystal seeds on
  // its floor; crystals only grow through water, so the player must flood the
  // basin and let the seeds spread. params: { goal }. Solved with WATER.
  growCrystals: {
    id: 'growCrystals',
    defaultAllowed: [E.WATER],
    forbidInPalette: [E.CRYSTAL],
    build(w, _p) {
      w.clear()
      const h = w.height
      const wdt = w.width
      const surface = Math.floor(h * 0.42)
      // solid stone, then carve an empty basin
      fillRect(w, 0, surface, wdt - 1, h - 1, E.STONE)
      const x0 = 10
      const x1 = wdt - 11
      const top = surface + 3
      const bot = h - 4
      fillRect(w, x0, top, x1, bot, E.EMPTY)
      // a few crystal seeds on the basin floor (dry — they won't grow until
      // flooded); spaced out so the starting count stays well below any goal
      for (let x = x0 + 4; x <= x1 - 4; x += 14) w.set(x, bot, E.CRYSTAL)
      w.wakeAll()
    },
    check(w, p) {
      const goal = p.goal ?? 90
      const n = countId(w, E.CRYSTAL)
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} crystal` }
    },
  },

  // Drape a cliff in vines. params: { goal }
  drapeVines: {
    id: 'drapeVines',
    defaultAllowed: [E.VINE, E.WATER],
    build(w, _p) {
      w.clear()
      // a stone overhang
      const top = Math.floor(w.height * 0.25)
      fillRect(w, 0, top, w.width - 1, top + 3, E.STONE)
      fillRect(w, 0, w.height - 6, w.width - 1, w.height - 1, E.DIRT)
      w.wakeAll()
    },
    check(w, p) {
      const goal = p.goal ?? 140
      const n = countId(w, E.VINE)
      return { progress: n / goal, done: n >= goal, status: `${n} / ${goal} vine` }
    },
  },

  // Make it rain by sending steam up to form clouds, then collect water in a
  // basin. params: { goal } — solved with lava under a covered pool, etc.
  collectWater: {
    id: 'collectWater',
    defaultAllowed: [E.WATER, E.SAND, E.STONE],
    build(w, p) {
      w.clear()
      const surface = Math.floor(w.height * 0.62)
      // an empty basin to fill to a marked line
      fillRect(w, 10, surface, 12, w.height - 1, E.STONE)
      fillRect(w, w.width - 13, surface, w.width - 11, w.height - 1, E.STONE)
      fillRect(w, 10, w.height - 3, w.width - 11, w.height - 1, E.STONE)
      p._region = [13, surface, w.width - 14, w.height - 4]
      w.wakeAll()
    },
    check(w, p) {
      const [x0, y0, x1, y1] = p._region ?? [0, 0, 0, 0]
      const total = (x1 - x0 + 1) * (y1 - y0 + 1)
      const goal = Math.floor(total * (p.ratio ?? 0.6))
      const n = countRegion(w, E.WATER, x0, y0, x1, y1)
      return { progress: n / goal, done: n >= goal, status: `basin ${pct(n, goal)}% full` }
    },
  },
}

export type ArchetypeId = keyof typeof ARCHETYPES
