import './style.css'
import { World } from './sim/engine'
import { Renderer } from './render/renderer'
import { Particles } from './render/particles'
import { EventManager } from './sim/events'
import { generateTerrain } from './sim/terrain'
import { placeStamp, STAMPS } from './sim/stamps'
import { paintCircle, paintLine, floodFill } from './sim/paint'
import { Camera } from './ui/camera'
import { Input } from './ui/input'
import { UI, type UIActions } from './ui/ui'
import { ChallengeUI } from './ui/challengeui'
import { type Challenge } from './game/challenges'
import { PALETTE } from './sim/elements'
import { state } from './state'
import { Audio } from './audio'
import { Player } from './player'
import {
  saveSlot,
  loadSlot,
  listSlots,
  exportFile,
  importFile,
  screenshot,
} from './persist'

// ---- DOM scaffold -----------------------------------------------------------
const app = document.getElementById('app')!
const stage = document.createElement('div')
stage.className = 'stage'
const inner = document.createElement('div')
inner.className = 'stage-inner'
stage.appendChild(inner)
const flash = document.createElement('div')
flash.className = 'flash'
stage.appendChild(flash)
app.appendChild(stage)

// ---- mutable world bundle ---------------------------------------------------
let world!: World
let renderer!: Renderer
let particles!: Particles
let events!: EventManager
let player: Player | null = null
let playerOn = false

const audio = new Audio()
const camera = new Camera(inner, 320, 180)

function mountCanvases() {
  inner.innerHTML = ''
  renderer.grid.className = 'layer'
  renderer.glow.className = 'layer glow'
  particles.canvas.className = 'layer fx'
  inner.append(renderer.grid, renderer.glow, particles.canvas)
}

function buildWorld(w: number, h: number, generate = false) {
  world = new World(w, h)
  renderer = new Renderer(world)
  particles = new Particles(w, h)
  events = new EventManager(world, particles)
  events.onShake = (i) => {
    if (state.haptics && navigator.vibrate) navigator.vibrate(Math.min(60, i * 4))
  }
  if (generate) generateTerrain(world)
  camera.setWorldSize(w, h)
  mountCanvases()
  fitCamera()
  applyState()
  if (playerOn) player = new Player(world)
}

function fitCamera() {
  const r = stage.getBoundingClientRect()
  camera.fit(r.width, r.height)
}

// ---- apply state to engine/renderer ----------------------------------------
function applyState() {
  world.gravity = state.gravity
  renderer.showGlow = state.showGlow
  renderer.glow.style.display = state.showGlow ? '' : 'none'
  if (!state.autoDayNight) renderer.dayNight = state.dayNight
  audio.muted = state.muted
  events.haptics = state.haptics
}

// ---- actions for UI ---------------------------------------------------------
const actions: UIActions = {
  triggerImmediateEvent(type) {
    events.trigger(type as any, (world.width / 2) | 0, (world.height * 0.6) | 0)
    eventSound(type)
  },
  clear() {
    world.clear()
  },
  generate() {
    generateTerrain(world)
  },
  recenter() {
    fitCamera()
  },
  save() {
    const name = prompt('Save as:', 'world ' + (listSlots().length + 1))
    if (name) {
      saveSlot(world, name)
      toast(`Saved “${name}”`)
    }
  },
  load() {
    const slots = listSlots()
    if (!slots.length) return toast('No saved worlds yet')
    const name = prompt('Load which world?\n' + slots.join('\n'), slots[slots.length - 1])
    if (name && loadSlot(world, name)) toast(`Loaded “${name}”`)
    else if (name) toast('Not found')
  },
  exportFile() {
    exportFile(world)
  },
  importFile() {
    importFile(world).then((ok) => ok && toast('World imported'))
  },
  screenshot() {
    screenshot([renderer.grid, renderer.glow, particles.canvas])
    toast('Saved screenshot')
  },
  togglePlayer(on) {
    playerOn = on
    if (on) {
      player = new Player(world)
      if (state.paused) {
        state.paused = false
      }
    } else {
      player = null
    }
    ui.setPlayerControlsVisible(on)
  },
  setResolution(w, h) {
    buildWorld(w, h, false)
    toast(`Resolution ${w}×${h}`)
  },
  step() {
    stepSim(1)
    drawFrame()
  },
  apply: applyState,
}

