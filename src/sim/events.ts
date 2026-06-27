import { World } from './engine'
import { Particles } from '../render/particles'
import { ELEMENTS, E } from './elements'
import { Category } from './types'

export type EventType = 'volcano' | 'tornado' | 'snowstorm' | 'lightning' | 'earthquake' | 'rain' | 'meteor'

export interface EventDef {
  type: EventType
  name: string
  icon: string
  /** does this event need the player to tap a location? */
  placed: boolean
  description: string
}

export const EVENTS: EventDef[] = [
  { type: 'volcano', name: 'Volcano', icon: 'volcano', placed: true, description: 'Erupts lava, ash and smoke from where you tap.' },
  { type: 'tornado', name: 'Tornado', icon: 'tornado', placed: true, description: 'A roaming vortex that lifts and flings loose cells.' },
  { type: 'lightning', name: 'Lightning', icon: 'lightning', placed: true, description: 'A bolt that strikes, flashes and ignites what it hits.' },
  { type: 'snowstorm', name: 'Snowstorm', icon: 'snow', placed: false, description: 'Snow falls and accumulates, cooling the whole world.' },
  { type: 'rain', name: 'Rain', icon: 'rain', placed: false, description: 'A passing rain shower fills basins.' },
  { type: 'earthquake', name: 'Earthquake', icon: 'quake', placed: false, description: 'Shakes the ground, dislodging loose solids.' },
  { type: 'meteor', name: 'Meteor', icon: 'meteor', placed: true, description: 'A blazing rock crashes down and explodes.' },
]

interface ActiveEvent {
  age: number
  life: number
  update(): void
}

function isLoose(id: number): boolean {
  const el = ELEMENTS[id]
  return !!el && (el.category === Category.Powder || el.category === Category.Liquid)
}

/**
 * Owns running events. Exposes `shake` (pixels) and `flash` (0..1 white)
 * that the renderer reads each frame for impact.
 */
export class EventManager {
  shake = 0
  flash = 0
  private events: ActiveEvent[] = []
  haptics = true
  onShake?: (intensity: number) => void

  constructor(private world: World, private particles: Particles) {}

  get active() {
    return this.events.length > 0
  }

  trigger(type: EventType, x: number, y: number) {
    switch (type) {
      case 'volcano':
        this.events.push(this.makeVolcano(x, y))
        this.kick(8)
        break
      case 'tornado':
        this.events.push(this.makeTornado(x))
        break
      case 'lightning':
        this.events.push(this.makeLightning(x))
        this.flash = 1
        this.kick(6)
        break
      case 'snowstorm':
        this.events.push(this.makeSnowstorm())
        break
      case 'rain':
        this.events.push(this.makeRain())
        break
      case 'earthquake':
        this.events.push(this.makeEarthquake())
        this.kick(14)
        break
      case 'meteor':
        this.events.push(this.makeMeteor(x, y))
        break
    }
  }

  private kick(amount: number) {
    this.shake = Math.max(this.shake, amount)
    if (this.haptics) this.onShake?.(amount)
  }

  step() {
    this.shake *= 0.86
    if (this.shake < 0.2) this.shake = 0
    this.flash *= 0.82
    if (this.flash < 0.02) this.flash = 0
    for (const e of this.events) {
      e.age++
      e.update()
    }
    this.events = this.events.filter((e) => e.age < e.life)
  }

  // ---- event factories ------------------------------------------------------
  private makeVolcano(x: number, baseY: number): ActiveEvent {
    const w = this.world
    const ventY = Math.min(baseY, w.height - 2)
    const ev: ActiveEvent = { age: 0, life: 220, update: () => {} }
    ev.update = () => {
      this.kick(4 + Math.random() * 3)
      for (let i = -1; i <= 1; i++) {
        if (w.get(x + i, ventY) !== E.WALL) w.set(x + i, ventY, E.LAVA)
        if (Math.random() < 0.6 && w.get(x + i, ventY - 1) === E.EMPTY) w.set(x + i, ventY - 1, E.LAVA)
      }
      for (let k = 0; k < 4; k++) {
        this.particles.spawn({
          x: x + (Math.random() * 6 - 3),
          y: ventY,
          vx: Math.random() * 3 - 1.5,
          vy: -(2 + Math.random() * 3),
          gravity: 0.12,
          life: 50 + Math.random() * 40,
          maxLife: 90,
          r: 255,
          g: 120 + Math.random() * 80,
          b: 30,
          size: 1,
          additive: true,
        })
      }
      if (Math.random() < 0.5 && w.get(x, ventY - 2) === E.EMPTY) w.set(x, ventY - 2, E.SMOKE)
    }
    return ev
  }

