import { Category, type Element, type SimView } from './types'

// Stable numeric ids. 0 must be Empty. Keep these stable — saved worlds and
// stamps reference them by number.
export const E = {
  EMPTY: 0,
  WALL: 1,
  SAND: 2,
  DIRT: 3,
  STONE: 4,
  ROCK: 5,
  WOOD: 6,
  METAL: 7,
  GLASS: 8,
  WATER: 9,
  LAVA: 10,
  ACID: 11,
  OIL: 12,
  FIRE: 13,
  SMOKE: 14,
  STEAM: 15,
  ASH: 16,
  SNOW: 17,
  ICE: 18,
  PLANT: 19,
  SEED: 20,
  GUNPOWDER: 21,
  SALT: 22,
  CLOUD: 23,
  SPARK: 24,
  OBSIDIAN: 25,
  EMBER: 26,
  MUD: 27,
  SLIME: 28,
  VINE: 29,
  SANDSTONE: 30,
  METHANE: 31,
  CRYSTAL: 32,
  GOLD: 33,
  LIGHTNING: 34,
} as const

// --- helpers used by custom update hooks ------------------------------------
const NEIGH4 = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const
const NEIGH8 = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const

function anyNeighbour(v: SimView, x: number, y: number, id: number, eight = false): boolean {
  const list = eight ? NEIGH8 : NEIGH4
  for (const [dx, dy] of list) if (v.get(x + dx, y + dy) === id) return true
  return false
}
function countNeighbour(v: SimView, x: number, y: number, id: number): number {
  let c = 0
  for (const [dx, dy] of NEIGH8) if (v.get(x + dx, y + dy) === id) c++
  return c
}

// The registry. Index in this array === element id.
export const ELEMENTS: Element[] = []
function def(e: Element) {
  ELEMENTS[e.id] = e
}

def({
  id: E.EMPTY,
  name: 'Eraser',
  category: Category.Empty,
  color: [14, 17, 22],
  colorNoise: 0,
  density: 0,
  icon: 'eraser',
  description: 'Removes whatever you paint over.',
})

// ---- static solids ----------------------------------------------------------
def({
  id: E.WALL,
  name: 'Wall',
  category: Category.Solid,
  color: [70, 74, 82],
  colorNoise: 0.06,
  density: 9999,
  acidProof: true,
  icon: 'wall',
  description: 'Indestructible. Nothing corrodes, melts or burns it.',
})
def({
  id: E.STONE,
  name: 'Stone',
  category: Category.Solid,
  color: [120, 122, 128],
  colorNoise: 0.16,
  density: 50,
  meltsAt: 1100,
  meltsInto: E.LAVA,
  icon: 'stone',
  description: 'Solid rock. Melts into lava under extreme heat.',
})
def({
  id: E.ROCK,
  name: 'Rock',
  category: Category.Solid,
  color: [98, 92, 86],
  colorNoise: 0.2,
  density: 55,
  meltsAt: 1150,
  meltsInto: E.LAVA,
  icon: 'rock',
})
def({
  id: E.WOOD,
  name: 'Wood',
  category: Category.Solid,
  color: [120, 80, 44],
  colorNoise: 0.14,
  density: 30,
  flammable: true,
  igniteTemp: 260,
  burnsInto: E.EMBER,
  burnLife: 140,
  icon: 'wood',
  description: 'Burns slowly, leaving embers and ash.',
})
def({
  id: E.METAL,
  name: 'Metal',
  category: Category.Solid,
  color: [150, 158, 168],
  colorNoise: 0.08,
  density: 70,
  meltsAt: 1400,
  meltsInto: E.LAVA,
  icon: 'metal',
  description: 'Conducts sparks. Melts only under intense heat.',
})
def({
  id: E.GLASS,
  name: 'Glass',
  category: Category.Solid,
  color: [180, 214, 222],
  colorNoise: 0.05,
  density: 45,
  acidProof: true,
  meltsAt: 1300,
  meltsInto: E.LAVA,
  icon: 'glass',
  description: 'Made from sand near intense heat. Resists acid.',
})
def({
  id: E.SANDSTONE,
  name: 'Sandstone',
  category: Category.Solid,
  color: [206, 178, 120],
  colorNoise: 0.12,
  density: 48,
  icon: 'sandstone',
})
def({
  id: E.OBSIDIAN,
  name: 'Obsidian',
  category: Category.Solid,
  color: [40, 32, 52],
  colorNoise: 0.1,
  density: 60,
  acidProof: true,
  icon: 'obsidian',
  description: 'Forms when water quenches lava.',
})
def({
  id: E.GOLD,
  name: 'Gold',
  category: Category.Solid,
  color: [226, 184, 60],
  colorNoise: 0.1,
  density: 90,
  acidProof: true,
  meltsAt: 1064,
  meltsInto: E.LAVA,
  icon: 'gold',
})
def({
  id: E.CRYSTAL,
  name: 'Crystal',
  category: Category.Solid,
  color: [150, 210, 230],
  colorNoise: 0.18,
  density: 52,
  emissive: true,
  acidProof: true,
  icon: 'crystal',
  description: 'Glows faintly. Slowly grows toward nearby crystal.',
  update(v, x, y) {
    // occasionally crystallises an adjacent watery/empty cell next to two crystals
    if (v.randInt(220) !== 0) return
    for (const [dx, dy] of NEIGH4) {
      const n = v.get(x + dx, y + dy)
      if ((n === E.EMPTY || n === E.WATER) && countNeighbour(v, x + dx, y + dy, E.CRYSTAL) >= 2) {
        v.set(x + dx, y + dy, E.CRYSTAL)
        return
      }
    }
  },
})