// ---- UI ---------------------------------------------------------------------
const ui = new UI(app, actions)

// ---- challenge / free-play modes -------------------------------------------
let currentChallenge: Challenge | null = null
let challengeWon = false

const challengeUI = new ChallengeUI(app, {
  onFreePlay: () => enterFreePlay(),
  onSelect: (ch) => enterChallenge(ch),
  onExit: () => enterFreePlay(),
})
ui.onShowChallenges = () => challengeUI.openPicker()

function enterFreePlay() {
  currentChallenge = null
  challengeWon = false
  state.mode = 'free'
  state.allowedElements = null
  challengeUI.hideObjective()
  generateTerrain(world)
  ui.selectElement(state.element)
  state.paused = false
  ui.setPaused(false)
  fitCamera()
}

function enterChallenge(ch: Challenge) {
  currentChallenge = ch
  challengeWon = false
  state.mode = 'challenge'
  state.allowedElements = ch.allowed
  ch.build(world)
  if (ch.allowed && ch.allowed.length) ui.selectElement(ch.allowed[0])
  else ui.selectElement(state.element)
  state.paused = false
  ui.setPaused(false)
  challengeUI.showObjective(ch)
  fitCamera()
}

ui.onPlayerInput = (key, down) => {
  if (!player) return
  if (key === 'left') player.left = down
  if (key === 'right') player.right = down
  if (key === 'jump') player.jumpHeld = down
}

// ---- input ------------------------------------------------------------------
function handleStrokePoint(wx: number, wy: number, start: boolean, px?: number, py?: number) {
  const x = wx
  const y = wy
  switch (state.tool) {
    case 'paint':
      if (start || px === undefined) paintCircle(world, x, y, state.brush, state.element, state.mirror)
      else paintLine(world, px, py!, x, y, state.brush, state.element, state.mirror)
      break
    case 'erase':
      if (start || px === undefined) paintCircle(world, x, y, state.brush, 0, state.mirror)
      else paintLine(world, px, py!, x, y, state.brush, 0, state.mirror)
      break
    case 'fill':
      if (start) floodFill(world, x, y, state.element)
      break
    case 'pick':
      if (start) {
        const id = world.get(Math.floor(x), Math.floor(y))
        state.element = id
        state.tool = 'paint'
        ui.selectTool('paint')
        ui.syncSelection()
      }
      break
    case 'stamp':
      if (start) {
        const s = STAMPS.find((st) => st.id === state.stampId)
        if (s) placeStamp(world, s, Math.round(x), Math.round(y))
        audio.blip(330)
      }
      break
    case 'event':
      if (start) {
        events.trigger(state.eventType, Math.round(x), Math.round(y))
        eventSound(state.eventType)
      }
      break
  }
}

new Input(stage, camera, {
  onStrokeStart: (wx, wy) => handleStrokePoint(wx, wy, true),
  onStrokeMove: (wx, wy, px, py) => handleStrokePoint(wx, wy, false, px, py),
  onStrokeEnd: () => {},
})

function eventSound(type: string) {
  switch (type) {
    case 'lightning':
      audio.thunder()
      break
    case 'earthquake':
      audio.rumble(12)
      break
    case 'tornado':
    case 'snowstorm':
    case 'rain':
      audio.whoosh()
      break
    case 'volcano':
    case 'meteor':
      audio.rumble(8)
      break
  }
}

// ---- keyboard (mouse, touch AND keyboard are all first-class) --------------
// Element/tool hotkeys are listed in the in-app menu.
const TOOL_KEYS: Record<string, 'paint' | 'erase' | 'fill' | 'pick' | 'stamp' | 'event'> = {
  KeyB: 'paint',
  KeyE: 'erase',
  KeyF: 'fill',
  KeyK: 'pick',
  KeyT: 'stamp',
  KeyV: 'event',
}

function selectableElements(): number[] {
  return state.allowedElements ?? PALETTE.filter((id) => id !== 0)
}

