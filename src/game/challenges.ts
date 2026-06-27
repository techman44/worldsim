import { World } from '../sim/engine'
import { ARCHETYPES } from './archetypes'
import { LEVELS } from './levels'

// A Level is pure data: it picks an archetype and supplies params + flavour.
// The runtime Challenge binds the archetype's build()/check() so the rest of the
// app (picker UI, win checks) is agnostic to where levels come from.

export interface Level {
  id: string
  name: string
  objective: string
  hint: string
  tier: number // 1..6 difficulty
  archetype: string
  params?: Record<string, any>
  /** element ids the palette is limited to; omit to use the archetype default; null = all */
  allowed?: number[] | null
}

export interface Challenge {
  id: string
  name: string
  objective: string
  hint: string
  tier: number
  allowed: number[] | null
  build: (world: World) => void
  check: (world: World) => { progress: number; done: boolean; status: string }
}

export const TIER_NAMES: Record<number, string> = {
  1: 'Sprout',
  2: 'Apprentice',
  3: 'Tinkerer',
  4: 'Alchemist',
  5: 'Elementalist',
  6: 'Worldsmith',
}

export function toChallenge(level: Level): Challenge {
  const arch = ARCHETYPES[level.archetype]
  if (!arch) throw new Error(`Unknown archetype "${level.archetype}" in level "${level.id}"`)
  // clone params per challenge so build() baselines don't leak between instances
  const params = { ...(level.params ?? {}) }
  let allowed = level.allowed === undefined ? arch.defaultAllowed : level.allowed
  // strip any "paint the answer" elements so the win must come from physics
  if (allowed && arch.forbidInPalette) {
    allowed = allowed.filter((id) => !arch.forbidInPalette!.includes(id))
    if (!allowed.length) allowed = arch.defaultAllowed
  }
  return {
    id: level.id,
    name: level.name,
    objective: level.objective,
    hint: level.hint,
    tier: level.tier,
    allowed,
    build: (world) => arch.build(world, params),
    check: (world) => arch.check(world, params),
  }
}

// All challenges, sorted by difficulty tier.
export const CHALLENGES: Challenge[] = LEVELS.slice()
  .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
  .map(toChallenge)
