// A tiny WebAudio synth for event impact sounds. No assets, built on demand,
// fully muteable. Created lazily on first user gesture (autoplay policies).
export class Audio {
  private ctx: AudioContext | null = null
  muted = false

  private ensure(): AudioContext | null {
    if (this.muted) return null
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch {
        return null
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private noiseBuffer(ctx: AudioContext, seconds: number) {
    const len = (ctx.sampleRate * seconds) | 0
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  thunder() {
    const ctx = this.ensure()
    if (!ctx) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer(ctx, 1.2)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(800, ctx.currentTime)
    lp.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.9, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    src.connect(lp).connect(g).connect(ctx.destination)
    src.start()
  }

  rumble(intensity = 1) {
    const ctx = this.ensure()
    if (!ctx) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer(ctx, 0.6)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 120
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.5 * Math.min(1, intensity / 10), ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    src.connect(lp).connect(g).connect(ctx.destination)
    src.start()
  }

  whoosh() {
    const ctx = this.ensure()
    if (!ctx) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer(ctx, 1.0)
    src.loop = false
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(300, ctx.currentTime)
    bp.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.9)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.3)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
    src.connect(bp).connect(g).connect(ctx.destination)
    src.start()
  }

  blip(freq = 440) {
    const ctx = this.ensure()
    if (!ctx) return
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.12, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.13)
  }
}
