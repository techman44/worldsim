import { World } from './sim/engine'
import { ELEMENTS, E } from './sim/elements'
import { Category } from './sim/types'

// A lightweight, clearly-optional platformer character that lives inside the
// simulation: solids and settled powders are ground, water slows it, lava /
// fire / acid are deadly. The sandbox remains the main attraction.
export class Player {
  x: number
  y: number
  vx = 0
  vy = 0
  readonly w = 1.6
  readonly h = 2.6
  onGround = false
  left = false
  right = false
  jumpHeld = false
  alive = true
  private spawnX: number
  private spawnY: number

  constructor(world: World) {
    this.spawnX = this.x = world.width / 2
    this.spawnY = this.y = 4
  }

  respawn() {
    this.x = this.spawnX
    this.y = this.spawnY
    this.vx = this.vy = 0
    this.alive = true
  }

  private isBlocked(world: World, x: number, y: number): boolean {
    const id = world.get(Math.floor(x), Math.floor(y))
    if (id === E.WALL) return true
    const el = ELEMENTS[id]
    if (!el) return false
    return el.category === Category.Solid || el.category === Category.Powder
  }

  private deadly(world: World, x: number, y: number): boolean {
    const id = world.get(Math.floor(x), Math.floor(y))
    return id === E.LAVA || id === E.FIRE || id === E.ACID || id === E.EMBER || id === E.LIGHTNING
  }

  private inLiquid(world: World): boolean {
    const id = world.get(Math.floor(this.x), Math.floor(this.y))
    const el = ELEMENTS[id]
    return !!el && el.category === Category.Liquid
  }

  update(world: World) {
    if (!this.alive) return
    const hw = this.w / 2
    const slow = this.inLiquid(world) ? 0.45 : 1

    // horizontal intent
    const accel = 0.35 * slow
    if (this.left) this.vx -= accel
    if (this.right) this.vx += accel
    this.vx *= 0.8
    this.vx = Math.max(-1.6 * slow, Math.min(1.6 * slow, this.vx))

    // gravity
    this.vy += this.inLiquid(world) ? 0.06 : 0.12
    this.vy = Math.min(this.vy, this.inLiquid(world) ? 0.8 : 2.2)

    // jump
    if (this.jumpHeld && this.onGround) {
      this.vy = -2.0
      this.onGround = false
    }

    // integrate X with collision
    let nx = this.x + this.vx
    if (this.vx !== 0) {
      const dir = Math.sign(this.vx)
      const edge = nx + dir * hw
      if (this.isBlocked(world, edge, this.y - this.h + 0.5) || this.isBlocked(world, edge, this.y - this.h * 0.5) || this.isBlocked(world, edge, this.y - 0.2)) {
        nx = this.x
        this.vx = 0
      }
    }
    this.x = Math.max(hw, Math.min(world.width - hw, nx))

    // integrate Y with collision
    let ny = this.y + this.vy
    this.onGround = false
    if (this.vy >= 0) {
      // feet
      if (this.isBlocked(world, this.x - hw + 0.2, ny) || this.isBlocked(world, this.x + hw - 0.2, ny)) {
        ny = Math.floor(ny)
        this.vy = 0
        this.onGround = true
      }
    } else {
      // head
      if (this.isBlocked(world, this.x - hw + 0.2, ny - this.h) || this.isBlocked(world, this.x + hw - 0.2, ny - this.h)) {
        this.vy = 0
        ny = this.y
      }
    }
    this.y = ny

    if (this.y > world.height + 4) this.respawn()
    if (this.deadly(world, this.x, this.y - 0.5) || this.deadly(world, this.x, this.y - this.h + 0.5)) {
      this.alive = false
      setTimeout(() => this.respawn(), 600)
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const hw = this.w / 2
    const x = this.x - hw
    const top = this.y - this.h
    ctx.fillStyle = this.alive ? '#ffd24a' : '#a33'
    ctx.fillRect(Math.round(x), Math.round(top), Math.ceil(this.w), Math.ceil(this.h))
    // little head
    ctx.fillStyle = this.alive ? '#ffe9b0' : '#c55'
    ctx.fillRect(Math.round(this.x - 0.8), Math.round(top), 2, 1)
  }
}
