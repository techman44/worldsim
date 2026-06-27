import { World } from '../sim/engine'
import { ELEMENTS, E } from '../sim/elements'

// Day/night sky palettes (top, bottom) blended by a 0..1 phase.
const SKY_DAY_TOP = [60, 110, 180]
const SKY_DAY_BOT = [150, 195, 225]
const SKY_NIGHT_TOP = [8, 11, 22]
const SKY_NIGHT_BOT = [24, 30, 55]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/**
 * Renders the World into a low-resolution canvas (one pixel per cell) that the
 * page scales up with `image-rendering: pixelated`. A second emissive buffer
 * feeds a CSS-blurred glow layer for lava/fire/lightning bloom.
 */
export class Renderer {
  readonly grid: HTMLCanvasElement
  readonly glow: HTMLCanvasElement
  private gctx: CanvasRenderingContext2D
  private glctx: CanvasRenderingContext2D
  private img: ImageData
  private glowImg: ImageData
  private noise: Uint8Array
  private world: World
  dayNight = 1 // 1 = full day, 0 = night
  showGlow = true

  constructor(world: World) {
    this.world = world
    this.grid = document.createElement('canvas')
    this.glow = document.createElement('canvas')
    this.grid.width = this.glow.width = world.width
    this.grid.height = this.glow.height = world.height
    this.gctx = this.grid.getContext('2d', { alpha: false })!
    this.glctx = this.glow.getContext('2d')!
    this.img = this.gctx.createImageData(world.width, world.height)
    this.glowImg = this.glctx.createImageData(world.width, world.height)
    // stable per-cell brightness noise
    this.noise = new Uint8Array(world.width * world.height)
    let s = 0x12345678
    for (let i = 0; i < this.noise.length; i++) {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      this.noise[i] = s & 0xff
    }
    // fill alpha
    const d = this.img.data
    for (let i = 3; i < d.length; i += 4) d[i] = 255
  }

  setWorld(world: World) {
    this.world = world
  }

  render() {
    const w = this.world.width
    const h = this.world.height
    const cells = this.world.cells
    const temp = this.world.temp
    const life = this.world.life
    const fixed = this.world.fixed
    const d = this.img.data
    const gd = this.glowImg.data
    const frame = this.world.frame
    const dn = this.dayNight

    // precompute sky gradient column (depends only on y)
    for (let y = 0; y < h; y++) {
      const ty = y / h
      const skTop = [
        lerp(SKY_NIGHT_TOP[0], SKY_DAY_TOP[0], dn),
        lerp(SKY_NIGHT_TOP[1], SKY_DAY_TOP[1], dn),
        lerp(SKY_NIGHT_TOP[2], SKY_DAY_TOP[2], dn),
      ]
      const skBot = [
        lerp(SKY_NIGHT_BOT[0], SKY_DAY_BOT[0], dn),
        lerp(SKY_NIGHT_BOT[1], SKY_DAY_BOT[1], dn),
        lerp(SKY_NIGHT_BOT[2], SKY_DAY_BOT[2], dn),
      ]
      const sr = lerp(skTop[0], skBot[0], ty)
      const sg = lerp(skTop[1], skBot[1], ty)
      const sb = lerp(skTop[2], skBot[2], ty)
      let row = y * w
      for (let x = 0; x < w; x++, row++) {
        const id = cells[row]
        const o = row * 4
        const go = o
        if (id === E.EMPTY) {
          d[o] = sr
          d[o + 1] = sg
          d[o + 2] = sb
          gd[go + 3] = 0
          continue
        }
        const el = ELEMENTS[id]
        let r = el.color[0]
        let g = el.color[1]
        let b = el.color[2]

        // per-cell brightness noise
        if (el.colorNoise > 0) {
          const n = (this.noise[row] / 255 - 0.5) * 2 * el.colorNoise
          const f = 1 + n
          r *= f
          g *= f
          b *= f
        }

        let emissiveStrength = 0
        if (el.emissive) {
          if (id === E.LAVA) {
            // hotter = brighter, with a slow pulse
            const pulse = 0.85 + 0.15 * Math.sin((frame + this.noise[row]) * 0.15)
            const heatF = Math.min(1.4, 0.7 + temp[row] / 1600)
            r = Math.min(255, 255 * heatF * pulse)
            g = Math.min(255, (90 + 60 * pulse) * heatF)
            b = Math.min(255, 30 * heatF)
            emissiveStrength = 1
          } else if (id === E.FIRE) {
            const ll = life[row]
            // young fire is white/yellow, old fire deep orange/red
            const t = ll / 60
            r = 255
            g = 120 + 110 * t + 20 * Math.sin((frame + x) * 0.4)
            b = 20 + 60 * t
            emissiveStrength = 1
          } else if (id === E.EMBER) {
            const flick = 0.7 + 0.3 * Math.sin((frame + this.noise[row]) * 0.2)
            r = 230 * flick + 25
            g = 80 * flick + 20
            b = 25 * flick
            emissiveStrength = 0.8
          } else if (id === E.SPARK || id === E.LIGHTNING) {
            r = 240
            g = 245
            b = 200
            emissiveStrength = 1
          } else if (id === E.ACID) {
            emissiveStrength = 0.4
          } else if (id === E.CRYSTAL) {
            emissiveStrength = 0.35
          }
        }

        // pinned (static-build) cells get a subtle frosted highlight
        if (fixed[row]) {
          r = Math.min(255, r * 0.85 + 36)
          g = Math.min(255, g * 0.85 + 40)
          b = Math.min(255, b * 0.85 + 46)
        }

        d[o] = r
        d[o + 1] = g
        d[o + 2] = b

        if (emissiveStrength > 0 && this.showGlow) {
          gd[go] = Math.min(255, r)
          gd[go + 1] = Math.min(255, g)
          gd[go + 2] = Math.min(255, b)
          gd[go + 3] = Math.min(255, 255 * emissiveStrength)
        } else {
          gd[go + 3] = 0
        }
      }
    }

    this.gctx.putImageData(this.img, 0, 0)
    if (this.showGlow) this.glctx.putImageData(this.glowImg, 0, 0)
  }
}