  private makeTornado(startX: number): ActiveEvent {
    const w = this.world
    let cx = startX
    const dir = Math.random() < 0.5 ? -1 : 1
    const speed = 0.4 + Math.random() * 0.4
    const ev: ActiveEvent = { age: 0, life: 360, update: () => {} }
    ev.update = () => {
      cx += dir * speed
      cx = Math.max(4, Math.min(w.width - 4, cx))
      const cxi = cx | 0
      this.kick(3)
      const radius = 10
      for (let y = w.height - 1; y > 6; y--) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cxi + dx
          if (x < 1 || x >= w.width - 1) continue
          const id = w.get(x, y)
          if (id === E.EMPTY || id === E.WALL) continue
          if (!isLoose(id) && id !== E.ASH) continue
          const dist = Math.abs(dx)
          if (Math.random() < 0.5 - dist * 0.02) {
            const tdx = dx > 0 ? -1 : dx < 0 ? 1 : Math.random() < 0.5 ? -1 : 1
            const ty = y - 1
            if (w.get(x + tdx, ty) === E.EMPTY) w.swap(x, y, x + tdx, ty)
            else if (w.get(x, ty) === E.EMPTY) w.swap(x, y, x, ty)
          }
        }
      }
      for (let k = 0; k < 3; k++) {
        const ang = Math.random() * Math.PI * 2
        const rr = Math.random() * radius
        this.particles.spawn({
          x: cxi + Math.cos(ang) * rr,
          y: w.height - 4 - Math.random() * (w.height - 10),
          vx: Math.cos(ang + Math.PI / 2) * 1.5,
          vy: -0.5,
          life: 20,
          maxLife: 20,
          r: 200,
          g: 200,
          b: 210,
          size: 1,
          additive: false,
        })
      }
    }
    return ev
  }

  private makeLightning(targetX: number): ActiveEvent {
    const w = this.world
    let struck = false
    const ev: ActiveEvent = { age: 0, life: 12, update: () => {} }
    ev.update = () => {
      if (struck) return
      struck = true
      let x = targetX
      let y = 0
      const cells: [number, number][] = []
      while (y < w.height - 1) {
        cells.push([x, y])
        const below = w.get(x, y + 1)
        if (below !== E.EMPTY && below !== E.SMOKE && below !== E.STEAM && below !== E.CLOUD) break
        x += (Math.random() * 3 - 1) | 0
        x = Math.max(1, Math.min(w.width - 2, x))
        y++
      }
      for (const [bx, by] of cells) {
        w.set(bx, by, E.LIGHTNING)
        this.particles.spawn({ x: bx, y: by, vx: 0, vy: 0, life: 8, maxLife: 8, r: 220, g: 235, b: 255, size: 1, additive: true })
      }
      const [hx, hy] = cells[cells.length - 1]
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const el = ELEMENTS[w.get(hx + dx, hy + dy)]
          if (el?.flammable) w.set(hx + dx, hy + dy, E.FIRE, 800)
        }
    }
    return ev
  }

  private makeSnowstorm(): ActiveEvent {
    const w = this.world
    const prevAmbient = w.ambient
    const ev: ActiveEvent = { age: 0, life: 480, update: () => {} }
    ev.update = () => {
      w.ambient = Math.max(-12, prevAmbient - 30)
      w.wind = Math.sin(ev.age * 0.01) * 0.5
      for (let k = 0; k < 4; k++) {
        const x = (Math.random() * w.width) | 0
        if (w.get(x, 0) === E.EMPTY) w.set(x, 0, E.SNOW)
      }
      if (ev.age > 470) {
        w.ambient = prevAmbient
        w.wind = 0
      }
    }
    return ev
  }

  private makeRain(): ActiveEvent {
    const w = this.world
    const ev: ActiveEvent = { age: 0, life: 320, update: () => {} }
    ev.update = () => {
      for (let k = 0; k < 5; k++) {
        const x = (Math.random() * w.width) | 0
        if (w.get(x, 0) === E.EMPTY) w.set(x, 0, E.WATER)
      }
    }
    return ev
  }

  private makeEarthquake(): ActiveEvent {
    const w = this.world
    const ev: ActiveEvent = { age: 0, life: 130, update: () => {} }
    ev.update = () => {
      this.kick(10)
      for (let n = 0; n < w.width; n++) {
        const x = (Math.random() * w.width) | 0
        const y = (Math.random() * (w.height - 2)) | 0
        const id = w.get(x, y)
        const el = ELEMENTS[id]
        if (el && el.category === Category.Solid && id !== E.WALL && w.get(x, y + 1) === E.EMPTY) {
          w.swap(x, y, x, y + 1)
        }
        if (Math.random() < 0.02 && el && el.category === Category.Solid && id !== E.WALL) w.set(x, y, E.EMPTY)
      }
    }
    return ev
  }

  private makeMeteor(targetX: number, targetY: number): ActiveEvent {
    const w = this.world
    let x = Math.max(2, targetX - 40)
    let y = 0
    const ty = Math.min(targetY, w.height - 2)
    const steps = 40
    const vx = (targetX - x) / steps
    const vy = ty / steps
    let exploded = false
    const ev: ActiveEvent = { age: 0, life: steps + 30, update: () => {} }
    ev.update = () => {
      if (y < ty) {
        x += vx
        y += vy
        const xi = x | 0
        const yi = y | 0
        for (let k = 0; k < 5; k++)
          this.particles.spawn({
            x: xi + Math.random() * 3 - 1.5,
            y: yi + Math.random() * 3 - 1.5,
            vx: -vx * 0.3,
            vy: -vy * 0.2,
            life: 20,
            maxLife: 20,
            r: 255,
            g: 160,
            b: 60,
            size: 1,
            additive: true,
          })
        if (w.inBounds(xi, yi)) w.set(xi, yi, E.LAVA)
      } else if (!exploded) {
        exploded = true
        const xi = targetX
        const yi = ty
        this.kick(12)
        const R = 8
        for (let dy = -R; dy <= R; dy++)
          for (let dx = -R; dx <= R; dx++) {
            if (dx * dx + dy * dy > R * R) continue
            const id = w.get(xi + dx, yi + dy)
            if (id === E.WALL) continue
            const inner = dx * dx + dy * dy < (R * 0.5) ** 2
            if (inner) w.set(xi + dx, yi + dy, Math.random() < 0.5 ? E.LAVA : E.FIRE)
            else if (Math.random() < 0.4) w.set(xi + dx, yi + dy, Math.random() < 0.5 ? E.ROCK : E.EMPTY)
          }
      }
    }
    return ev
  }
}