// ---- powders ---------------------------------------------------------------
def({
  id: E.SAND,
  name: 'Sand',
  category: Category.Powder,
  color: [222, 194, 120],
  colorNoise: 0.16,
  density: 40,
  meltsAt: 820,
  meltsInto: E.GLASS,
  icon: 'sand',
  description: 'Piles up. Fuses into glass near lava or fire.',
  reactions: [{ with: E.WATER, become: E.SAND }],
})
def({
  id: E.DIRT,
  name: 'Dirt',
  category: Category.Powder,
  color: [108, 76, 46],
  colorNoise: 0.16,
  density: 41,
  icon: 'dirt',
  description: 'Soil for plants. Turns to mud when wet.',
  reactions: [{ with: E.WATER, become: E.MUD, neighbourBecomes: E.EMPTY, chance: 0.05 }],
})
def({
  id: E.ASH,
  name: 'Ash',
  category: Category.Powder,
  color: [86, 84, 88],
  colorNoise: 0.2,
  density: 35,
  icon: 'ash',
})
def({
  id: E.SNOW,
  name: 'Snow',
  category: Category.Powder,
  color: [236, 242, 250],
  colorNoise: 0.08,
  density: 20,
  baseTemp: -8,
  heat: -10,
  meltsAt: 2,
  meltsInto: E.WATER,
  icon: 'snow',
  description: 'Cold and light. Melts into water when it warms.',
})
def({
  id: E.SALT,
  name: 'Salt',
  category: Category.Powder,
  color: [238, 238, 244],
  colorNoise: 0.1,
  density: 38,
  icon: 'salt',
  description: 'Dissolves in water; melts ice it touches.',
  reactions: [
    { with: E.WATER, become: E.EMPTY, chance: 0.08 },
    { with: E.ICE, neighbourBecomes: E.WATER, chance: 0.05 },
  ],
})
def({
  id: E.GUNPOWDER,
  name: 'Gunpowder',
  category: Category.Powder,
  color: [60, 60, 66],
  colorNoise: 0.18,
  density: 39,
  flammable: true,
  igniteTemp: 180,
  icon: 'gunpowder',
  description: 'Flashes into an explosion when it catches fire.',
  update(v, x, y) {
    if (v.getTemp(x, y) > 180 || anyNeighbour(v, x, y, E.FIRE, true) || anyNeighbour(v, x, y, E.SPARK, true) || anyNeighbour(v, x, y, E.LIGHTNING, true)) {
      // explode: blast fire/embers outward
      const R = 4
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          if (dx * dx + dy * dy > R * R) continue
          const t = v.get(x + dx, y + dy)
          if (t === E.WALL || t === E.EMPTY) {
            if (t === E.EMPTY && v.randInt(2) === 0) v.set(x + dx, y + dy, E.FIRE, 700)
          } else if (t !== E.OBSIDIAN && v.randInt(3) === 0) {
            v.set(x + dx, y + dy, E.FIRE, 700)
          }
        }
      }
      v.set(x, y, E.FIRE, 900)
    }
  },
})

