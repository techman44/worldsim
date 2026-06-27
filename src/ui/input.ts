import { Camera } from './camera'

interface PointerInfo {
  x: number
  y: number
}

export interface InputHandlers {
  onStrokeStart(wx: number, wy: number): void
  onStrokeMove(wx: number, wy: number, px: number, py: number): void
  onStrokeEnd(): void
  onHover?(wx: number, wy: number): void
  onZoomChange?(): void
}

/**
 * Unifies mouse / touch / pen via Pointer Events. One pointer draws; two
 * pointers pan + pinch-zoom. Page scroll/zoom over the canvas is suppressed.
 */
export class Input {
  private pointers = new Map<number, PointerInfo>()
  private drawing = false
  private prev = { x: 0, y: 0 }
  private gestureActive = false
  private lastMid = { x: 0, y: 0 }
  private lastDist = 0

  constructor(
    private stage: HTMLElement,
    private camera: Camera,
    private handlers: InputHandlers,
  ) {
    stage.addEventListener('pointerdown', this.onDown, { passive: false })
    stage.addEventListener('pointermove', this.onMove, { passive: false })
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
    stage.addEventListener('wheel', this.onWheel, { passive: false })
    stage.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private local(e: PointerEvent) {
    const r = this.stage.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private onDown = (e: PointerEvent) => {
    e.preventDefault()
    const p = this.local(e)
    this.pointers.set(e.pointerId, p)
    if (this.pointers.size === 1) {
      const w = this.camera.toWorld(p.x, p.y)
      this.drawing = true
      this.prev = w
      this.handlers.onStrokeStart(w.x, w.y)
    } else if (this.pointers.size === 2) {
      // second finger: cancel any in-progress stroke and start a gesture
      if (this.drawing) {
        this.drawing = false
        this.handlers.onStrokeEnd()
      }
      this.startGesture()
    }
  }

  private onMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) {
      if (this.handlers.onHover && this.pointers.size === 0) {
        const p = this.local(e)
        const w = this.camera.toWorld(p.x, p.y)
        this.handlers.onHover(w.x, w.y)
      }
      return
    }
    e.preventDefault()
    const p = this.local(e)
    this.pointers.set(e.pointerId, p)
    if (this.pointers.size >= 2) {
      this.updateGesture()
      return
    }
    if (this.drawing) {
      const w = this.camera.toWorld(p.x, p.y)
      this.handlers.onStrokeMove(w.x, w.y, this.prev.x, this.prev.y)
      this.prev = w
    }
  }

  private onUp = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return
    this.pointers.delete(e.pointerId)
    if (this.drawing && this.pointers.size === 0) {
      this.drawing = false
      this.handlers.onStrokeEnd()
    }
    if (this.pointers.size < 2) this.gestureActive = false
    // if exactly one pointer remains after a pinch, don't resume drawing to
    // avoid an accidental smear — wait for a fresh down.
  }

  private startGesture() {
    const pts = [...this.pointers.values()]
    this.lastMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
    this.lastDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    this.gestureActive = true
  }

  private updateGesture() {
    if (!this.gestureActive) {
      this.startGesture()
      return
    }
    const pts = [...this.pointers.values()]
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    // pan
    this.camera.panBy(mid.x - this.lastMid.x, mid.y - this.lastMid.y)
    // zoom around the midpoint
    if (this.lastDist > 0) this.camera.zoomAt(dist / this.lastDist, mid.x, mid.y)
    this.lastMid = mid
    this.lastDist = dist
    this.handlers.onZoomChange?.()
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const r = this.stage.getBoundingClientRect()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    this.camera.zoomAt(factor, e.clientX - r.left, e.clientY - r.top)
    this.handlers.onZoomChange?.()
  }
}
