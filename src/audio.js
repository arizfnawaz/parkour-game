// Procedural SFX via Web Audio. No external assets — all sounds are synthesized at runtime.
class SfxManager {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('parkourMuted') === '1';
    }

    init() {
        if (this.ctx) return;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new Ctx();
        } catch (e) {
            this.ctx = null;
        }
    }

    isMuted() { return this.muted; }

    setMuted(m) {
        this.muted = m;
        localStorage.setItem('parkourMuted', m ? '1' : '0');
    }

    toggle() { this.setMuted(!this.muted); }

    _envelope(node, vol, duration) {
        const t = this.ctx.currentTime;
        node.gain.setValueAtTime(vol, t);
        node.gain.exponentialRampToValueAtTime(0.0005, t + duration);
    }

    blip(freq, duration, type = 'square', vol = 0.08) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        this._envelope(gain, vol, duration);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    sweep(startFreq, endFreq, duration, type = 'sawtooth', vol = 0.08) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
        this._envelope(gain, vol, duration);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start();
        osc.stop(t + duration);
    }

    noise(duration, vol = 0.1, filterFreq = 4000) {
        if (this.muted || !this.ctx) return;
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        const gain = this.ctx.createGain();
        this._envelope(gain, vol, duration);
        src.connect(filter).connect(gain).connect(this.ctx.destination);
        src.start();
        src.stop(this.ctx.currentTime + duration);
    }

    jump()        { this.sweep(280, 480, 0.10, 'square', 0.07); }
    doubleJump()  { this.sweep(500, 880, 0.16, 'square', 0.08); }
    land()        { this.blip(110, 0.06, 'triangle', 0.05); }
    bounce()      { this.sweep(220, 880, 0.20, 'square', 0.10); }
    dash()        { this.sweep(880, 220, 0.10, 'sawtooth', 0.06); }
    collect()     { this.sweep(700, 1300, 0.16, 'sine', 0.08); }
    shieldHit()   { this.sweep(900, 200, 0.20, 'square', 0.10); }
    death()       { this.sweep(440, 60, 0.55, 'sawtooth', 0.12); }
    warning()     { this.blip(880, 0.05, 'square', 0.06); }
    laserCharge() { this.sweep(180, 700, 0.45, 'sawtooth', 0.05); }
    laserFire()   { this.noise(0.3, 0.10, 2200); }
    wind()        { this.noise(0.6, 0.06, 600); }
    pause()       { this.blip(330, 0.08, 'square', 0.05); }
    achievement() {
        this.blip(523, 0.10, 'sine', 0.09);
        setTimeout(() => this.blip(659, 0.10, 'sine', 0.09), 110);
        setTimeout(() => this.blip(783, 0.20, 'sine', 0.09), 220);
    }
}

export const sfx = new SfxManager();
