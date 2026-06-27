// Generates the PWA app icons (PNG) and an SVG favicon with no external deps.
// PNGs are encoded by hand using Node's built-in zlib. The art is a small
// "world in a droplet" scene: sky, sun/moon, sand dune, water, and a lava vein —
// a compact nod to the elements the sim is built from.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dirname, '../public')
const ICONS = resolve(PUBLIC, 'icons')
mkdirSync(ICONS, { recursive: true })

// ---- tiny PNG encoder -------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  // filter: prepend a 0 byte (no filter) per scanline
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---- drawing helpers --------------------------------------------------------
function lerp(a, b, t) { return a + (b - a) * t }
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  // For non-maskable we round the corners into a "squircle"; maskable fills edge-to-edge.
  const radius = maskable ? size : size * 0.46
  const corner = size * 0.22

  const skyTop = [22, 32, 58]
  const skyBot = [70, 96, 150]
  const sandTop = [225, 198, 120]
  const sandBot = [196, 158, 86]
  const water = [54, 120, 190]
  const waterDeep = [30, 78, 140]
  const lava = [255, 140, 40]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // rounded-rect / circle mask
      let inside = true
      let aa = 1
      if (maskable) {
        inside = true
      } else {
        const dx = Math.max(Math.abs(x - cx) - (radius - corner), 0)
        const dy = Math.max(Math.abs(y - cy) - (radius - corner), 0)
        const d = Math.sqrt(dx * dx + dy * dy)
        aa = Math.max(0, Math.min(1, corner - d + 0.5))
        inside = aa > 0
      }
      if (!inside) { rgba[i + 3] = 0; continue }

      const ny = y / size
      let col
      const horizon = 0.52
      const sandLine = 0.66
      if (ny < horizon) {
        // sky gradient
        col = mix(skyTop, skyBot, ny / horizon)
        // sun/moon glow
        const sx = size * 0.70, sy = size * 0.26, sr = size * 0.11
        const dd = Math.hypot(x - sx, y - sy)
        if (dd < sr) col = mix([255, 240, 200], col, dd / sr)
        else if (dd < sr * 1.8) col = mix(col, [255, 235, 190], (1 - (dd - sr) / (sr * 0.8)) * 0.35)
      } else if (ny < sandLine) {
        // sand dune
        col = mix(sandTop, sandBot, (ny - horizon) / (sandLine - horizon))
        // lava vein near bottom-left of the dune
        const vx = size * 0.30
        if (Math.abs(x - vx) < size * 0.03 && ny > 0.58) {
          col = mix(col, lava, 0.85)
        }
      } else {
        // water
        col = mix(water, waterDeep, (ny - sandLine) / (1 - sandLine))
        // simple highlight ripples
        if ((Math.floor(x * 0.5 + y) % 7) === 0) col = mix(col, [180, 220, 255], 0.25)
      }
      rgba[i] = Math.round(col[0])
      rgba[i + 1] = Math.round(col[1])
      rgba[i + 2] = Math.round(col[2])
      rgba[i + 3] = Math.round(aa * 255)
    }
  }
  return encodePng(size, size, rgba)
}

const targets = [
  { name: 'icons/icon-192.png', size: 192 },
  { name: 'icons/icon-512.png', size: 512 },
  { name: 'icons/maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
]
for (const t of targets) {
  const png = drawIcon(t.size, { maskable: t.maskable })
  writeFileSync(resolve(PUBLIC, t.name), png)
  console.log('wrote', t.name, `(${t.size}x${t.size})`)
}

// A crisp SVG favicon mirroring the same scene.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <clipPath id="r"><rect x="2" y="2" width="60" height="60" rx="14"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="64" height="64" fill="#466096"/>
    <rect width="64" height="34" fill="#243a5e"/>
    <circle cx="45" cy="17" r="7" fill="#ffe9b0"/>
    <rect y="33" width="64" height="10" fill="#dcc278"/>
    <rect x="17" y="36" width="3" height="8" fill="#ff8c28"/>
    <rect y="43" width="64" height="21" fill="#3678be"/>
    <rect y="55" width="64" height="9" fill="#1e4e8c"/>
  </g>
</svg>`
writeFileSync(resolve(PUBLIC, 'favicon.svg'), favicon)
console.log('wrote favicon.svg')
