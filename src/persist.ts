import { World } from './sim/engine'
import { ELEMENTS } from './sim/elements'

// World save format: run-length encoded cell ids. Compact enough for
// localStorage and a small shareable file. No backend involved.
interface WorldSave {
  v: 1
  w: number
  h: number
  rle: number[] // flat [id, count, id, count, ...]
}

export function encodeWorld(world: World): WorldSave {
  const rle: number[] = []
  const cells = world.cells
  let prev = cells[0]
  let count = 1
  for (let i = 1; i < cells.length; i++) {
    if (cells[i] === prev) count++
    else {
      rle.push(prev, count)
      prev = cells[i]
      count = 1
    }
  }
  rle.push(prev, count)
  return { v: 1, w: world.width, h: world.height, rle }
}

export function decodeWorld(world: World, save: WorldSave) {
  if (save.w !== world.width || save.h !== world.height) {
    throw new Error(`size mismatch (${save.w}x${save.h} vs ${world.width}x${world.height})`)
  }
  const cells = world.cells
  let i = 0
  for (let r = 0; r < save.rle.length; r += 2) {
    const id = save.rle[r]
    const n = save.rle[r + 1]
    for (let k = 0; k < n; k++) cells[i++] = id
  }
  // reset temperature / life from element defaults
  for (let p = 0; p < cells.length; p++) {
    const el = ELEMENTS[cells[p]]
    world.temp[p] = el?.baseTemp ?? world.ambient
    world.life[p] = el?.initialLife ?? 0
  }
  world.wakeAll()
}

const SLOT_PREFIX = 'worldsim:slot:'

export function listSlots(): string[] {
  const out: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(SLOT_PREFIX)) out.push(k.slice(SLOT_PREFIX.length))
  }
  return out.sort()
}

export function saveSlot(world: World, name: string) {
  localStorage.setItem(SLOT_PREFIX + name, JSON.stringify(encodeWorld(world)))
}

export function loadSlot(world: World, name: string): boolean {
  const raw = localStorage.getItem(SLOT_PREFIX + name)
  if (!raw) return false
  decodeWorld(world, JSON.parse(raw))
  return true
}

export function deleteSlot(name: string) {
  localStorage.removeItem(SLOT_PREFIX + name)
}

export function exportFile(world: World, name = 'world') {
  const blob = new Blob([JSON.stringify(encodeWorld(world))], { type: 'application/json' })
  downloadBlob(blob, `${name}.worldsim.json`)
}

export function importFile(world: World): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(false)
      const reader = new FileReader()
      reader.onload = () => {
        try {
          decodeWorld(world, JSON.parse(String(reader.result)))
          resolve(true)
        } catch (err) {
          console.error(err)
          alert('Could not load that world: ' + (err as Error).message)
          resolve(false)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}

export function screenshot(layers: HTMLCanvasElement[], scale = 4) {
  const w = layers[0].width * scale
  const h = layers[0].height * scale
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  for (const c of layers) ctx.drawImage(c, 0, 0, w, h)
  out.toBlob((blob) => {
    if (blob) downloadBlob(blob, 'worldsim.png')
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