// ---- liquids ---------------------------------------------------------------
def({
  id: E.WATER,
  name: 'Water',
  category: Category.Liquid,
  color: [54, 120, 200],
  colorNoise: 0.1,
  density: 32,
  baseTemp: 20,
  boilsAt: 100,
  boilsInto: E.STEAM,
  freezesAt: -2,
  freezesInto: E.ICE,
  icon: 'water',
  description: 'Flows, puts out fire, freezes and boils.',
  reactions: [
    { with: E.LAVA, become: E.STEAM, neighbourBecomes: E.OBSIDIAN, chance: 0.5 },
    { with: E.FIRE, become: E.STEAM, neighbourBecomes: E.SMOKE, chance: 0.7 },
    { with: E.EMBER, become: E.STEAM, neighbourBecomes: E.EMPTY, chance: 0.5 },
  ],
})
def({
  id: E.LAVA,
  name: 'Lava',
  category: Category.Liquid,
  color: [240, 120, 36],
  colorNoise: 0.18,
  density: 60,
  emissive: true,
  baseTemp: 1200,
  heat: 1200,
  freezesAt: 560,
  freezesInto: E.STONE,
  icon: 'lava',
  description: 'Molten rock. Cools into stone, fuses sand to glass, ignites the flammable.',
  reactions: [{ with: E.WATER, become: E.OBSIDIAN, neighbourBecomes: E.STEAM, chance: 0.5 }],
})
def({
  id: E.ACID,
  name: 'Acid',
  category: Category.Liquid,
  color: [150, 230, 70],
  colorNoise: 0.12,
  density: 33,
  emissive: true,
  baseTemp: 20,
  icon: 'acid',
  description: 'Dissolves most solids and powders over time.',
  update(v, x, y) {
    for (const [dx, dy] of NEIGH4) {
      const n = v.get(x + dx, y + dy)
      if (n === E.EMPTY || n === E.ACID) continue
      const el = ELEMENTS[n]
      if (!el || el.acidProof || el.category === Category.Gas || el.category === Category.Energy) continue
      if (v.randInt(6) === 0) {
        v.set(x + dx, y + dy, v.randInt(4) === 0 ? E.SMOKE : E.EMPTY)
        if (v.randInt(3) === 0) v.set(x, y, E.SMOKE) // acid is consumed sometimes
        return
      }
    }
  },
})
def({
  id: E.OIL,
  name: 'Oil',
  category: Category.Liquid,
  color: [60, 50, 40],
  colorNoise: 0.1,
  density: 28, // lighter than water → floats
  flammable: true,
  igniteTemp: 150,
  burnsInto: E.SMOKE,
  burnLife: 90,
  icon: 'oil',
  description: 'Floats on water and burns fiercely.',
})
def({
  id: E.MUD,
  name: 'Mud',
  category: Category.Liquid,
  color: [78, 58, 40],
  colorNoise: 0.12,
  density: 44,
  meltsAt: 200,
  meltsInto: E.DIRT, // bakes back to dry dirt when heated
  icon: 'mud',
})
def({
  id: E.SLIME,
  name: 'Slime',
  category: Category.Liquid,
  color: [90, 200, 130],
  colorNoise: 0.14,
  density: 36,
  emissive: false,
  icon: 'slime',
  description: 'A sluggish, sticky goo.',
})

// ---- gases -----------------------------------------------------------------
def({
  id: E.STEAM,
  name: 'Steam',
  category: Category.Gas,
  color: [200, 210, 220],
  colorNoise: 0.08,
  density: 4,
  baseTemp: 110,
  initialLife: 160,
  icon: 'steam',
  update(v, x, y) {
    // near the top of the world steam gathers into clouds
    if (y < v.height * 0.18 && v.randInt(80) === 0) v.set(x, y, E.CLOUD)
    let life = v.getLife(x, y)
    if (--life <= 0) v.set(x, y, v.randInt(3) === 0 ? E.WATER : E.EMPTY)
    else v.setLife(x, y, life)
  },
})
def({
  id: E.SMOKE,
  name: 'Smoke',
  category: Category.Gas,
  color: [60, 60, 66],
  colorNoise: 0.12,
  density: 3,
  initialLife: 120,
  icon: 'smoke',
  update(v, x, y) {
    let life = v.getLife(x, y)
    if (--life <= 0) v.set(x, y, E.EMPTY)
    else v.setLife(x, y, life)
  },
})
def({
  id: E.METHANE,
  name: 'Methane',
  category: Category.Gas,
  color: [120, 150, 90],
  colorNoise: 0.1,
  density: 2,
  flammable: true,
  igniteTemp: 140,
  burnsInto: E.FIRE,
  burnLife: 20,
  icon: 'methane',
  description: 'A flammable gas — keep it away from flame.',
})
def({
  id: E.CLOUD,
  name: 'Cloud',
  category: Category.Gas,
  color: [225, 230, 240],
  colorNoise: 0.06,
  density: 1,
  icon: 'cloud',
  description: 'Drifts and rains. Steam rises to form it.',
  update(v, x, y) {
    // rain: drop water from the underside now and then
    if (v.randInt(140) === 0 && v.get(x, y + 1) === E.EMPTY) {
      v.set(x, y + 1, E.WATER)
    }
  },
})

