import { Category, type SimView } from './types'
import { ELEMENTS, E } from './elements'

export const CHUNK = 16

// Fast xorshift PRNG — cheaper than Math.random and good enough for sand.
let _seed = 0x9e3779b9 | 0
function rng(): number {
  _seed ^= _seed << 13
  _seed ^= _seed >>> 17
  _seed ^= _seed << 5
  return ((_seed >>> 0) % 1000000) / 1000000
}

/** Reset the PRNG (used by the headless validator for reproducible runs). */
export function reseedRng(seed: number) {
  _seed = (seed | 0) || 1
}

/**
 * The world grid + cellular-automaton step. Implements SimView so element
 * hooks can read/write cells without knowing about the storage layout.
 *
 * Performance: only "active" chunks are simulated each frame. Any cell change
 * wakes its chunk and the eight neighbours for the next frame, so settled
 * regions cost nothing (Noita-style chunking).
 */
export class World implements SimView {
  readonly width: number
  readonly height: number
  readonly cells: Uint8Array
  readonly temp: Int16Array
  readonly life: Uint8Array
  /** 1 = "pinned" cell: ignores gravity and can't be displaced (build mode) */
  readonly fixed: Uint8Array
  private readonly stamp: Uint32Array
  frame = 0
  ambient = 20
  gravity = 1 // 1 = normal, -1 = inverted, 0 = zero-g (set by god powers)
  wind = 0 // -1..1, nudges gases and fire sideways

