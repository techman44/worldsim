import { CHALLENGES, type Challenge } from '../game/challenges'
import { ELEMENTS } from '../sim/elements'
import { icon } from './icons'

const el = (tag: string, cls?: string, html?: string): HTMLElement => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html !== undefined) e.innerHTML = html
  return e
}

export interface ChallengeCallbacks {
  onFreePlay(): void
  onSelect(ch: Challenge): void
  onExit(): void
}

const DONE_KEY = 'worldsim:challenges:done'

export class ChallengeUI {
  private modal: HTMLElement
  private objective: HTMLElement
  private bar!: HTMLElement
  private statusEl!: HTMLElement
  private titleEl!: HTMLElement
  private hintEl!: HTMLElement
  private win: HTMLElement
  private done: Set<string>

  constructor(mount: HTMLElement, private cb: ChallengeCallbacks) {
    this.done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'))
    this.modal = this.buildModal()
    this.objective = this.buildObjective()
    this.win = this.buildWin()
    mount.append(this.modal, this.objective, this.win)
  }

  // ---- picker ---------------------------------------------------------------
  private buildModal(): HTMLElement {
    const modal = el('div', 'cmodal')
    const sheet = el('div', 'cmodal-sheet')
    const head = el('div', 'cmodal-head')
    head.appendChild(el('h2', '', 'Choose a mode'))
    const close = el('button', 'icon-btn', icon('close'))
    close.onclick = () => this.closePicker()
    head.appendChild(close)
    sheet.appendChild(head)

    const grid = el('div', 'cgrid')

    const free = el('button', 'ccard ccard-free')
    free.innerHTML = `<div class="ccard-ic">${icon('world')}</div><h3>Free Play</h3><p>The full sandbox — every element, stamp and event. Build whatever you like.</p>`
    free.onclick = () => {
      this.closePicker()
      this.cb.onFreePlay()
    }
    grid.appendChild(free)

    for (const ch of CHALLENGES) {
      const card = el('button', 'ccard')
      const restricted = ch.allowed ? ch.allowed.map((id) => ELEMENTS[id]?.name).join(', ') : 'All elements'
      const doneBadge = this.done.has(ch.id) ? `<span class="cbadge">${icon('trophy')} done</span>` : ''
      card.innerHTML = `
        <div class="ccard-ic">${icon('target')}</div>
        <h3>${ch.name} ${doneBadge}</h3>
        <p>${ch.objective}</p>
        <span class="callowed">${ch.allowed ? 'Limited to: ' : ''}${restricted}</span>`
      card.onclick = () => {
        this.closePicker()
        this.cb.onSelect(ch)
      }
      grid.appendChild(card)
    }
    sheet.appendChild(grid)
    modal.appendChild(sheet)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closePicker()
    })
    return modal
  }

  openPicker() {
    this.refreshBadges()
    this.modal.classList.add('open')
  }
  closePicker() {
    this.modal.classList.remove('open')
  }
  private refreshBadges() {
    // rebuild grid badges cheaply by re-creating the modal contents
    const fresh = this.buildModal()
    this.modal.replaceWith(fresh)
    this.modal = fresh
  }

  // ---- objective banner -----------------------------------------------------
  private buildObjective(): HTMLElement {
    const wrap = el('div', 'objective')
    const main = el('div', 'objective-main')
    this.titleEl = el('div', 'objective-title')
    const status = el('div', 'objective-status')
    this.statusEl = status
    main.append(this.titleEl, status)

    const barWrap = el('div', 'objective-bar')
    this.bar = el('div', 'objective-bar-fill')
    barWrap.appendChild(this.bar)

    const actions = el('div', 'objective-actions')
    const hintBtn = el('button', 'icon-btn small', icon('info'))
    hintBtn.title = 'Hint'
    this.hintEl = el('div', 'objective-hint')
    hintBtn.onclick = () => this.hintEl.classList.toggle('show')
    const exitBtn = el('button', 'icon-btn small', icon('close'))
    exitBtn.title = 'Exit challenge'
    exitBtn.onclick = () => this.cb.onExit()
    actions.append(hintBtn, exitBtn)

    wrap.append(main, barWrap, actions, this.hintEl)
    return wrap
  }

  showObjective(ch: Challenge) {
    this.titleEl.innerHTML = `${icon('target')}<b>${ch.name}</b> — ${ch.objective}`
    this.hintEl.textContent = ch.hint
    this.hintEl.classList.remove('show')
    this.statusEl.textContent = ''
    this.bar.style.width = '0%'
    this.objective.classList.add('show')
  }

  setProgress(p: { progress: number; done: boolean; status: string }) {
    this.bar.style.width = `${Math.max(0, Math.min(100, p.progress * 100))}%`
    this.statusEl.textContent = p.status
    this.bar.classList.toggle('full', p.done)
  }

  hideObjective() {
    this.objective.classList.remove('show')
  }

  // ---- win banner -----------------------------------------------------------
  private buildWin(): HTMLElement {
    const wrap = el('div', 'win')
    const card = el('div', 'win-card')
    card.innerHTML = `<div class="win-ic">${icon('trophy')}</div><h2>Challenge complete!</h2><p class="win-msg"></p>`
    const row = el('div', 'win-row')
    const next = el('button', 'choice-btn active', 'More challenges')
    next.onclick = () => {
      this.win.classList.remove('open')
      this.openPicker()
    }
    const free = el('button', 'choice-btn', 'Keep playing')
    free.onclick = () => this.win.classList.remove('open')
    row.append(next, free)
    card.appendChild(row)
    wrap.appendChild(card)
    return wrap
  }

  markDone(ch: Challenge) {
    this.done.add(ch.id)
    localStorage.setItem(DONE_KEY, JSON.stringify([...this.done]))
    ;(this.win.querySelector('.win-msg') as HTMLElement).textContent = `You solved “${ch.name}”. Nicely done.`
    this.win.classList.add('open')
  }
}
