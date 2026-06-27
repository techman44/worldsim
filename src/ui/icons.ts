// A cohesive inline-SVG icon set. Element glyphs are simple filled symbols shown
// on top of the element's colour swatch in the palette; tool/event/control icons
// are line glyphs that inherit `currentColor`. Every element, tool, event and
// control has an entry so the palette is never a mystery.

const S = (inner: string, opts = '') =>
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" ${opts}>${inner}</svg>`

// stroke helper for line icons
const L = (paths: string) =>
  S(paths, 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')

const ICONS: Record<string, string> = {
  // ---- element glyphs (white symbols, drawn over the colour swatch) --------
  eraser: L('<path d="M7 17l-3-3 8-8 6 6-5 5H7z"/><path d="M14 20h6"/>'),
  wall: S('<rect x="3" y="5" width="18" height="5" rx="1" fill="#fff" opacity=".85"/><rect x="3" y="12" width="18" height="5" rx="1" fill="#fff" opacity=".85"/><path d="M9 5v5M15 5v5M6 12v5M12 12v5M18 12v5" stroke="#000" stroke-opacity=".25"/>'),
  stone: S('<path d="M5 14c0-4 3-7 7-7s7 3 7 7v3H5z" fill="#fff" opacity=".85"/>'),
  rock: S('<path d="M4 16l4-7 4 3 3-5 5 9z" fill="#fff" opacity=".85"/>'),
  wood: S('<rect x="5" y="4" width="14" height="16" rx="1.5" fill="#fff" opacity=".85"/><path d="M9 4v16M14 4v16" stroke="#000" stroke-opacity=".25"/>'),
  metal: S('<rect x="4" y="6" width="16" height="12" rx="1.5" fill="#fff" opacity=".85"/><path d="M7 9l10 0M7 12l10 0" stroke="#000" stroke-opacity=".2"/>'),
  glass: S('<rect x="6" y="4" width="12" height="16" rx="1.5" fill="#fff" opacity=".5"/><path d="M9 6l6 6M9 11l4 4" stroke="#fff"/>'),
  sandstone: S('<rect x="4" y="5" width="16" height="14" rx="1" fill="#fff" opacity=".85"/><path d="M4 10h16M4 14h16" stroke="#000" stroke-opacity=".18"/>'),
  gold: S('<path d="M12 3l3 6 6 1-4.5 4.2L18 21l-6-3-6 3 1.5-6.8L3 10l6-1z" fill="#fff" opacity=".9"/>'),
  crystal: S('<path d="M12 2l5 7-5 13-5-13z" fill="#fff" opacity=".85"/><path d="M7 9h10" stroke="#000" stroke-opacity=".2"/>'),
  sand: S('<circle cx="8" cy="14" r="2" fill="#fff"/><circle cx="13" cy="11" r="2" fill="#fff"/><circle cx="16" cy="15" r="2" fill="#fff"/><circle cx="11" cy="16" r="1.6" fill="#fff"/>'),
  dirt: S('<rect x="4" y="6" width="16" height="13" rx="1" fill="#fff" opacity=".85"/><circle cx="9" cy="11" r="1.3" fill="#000" fill-opacity=".25"/><circle cx="15" cy="14" r="1.3" fill="#000" fill-opacity=".25"/>'),
  ash: S('<circle cx="8" cy="13" r="1.8" fill="#fff"/><circle cx="14" cy="10" r="1.8" fill="#fff"/><circle cx="16" cy="15" r="1.6" fill="#fff"/><circle cx="11" cy="16" r="1.4" fill="#fff"/>'),
  snow: L('<path d="M12 3v18M4.5 7l15 10M19.5 7l-15 10"/>'),
  salt: S('<rect x="7" y="7" width="4" height="4" fill="#fff"/><rect x="13" y="9" width="4" height="4" fill="#fff"/><rect x="9" y="13" width="4" height="4" fill="#fff"/>'),
  gunpowder: S('<circle cx="9" cy="14" r="2.2" fill="#fff"/><circle cx="15" cy="12" r="2.2" fill="#fff"/><circle cx="13" cy="16" r="1.8" fill="#fff"/><path d="M15 9l2-3" stroke="#fff" stroke-width="1.5"/>'),
  water: S('<path d="M12 4c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11z" fill="#fff" opacity=".85"/>'),
  lava: S('<path d="M5 18c1-4 2-5 2-8M11 18c0-5 1-7 1-11M17 18c1-3 1-5 2-7" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M4 18h16" stroke="#fff" stroke-width="2"/>'),
  acid: S('<path d="M12 4c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11z" fill="#fff" opacity=".85"/><circle cx="12" cy="14" r="2" fill="#000" fill-opacity=".3"/>'),
  oil: S('<path d="M12 4c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11z" fill="#fff" opacity=".7"/>'),
  mud: S('<path d="M4 15c2-2 4 0 6-1s4 1 6-1v6H4z" fill="#fff" opacity=".8"/><circle cx="9" cy="12" r="1" fill="#fff"/>'),
  slime: S('<path d="M5 13a7 5 0 0114 0c0 4-3 6-7 6s-7-2-7-6z" fill="#fff" opacity=".8"/><circle cx="9" cy="12" r="1.3" fill="#000" fill-opacity=".3"/><circle cx="15" cy="12" r="1.3" fill="#000" fill-opacity=".3"/>'),
  steam: L('<path d="M7 16c0-3 3-3 3-6M12 16c0-3 3-3 3-6M17 14c0-2 1-2 1-4"/>'),
  smoke: S('<path d="M6 16c-2-1-2-4 0-5-1-2 1-4 3-3 1-2 4-2 5 0 2-1 4 1 3 3 2 1 1 5-1 5z" fill="#fff" opacity=".8"/>'),
  methane: L('<path d="M7 16c0-3 3-3 3-6M13 16c0-3 3-3 3-6"/><circle cx="17" cy="8" r="1.4" fill="currentColor"/>'),
  cloud: S('<path d="M7 17a4 4 0 010-8 5 5 0 019-2 4 4 0 011 10z" fill="#fff" opacity=".9"/>'),
  fire: S('<path d="M12 3c1 3 4 4 4 8a4 4 0 11-8 0c0-2 1-3 2-4 0 2 2 2 2 0 0-2 0-3 0-4z" fill="#fff"/>'),
  ember: S('<circle cx="12" cy="13" r="5" fill="#fff"/><circle cx="12" cy="13" r="2" fill="#000" fill-opacity=".25"/>'),
  spark: L('<path d="M13 3l-6 9h4l-1 9 7-11h-4z" fill="currentColor" stroke="none"/>'),
  lightning: S('<path d="M13 2l-7 11h4l-1 9 8-12h-4z" fill="#fff"/>'),
  ice: S('<path d="M12 3v18M4.5 7l15 10M19.5 7l-15 10" stroke="#fff" stroke-width="2"/><rect x="9" y="9" width="6" height="6" fill="#fff" opacity=".5"/>'),
  plant: S('<path d="M12 21v-9" stroke="#fff" stroke-width="2"/><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 11c3 0 5-2 5-5-3 0-5 2-5 5z" fill="#fff"/>'),
  vine: L('<path d="M12 3v18"/><path d="M12 8c-3 0-4-2-4-2M12 13c3 0 4-2 4-2M12 17c-3 0-4-2-4-2"/>'),
  seed: S('<ellipse cx="12" cy="13" rx="4" ry="6" fill="#fff"/><path d="M12 8v10" stroke="#000" stroke-opacity=".25"/>'),
  obsidian: S('<path d="M12 2l5 7-5 13-5-13z" fill="#fff" opacity=".85"/><path d="M12 2v20" stroke="#000" stroke-opacity=".3"/>'),

  // ---- tools ----------------------------------------------------------------
  brush: L('<path d="M4 20s1-4 4-5l8-9 3 3-9 8c-1 3-5 4-6 3z"/><path d="M14 5l3 3"/>'),
  fill: L('<path d="M5 11l6-6 6 6-6 6-6-6z"/><path d="M11 5V3"/><path d="M19 14c1.5 2 1.5 4 0 4s-1.5-2 0-4z" fill="currentColor"/>'),
  picker: L('<path d="M19 5l-1-1c-1-1-2-1-3 0l-2 2 4 4 2-2c1-1 1-2 0-3z"/><path d="M13 8l-7 7v3h3l7-7"/>'),
  stamp: L('<path d="M9 3h6l-1 6h2a2 2 0 012 2v2H6v-2a2 2 0 012-2h2z"/><rect x="5" y="18" width="14" height="3" rx="1"/>'),
  bolt: L('<path d="M13 2l-7 11h4l-1 9 8-12h-4z"/>'),
  move: L('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>'),
  mirror: L('<path d="M12 3v18"/><path d="M9 7l-4 5 4 5z" fill="currentColor"/><path d="M15 7l4 5-4 5z"/>'),
  rect: L('<rect x="4" y="6" width="16" height="12" rx="1"/>'),

  // ---- events ---------------------------------------------------------------
  volcano: L('<path d="M3 20h18M8 20l3-9h2l3 9"/><path d="M10 8c0-2 1-3 1-4M13 8c0-1 1-2 0-3" stroke-width="1.6"/>'),
  tornado: L('<path d="M4 5h16M6 9h12M8 13h8M10 17h4M12 21h0"/>'),
  rain: L('<path d="M7 14a4 4 0 010-8 5 5 0 019-2 4 4 0 011 10"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>'),
  quake: L('<path d="M2 12h4l2-5 3 10 3-12 3 9 2-2h4"/>'),
  meteor: L('<circle cx="15" cy="9" r="4"/><path d="M11 13L4 20M13 14l-5 5M9 11l-4 4"/>'),

  // ---- controls -------------------------------------------------------------
  play: S('<path d="M8 5l11 7-11 7z" fill="currentColor"/>'),
  pause: S('<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>'),
  stepf: L('<path d="M6 5l9 7-9 7z" fill="currentColor" stroke="none"/><path d="M18 5v14"/>'),
  trash: L('<path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/>'),
  save: L('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'),
  load: L('<path d="M4 6h6l2 2h8v11H4z"/><path d="M12 17v-6M9 14l3 3 3-3"/>'),
  camera: L('<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>'),
  hud: L('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4M7 13h7M7 16h5"/>'),
  glow: L('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  day: L('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>'),
  night: L('<path d="M20 14a8 8 0 11-9-11 7 7 0 009 11z"/>'),
  gravity: L('<path d="M12 3v14M7 12l5 5 5-5"/><path d="M6 21h12"/>'),
  settings: L('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  plus: L('<path d="M12 5v14M5 12h14"/>'),
  minus: L('<path d="M5 12h14"/>'),
  close: L('<path d="M6 6l12 12M18 6L6 18"/>'),
  menu: L('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  world: L('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  player: L('<circle cx="12" cy="6" r="3"/><path d="M12 9v7M12 12l-4 3M12 12l4 3M12 16l-3 5M12 16l3 5"/>'),
  wind: L('<path d="M3 8h11a2.5 2.5 0 100-5M3 12h15a2.5 2.5 0 110 5M3 16h8a2 2 0 110 4"/>'),
  dice: L('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  target: L('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  trophy: L('<path d="M8 4h8v4a4 4 0 01-8 0z"/><path d="M8 6H5v1a3 3 0 003 3M16 6h3v1a3 3 0 01-3 3"/><path d="M12 12v4M9 20h6M10 16h4l1 4H9z"/>'),
  info: L('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  flag: L('<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>'),
  pin: L('<path d="M12 17v5M9 3h6l-1 4 3 3v2H7v-2l3-3z"/>'),
}

export function icon(name: string): string {
  return ICONS[name] ?? ICONS.world
}