  readonly chunksX: number
  readonly chunksY: number
  private activeNow: Uint8Array
  private activeNext: Uint8Array
  private scanDir = 1

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    const n = width * height
    this.cells = new Uint8Array(n)
    this.temp = new Int16Array(n).fill(this.ambient)
    this.life = new Uint8Array(n)
    this.fixed = new Uint8Array(n)
    this.stamp = new Uint32Array(n)
    this.chunksX = Math.ceil(width / CHUNK)
    this.chunksY = Math.ceil(height / CHUNK)
    this.activeNow = new Uint8Array(this.chunksX * this.chunksY).fill(1)
    this.activeNext = new Uint8Array(this.chunksX * this.chunksY)
  }

  idx(x: number, y: number) {
    return y * this.width + x
  }
  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return E.WALL
    return this.cells[y * this.width + x]
  }
  getTemp(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this.ambient
    return this.temp[y * this.width + x]
  }
  setTemp(x: number, y: number, t?: number) {
    if (!this.inBounds(x, y)) return
    if (t !== undefined) {
      this.temp[y * this.width + x] = t
      this.wake(x, y)
    }
    return this.temp[y * this.width + x]
  }
  getLife(x: number, y: number) {
    if (!this.inBounds(x, y)) return 0
    return this.life[y * this.width + x]
  }
  setLife(x: number, y: number, v: number) {
    if (!this.inBounds(x, y)) return
    this.life[y * this.width + x] = v & 0xff
  }

  rand() {
    return rng()
  }
  randInt(n: number) {
    return (rng() * n) | 0
  }

  /**
   * Mark a chunk and its 8 neighbours active. We set BOTH the current and next
   * activity buffers: edits that happen between frames (e.g. the player painting
   * into a settled, sleeping region) must land in the buffer the next step reads
   * — otherwise the start-of-step clear would drop them and the cells would sit
   * frozen exactly as painted. Internal moves only ever add work, so setting the
   * current buffer too is harmless (it just lets activity cascade within a frame).
   */
  wake(x: number, y: number) {
    const cx = (x / CHUNK) | 0
    const cy = (y / CHUNK) | 0
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const nx = cx + i
        const ny = cy + j
        if (nx >= 0 && ny >= 0 && nx < this.chunksX && ny < this.chunksY) {
          const idx = ny * this.chunksX + nx
          this.activeNow[idx] = 1
          this.activeNext[idx] = 1
        }
      }
    }
  }

  set(x: number, y: number, id: number, temp?: number) {
    if (!this.inBounds(x, y)) return
    const i = y * this.width + x
    this.cells[i] = id
    const el = ELEMENTS[id]
    this.temp[i] = temp ?? el?.baseTemp ?? this.ambient
    this.life[i] = el?.initialLife ?? 0
    this.fixed[i] = 0 // any element change releases a pinned cell
    this.wake(x, y)
  }

  isFixed(x: number, y: number) {
    if (!this.inBounds(x, y)) return false
    return this.fixed[y * this.width + x] === 1
  }

  /** Pin a powder/solid cell in place (build mode). Liquids/gases never pin. */
  markFixed(x: number, y: number) {
    if (!this.inBounds(x, y)) return
    const i = y * this.width + x
    const el = ELEMENTS[this.cells[i]]
    if (!el) return
    if (el.category === Category.Powder || el.category === Category.Solid || el.category === Category.Life) {
      this.fixed[i] = 1
    }
  }

  swap(x1: number, y1: number, x2: number, y2: number) {
    const i = y1 * this.width + x1
    const j = y2 * this.width + x2
    if (this.fixed[i] || this.fixed[j]) return // pinned cells don't move
    const c = this.cells[i]
    this.cells[i] = this.cells[j]
    this.cells[j] = c
    const t = this.temp[i]
    this.temp[i] = this.temp[j]
    this.temp[j] = t
    const l = this.life[i]
    this.life[i] = this.life[j]
    this.life[j] = l
    this.stamp[j] = this.frame // the cell that moved into j is done for this frame
    this.wake(x1, y1)
    this.wake(x2, y2)
  }

  /** Force the whole world awake for a few frames (after reset / load). */
  wakeAll() {
    this.activeNow.fill(1)
    this.activeNext.fill(1)
  }

  // --- movement primitives ---------------------------------------------------
  private canSink(selfDensity: number, targetId: number): boolean {
    if (targetId === E.EMPTY) return true
    if (targetId === E.WALL) return false
    const t = ELEMENTS[targetId]
    if (!t) return false
    if ((t.category === Category.Liquid || t.category === Category.Gas) && t.density < selfDensity) return true
    return false
  }
  private gasRiseInto(targetId: number): boolean {
    if (targetId === E.EMPTY) return true
    if (targetId === E.WALL) return false
    const t = ELEMENTS[targetId]
    return !!t && t.category === Category.Liquid // bubble up through liquids
  }

  private movePowder(x: number, y: number, density: number) {
    const dy = this.gravity >= 0 ? 1 : -1
    if (this.gravity === 0) return
    if (this.canSink(density, this.get(x, y + dy))) {
      this.swap(x, y, x, y + dy)
      return
    }
    const first = this.randInt(2) === 0 ? -1 : 1
    for (const dx of [first, -first]) {
      if (this.canSink(density, this.get(x + dx, y + dy)) && this.get(x + dx, y) === E.EMPTY) {
        this.swap(x, y, x + dx, y + dy)
        return
      }
    }
  }

  private moveLiquid(x: number, y: number, density: number) {
    const dy = this.gravity >= 0 ? 1 : -1
    if (this.gravity !== 0 && this.canSink(density, this.get(x, y + dy))) {
      this.swap(x, y, x, y + dy)
      return
    }
    if (this.gravity !== 0) {
      const first = this.randInt(2) === 0 ? -1 : 1
      for (const dx of [first, -first]) {
        if (this.canSink(density, this.get(x + dx, y + dy))) {
          this.swap(x, y, x + dx, y + dy)
          return
        }
      }
    }
    // horizontal flow: slide toward the farthest open cell (dispersion)
    const disp = 5
    const dir = this.scanDir
    for (const d of [dir, -dir]) {
      let nx = x
      for (let s = 0; s < disp; s++) {
        const tx = nx + d
        if (this.canSink(density, this.get(tx, y))) nx = tx
        else break
      }
      if (nx !== x) {
        this.swap(x, y, nx, y)
        return
      }
    }
  }

  private moveGas(x: number, y: number) {
    const dy = this.gravity >= 0 ? -1 : 1 // gas rises against gravity
    if (this.gasRiseInto(this.get(x, y + dy))) {
      this.swap(x, y, x, y + dy)
      return
    }
    const first = this.randInt(2) === 0 ? -1 : 1
    for (const dx of [first, -first]) {
      if (this.gasRiseInto(this.get(x + dx, y + dy))) {
        this.swap(x, y, x + dx, y + dy)
        return
      }
    }
    // drift sideways, biased by wind
    let dx = this.randInt(3) - 1
    if (this.wind > 0.2 && rng() < this.wind) dx = 1
    else if (this.wind < -0.2 && rng() < -this.wind) dx = -1
    if (dx !== 0 && this.get(x + dx, y) === E.EMPTY) this.swap(x, y, x + dx, y)
  }

  // --- temperature -----------------------------------------------------------
  private updateTemp(x: number, y: number, id: number) {
    const i = y * this.width + x
    const el = ELEMENTS[id]
    let t = this.temp[i]
    // relax toward ambient
    t += (this.ambient - t) * 0.012
    // self-sustaining heat sources, and push heat to neighbours.
    // Only HOT sources pin their own temperature (fire/lava stay hot); cold
    // sources emit cold to neighbours but follow normal temperature themselves,
    // so snow/ice can still melt when something heats them.
    if (el.heat !== undefined) {
      if (el.heat >= 0) t = Math.max(t, el.heat)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = x + dx
          const ny = y + dy
          if (!this.inBounds(nx, ny)) continue
          const ni = ny * this.width + nx
          if (this.cells[ni] === E.WALL) continue
          this.temp[ni] += (el.heat - this.temp[ni]) * 0.06
          // wake the neighbour if it's still equalising OR if conducted heat just
          // pushed it across a phase-change threshold — otherwise a cell can reach
          // freezing/melting/boiling/ignition temperature while its chunk sleeps
          // and the transition would never run.
          if (
            Math.abs(el.heat - this.temp[ni]) > 4 ||
            this.wantsTransition(this.cells[ni], this.temp[ni])
          ) {
            this.wake(nx, ny)
          }
        }
      }
    }
    this.temp[i] = t
  }

  /** would this element change state at temperature t? */
  private wantsTransition(id: number, t: number): boolean {
    const el = ELEMENTS[id]
    if (!el) return false
    return !!(
      (el.meltsAt !== undefined && t >= el.meltsAt) ||
      (el.boilsAt !== undefined && t >= el.boilsAt) ||
      (el.freezesAt !== undefined && t <= el.freezesAt) ||
      (el.flammable && el.igniteTemp !== undefined && t >= el.igniteTemp)
    )
  }

  private transitions(x: number, y: number, id: number): boolean {
    const el = ELEMENTS[id]
    const t = this.temp[y * this.width + x]
    if (el.meltsAt !== undefined && t >= el.meltsAt && el.meltsInto !== undefined) {
      this.set(x, y, el.meltsInto, t)
      return true
    }
    if (el.boilsAt !== undefined && t >= el.boilsAt && el.boilsInto !== undefined) {
      this.set(x, y, el.boilsInto)
      return true
    }
    if (el.freezesAt !== undefined && t <= el.freezesAt && el.freezesInto !== undefined) {
      this.set(x, y, el.freezesInto, t)
      return true
    }
    if (el.flammable && el.igniteTemp !== undefined && t >= el.igniteTemp) {
      this.set(x, y, el.burnsInto ?? E.FIRE, Math.max(t, 600))
      if (el.burnLife) this.setLife(x, y, el.burnLife)
      return true
    }
    return false
  }

  private reactions(x: number, y: number, id: number): boolean {
    const el = ELEMENTS[id]
    if (!el.reactions) return false
    for (const r of el.reactions) {
      const chance = r.chance ?? 1
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== 1) continue // 4-neighbourhood
          if (this.get(x + dx, y + dy) !== r.with) continue
          if (chance < 1 && rng() > chance) continue
          if (r.neighbourBecomes !== undefined) this.set(x + dx, y + dy, r.neighbourBecomes)
          if (r.become !== undefined) {
            this.set(x, y, r.become)
            return true
          }
        }
      }
    }
    return false
  }

  /** does this cell have an empty/water neighbour it could grow into? */
  private hasGrowthRoom(x: number, y: number): boolean {
    return (
      this.get(x, y - 1) === E.EMPTY ||
      this.get(x, y + 1) === E.EMPTY ||
      this.get(x - 1, y) === E.EMPTY ||
      this.get(x + 1, y) === E.EMPTY ||
      this.get(x, y - 1) === E.WATER ||
      this.get(x, y + 1) === E.WATER ||
      this.get(x - 1, y) === E.WATER ||
      this.get(x + 1, y) === E.WATER
    )
  }

  // --- the step --------------------------------------------------------------
  step() {
    this.frame++
    this.scanDir = this.frame & 1 ? 1 : -1
    this.activeNext.fill(0)

    for (let cy = this.chunksY - 1; cy >= 0; cy--) {
      for (let cxi = 0; cxi < this.chunksX; cxi++) {
        const cx = this.scanDir > 0 ? cxi : this.chunksX - 1 - cxi
        if (!this.activeNow[cy * this.chunksX + cx]) continue
        const x0 = cx * CHUNK
        const y0 = cy * CHUNK
        const x1 = Math.min(x0 + CHUNK, this.width)
        const y1 = Math.min(y0 + CHUNK, this.height)
        for (let y = y1 - 1; y >= y0; y--) {
          for (let xi = x0; xi < x1; xi++) {
            const x = this.scanDir > 0 ? xi : x1 - 1 - (xi - x0)
            const i = y * this.width + x
            if (this.stamp[i] === this.frame) continue
            const id = this.cells[i]
            if (id === E.EMPTY || id === E.WALL) continue

            this.updateTemp(x, y, id)
            if (this.transitions(x, y, id)) continue
            if (this.reactions(x, y, id)) continue

            const el = ELEMENTS[id]
            if (el.update) el.update(this, x, y)
            if (this.cells[i] !== id) continue // changed by its own hook

            // keep "living" growers awake while they still have somewhere to
            // grow, so slow stochastic growth never stalls when a region settles
            if (el.restless && this.hasGrowthRoom(x, y)) this.wake(x, y)

            if (this.fixed[i]) continue // pinned cells react/heat but never move

            switch (el.category) {
              case Category.Powder:
                this.movePowder(x, y, el.density)
                break
              case Category.Liquid:
                this.moveLiquid(x, y, el.density)
                break
              case Category.Gas:
                this.moveGas(x, y)
                break
            }
          }
        }
      }
    }
    // swap active buffers
    const tmp = this.activeNow
    this.activeNow = this.activeNext
    this.activeNext = tmp
  }

  /** Count of currently active (simulated) cells — for the HUD. */
  activeChunkCount() {
    let c = 0
    for (let i = 0; i < this.activeNow.length; i++) c += this.activeNow[i]
    return c
  }

  clear() {
    this.cells.fill(E.EMPTY)
    this.temp.fill(this.ambient)
    this.life.fill(0)
    this.fixed.fill(0)
    this.wakeAll()
  }
}