window.addEventListener('keydown', (e) => {
  // don't steal typing from inputs / prompts
  const tag = (document.activeElement as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  // player movement (only when playing a character)
  if (player) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') player.left = true
    if (e.code === 'ArrowRight' || e.code === 'KeyD') player.right = true
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
      player.jumpHeld = true
      if (e.code === 'Space') {
        e.preventDefault()
        return
      }
    }
  }

  if (e.repeat) return

  // pause / step
  if (e.code === 'Space') {
    ui.togglePause()
    e.preventDefault()
    return
  }
  if (e.code === 'Period' || e.code === 'Comma') {
    actions.step()
    return
  }

  // tools
  const tool = TOOL_KEYS[e.code]
  if (tool) {
    ui.selectTool(tool)
    return
  }
  if (e.code === 'KeyX') return ui.toggleMirror()
  if (e.code === 'KeyH') {
    state.showHud = !state.showHud
    document.querySelector('.hud')?.classList.toggle('show', state.showHud)
    return
  }
  if (e.code === 'BracketLeft') return ui.nudgeBrush(-1)
  if (e.code === 'BracketRight') return ui.nudgeBrush(1)

  // element digits 1..9,0 -> selectable element by index
  if (e.code.startsWith('Digit')) {
    const d = +e.code.slice(5)
    const idx = d === 0 ? 9 : d - 1
    const list = selectableElements()
    if (idx < list.length) ui.selectElement(list[idx])
    return
  }
})
window.addEventListener('keyup', (e) => {
  if (player) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') player.left = false
    if (e.code === 'ArrowRight' || e.code === 'KeyD') player.right = false
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') player.jumpHeld = false
  }
})

window.addEventListener('resize', () => fitCamera())

// ---- toast ------------------------------------------------------------------
let toastTimer = 0
function toast(msg: string) {
  let t = document.querySelector('.toast') as HTMLElement | null
  if (!t) {
    t = document.createElement('div')
    t.className = 'toast'
    app.appendChild(t)
  }
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => t!.classList.remove('show'), 1600)
}

// ---- simulation + render loop ----------------------------------------------
let speedAccumulator = 0
function stepSim(times: number) {
  for (let i = 0; i < times; i++) {
    world.step()
    events.step()
    particles.update()
    if (player) player.update(world)
  }
}

let lastTime = performance.now()
let fps = 60
let frameCount = 0
let fpsTimer = 0

function drawFrame() {
  // auto day/night
  if (state.autoDayNight) {
    const t = (Math.sin(world.frame * 0.0008) + 1) / 2
    renderer.dayNight = t
    state.dayNight = t
  }
  renderer.render()
  particles.render()
  if (player) {
    const ctx = particles.canvas.getContext('2d')!
    player.render(ctx)
  }
  // shake + camera transform
  let sx = 0
  let sy = 0
  if (events.shake > 0) {
    sx = (Math.random() * 2 - 1) * events.shake
    sy = (Math.random() * 2 - 1) * events.shake
  }
  inner.style.transform = `translate(${camera.offsetX + sx}px, ${camera.offsetY + sy}px) scale(${camera.scale})`
  flash.style.opacity = String(events.flash * 0.8)
}

function loop(now: number) {
  const dt = now - lastTime
  lastTime = now

  if (!state.paused) {
    speedAccumulator += state.speed
    let steps = 0
    while (speedAccumulator >= 1 && steps < 8) {
      stepSim(1)
      speedAccumulator -= 1
      steps++
    }
  }

  drawFrame()

  // fps + hud
  frameCount++
  fpsTimer += dt
  if (fpsTimer >= 500) {
    fps = Math.round((frameCount * 1000) / fpsTimer)
    frameCount = 0
    fpsTimer = 0
    // challenge win-condition check
    if (currentChallenge && !challengeWon) {
      const res = currentChallenge.check(world)
      challengeUI.setProgress(res)
      if (res.done) {
        challengeWon = true
        challengeUI.markDone(currentChallenge)
        audio.blip(660)
        setTimeout(() => audio.blip(880), 120)
        setTimeout(() => audio.blip(1040), 240)
      }
    }
    if (state.showHud) {
      ui.updateHud(
        `FPS ${fps} · active chunks ${world.activeChunkCount()} · particles ${particles.count}` +
          (player ? ` · ${player.alive ? 'alive' : '✝'}` : ''),
      )
    }
  }

  requestAnimationFrame(loop)
}

// ---- boot -------------------------------------------------------------------
buildWorld(320, 180, true)
// a friendly starter scene flourish: a little rain to show life
events.trigger('rain', 160, 100)
requestAnimationFrame(loop)
