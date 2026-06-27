// Headless level validator. Runs the REAL simulation engine in Node (no DOM) to
// prove every level: builds without error, starts un-solved, is not winnable by
// doing nothing, and — crucially — is SOLVABLE BY PHYSICS: applying the intended
// elements and simulating actually drives the win condition to completion.
//
// Bundled + run via esbuild (see the `validate` npm script).
import { LEVELS } from '../src/game/levels/index'
import { ARCHETYPES } from '../src/game/archetypes'
import { World } from '../src/sim/engine'
import { ELEMENTS, E } from '../src/sim/elements'

const W = 320
const H = 180

// how long (sim steps) the intended solution is allowed to reach `done`
const BUDGET: Record<string, number> = {
  growForest: 7000,
  fillVessel: 2500,
  freezeLake: 4000,
  forgeGlass: 3500,
  quenchLava: 2500,
  extinguish: 800,
  dissolveBarrier: 6000,
  blastWall: 600,
  boilOff: 2500,
  growCrystals: 8000,
  drapeVines: 4000,
  collectWater: 3000,
}

function fill(w: World, x0: number, y0: number, x1: number, y1: number, id: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (w.inBounds(x, y)) w.set(x, y, id)
}

// Paints the intended solution in a contact-maximising pattern a skilled player
// could reproduce. Returns a per-step "top-up" callback for faucet-style pours.
function applySolution(w: World, arch: string, p: any): ((step: number) => void) | void {
  const wdt = w.width
  const hgt = w.height
  switch (arch) {
    case 'growForest': {
      const surface = Math.floor(hgt * (p.topFrac ?? 0.7))
      // soak the soil and sow seeds densely across the whole surface
      for (let x = 2; x < wdt - 2; x++) {
        w.set(x, surface - 1, E.WATER)
        w.set(x, surface - 2, E.WATER)
        w.set(x, surface - 3, E.SEED)
      }
      return
    }
    case 'freezeLake': {
      const surface = Math.floor(hgt * (p.topFrac ?? 0.5))
      // heap snow across the surface; cold sinks and freezes the water
      fill(w, 7, surface - 10, wdt - 8, surface - 1, E.SNOW)
      return
    }
    case 'forgeGlass': {
      const surface = Math.floor(hgt * (p.depthFrac ?? 0.45))
      // lava columns every few cells so every sand column touches heat
      for (let x = 1; x < wdt - 1; x += 3) fill(w, x, surface, x, hgt - 4, E.LAVA)
      return
    }
    case 'quenchLava': {
      // water columns through the lava
      for (let x = 6; x < wdt - 6; x += 3) fill(w, x, 0, x, hgt - 1, E.WATER)
      return
    }
    case 'boilOff': {
      const surface = Math.floor(hgt * 0.5)
      // lava poured over the whole water pan
      fill(w, 9, surface - 1, wdt - 10, surface + 2, E.LAVA)
      return
    }
    case 'extinguish': {
      // douse the whole structure area with water from above
      const surface = Math.floor(hgt * 0.7)
      fill(w, (wdt >> 1) - 12, surface - 16, (wdt >> 1) + 12, surface - 14, E.WATER)
      return (step) => {
        if (step < 60) fill(w, (wdt >> 1) - 12, surface - 16, (wdt >> 1) + 12, surface - 16, E.WATER)
      }
    }
    case 'dissolveBarrier': {
      const [x0, y0, x1] = p._region ?? [0, 0, 0, 0]
      // pour acid along the top of the barrier; top it up so it eats all the way
      return (step) => {
        if (step % 20 === 0 && step < BUDGET.dissolveBarrier * 0.6) for (let x = x0; x <= x1; x++) w.set(x, y0 - 1, E.ACID)
      }
    }
    case 'blastWall': {
      const [x0, y0, x1, y1] = p._region ?? [0, 0, 0, 0]
      // pack the wall column with gunpowder, then light it
      fill(w, x0, y0, x1, y1, E.GUNPOWDER)
      w.set((x0 + x1) >> 1, y0, E.FIRE, 800)
      void y1
      return
    }
    case 'growCrystals': {
      // flood the basin with water so the floor seeds spread through it
      const surface = Math.floor(hgt * 0.42)
      fill(w, 11, surface + 3, wdt - 12, hgt - 5, E.WATER)
      return (step) => {
        // keep it topped up as crystals displace water
        if (step % 40 === 0 && step < BUDGET.growCrystals * 0.7) fill(w, 11, surface + 3, wdt - 12, surface + 4, E.WATER)
      }
    }
    case 'drapeVines': {
      const top = Math.floor(hgt * 0.25)
      for (let x = 2; x < wdt - 2; x++) w.set(x, top + 4, E.VINE)
      return
    }
    case 'fillVessel':
    case 'collectWater': {
      const [x0, y0, x1] = p._region ?? [0, 0, 0, 0]
      const fluid = arch === 'fillVessel' ? p.fluid ?? E.WATER : E.WATER
      // a faucet pouring fluid into the opening
      return (step) => {
        if (step < BUDGET[arch] * 0.8) for (let x = x0; x <= x1; x++) w.set(x, Math.max(0, y0 - 2), fluid)
      }
    }
  }
}

