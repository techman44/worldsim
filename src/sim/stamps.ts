import { World } from './engine'
import { E } from './elements'

// Stamps are authored as ASCII art so new ones are trivial to add. Each glyph
// maps to an element id; space means "leave whatever is already there".
const LEGEND: Record<string, number> = {
  ' ': -1, // skip (transparent)
  '.': E.EMPTY, // force-clear
  S: E.STONE,
  R: E.ROCK,
  N: E.SANDSTONE,
  W: E.WOOD,
  G: E.GLASS,
  M: E.METAL,
  O: E.OBSIDIAN,
  w: E.WATER,
  d: E.DIRT,
  s: E.SAND,
  p: E.PLANT,
  L: E.LAVA,
  g: E.GOLD,
  c: E.CRYSTAL,
  '#': E.WALL,
  v: E.VINE,
}

export interface Stamp {
  id: string
  name: string
  icon: string
  rows: string[]
}

export const STAMPS: Stamp[] = [
  {
    id: 'castle',
    name: 'Castle',
    icon: 'castle',
    rows: [
      'S.S.S.S.S.S.S',
      'SSSSSSSSSSSSS',
      'SSSSSSSSSSSSS',
      'SSSGSSSSGSSSS',
      'SSSSSSSSSSSSS',
      'SSSSSWWSSSSSS',
      'SSSSSWWSSSSSS',
      'dddddddddddddd',
    ],
  },
  {
    id: 'house',
    name: 'House',
    icon: 'house',
    rows: [
      '....R....',
      '...RRR...',
      '..RRRRR..',
      '.RRRRRRR.',
      'WWWWWWWWW',
      'WWGWWWGWW',
      'WWGWWWGWW',
      'WWWWWWWWW',
      'WWWWWWWWW',
      'WWWWdWWWW',
      'WWWWdWWWW',
    ],
  },
  {
    id: 'car',
    name: 'Car',
    icon: 'car',
    rows: [
      '...MMMMM...',
      '..MGGGGGM..',
      '.MMMMMMMMM.',
      'MMMMMMMMMMM',
      'MMMMMMMMMMM',
      '.OO.....OO.',
      '.OO.....OO.',
    ],
  },
  {
    id: 'monstertruck',
    name: 'Monster Truck',
    icon: 'truck',
    rows: [
      '...MMMMMMM...',
      '..MGGGGGGGM..',
      '.MMMMMMMMMMM.',
      'MMMMMMMMMMMMM',
      'MMMMMMMMMMMMM',
      'OOOO.....OOOO',
      'OOOOO...OOOOO',
      'OOOOO...OOOOO',
      'OOOO.....OOOO',
      '.OOO.....OOO.',
    ],
  },
  {
    id: 'tree',
    name: 'Tree',
    icon: 'tree',
    rows: [
      '..ppp..',
      '.ppppp.',
      'ppppppp',
      'ppppppp',
      '.ppppp.',
      '..pWp..',
      '..pWp..',
      '..WWW..',
      '..WWW..',
    ],
  },
  {
    id: 'pond',
    name: 'Pond',
    icon: 'pond',
    rows: [
      'p.........p',
      'dwwwwwwwwwd',
      'dwwwwwwwwwd',
      'ddwwwwwwwdd',
      'dddwwwwwddd',
      'ddddddddddd',
    ],
  },
  {
    id: 'volcanocone',
    name: 'Volcano',
    icon: 'volcano',
    rows: [
      '......L......',
      '.....RLR.....',
      '....RRLRR....',
      '...RRRLRRR...',
      '..RRRRLRRRR..',
      '.RRRRRLRRRRR.',
      'RRRRRRLRRRRRR',
      'RRRRRRRRRRRRR',
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    icon: 'rocket',
    rows: [
      '..M..',
      '.MGM.',
      '.MMM.',
      '.MMM.',
      '.MMM.',
      'M.M.M',
      '..L..',
    ],
  },
]

export function stampWidth(s: Stamp): number {
  return Math.max(...s.rows.map((r) => r.length))
}

/**
 * Place a stamp so its bottom-centre sits at (cx, cy) — structures land on the
 * ground where you tap.
 */
export function placeStamp(world: World, s: Stamp, cx: number, cy: number) {
  const w = stampWidth(s)
  const h = s.rows.length
  const ox = Math.round(cx - w / 2)
  const oy = Math.round(cy - h)
  for (let y = 0; y < h; y++) {
    const row = s.rows[y]
    for (let x = 0; x < row.length; x++) {
      const id = LEGEND[row[x]]
      if (id === undefined || id === -1) continue
      world.set(ox + x, oy + y, id)
    }
  }
}
