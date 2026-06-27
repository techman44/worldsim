import { World } from './engine'
import { E } from './elements'

// A small procedural terrain generator used for "New world" starting templates:
// rolling hills of stone→dirt→grass with a couple of water basins.
export function generateTerrain(world: World, seed = 1) {
  world.clear()
  const w = world.width
  const h = world.height
  let s = seed | 0 || 1
  const rnd = () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }

  // height map from a few sine octaves
  const base = h * 0.55
  const phase1 = rnd() * Math.PI * 2
  const phase2 = rnd() * Math.PI * 2
  const phase3 = rnd() * Math.PI * 2
  const height: number[] = []
  for (let x = 0; x < w; x++) {
    const y =
      base +
      Math.sin(x * 0.012 + phase1) * h * 0.14 +
      Math.sin(x * 0.045 + phase2) * h * 0.05 +
      Math.sin(x * 0.09 + phase3) * h * 0.03
    height[x] = y
  }

  for (let x = 0; x < w; x++) {
    const top = Math.round(height[x])
    for (let y = top; y < h; y++) {
      const depth = y - top
      let id: number
      if (depth === 0) id = E.PLANT
      else if (depth < 4) id = E.DIRT
      else if (depth < 7 && rnd() < 0.5) id = E.DIRT
      else id = rnd() < 0.012 ? E.GOLD : E.STONE
      world.set(x, y, id)
    }
  }

  // carve a couple of lakes in local minima
  const lakes = 2 + (rnd() * 2 | 0)
  for (let l = 0; l < lakes; l++) {
    const lx = (rnd() * w) | 0
    let ly = 0
    for (let x = Math.max(0, lx - 12); x < Math.min(w, lx + 12); x++) ly = Math.max(ly, height[x])
    const cx = lx
    const top = Math.round(height[cx])
    const rw = 8 + (rnd() * 14 | 0)
    const rd = 4 + (rnd() * 6 | 0)
    for (let x = cx - rw; x <= cx + rw; x++) {
      for (let y = top - 1; y <= top + rd; y++) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue
        const dx = (x - cx) / rw
        const dy = (y - (top + rd / 2)) / rd
        if (dx * dx + dy * dy <= 1) world.set(x, y, y < top + rd ? E.WATER : E.SAND)
      }
    }
  }

  world.wakeAll()
}
