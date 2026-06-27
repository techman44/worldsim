// Maps between screen (CSS px) and world (grid cell) coordinates and applies a
// CSS transform to the layered-canvas container. Supports pinch-zoom and pan.
export class Camera {
  zoom = 1
  offsetX = 0
  offsetY = 0
  private baseScale = 1

  constructor(
    private container: HTMLElement,
    private worldW: number,
    private worldH: number,
  ) {}

  setWorldSize(w: number, h: number) {
    this.worldW = w
    this.worldH = h
  }

  /** Fit the world to cover the stage and centre it. */
  fit(stageW: number, stageH: number) {
    this.baseScale = Math.max(stageW / this.worldW, stageH / this.worldH)
    this.zoom = 1
    this.offsetX = (stageW - this.worldW * this.scale) / 2
    this.offsetY = (stageH - this.worldH * this.scale) / 2
    this.apply()
  }

  get scale() {
    return this.baseScale * this.zoom
  }

  apply() {
    this.container.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`
  }

  panBy(dx: number, dy: number) {
    this.offsetX += dx
    this.offsetY += dy
    this.apply()
  }

  /** Zoom around a screen-space anchor point. */
  zoomAt(factor: number, sx: number, sy: number) {
    const newZoom = Math.max(0.4, Math.min(8, this.zoom * factor))
    const realFactor = newZoom / this.zoom
    // keep the anchor point stationary
    this.offsetX = sx - (sx - this.offsetX) * realFactor
    this.offsetY = sy - (sy - this.offsetY) * realFactor
    this.zoom = newZoom
    this.apply()
  }

  /** screen (relative to stage) -> world cell coords (floats) */
  toWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    }
  }
}