// ---- energy ----------------------------------------------------------------
def({
  id: E.FIRE,
  name: 'Fire',
  category: Category.Energy,
  color: [255, 150, 40],
  colorNoise: 0.2,
  density: 2,
  emissive: true,
  baseTemp: 700,
  heat: 700,
  initialLife: 60,
  icon: 'fire',
  description: 'Spreads through anything flammable, then dies to smoke.',
  update(v, x, y) {
    // spread to flammable neighbours
    for (const [dx, dy] of NEIGH8) {
      const n = v.get(x + dx, y + dy)
      const el = ELEMENTS[n]
      if (el?.flammable && v.randInt(4) === 0) {
        v.set(x + dx, y + dy, el.burnsInto ?? E.FIRE, 700)
        if (el.burnLife) v.setLife(x + dx, y + dy, el.burnLife)
      }
    }
    // rise & flicker: try to move up into empty space
    if (v.get(x, y - 1) === E.EMPTY && v.randInt(2) === 0) v.swap(x, y, x, y - 1)
    let life = v.getLife(x, y)
    if (life <= 0) life = 60
    if (--life <= 0) v.set(x, y, v.randInt(3) === 0 ? E.SMOKE : E.EMPTY)
    else v.setLife(x, y, life)
  },
})
def({
  id: E.EMBER,
  name: 'Ember',
  category: Category.Powder,
  color: [220, 90, 30],
  colorNoise: 0.25,
  density: 36,
  emissive: true,
  baseTemp: 480,
  heat: 420,
  flammable: false,
  initialLife: 120,
  icon: 'ember',
  description: 'Glowing remains of a fire. Reignites the flammable, then turns to ash.',
  update(v, x, y) {
    for (const [dx, dy] of NEIGH8) {
      const n = v.get(x + dx, y + dy)
      const el = ELEMENTS[n]
      if (el?.flammable && v.randInt(10) === 0) v.set(x + dx, y + dy, E.FIRE, 700)
    }
    let life = v.getLife(x, y)
    if (life <= 0) life = 120
    if (--life <= 0) v.set(x, y, E.ASH)
    else v.setLife(x, y, life)
  },
})
def({
  id: E.SPARK,
  name: 'Spark',
  category: Category.Energy,
  color: [255, 244, 150],
  colorNoise: 0.2,
  density: 2,
  emissive: true,
  baseTemp: 120,
  initialLife: 10,
  icon: 'spark',
  description: 'Travels along metal, igniting oil and gunpowder.',
  update(v, x, y) {
    // conduct along metal: light up adjacent metal that isn't already sparking
    for (const [dx, dy] of NEIGH8) {
      const n = v.get(x + dx, y + dy)
      if (n === E.METAL && v.randInt(2) === 0) {
        // leave a brief spark traveling — mark via life on a temporary fire-free spark
        if (v.get(x + dx, y + dy + 1) === E.EMPTY) v.set(x + dx, y + dy, E.METAL)
      }
      const el = ELEMENTS[n]
      if (el?.flammable && v.randInt(2) === 0) v.set(x + dx, y + dy, E.FIRE, 700)
    }
    let life = v.getLife(x, y)
    if (life <= 0) life = 10
    if (--life <= 0) v.set(x, y, E.EMPTY)
    else v.setLife(x, y, life)
  },
})
def({
  id: E.LIGHTNING,
  name: 'Lightning',
  category: Category.Energy,
  color: [220, 230, 255],
  colorNoise: 0.1,
  density: 0,
  emissive: true,
  baseTemp: 1500,
  heat: 900,
  initialLife: 6,
  hidden: true,
  icon: 'lightning',
  update(v, x, y) {
    for (const [dx, dy] of NEIGH8) {
      const el = ELEMENTS[v.get(x + dx, y + dy)]
      if (el?.flammable) v.set(x + dx, y + dy, E.FIRE, 800)
    }
    let life = v.getLife(x, y)
    if (life <= 0) life = 6
    if (--life <= 0) v.set(x, y, E.EMPTY)
    else v.setLife(x, y, life)
  },
})

// ---- ice (solid that melts/spreads cold) -----------------------------------
def({
  id: E.ICE,
  name: 'Ice',
  category: Category.Solid,
  color: [180, 220, 245],
  colorNoise: 0.08,
  density: 30,
  baseTemp: -10,
  heat: -14,
  meltsAt: 2,
  meltsInto: E.WATER,
  icon: 'ice',
  description: 'Frozen water. Freezes water it touches when cold.',
  update(v, x, y) {
    if (v.getTemp(x, y) < -1 && v.randInt(20) === 0) {
      for (const [dx, dy] of NEIGH4) {
        if (v.get(x + dx, y + dy) === E.WATER) {
          v.set(x + dx, y + dy, E.ICE, -8)
          return
        }
      }
    }
  },
})

