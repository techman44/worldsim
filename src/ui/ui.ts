import { state, type Tool } from '../state'
import { ELEMENTS, PALETTE } from '../sim/elements'
import { STAMPS } from '../sim/stamps'
import { EVENTS } from '../sim/events'
import { icon } from './icons'

export interface UIActions {
  triggerImmediateEvent(type: string): void
  clear(): void
  generate(): void
  save(): void
  load(): void
  exportFile(): void
  importFile(): void
  screenshot(): void
  togglePlayer(on: boolean): void
  setResolution(w: number, h: number): void
  recenter(): void
  step(): void
  apply(): void // push state -> engine/renderer
}

const el = (tag: string, cls?: string, html?: string): HTMLElement => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html !== undefined) e.innerHTML = html
  return e
}

function rgb(c: [number, number, number]) {
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export class UI {
  private root: HTMLElement
  private paletteWrap: HTMLElement
  private toolButtons = new Map<Tool, HTMLElement>()
  private hudEl: HTMLElement
  private playPauseBtn!: HTMLElement
  private brushLabel!: HTMLElement
  private panel!: HTMLElement
  private playerControls!: HTMLElement

  constructor(
    mount: HTMLElement,
    private actions: UIActions,
  ) {
    this.root = el('div', 'ui')
    mount.appendChild(this.root)

    this.hudEl = el('div', 'hud')
    this.root.appendChild(this.hudEl)

    this.buildTopBar()
    this.buildToolRail()
    this.paletteWrap = el('div', 'palette-wrap')
    this.root.appendChild(this.paletteWrap)
    this.buildBottomBar()
    this.buildPanel()
    this.playerControls = this.buildPlayerControls()

    this.refreshPalette()
    this.syncTools()
    this.updateHud('')
  }

  // ---- top bar --------------------------------------------------------------
  private buildTopBar() {
    const bar = el('div', 'topbar')
    const brand = el('div', 'brand', `${icon('world')}<span>World&nbsp;Sim</span>`)
    bar.appendChild(brand)

    const right = el('div', 'topbar-right')
    right.appendChild(this.iconBtn('target', 'Challenges & modes', () => this.onShowChallenges?.()))
    right.appendChild(this.iconBtn('hud', 'Toggle HUD', () => {
      state.showHud = !state.showHud
      this.hudEl.classList.toggle('show', state.showHud)
    }))
    right.appendChild(this.iconBtn('settings', 'Menu', () => this.togglePanel()))
    bar.appendChild(right)
    this.root.appendChild(bar)
  }

  // ---- tool rail (right side) ----------------------------------------------
  private buildToolRail() {
    const rail = el('div', 'rail')
    const tools: { tool: Tool; icon: string; label: string }[] = [
      { tool: 'paint', icon: 'brush', label: 'Paint' },
      { tool: 'erase', icon: 'eraser', label: 'Erase' },
      { tool: 'fill', icon: 'fill', label: 'Fill' },
      { tool: 'pick', icon: 'picker', label: 'Pick' },
      { tool: 'stamp', icon: 'stamp', label: 'Stamp' },
      { tool: 'event', icon: 'bolt', label: 'Event' },
    ]
    for (const t of tools) {
      const b = this.iconBtn(t.icon, t.label, () => this.selectTool(t.tool))
      this.toolButtons.set(t.tool, b)
      rail.appendChild(b)
    }
    const mirror = this.iconBtn('mirror', 'Mirror', () => {
      state.mirror = !state.mirror
      mirror.classList.toggle('active', state.mirror)
    })
    rail.appendChild(mirror)
    this.root.appendChild(rail)
  }

  selectTool(tool: Tool) {
    state.tool = tool
    this.syncTools()
    this.refreshPalette()
  }

  private syncTools() {
    for (const [tool, btn] of this.toolButtons) btn.classList.toggle('active', state.tool === tool)
  }

  // ---- bottom bar (time controls + brush) ----------------------------------
  private buildBottomBar() {
    const bar = el('div', 'bottombar')

    this.playPauseBtn = this.iconBtn(state.paused ? 'play' : 'pause', 'Play / Pause', () => {
      state.paused = !state.paused
      this.playPauseBtn.innerHTML = icon(state.paused ? 'play' : 'pause')
      this.actions.apply()
    })
    bar.appendChild(this.playPauseBtn)
    bar.appendChild(this.iconBtn('stepf', 'Step', () => this.actions.step()))

    // speed
    const speedWrap = el('div', 'slider')
    const speedLabel = el('span', 'slider-label', 'Speed')
    const speed = el('input') as HTMLInputElement
    speed.type = 'range'
    speed.min = '0'
    speed.max = '4'
    speed.step = '1'
    speed.value = '2'
    const speedVal = el('span', 'slider-val', '1×')
    const speeds = [0.25, 0.5, 1, 2, 4]
    speed.oninput = () => {
      state.speed = speeds[+speed.value]
      speedVal.textContent = state.speed + '×'
    }
    speedWrap.append(speedLabel, speed, speedVal)
    bar.appendChild(speedWrap)

    // brush size
    const brushWrap = el('div', 'slider')
    const brushLbl = el('span', 'slider-label', 'Brush')
    const brush = el('input') as HTMLInputElement
    brush.type = 'range'
    brush.min = '1'
    brush.max = '14'
    brush.step = '1'
    brush.value = String(state.brush)
    this.brushLabel = el('span', 'slider-val', String(state.brush))
    brush.oninput = () => {
      state.brush = +brush.value
      this.brushLabel.textContent = String(state.brush)
    }
    brushWrap.append(brushLbl, brush, this.brushLabel)
    bar.appendChild(brushWrap)

    this.root.appendChild(bar)
  }

  // ---- palette (content depends on tool) -----------------------------------
  private refreshPalette() {
    this.paletteWrap.innerHTML = ''
    const strip = el('div', 'palette')
    if (state.tool === 'stamp') {
      for (const s of STAMPS) strip.appendChild(this.stampButton(s.id, s.name, s.icon))
    } else if (state.tool === 'event') {
      for (const ev of EVENTS) strip.appendChild(this.eventButton(ev.type, ev.name, ev.icon, ev.placed))
    } else {
      const list = state.allowedElements ? [0, ...state.allowedElements] : PALETTE
      for (const id of list) strip.appendChild(this.elementButton(id))
    }
    this.paletteWrap.appendChild(strip)
  }

  private elementButton(id: number): HTMLElement {
    const e = ELEMENTS[id]
    const b = el('button', 'pal-btn')
    b.title = e.description ?? e.name
    const sw = el('div', 'swatch')
    sw.style.background = id === 0 ? 'transparent' : rgb(e.color)
    sw.innerHTML = icon(e.icon)
    if (id === 0) sw.classList.add('eraser-swatch')
    b.appendChild(sw)
    b.appendChild(el('span', 'pal-name', e.name))
    b.onclick = () => {
      state.element = id
      if (state.tool !== 'paint' && state.tool !== 'erase') this.selectTool('paint')
      this.markSelected(strip(b))
    }
    if (state.element === id) b.classList.add('selected')
    return b
  }

  private stampButton(sid: string, name: string, ic: string): HTMLElement {
    const b = el('button', 'pal-btn')
    b.title = name
    const sw = el('div', 'swatch tool-swatch')
    sw.innerHTML = icon(ic)
    b.appendChild(sw)
    b.appendChild(el('span', 'pal-name', name))
    b.onclick = () => {
      state.stampId = sid
      this.markSelected(strip(b))
    }
    if (state.stampId === sid) b.classList.add('selected')
    return b
  }

  private eventButton(type: string, name: string, ic: string, placed: boolean): HTMLElement {
    const b = el('button', 'pal-btn')
    b.title = name + (placed ? ' (tap to place)' : '')
    const sw = el('div', 'swatch tool-swatch')
    sw.innerHTML = icon(ic)
    b.appendChild(sw)
    b.appendChild(el('span', 'pal-name', name))
    b.onclick = () => {
      state.eventType = type as any
      this.markSelected(strip(b))
      if (!placed) this.actions.triggerImmediateEvent(type)
    }
    if (state.eventType === type) b.classList.add('selected')
    return b
  }

  private markSelected(buttons: HTMLElement[]) {
    for (const b of buttons) b.classList.remove('selected')
  }

  // ---- settings / menu panel ------------------------------------------------
  private buildPanel() {
    const panel = el('div', 'panel')
    this.panel = panel
    const head = el('div', 'panel-head')
    head.appendChild(el('h2', '', 'Menu'))
    head.appendChild(this.iconBtn('close', 'Close', () => this.togglePanel(false)))
    panel.appendChild(head)

    const body = el('div', 'panel-body')

    body.appendChild(this.section('World', [
      this.actionBtn('trash', 'Clear', () => this.actions.clear()),
      this.actionBtn('dice', 'New terrain', () => this.actions.generate()),
      this.actionBtn('move', 'Recenter', () => this.actions.recenter()),
    ]))

    body.appendChild(this.section('Save & share', [
      this.actionBtn('save', 'Save', () => this.actions.save()),
      this.actionBtn('load', 'Load', () => this.actions.load()),
      this.actionBtn('load', 'Import', () => this.actions.importFile()),
      this.actionBtn('save', 'Export', () => this.actions.exportFile()),
      this.actionBtn('camera', 'Screenshot', () => this.actions.screenshot()),
    ]))

    // toggles
    const toggles = el('div', 'toggles')
    toggles.appendChild(this.toggle('Glow / bloom', state.showGlow, (v) => { state.showGlow = v; this.actions.apply() }))
    toggles.appendChild(this.toggle('Sound', !state.muted, (v) => { state.muted = !v; this.actions.apply() }))
    toggles.appendChild(this.toggle('Haptics', state.haptics, (v) => { state.haptics = v; this.actions.apply() }))
    toggles.appendChild(this.toggle('Auto day/night', state.autoDayNight, (v) => { state.autoDayNight = v; this.actions.apply() }))
    toggles.appendChild(this.toggle('Play as character', false, (v) => this.actions.togglePlayer(v)))
    body.appendChild(this.section('Options', [toggles]))

    // day/night slider
    const dnWrap = el('div', 'slider wide')
    dnWrap.appendChild(el('span', 'slider-label', 'Time of day'))
    const dn = el('input') as HTMLInputElement
    dn.type = 'range'; dn.min = '0'; dn.max = '100'; dn.value = '100'
    dn.oninput = () => { state.autoDayNight = false; state.dayNight = +dn.value / 100; this.actions.apply() }
    dnWrap.appendChild(dn)
    body.appendChild(this.section('Lighting', [dnWrap]))

    // gravity
    const grav = el('div', 'btn-row')
    grav.append(
      this.choiceBtn('Normal', () => { state.gravity = 1; this.actions.apply() }),
      this.choiceBtn('Zero-G', () => { state.gravity = 0; this.actions.apply() }),
      this.choiceBtn('Inverted', () => { state.gravity = -1; this.actions.apply() }),
    )
    body.appendChild(this.section('Gravity', [grav]))

    // resolution
    const res = el('div', 'btn-row')
    res.append(
      this.choiceBtn('Low', () => this.actions.setResolution(240, 135)),
      this.choiceBtn('Medium', () => this.actions.setResolution(320, 180)),
      this.choiceBtn('High', () => this.actions.setResolution(480, 270)),
    )
    body.appendChild(this.section('Resolution', [res]))

    body.appendChild(this.helpText())

    panel.appendChild(body)
    this.root.appendChild(panel)
  }

  private helpText(): HTMLElement {
    const s = el('div', 'help')
    s.innerHTML = `
      <h3>How to play</h3>
      <ul>
        <li>Pick an element and drag on the world to paint.</li>
        <li><b>Touch:</b> one finger draws · two fingers pan &amp; pinch-zoom.</li>
        <li><b>Mouse:</b> drag to draw · wheel to zoom · two-finger trackpad to pan.</li>
        <li>Try pouring <b>water</b> on <b>lava</b>, or dropping <b>fire</b> on a <b>plant</b> forest.</li>
        <li><b>Stamp</b> places castles &amp; vehicles; <b>Event</b> triggers volcanoes, tornadoes &amp; more.</li>
        <li>Tap the <b>target</b> icon (top bar) for Free Play &amp; Challenges.</li>
      </ul>
      <h3>Keyboard shortcuts</h3>
      <ul class="keys">
        <li><kbd>1</kbd>–<kbd>0</kbd> select element &nbsp; <kbd>B</kbd> paint &nbsp; <kbd>E</kbd> erase &nbsp; <kbd>F</kbd> fill</li>
        <li><kbd>K</kbd> pick &nbsp; <kbd>T</kbd> stamp &nbsp; <kbd>V</kbd> event &nbsp; <kbd>X</kbd> mirror</li>
        <li><kbd>[</kbd> / <kbd>]</kbd> brush size &nbsp; <kbd>Space</kbd> pause &nbsp; <kbd>.</kbd> step &nbsp; <kbd>H</kbd> HUD</li>
        <li>In play mode: <kbd>←</kbd><kbd>→</kbd>/<kbd>A</kbd><kbd>D</kbd> move &nbsp; <kbd>W</kbd>/<kbd>↑</kbd>/<kbd>Space</kbd> jump</li>
      </ul>`
    return s
  }

  private section(title: string, children: HTMLElement[]): HTMLElement {
    const s = el('div', 'section')
    s.appendChild(el('h3', '', title))
    const row = el('div', 'section-row')
    for (const c of children) row.appendChild(c)
    s.appendChild(row)
    return s
  }

  private togglePanel(force?: boolean) {
    const show = force ?? !this.panel.classList.contains('open')
    this.panel.classList.toggle('open', show)
  }

  // ---- player on-screen controls -------------------------------------------
  private buildPlayerControls(): HTMLElement {
    const wrap = el('div', 'player-controls')
    const mk = (label: string, on: (down: boolean) => void) => {
      const b = el('button', 'pad-btn', label)
      const down = (e: Event) => { e.preventDefault(); on(true) }
      const up = (e: Event) => { e.preventDefault(); on(false) }
      b.addEventListener('pointerdown', down)
      b.addEventListener('pointerup', up)
      b.addEventListener('pointerleave', up)
      b.addEventListener('pointercancel', up)
      return b
    }
    wrap.appendChild(mk('◀', (d) => this.onPlayerInput?.('left', d)))
    wrap.appendChild(mk('▶', (d) => this.onPlayerInput?.('right', d)))
    wrap.appendChild(mk('▲', (d) => this.onPlayerInput?.('jump', d)))
    this.root.appendChild(wrap)
    return wrap
  }

  onPlayerInput?: (key: 'left' | 'right' | 'jump', down: boolean) => void
  onShowChallenges?: () => void

  /** Select an element by id (used by palette clicks and keyboard shortcuts). */
  selectElement(id: number) {
    if (state.allowedElements && id !== 0 && !state.allowedElements.includes(id)) return
    state.element = id
    if (state.tool !== 'paint' && state.tool !== 'erase') state.tool = 'paint'
    this.syncTools()
    this.refreshPalette()
  }

  toggleMirror() {
    state.mirror = !state.mirror
    const btn = [...this.root.querySelectorAll('.rail .icon-btn')].pop() as HTMLElement | undefined
    btn?.classList.toggle('active', state.mirror)
  }

  togglePause() {
    state.paused = !state.paused
    this.playPauseBtn.innerHTML = icon(state.paused ? 'play' : 'pause')
  }

  setPaused(paused: boolean) {
    state.paused = paused
    this.playPauseBtn.innerHTML = icon(paused ? 'play' : 'pause')
  }

  /** Adjust brush size and reflect it in the slider. */
  nudgeBrush(delta: number) {
    state.brush = Math.max(1, Math.min(14, state.brush + delta))
    this.brushLabel.textContent = String(state.brush)
    const slider = this.root.querySelector('.bottombar input[type="range"][max="14"]') as HTMLInputElement | null
    if (slider) slider.value = String(state.brush)
  }

  setPlayerControlsVisible(v: boolean) {
    this.playerControls.classList.toggle('show', v)
  }

  // ---- helpers --------------------------------------------------------------
  private iconBtn(ic: string, title: string, onClick: () => void): HTMLElement {
    const b = el('button', 'icon-btn')
    b.title = title
    b.setAttribute('aria-label', title)
    b.innerHTML = icon(ic)
    b.onclick = onClick
    return b
  }
  private actionBtn(ic: string, label: string, onClick: () => void): HTMLElement {
    const b = el('button', 'action-btn')
    b.innerHTML = `${icon(ic)}<span>${label}</span>`
    b.onclick = onClick
    return b
  }
  private choiceBtn(label: string, onClick: () => void): HTMLElement {
    const b = el('button', 'choice-btn', label)
    b.onclick = () => {
      ;[...b.parentElement!.children].forEach((c) => c.classList.remove('active'))
      b.classList.add('active')
      onClick()
    }
    return b
  }
  private toggle(label: string, initial: boolean, onChange: (v: boolean) => void): HTMLElement {
    const wrap = el('label', 'toggle')
    const input = el('input') as HTMLInputElement
    input.type = 'checkbox'
    input.checked = initial
    input.onchange = () => onChange(input.checked)
    wrap.append(input, el('span', '', label))
    return wrap
  }

  updateHud(text: string) {
    this.hudEl.innerHTML = text
  }

  /** Re-highlight the selected element button (used by the eyedropper). */
  syncSelection() {
    this.refreshPalette()
  }
}

// collect sibling palette buttons
function strip(b: HTMLElement): HTMLElement[] {
  return [...(b.parentElement?.children ?? [])] as HTMLElement[]
}
