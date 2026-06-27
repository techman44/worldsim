import { World } from './engine'

// Brush / line / flood-fill operations, with optional vertical mirror for fast
// symmetric building.

function stampCircle(world: World, cx: number, cy: number, r: number, element: number, fixed: boolean) {
  const r2 = r * r
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const x = Math.round(cx) + dx
      const y = Math.round(cy) + dy
      if (world.inBounds(x, y)) {
        world.set(x, y, element)
        if (fixed) world.markFixed(x, y)
      }
    }
  }
}

export function paintCircle(world: World, cx: number, cy: number, r: number, element: number, mirror = false, fixed = false) {
  stampCircle(world, cx, cy, r, element, fixed)
  if (mirror) stampCircle(world, world.width - 1 - cx, cy, r, element, fixed)
}

export function paintLine(
  world: World,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  element: number,
  mirror = false,
  fixed = false,
) {
  // sample along the segment at sub-radius spacing so drags are continuous
  const dist = Math.hypot(x1 - x0, y1 - y0)
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, r * 0.5)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    paintCircle(world, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, element, mirror, fixed)
  }
}

export function floodFill(world: World, sx: number, sy: number, element: number) {
  sx = Math.round(sx)
  sy = Math.round(sy)
  if (!world.inBounds(sx, sy)) return
  const target = world.get(sx, sy)
  if (target === element) return
  const stack: number[] = [sx, sy]
  let guard = world.width * world.height
  while (stack.length && guard-- > 0) {
    const y = stack.pop()!
    const x = stack.pop()!
    if (!world.inBounds(x, y) || world.get(x, y) !== target) continue
    world.set(x, y, element)
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }
}
