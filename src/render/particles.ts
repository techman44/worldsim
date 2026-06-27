// A tiny particle overlay drawn on its own canvas (grid resolution, scaled up
// with the rest). Used for spark trails, embers, rain and snow from events.

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  r: number
  g: number
  b: number
  size: number
  gravity: number
  additive: boolean
}

export class Particles {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private list: Particle[] = []
  private w: number
  private h: number

  constructor(width: number, height: number) {
    this.w = width
    this.h = height
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')!
  }

  resize(width: number, height: number) {
    this.w = width
    this.h = height
    this.canvas.width = width
    this.canvas.height = height
  }

  spawn(p: Partial<Particle> & { x: number; y: number }) {
    if (this.list.length > 1200) return
    this.list.push({
      vx: 0,
      vy: 0,
      life: 30,
      maxLife: 30,
      r: 255,
      g: 220,
      b: 120,
      size: 1,
      gravity: 0,
      additive: true,
      ...p,
    })
  }

  get count() {
    return this.list.length
  }

  update() {
    const next: Particle[] = []
    for (const p of this.list) {
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.life--
      if (p.life > 0 && p.x > -2 && p.x < this.w + 2 && p.y > -2 && p.y < this.h + 2) next.push(p)
    }
    this.list = next
  }

  render() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.w, this.h)
    // group additive vs normal to limit state changes
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.list) {
      if (!p.additive) continue
      const a = Math.max(0, Math.min(1, p.life / p.maxLife))
      ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${a})`
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size)
    }
    ctx.globalCompositeOperation = 'source-over'
    for (const p of this.list) {
      if (p.additive) continue
      const a = Math.max(0, Math.min(1, p.life / p.maxLife))
      ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${a})`
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size)
    }
  }

  clear() {
    this.list.length = 0
  }
}
