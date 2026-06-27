// Core simulation types. Elements are data: behavior is selected by `category`
// plus a handful of declarative properties, with optional custom hooks for the
// few elements that need bespoke logic (fire, plant, acid, lava…).

export const enum Category {
  Empty = 0,
  Solid = 1, // static, does not move (stone, wood, glass, wall, ice…)
  Powder = 2, // falls and piles (sand, dirt, ash, snow…)
  Liquid = 3, // falls and spreads horizontally (water, lava, oil…)
  Gas = 4, // rises and disperses (steam, smoke…)
  Energy = 5, // fire, spark, ember, lightning
  Life = 6, // plant, vine, seed…
}

// The mutable view the engine hands to element hooks. Kept as a plain interface
// so the engine (which owns the typed arrays) can implement it cheaply.
export interface SimView {
  readonly width: number
  readonly height: number
  /** element id at (x,y); 0 if out of bounds */
  get(x: number, y: number): number
  /** temperature at (x,y) */
  getTemp(x: number, y: number): number
  setTemp(x: number, y: number): number | void
  /** write an element id at (x,y) and wake the region */
  set(x: number, y: number, id: number, temp?: number): void
  /** swap two cells (used by movement) */
  swap(x1: number, y1: number, x2: number, y2: number): void
  /** generic per-cell scratch byte (lifetime/charge/growth) */
  getLife(x: number, y: number): number
  setLife(x: number, y: number, v: number): void
  inBounds(x: number, y: number): boolean
  /** deterministic-ish randomness for the frame */
  rand(): number
  randInt(n: number): number
  /** current frame counter */
  readonly frame: number
}

export interface Reaction {
  // When this element is adjacent to `with` (element id), and an optional
  // probability check passes, this element becomes `become` and the neighbour
  // (optionally) becomes `neighbourBecomes`.
  with: number
  become?: number
  neighbourBecomes?: number
  chance?: number // 0..1, default 1
}

export interface Element {
  id: number
  name: string
  category: Category
  /** base RGB colour */
  color: [number, number, number]
  /** amount of per-cell brightness noise, 0..1 */
  colorNoise: number
  /** relative density; heavier sinks through lighter fluids/gases */
  density: number
  emissive?: boolean // contributes to the glow pass
  flammable?: boolean
  igniteTemp?: number // °, temperature at which it catches
  burnsInto?: number // what it leaves behind when consumed by fire
  burnLife?: number // how long it burns (frames-ish)
  meltsAt?: number
  meltsInto?: number
  freezesAt?: number
  freezesInto?: number
  boilsAt?: number
  boilsInto?: number
  /** acids corrode this unless `acidProof` */
  acidProof?: boolean
  /** initial temperature when placed */
  baseTemp?: number
  /** continuously emits this much heat to itself/neighbours */
  heat?: number
  /** initial life value when a cell of this element is created */
  initialLife?: number
  /**
   * "Living" elements that act stochastically (plants, vines, crystals, clouds)
   * keep their chunk awake while they still have room to act, so slow growth
   * never stalls when a region would otherwise settle.
   */
  restless?: boolean
  /** declarative adjacency reactions */
  reactions?: Reaction[]
  /** optional bespoke per-cell update, run after generic movement */
  update?: (v: SimView, x: number, y: number) => void
  icon: string // key into the SVG icon set
  hidden?: boolean // not shown in the palette (transient elements)
  description?: string
}
