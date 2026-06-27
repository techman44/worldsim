// Headless level validator. Runs the REAL simulation engine in Node (no DOM) to
// prove every level: builds without error, starts un-solved, is not winnable by
// doing nothing, has a goal that is actually reachable, and uses valid elements.
//
// Bundled + run via esbuild (see scripts/validate-levels.mjs runner).
import { LEVELS } from '../src/game/levels'
import { ARCHETYPES } from '../src/game/archetypes'
import { World } from '../src/sim/engine'
import { ELEMENTS, E } from '../src/sim/elements'

const W = 320
const H = 180

// result element produced by each additive archetype (region archetypes use the
// region from params); removal archetypes clear cells instead.
const RESULT: Record<string, number> = {
  growForest: E.PLANT,
  freezeLake: E.ICE,
  forgeGlass: E.GLASS,
  quenchLava: E.OBSIDIAN,
  boilOff: E.STEAM,
  growCrystals: E.CRYSTAL,
  drapeVines: E.VINE,
}
const REGION_FLUID = new Set(['fillVessel', 'collectWater'])
const REMOVAL = new Set(['extinguish', 'dissolveBarrier', 'blastWall'])

interface Result {
  id: string
  ok: boolean
  problems: string[]
}

function validate(level: (typeof LEVELS)[number]): Result {
  const problems: string[] = []
  const arch = ARCHETYPES[level.archetype]
  if (!arch) return { id: level.id, ok: false, problems: [`unknown archetype "${level.archetype}"`] }

  // allowed elements valid?
  const allowed = level.allowed === undefined ? arch.defaultAllowed : level.allowed
  if (allowed) {
    for (const id of allowed) {
      const el = ELEMENTS[id]
      if (!el) problems.push(`allowed element id ${id} does not exist`)
      else if (id === E.EMPTY) problems.push(`allowed list should not include Empty`)
    }
    if (!allowed.length) problems.push(`allowed list is empty`)
  }

  // build runs + not auto-won
  const params = { ...(level.params ?? {}) }
  const w = new World(W, H)
  try {
    arch.build(w, params)
  } catch (e) {
    return { id: level.id, ok: false, problems: [`build threw: ${(e as Error).message}`] }
  }
  const start = arch.check(w, params)
  if (typeof start.progress !== 'number' || Number.isNaN(start.progress)) problems.push(`check() returned non-numeric progress`)
  if (start.done) problems.push(`level is already solved at start (trivial)`)

  // not passively winnable: 400 idle steps should not complete it
  const w2 = new World(W, H)
  const p2 = { ...(level.params ?? {}) }
  arch.build(w2, p2)
  let passive = false
  for (let i = 0; i < 400; i++) {
    w2.step()
    if (arch.check(w2, p2).done) {
      passive = true
      break
    }
  }
  if (passive) problems.push(`solved by doing nothing in <=400 steps (goal too low / passive)`)

  // reachability: apply an idealised solution and confirm it can be solved
  const w3 = new World(W, H)
  const p3 = { ...(level.params ?? {}) }
  arch.build(w3, p3)
  applySolution(w3, level.archetype, p3)
  for (let i = 0; i < 4; i++) w3.step()
  const solved = arch.check(w3, p3)
  if (!solved.done) problems.push(`goal not reachable even with an idealised solution (got ${solved.status})`)

  return { id: level.id, ok: problems.length === 0, problems }
}

function applySolution(w: World, archId: string, params: any) {
  if (REGION_FLUID.has(archId)) {
    const fluid = params.fluid ?? E.WATER
    const [x0, y0, x1, y1] = params._region ?? [0, 0, 0, 0]
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.set(x, y, fluid)
    return
  }
  if (REMOVAL.has(archId)) {
    if (archId === 'extinguish') {
      for (let i = 0; i < w.cells.length; i++)
        if (w.cells[i] === E.FIRE || w.cells[i] === E.EMBER) w.cells[i] = E.EMPTY
    } else {
      const [x0, y0, x1, y1] = params._region ?? [0, 0, 0, 0]
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.set(x, y, E.EMPTY)
    }
    return
  }
  const result = RESULT[archId]
  if (result !== undefined) {
    // flood every non-wall cell with the result element — tests goal vs capacity.
    // use w.set so per-cell life/temp initialise (steam etc. would otherwise die).
    for (let y = 0; y < w.height; y++)
      for (let x = 0; x < w.width; x++) if (w.get(x, y) !== E.WALL) w.set(x, y, result)
    return
  }
  throw new Error(`no solution strategy for archetype "${archId}"`)
}

// --- run ---------------------------------------------------------------------
const results = LEVELS.map(validate)
const failed = results.filter((r) => !r.ok)
const ids = new Set<string>()
for (const l of LEVELS) {
  if (ids.has(l.id)) failed.push({ id: l.id, ok: false, problems: ['duplicate level id'] })
  ids.add(l.id)
}

for (const r of results) {
  if (r.ok) console.log(`  ok   ${r.id}`)
  else console.log(`  FAIL ${r.id}: ${r.problems.join('; ')}`)
}
console.log(`\n${results.length - failed.length}/${results.length} levels valid`)
if (failed.length) {
  console.error(`\n${failed.length} level(s) failed validation`)
  process.exit(1)
}