interface Result {
  id: string
  ok: boolean
  problems: string[]
}

function simulateSolves(arch: string, params: any): { done: boolean; peak: string } {
  const w = new World(W, H)
  const p = { ...params }
  ARCHETYPES[arch].build(w, p)
  const topUp = applySolution(w, arch, p)
  const budget = BUDGET[arch] ?? 3000
  let peak = 0
  let peakStatus = ''
  for (let s = 0; s < budget; s++) {
    if (topUp) topUp(s)
    w.step()
    if (s % 25 === 0) {
      const r = ARCHETYPES[arch].check(w, p)
      if (r.progress > peak) {
        peak = r.progress
        peakStatus = r.status
      }
      if (r.done) return { done: true, peak: peakStatus }
    }
  }
  const final = ARCHETYPES[arch].check(w, p)
  return { done: final.done, peak: final.done ? final.status : `peak ${Math.round(peak * 100)}% (${peakStatus})` }
}

function validate(level: (typeof LEVELS)[number]): Result {
  const problems: string[] = []
  const arch = ARCHETYPES[level.archetype]
  if (!arch) return { id: level.id, ok: false, problems: [`unknown archetype "${level.archetype}"`] }

  const allowed = level.allowed === undefined ? arch.defaultAllowed : level.allowed
  if (allowed) {
    for (const id of allowed) {
      if (!ELEMENTS[id]) problems.push(`allowed element id ${id} does not exist`)
      else if (id === E.EMPTY) problems.push(`allowed list should not include Empty`)
      else if (arch.forbidInPalette?.includes(id)) problems.push(`allowed includes a forbidden "paint the answer" element (${ELEMENTS[id].name})`)
    }
    if (!allowed.length) problems.push(`allowed list is empty`)
  }

  // build runs + not auto-won (build and check must share one params object so
  // build-time region/baseline data is visible to check)
  const w = new World(W, H)
  const params = { ...(level.params ?? {}) }
  try {
    arch.build(w, params)
  } catch (e) {
    return { id: level.id, ok: false, problems: [`build threw: ${(e as Error).message}`] }
  }
  const start = arch.check(w, params)
  if (typeof start.progress !== 'number' || Number.isNaN(start.progress)) problems.push(`check() returned non-numeric progress`)
  if (start.done) problems.push(`already solved at start (trivial)`)

  // not passively winnable
  const w2 = new World(W, H)
  const p2 = { ...(level.params ?? {}) }
  arch.build(w2, p2)
  for (let i = 0; i < 400; i++) {
    w2.step()
    if (arch.check(w2, p2).done) {
      problems.push(`solved by doing nothing in <=400 steps`)
      break
    }
  }

  // SOLVABLE BY PHYSICS: the intended elements must actually drive it to done
  const solved = simulateSolves(level.archetype, { ...(level.params ?? {}) })
  if (!solved.done) problems.push(`not solvable by physics within ${BUDGET[level.archetype]} steps — ${solved.peak}`)

  return { id: level.id, ok: problems.length === 0, problems }
}

// --- run ---------------------------------------------------------------------
const results = LEVELS.map(validate)
const seen = new Set<string>()
for (const l of LEVELS) {
  if (seen.has(l.id)) results.push({ id: l.id, ok: false, problems: ['duplicate level id'] })
  seen.add(l.id)
}
const failed = results.filter((r) => !r.ok)
for (const r of results) {
  if (!r.ok) console.log(`  FAIL ${r.id}: ${r.problems.join('; ')}`)
}
console.log(`\n${results.length - failed.length}/${results.length} levels valid`)
if (failed.length) {
  console.error(`${failed.length} failed`)
  process.exit(1)
}
