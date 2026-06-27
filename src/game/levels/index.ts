import type { Level } from '../challenges'
import { blastWall } from './blastWall'
import { boilOff } from './boilOff'
import { collectWater } from './collectWater'
import { dissolveBarrier } from './dissolveBarrier'
import { drapeVines } from './drapeVines'
import { extinguish } from './extinguish'
import { fillVessel } from './fillVessel'
import { forgeGlass } from './forgeGlass'
import { freezeLake } from './freezeLake'
import { growCrystals } from './growCrystals'
import { growForest } from './growForest'
import { quenchLava } from './quenchLava'

// Modular level packs — one file per mechanic (archetype). To expand the
// game, add a level object to a pack file, or add a new pack file + one
// line below. Everything else (picker UI, validation) is automatic.
export const LEVELS: Level[] = [
  ...blastWall,
  ...boilOff,
  ...collectWater,
  ...dissolveBarrier,
  ...drapeVines,
  ...extinguish,
  ...fillVessel,
  ...forgeGlass,
  ...freezeLake,
  ...growCrystals,
  ...growForest,
  ...quenchLava,
]