// ---- life ------------------------------------------------------------------
def({
  id: E.PLANT,
  name: 'Plant',
  category: Category.Life,
  color: [70, 170, 70],
  colorNoise: 0.18,
  density: 25,
  flammable: true,
  igniteTemp: 200,
  burnsInto: E.FIRE,
  burnLife: 50,
  icon: 'plant',
  description: 'Grows on soil and toward water; withers without it.',
  update(v, x, y) {
    // grow upward / sideways into empty space if watered or on soil
    const watered = anyNeighbour(v, x, y, E.WATER, true)
    const onSoil = anyNeighbour(v, x, y, E.DIRT, true) || anyNeighbour(v, x, y, E.MUD, true) || anyNeighbour(v, x, y, E.PLANT, true)
    if ((watered || onSoil) && v.randInt(watered ? 14 : 40) === 0) {
      const dirs: [number, number][] = [
        [0, -1],
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
      ]
      const d = dirs[v.randInt(dirs.length)]
      if (v.get(x + d[0], y + d[1]) === E.EMPTY) v.set(x + d[0], y + d[1], E.PLANT)
    }
    // wither slowly if bone dry and not on soil
    if (!watered && !onSoil && v.randInt(900) === 0) v.set(x, y, E.EMPTY)
    // absorb adjacent water as it grows
    if (watered && v.randInt(30) === 0) {
      for (const [dx, dy] of NEIGH4) if (v.get(x + dx, y + dy) === E.WATER) { v.set(x + dx, y + dy, E.EMPTY); break }
    }
  },
})
def({
  id: E.VINE,
  name: 'Vine',
  category: Category.Life,
  color: [60, 150, 80],
  colorNoise: 0.16,
  density: 25,
  flammable: true,
  igniteTemp: 200,
  burnsInto: E.FIRE,
  burnLife: 40,
  icon: 'vine',
  description: 'Creeps downward from whatever it clings to.',
  update(v, x, y) {
    if (v.randInt(24) === 0 && v.get(x, y + 1) === E.EMPTY) v.set(x, y + 1, E.VINE)
    else if (v.randInt(80) === 0 && v.get(x + (v.randInt(2) ? 1 : -1), y) === E.EMPTY) {
      v.set(x + (v.randInt(2) ? 1 : -1), y, E.VINE)
    }
  },
})
def({
  id: E.SEED,
  name: 'Seed',
  category: Category.Powder,
  color: [150, 120, 60],
  colorNoise: 0.14,
  density: 22,
  flammable: true,
  igniteTemp: 220,
  burnsInto: E.FIRE,
  burnLife: 20,
  icon: 'seed',
  description: 'Falls and sprouts into a plant on damp soil.',
  update(v, x, y) {
    const resting = v.get(x, y + 1) !== E.EMPTY && ELEMENTS[v.get(x, y + 1)]?.category !== Category.Liquid
    const onSoil = v.get(x, y + 1) === E.DIRT || v.get(x, y + 1) === E.MUD || v.get(x, y + 1) === E.SAND
    const watered = anyNeighbour(v, x, y, E.WATER, true) || anyNeighbour(v, x, y, E.MUD, true)
    if (resting && onSoil && watered && v.randInt(20) === 0) v.set(x, y, E.PLANT)
  },
})

export const ELEMENT_COUNT = ELEMENTS.length

// Palette order (what shows up, and grouped sensibly). Eraser first.
export const PALETTE: number[] = [
  E.EMPTY,
  E.SAND,
  E.DIRT,
  E.STONE,
  E.ROCK,
  E.WOOD,
  E.METAL,
  E.GLASS,
  E.SANDSTONE,
  E.GOLD,
  E.CRYSTAL,
  E.WALL,
  E.WATER,
  E.OIL,
  E.ACID,
  E.LAVA,
  E.MUD,
  E.SLIME,
  E.SALT,
  E.SNOW,
  E.ICE,
  E.PLANT,
  E.SEED,
  E.VINE,
  E.FIRE,
  E.EMBER,
  E.SPARK,
  E.GUNPOWDER,
  E.METHANE,
  E.SMOKE,
  E.STEAM,
  E.CLOUD,
  E.ASH,
  E.OBSIDIAN,
].filter((id, i, arr) => arr.indexOf(id) === i && !ELEMENTS[id]?.hidden)
