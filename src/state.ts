import { E } from './sim/elements'
import type { EventType } from './sim/events'

export type Tool = 'paint' | 'erase' | 'fill' | 'pick' | 'stamp' | 'event'

export interface AppState {
  tool: Tool
  element: number
  stampId: string
  eventType: EventType
  brush: number
  mirror: boolean
  /** pin painted solids/powders so they don't fall (build mode) */
  staticPaint: boolean
  paused: boolean
  speed: number // sim steps per rendered frame (can be fractional)
  showGlow: boolean
  showHud: boolean
  dayNight: number // 1 day .. 0 night
  autoDayNight: boolean
  gravity: number // 1 normal, 0 zero-g, -1 inverted
  muted: boolean
  haptics: boolean
  /** when in a challenge, the palette is limited to these element ids (null = all) */
  allowedElements: number[] | null
  mode: 'free' | 'challenge'
}

export const state: AppState = {
  tool: 'paint',
  element: E.SAND,
  stampId: 'castle',
  eventType: 'volcano',
  brush: 3,
  mirror: false,
  staticPaint: false,
  paused: false,
  speed: 1,
  showGlow: true,
  showHud: false,
  dayNight: 1,
  autoDayNight: false,
  gravity: 1,
  muted: false,
  haptics: true,
  allowedElements: null,
  mode: 'free',
}
