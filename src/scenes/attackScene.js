import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { SKINS, loadSkin } from '../achievements.js';

const PLAYER_SPEED = 300;
const PLAYER_BULLET_SPEED = 1100;     // fast — but only does 1 dmg
const FIRE_COOLDOWN_MS = 130;         // ~7.5 shots/sec

// Lives: 3 across easy/medium/hard, 1 on insane.
const LIVES_DEFAULT = 3;
const LIVES_INSANE = 1;
const HIT_INVULN_MS = 1500;

// Hitbox radii used by the manual circle-vs-circle collision in update().
const PLAYER_HIT_RADIUS = 13;
const BOSS_HIT_RADIUS = 44;

// 5 bosses, each meaner than the last. `burst` is bullets per shot, `fireDelay` is ms between shots.
// Pattern: 'aimed' = narrow fan toward player, 'spread' = wide fan, 'ring' = full circle,
// 'mortar' = lobbed projectiles that stop and explode in a telegraphed radius.
// Boss bullets are slow on purpose so they're dodgeable — but they're lethal.
export const BOSSES = [
    { name: 'Crimson Eye',  hp: 28,  color: 0xff3a3a, accent: 0xffe5a8, hp_bar: '#ff5e5e',
      pattern: 'aimed',  burst: 1, fireDelay: 1200, bulletSpeed: 150, sway: 160, swaySpeed: 0.8 },
    { name: 'Aqua Shogun',  hp: 50,  color: 0x3a9cff, accent: 0xc8e8ff, hp_bar: '#4fa3ff',
      pattern: 'spread', burst: 3, fireDelay: 1050, bulletSpeed: 165, sway: 200, swaySpeed: 1.0 },
    { name: 'Boomshell',    hp: 68,  color: 0xff7a3a, accent: 0xffd166, hp_bar: '#ff8a3a',
      pattern: 'mortar', burst: 2, fireDelay: 1600, bulletSpeed: 260, sway: 200, swaySpeed: 0.9 },
    { name: 'Storm Bolt',   hp: 110, color: 0xfff04d, accent: 0xff8a3a, hp_bar: '#ffd166',
      pattern: 'aimed',  burst: 5, fireDelay: 900,  bulletSpeed: 190, sway: 240, swaySpeed: 1.3 },
    { name: 'Blob King',    hp: 180, color: 0xffd166, accent: 0xff5e5e, hp_bar: '#fde68a',
      pattern: 'ring',   burst: 12, fireDelay: 1100, bulletSpeed: 160, sway: 280, swaySpeed: 0.9 }
];

// Boomshell mortar timing/radius.
const MORTAR_TRAVEL_MS = 1100;
const MORTAR_ARM_MS = 800;
const MORTAR_RADIUS = 60;

// Per-difficulty multipliers. Easy is the baseline; harder tiers scale HP, fire rate,
// movement, and add lasers as a second hazard.
//   bossHpMul     — multiplier on boss HP
//   fireRateMul   — multiplier on fireDelay (smaller = shoots faster)
//   bossSpeedMul  — multiplier on boss horizontal sway speed
//   lasers        — whether horizontal laser hazards spawn periodically
export const ATTACK_DIFFICULTY_CONFIG = {
    easy:   { name: 'Easy',   color: '#a0e8a0',
              bossHpMul: 1.0, fireRateMul: 1.0, bossSpeedMul: 1.0, lasers: false },
    medium: { name: 'Medium', color: '#9be7ff',
              bossHpMul: 1.2, fireRateMul: 0.8, bossSpeedMul: 1.0, lasers: false },
    hard:   { name: 'Hard',   color: '#ffd166',
              bossHpMul: 1.5, fireRateMul: 0.8, bossSpeedMul: 1.2, lasers: true  },
    insane: { name: 'Insane', color: '#ff5e5e',
              bossHpMul: 2.0, fireRateMul: 0.5, bossSpeedMul: 1.5, lasers: true  }
};

// How often laser hazards spawn when enabled (ms).
const LASER_SPAWN_DELAY = 4500;
const LASER_WARNING_MS = 1500;
const LASER_ACTIVE_MS = 2000;
const LASER_HIT_HALF_THICKNESS = 10; // half-height for player overlap detection

// Power-up spawn cadence (ms). One random power-up drops at this interval.
const POWERUP_SPAWN_DELAY = 8000;
const POWERUP_LIFETIME_MS = 10000; // how long an uncollected power-up sits before vanishing
const POWERUP_PICKUP_RADIUS = 24;

// Power-up tuning constants.
const TINY_SCALE = 0.55;
const TINY_HIT_RADIUS = 7;
const SHOTGUN_SPREAD_RAD = Math.PI / 14; // ~13deg per side
const SNIPER_COOLDOWN_MUL = 2.8;
const SNIPER_DAMAGE = 6;
const BOUNCE_MAX = 3;     // wall bounces per bullet fired during the Bouncing buff
const BOUNCE_MARGIN = 6;  // distance from screen edge where a bounce triggers

const POWERUPS = {
    tiny:     { name: 'Tiny',     color: 0x67e8f9, icon: '🤏', durationMs: 8000 },
    shotgun:  { name: 'Shotgun',  color: 0xff8a3a, icon: '🔫', durationMs: 8000 },
    bouncing: { name: 'Bouncing', color: 0xff7ac4, icon: '🏓', durationMs: 5000 },
    shield:   { name: 'Shield',   color: 0x06b6d4, icon: '🛡', durationMs: 0    }, // permanent until consumed
    sniper:   { name: 'Sniper',   color: 0xff5e5e, icon: '🎯', durationMs: 8000 }
};
const POWERUP_IDS = Object.keys(POWERUPS);

export default class AttackScene extends Phaser.Scene {
    constructor() {
        super('AttackScene');
    }

    init(data) {
        const diffId = (data && data.difficulty) || localStorage.getItem('attackDifficulty') || 'easy';
        this.difficultyId = ATTACK_DIFFICULTY_CONFIG[diffId] ? diffId : 'easy';
        this.difficulty = ATTACK_DIFFICULTY_CONFIG[this.difficultyId];
        this.skinId = loadSkin();
        // Insane is the only mode where one bullet ends the run.
        this.maxLives = this.difficultyId === 'insane' ? LIVES_INSANE : LIVES_DEFAULT;
        // Practice mode: pick a single boss to fight. Null = full 5-boss gauntlet.
        this.practiceBossIndex = (data && Number.isInteger(data.practiceBossIndex))
            ? data.practiceBossIndex : null;
    }

    create() {
        this.gameOver = false;
        this.victory = false;
        this.isPaused = false;
        this.transitioning = false;
        // Start the gauntlet at the practice index if set, otherwise from the top.
        this.bossIndex = this.practiceBossIndex !== null ? this.practiceBossIndex : 0;
        this.lives = this.maxLives;
        this.invulnUntil = 0;
        this.lastFireTime = 0;
        this.runStartTime = 0; // set when first boss intro finishes

        // Power-up state. Timed effects store expiry timestamps; shield stores a count.
        this.powerups = [];
        this.effects = { tiny: 0, shotgun: 0, bouncing: 0, sniper: 0, shield: 0 };

        this.physics.world.setBounds(0, 0, 800, 600);

        sfx.init();

        this.buildBackground();
        this.buildPlayer();

        // Plain arrays — bullets are moved manually in update() using their
        // own vx/vy properties. Phaser 4's arcade body wasn't reliably driving
        // Shape GameObjects, so we sidestep the body entirely.
        this.playerBullets = [];
        this.bossBullets = [];

        this.keys = {
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        };

        this.input.keyboard.on('keydown-P', () => this.togglePause());
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-M', () => {
            sfx.toggle();
            sfx.blip(440, 0.05, 'square', 0.05);
            this.muteHint.setText(sfx.isMuted() ? '🔇' : '🔊');
        });

        this.buildHUD();

        // Horizontal laser hazard (hard/insane only).
        this.activeLasers = [];
        if (this.difficulty.lasers) {
            this.laserEvent = this.time.addEvent({
                delay: LASER_SPAWN_DELAY, loop: true, callback: () => this.spawnLaser()
            });
        }

        // Power-up drop loop. Available on every difficulty.
        this.powerupEvent = this.time.addEvent({
            delay: POWERUP_SPAWN_DELAY, loop: true, callback: () => this.spawnPowerup()
        });

        this.spawnBoss(this.bossIndex);
    }

    // ----- Background -----
    buildBackground() {
        // Dark arena gradient.
        const g = this.add.graphics();
        const top = Phaser.Display.Color.IntegerToColor(0x12091f);
        const bot = Phaser.Display.Color.IntegerToColor(0x3a1346);
        const stripes = 36;
        for (let i = 0; i < stripes; i++) {
            const t = i / (stripes - 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, 1, t);
            g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            g.fillRect(0, i * (600 / stripes), 800, Math.ceil(600 / stripes) + 1);
        }

        // Subtle grid lines.
        const grid = this.add.graphics();
        grid.lineStyle(1, 0xffffff, 0.06);
        for (let x = 0; x <= 800; x += 40) {
            grid.lineBetween(x, 0, x, 600);
        }
        for (let y = 0; y <= 600; y += 40) {
            grid.lineBetween(0, y, 800, y);
        }

        // Star specks.
        for (let i = 0; i < 60; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
            const s = Phaser.Math.FloatBetween(0.3, 1.0);
            this.add.circle(x, y, s, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.7));
        }
    }

    // ----- Player -----
    buildPlayer() {
        const skin = SKINS[this.skinId] || SKINS.yellow;

        this.player = this.add.container(400, 480);
        const body = this.add.rectangle(0, 0, 28, 36, skin.body).setStrokeStyle(2, skin.stroke);
        this.playerEyeL = this.add.circle(-6, -6, 4, skin.eye);
        this.playerEyeR = this.add.circle(6, -6, 4, skin.eye);
        this.playerPupilL = this.add.circle(-6, -6, 2, skin.pupil);
        this.playerPupilR = this.add.circle(6, -6, 2, skin.pupil);
        const mouth = this.add.rectangle(0, 6, 7, 2, skin.mouth);

        // Little gun perched on top of the blob, aiming straight up.
        const gunBase = this.add.rectangle(0, -22, 12, 5, 0x4a4a4a).setStrokeStyle(1, 0x111111);
        const gunBarrel = this.add.rectangle(0, -32, 5, 14, 0x6b6b6b).setStrokeStyle(1, 0x111111);
        this.gunMuzzle = this.add.rectangle(0, -40, 7, 4, 0xffd166).setStrokeStyle(1, 0x6b3a00);
        // Muzzle flash overlay — invisible until firing.
        this.muzzleFlash = this.add.circle(0, -42, 7, 0xfff04d, 0).setStrokeStyle(2, 0xff8a3a, 0);

        // Shield aura — hidden until the Shield power-up is active.
        this.shieldAura = this.add.circle(0, 0, 26, 0x06b6d4, 0.25).setStrokeStyle(2, 0x06b6d4, 0.95);
        this.shieldAura.setVisible(false);

        this.player.add([
            this.shieldAura,
            body, this.playerEyeL, this.playerEyeR, this.playerPupilL, this.playerPupilR, mouth,
            gunBase, gunBarrel, this.gunMuzzle, this.muzzleFlash
        ]);
        this.player.setSize(28, 36);
        this.player.setDepth(10);

        this.physics.world.enable(this.player);
        this.player.body.setAllowGravity(false);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(22, 30);
    }

    // ----- Boss -----
    spawnBoss(index) {
        const def = BOSSES[index];
        const burstScaled = def.burst;
        const fireDelayScaled = Math.max(220, def.fireDelay * this.difficulty.fireRateMul);
        const bulletSpeedScaled = def.bulletSpeed;
        const hpScaled = Math.max(8, Math.round(def.hp * this.difficulty.bossHpMul));
        const swaySpeedScaled = def.swaySpeed * this.difficulty.bossSpeedMul;

        this.boss = this.add.container(400, 120);
        const r = 38;
        const bossBody = this.add.circle(0, 0, r, def.color).setStrokeStyle(3, 0x000000, 0.5);
        const ring = this.add.circle(0, 0, r + 8, def.accent, 0).setStrokeStyle(2, def.accent, 0.6);
        const eyeWhite = this.add.circle(0, -4, 14, 0xffffff);
        const eyePupil = this.add.circle(0, -4, 7, 0x111111);
        const mouth = this.add.rectangle(0, 18, 18, 4, 0x111111);
        this.boss.add([ring, bossBody, eyeWhite, eyePupil, mouth]);
        this.boss.setSize(r * 2, r * 2);
        this.boss.setDepth(8);
        this.boss.eyePupil = eyePupil;
        this.boss.ring = ring;

        this.physics.world.enable(this.boss);
        this.boss.body.setAllowGravity(false);
        // Slightly forgiving hitbox so bullets feel like they hit the visible blob.
        this.boss.body.setSize(r * 1.7, r * 1.7);

        this.boss.def = def;
        this.boss.hp = hpScaled;
        this.boss.maxHp = hpScaled;
        this.boss.fireDelay = fireDelayScaled;
        this.boss.bulletSpeed = bulletSpeedScaled;
        this.boss.burst = burstScaled;
        this.boss.swaySpeed = swaySpeedScaled;
        this.boss.spawnTime = this.time.now;
        this.boss.phase = 1;
        this.boss.phase2HpThreshold = Math.ceil(hpScaled * 0.5);
        // Per-boss mechanic state flags (set/checked by the boss mechanic methods).
        this.boss.charging = false;
        this.boss.teleporting = false;
        this.boss.locked = false;
        this.boss.movementType = (index === 1) ? 'teleport' : 'sway';
        this.boss.spiralAngle = 0;
        // Sway-around-this-point for teleport-type bosses. Updated whenever the
        // boss teleports so motion between hops feels natural.
        this.boss.baseX = 400;
        this.boss.baseY = 120;

        // Ring pulse.
        this.tweens.add({
            targets: ring, scale: 1.12, alpha: 0.4,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        // Collisions are handled manually in update() (see checkCollisions) — more reliable
        // than physics.add.overlap for Container bodies with custom hitboxes.

        // Brief intro before the boss can fire.
        this.bossActive = false;
        this.showBossNameplate(def.name, index);
        this.time.delayedCall(1500, () => {
            if (this.gameOver) return;
            this.bossActive = true;
            this.bossFireEvent = this.time.addEvent({
                delay: this.boss.fireDelay, loop: true, callback: () => this.bossFire()
            });
            this.setupBossMechanics(index);
            if (this.runStartTime === 0) this.runStartTime = this.time.now;
        });

        this.refreshBossHpBar();
        this.bossLabel.setText(`Boss ${index + 1} / ${BOSSES.length}`);
        this.bossNameText.setText(def.name);
    }

    // Per-boss recurring mechanic timers. Each boss gets a distinct hazard layered
    // on top of its bullet pattern. Events are tracked so they can be cleared on
    // defeat / death without leaking timers.
    setupBossMechanics(index) {
        this.bossMechanicEvents = [];
        if (!this.minions) this.minions = [];
        if (!this.activeSweepLasers) this.activeSweepLasers = [];

        if (index === 0) {
            // Crimson Eye: telegraphed charge attack toward the player.
            this.bossMechanicEvents.push(this.time.addEvent({
                delay: 5500, loop: true, callback: () => this.bossCharge()
            }));
        } else if (index === 1) {
            // Aqua Shogun: teleports to a new position periodically (no sway).
            this.bossMechanicEvents.push(this.time.addEvent({
                delay: 3500, loop: true, callback: () => this.bossTeleport()
            }));
        } else if (index === 3) {
            // Storm Bolt: vertical sweep laser straight down from its current x.
            this.bossMechanicEvents.push(this.time.addEvent({
                delay: 6000, loop: true, callback: () => this.bossSweepLaser()
            }));
        }
        // Boss 2 (Boomshell): mortar pattern is handled entirely inside bossFire().
        // Boss 4 (Blob King): phase-2 spiral is handled inside bossFire().
    }

    clearBossMechanics() {
        if (this.bossMechanicEvents) {
            for (const e of this.bossMechanicEvents) e.remove();
            this.bossMechanicEvents = [];
        }
        if (this.minions) {
            for (const m of this.minions) {
                if (m && m.alive) { m.alive = false; m.destroy(); }
            }
            this.minions.length = 0;
        }
        if (this.activeSweepLasers) {
            for (const sw of this.activeSweepLasers) {
                sw.alive = false;
                if (sw.warning) { this.tweens.killTweensOf(sw.warning); sw.warning.destroy(); }
                if (sw.beam) { this.tweens.killTweensOf(sw.beam); sw.beam.destroy(); }
                if (sw.inner) sw.inner.destroy();
            }
            this.activeSweepLasers.length = 0;
        }
    }

    // ----- Mechanic: Charge (Boss 0 — Crimson Eye) -----
    bossCharge() {
        if (!this.boss || !this.bossActive || this.transitioning) return;
        if (this.boss.charging || this.boss.teleporting || this.boss.locked) return;

        const tel = this.add.text(this.boss.x, this.boss.y + 60, '⚠', {
            fontSize: '32px', color: '#ff3a3a', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);
        this.tweens.add({
            targets: tel, alpha: 0.3, duration: 150, yoyo: true, repeat: 3
        });
        sfx.warning();

        const targetX = Phaser.Math.Clamp(this.player.x, 60, 740);
        const targetY = Math.min(420, this.player.y);

        this.time.delayedCall(750, () => {
            tel.destroy();
            if (!this.boss || !this.bossActive) return;
            this.boss.charging = true;
            const DOWN_MS = 280, HOLD_MS = 180, RETURN_MS = 600;
            this.tweens.add({
                targets: this.boss, x: targetX, y: targetY,
                duration: DOWN_MS, ease: 'Cubic.in',
                onComplete: () => {
                    this.time.delayedCall(HOLD_MS, () => {
                        if (!this.boss) return;
                        this.tweens.add({
                            targets: this.boss, x: 400, y: 120,
                            duration: RETURN_MS, ease: 'Cubic.out'
                        });
                    });
                }
            });
            // Hard fallback: clear the charging flag even if killTweensOf cancels
            // the return tween mid-flight.
            this.time.delayedCall(DOWN_MS + HOLD_MS + RETURN_MS + 80, () => {
                if (this.boss) this.boss.charging = false;
            });
        });
    }

    // ----- Mechanic: Teleport (Boss 1 — Aqua Shogun) -----
    bossTeleport() {
        if (!this.boss || !this.bossActive || this.transitioning) return;
        if (this.boss.teleporting || this.boss.charging) return;

        this.boss.teleporting = true;
        const FADE_OUT_MS = 220;
        const FADE_IN_MS = 220;

        this.tweens.add({
            targets: this.boss, alpha: 0.1, scale: 0.65,
            duration: FADE_OUT_MS,
            onComplete: () => {
                if (!this.boss) return;
                const nx = Phaser.Math.Between(120, 680);
                const ny = Phaser.Math.Between(90, 200);
                this.boss.x = nx;
                this.boss.y = ny;
                // Sway re-anchors to the new landing spot.
                this.boss.baseX = nx;
                this.boss.baseY = ny;
                this.tweens.add({
                    targets: this.boss, alpha: 1, scale: 1,
                    duration: FADE_IN_MS
                });
            }
        });
        // Hard fallback: regardless of whether the tween onComplete fires (it can
        // get cancelled by killTweensOf in damageBoss / triggerPhase2), force the
        // teleporting flag to clear once the expected duration has elapsed.
        this.time.delayedCall(FADE_OUT_MS + FADE_IN_MS + 60, () => {
            if (this.boss) {
                this.boss.teleporting = false;
                // Make sure we're visible in case the fade-in got killed too.
                this.boss.setAlpha(1);
                this.boss.setScale(1);
            }
        });
    }

    // ----- Mechanic: Sweep laser (Boss 2 — Storm Bolt) -----
    bossSweepLaser() {
        if (!this.boss || !this.bossActive || this.transitioning) return;
        if (this.boss.locked || this.boss.charging || this.boss.teleporting) return;

        this.boss.locked = true;
        const x = this.boss.x;

        const warning = this.add.rectangle(x, 360, 3, 480, 0xfff04d, 0.7).setDepth(7);
        this.tweens.add({
            targets: warning, alpha: 0.2,
            duration: 150, yoyo: true, repeat: -1
        });
        sfx.warning();

        const sweep = { x, alive: true, warning, beam: null, inner: null, phase: 'warning' };
        this.activeSweepLasers.push(sweep);

        this.time.delayedCall(1200, () => {
            this.tweens.killTweensOf(warning);
            warning.destroy();
            sweep.warning = null;
            if (!this.boss || !sweep.alive) {
                sweep.alive = false;
                if (this.boss) this.boss.locked = false;
                return;
            }
            const beam = this.add.rectangle(x, 360, 22, 480, 0xfff04d).setStrokeStyle(2, 0xff8a3a, 0.9).setDepth(7);
            const inner = this.add.rectangle(x, 360, 8, 480, 0xffffff, 0.9).setDepth(8);
            this.tweens.add({
                targets: [beam, inner], scaleX: 1.15,
                duration: 90, yoyo: true, repeat: -1
            });
            sweep.beam = beam;
            sweep.inner = inner;
            sweep.phase = 'active';
            sfx.laserFire();

            this.time.delayedCall(1400, () => {
                sweep.alive = false;
                this.tweens.killTweensOf([beam, inner]);
                beam.destroy();
                inner.destroy();
                if (this.boss) this.boss.locked = false;
            });
        });
    }

    // ----- Mechanic: Minions (Boss 3 — Void Mauler) -----
    bossSpawnMinions() {
        if (!this.boss || !this.bossActive || this.transitioning) return;
        const MAX_MINIONS = 4;
        let alive = this.minions.filter(m => m.alive).length;
        for (let i = 0; i < 2 && alive < MAX_MINIONS; i++) {
            this.spawnMinion(i);
            alive++;
        }
    }

    spawnMinion(seedIdx) {
        const minion = this.add.container(this.boss.x, this.boss.y).setDepth(7);
        const body = this.add.circle(0, 0, 13, 0x9b3bff).setStrokeStyle(2, 0xff7ac4, 0.9);
        const eye = this.add.circle(0, -3, 4, 0xffffff);
        const pupil = this.add.circle(0, -3, 2, 0x111111);
        minion.add([body, eye, pupil]);
        minion.hp = 3;
        minion.alive = true;
        minion.spawnTime = this.time.now;
        minion.orbitOffset = (seedIdx * Math.PI) + Phaser.Math.FloatBetween(-0.5, 0.5);
        minion.setScale(0);
        this.tweens.add({ targets: minion, scale: 1, duration: 250, ease: 'Back.out' });
        this.minions.push(minion);
    }

    minionsFire() {
        if (this.transitioning || !this.bossActive) return;
        for (const m of this.minions) {
            if (!m || !m.alive) continue;
            const dx = this.player.x - m.x;
            const dy = this.player.y - m.y;
            const ang = Math.atan2(dy, dx);
            const speed = 200;
            const bx = m.x + Math.cos(ang) * 16;
            const by = m.y + Math.sin(ang) * 16;
            const bullet = this.add.circle(bx, by, 5, 0xff7ac4).setStrokeStyle(2, 0xffffff, 0.85);
            bullet.setDepth(8);
            bullet.vx = Math.cos(ang) * speed;
            bullet.vy = Math.sin(ang) * speed;
            this.bossBullets.push(bullet);
        }
    }

    // ----- Phase 2 enrage -----
    triggerPhase2() {
        this.boss.phase = 2;
        // Re-time the fire event for faster shooting.
        if (this.bossFireEvent) {
            this.bossFireEvent.remove();
            const newDelay = Math.max(180, this.boss.fireDelay * 0.6);
            this.bossFireEvent = this.time.addEvent({
                delay: newDelay, loop: true, callback: () => this.bossFire()
            });
        }
        this.boss.swaySpeed *= 1.3;

        // Only run the enrage scale pulse if the boss isn't mid-teleport / mid-charge.
        // Otherwise killTweensOf would cancel that scripted movement and leave the
        // state flag stuck on (boss freezes + stops firing).
        if (!this.boss.teleporting && !this.boss.charging) {
            this.tweens.killTweensOf(this.boss);
            this.tweens.add({
                targets: this.boss, scale: 1.18,
                duration: 180, yoyo: true, repeat: 2
            });
        }
        // Permanent red enrage tint on the ring.
        if (this.boss.ring) this.boss.ring.setStrokeStyle(3, 0xff3a3a, 1);

        const banner = this.add.text(400, 200, 'ENRAGED', {
            fontSize: '38px', color: '#ff3a3a', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(60).setAlpha(0);
        this.tweens.add({
            targets: banner, alpha: 1, duration: 200,
            onComplete: () => {
                this.time.delayedCall(900, () => {
                    this.tweens.add({
                        targets: banner, alpha: 0, duration: 350,
                        onComplete: () => banner.destroy()
                    });
                });
            }
        });
        this.cameras.main.shake(220, 0.012);
        sfx.warning();
    }

    showBossNameplate(name, index) {
        const banner = this.add.container(400, 240).setDepth(60);
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-220, -38, 440, 76, 14);
        bg.lineStyle(3, 0xff5e5e, 0.85);
        bg.strokeRoundedRect(-220, -38, 440, 76, 14);
        const tagText = this.add.text(0, -16, `Boss ${index + 1} / ${BOSSES.length}`, {
            fontSize: '14px', color: '#ffd166', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        const nameText = this.add.text(0, 12, name.toUpperCase(), {
            fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        banner.add([bg, tagText, nameText]);
        banner.setAlpha(0);
        this.tweens.add({
            targets: banner, alpha: 1, duration: 200, ease: 'Sine.out',
            onComplete: () => {
                this.time.delayedCall(900, () => {
                    this.tweens.add({
                        targets: banner, alpha: 0, duration: 300,
                        onComplete: () => banner.destroy()
                    });
                });
            }
        });
        sfx.blip(180, 0.18, 'sawtooth', 0.08);
    }

    // ----- HUD -----
    buildHUD() {
        const panel = this.add.graphics().setDepth(50);
        panel.fillStyle(0x000000, 0.55);
        panel.fillRoundedRect(8, 8, 280, 56, 10);
        panel.lineStyle(2, 0xffffff, 0.25);
        panel.strokeRoundedRect(8, 8, 280, 56, 10);

        this.bossLabel = this.add.text(20, 16, 'Boss 1 / 5', {
            fontSize: '13px', color: '#ffd166', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setDepth(51);
        this.bossNameText = this.add.text(20, 32, '', {
            fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setDepth(51);

        this.bossHpBarBg = this.add.graphics().setDepth(51);
        this.bossHpBarBg.fillStyle(0x000000, 0.5);
        this.bossHpBarBg.fillRoundedRect(120, 50, 160, 8, 4);
        this.bossHpBar = this.add.graphics().setDepth(52);

        // Right panel — lives + difficulty.
        const right = this.add.graphics().setDepth(50);
        right.fillStyle(0x000000, 0.55);
        right.fillRoundedRect(530, 8, 262, 56, 10);
        right.lineStyle(2, 0xffffff, 0.25);
        right.strokeRoundedRect(530, 8, 262, 56, 10);

        const livesLabel = this.maxLives === 1 ? 'ONE-SHOT' : 'LIVES';
        const livesColor = this.maxLives === 1 ? '#ff5e5e' : '#ffd1dc';
        this.add.text(542, 16, livesLabel, {
            fontSize: '13px', color: livesColor, fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setDepth(51);

        // Hearts — count matches difficulty (1 on insane, 3 otherwise).
        this.hearts = [];
        const heartStartX = 588;
        for (let i = 0; i < this.maxLives; i++) {
            const h = this.add.text(heartStartX + i * 22, 11, '❤', {
                fontSize: '22px', color: '#ff5e5e', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2
            }).setDepth(51);
            this.hearts.push(h);
        }
        // Pulse just the last heart so the "danger" cue scales sensibly with multi-life mode.
        if (this.hearts.length > 0) {
            this.tweens.add({
                targets: this.hearts[this.hearts.length - 1], scale: 1.1,
                duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut'
            });
        }

        this.add.text(542, 42, `Diff: ${this.difficulty.name}`, {
            fontSize: '12px', color: this.difficulty.color, fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setDepth(51);

        this.add.text(665, 42, 'WASD move • SPACE shoot', {
            fontSize: '11px', color: '#cfe4ff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5, 0).setDepth(51);

        this.muteHint = this.add.text(792, 72, sfx.isMuted() ? '🔇' : '🔊', {
            fontSize: '14px', color: '#ffffff'
        }).setOrigin(1, 0).setDepth(51);

        // Active power-up icons strip (top center, below the boss HP bar).
        this.effectIcons = {};
        const slotW = 34;
        const totalW = POWERUP_IDS.length * slotW;
        const startX = 400 - totalW / 2 + slotW / 2;
        POWERUP_IDS.forEach((id, i) => {
            const def = POWERUPS[id];
            const x = startX + i * slotW;
            const y = 82;
            const halo = this.add.circle(x, y, 13, def.color, 0.15)
                .setStrokeStyle(2, def.color, 0.4).setDepth(51);
            const icon = this.add.text(x, y, def.icon, { fontSize: '14px' })
                .setOrigin(0.5).setAlpha(0.35).setDepth(52);
            this.effectIcons[id] = { halo, icon };
        });
    }

    refreshBossHpBar() {
        if (!this.boss) return;
        this.bossHpBar.clear();
        const pct = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
        const color = Phaser.Display.Color.HexStringToColor(this.boss.def.hp_bar).color;
        this.bossHpBar.fillStyle(color, 1);
        this.bossHpBar.fillRoundedRect(120, 50, 160 * pct, 8, 4);
    }

    // ----- Main update loop -----
    update(time, delta) {
        if (this.gameOver || this.victory || this.isPaused) return;

        this.updateEffects(time);
        this.updatePlayer(time);
        this.updateBoss(time);
        this.moveBullets(delta);
        this.checkCollisions();
        this.checkLasers();
        this.checkSweepLasers();
        this.expirePowerups(time);
        this.cleanupBullets();
    }

    // Orbit the alive minions around the boss. Called from updateBoss.
    updateMinions(time) {
        if (!this.minions || !this.boss) return;
        for (const m of this.minions) {
            if (!m || !m.alive) continue;
            const t = (time - m.spawnTime) * 0.001;
            m.x = this.boss.x + Math.cos(t * 1.4 + m.orbitOffset) * 95;
            m.y = this.boss.y + 75 + Math.sin(t * 1.4 + m.orbitOffset) * 30;
        }
    }

    // Vertical sweep-laser collision (Storm Bolt mechanic).
    checkSweepLasers() {
        if (this.transitioning || this.gameOver || this.victory) return;
        if (!this.activeSweepLasers || this.activeSweepLasers.length === 0) return;
        const playerHitR = this.time.now < this.effects.tiny ? TINY_HIT_RADIUS : PLAYER_HIT_RADIUS;
        for (let i = this.activeSweepLasers.length - 1; i >= 0; i--) {
            const sw = this.activeSweepLasers[i];
            if (!sw.alive) { this.activeSweepLasers.splice(i, 1); continue; }
            if (sw.phase !== 'active') continue;
            const dx = Math.abs(this.player.x - sw.x);
            if (dx < 11 + playerHitR) {
                this.handleDeath();
                return;
            }
        }
    }

    // Refreshes per-frame visuals tied to active effects (scale, shield aura,
    // HUD icon brightness). Expiry handling is also done here so effects fade
    // exactly on their timestamp.
    updateEffects(time) {
        // Tiny: shrink player visual.
        const tinyActive = time < this.effects.tiny;
        const targetScale = tinyActive ? TINY_SCALE : 1;
        if (this.player.scaleX !== targetScale) this.player.setScale(targetScale);

        // I-frame blink after a non-lethal hit.
        if (time < this.invulnUntil) {
            this.player.setAlpha(Math.sin(time * 0.04) > 0 ? 0.3 : 1);
        } else if (this.player.alpha !== 1) {
            this.player.setAlpha(1);
        }

        // Shield aura visibility.
        this.shieldAura.setVisible(this.effects.shield > 0);

        // HUD icons.
        for (const id of POWERUP_IDS) {
            const icons = this.effectIcons[id];
            if (!icons) continue;
            const isShield = id === 'shield';
            const active = isShield ? this.effects.shield > 0 : time < this.effects[id];
            icons.halo.setAlpha(active ? 0.75 : 0.15);
            icons.halo.setStrokeStyle(2, POWERUPS[id].color, active ? 1 : 0.4);
            icons.icon.setAlpha(active ? 1 : 0.35);
        }
    }

    // ----- Lasers -----
    spawnLaser() {
        if (this.gameOver || this.victory || this.isPaused || this.transitioning) return;
        if (!this.bossActive) return;

        // Pick a y away from the screen edges and not directly on the player so they
        // have a chance to react before the beam locks in.
        let y;
        for (let attempt = 0; attempt < 6; attempt++) {
            y = Phaser.Math.Between(130, 540);
            if (Math.abs(y - this.player.y) > 60) break;
        }

        const laser = { y, phase: 'warning', alive: true };

        // Warning line — thin and blinking.
        const warning = this.add.rectangle(400, y, 800, 3, 0xff5e5e, 0.7);
        warning.setDepth(7);
        this.tweens.add({
            targets: warning, alpha: 0.15,
            duration: 150, yoyo: true, repeat: -1
        });

        // Edge arrow markers so it reads as a horizontal sweep.
        const markerL = this.add.text(18, y, '◀', {
            fontSize: '22px', color: '#ff5e5e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(8);
        const markerR = this.add.text(782, y, '▶', {
            fontSize: '22px', color: '#ff5e5e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(8);
        laser.warning = warning;
        laser.markers = [markerL, markerR];

        this.activeLasers.push(laser);
        sfx.warning();

        this.time.delayedCall(LASER_WARNING_MS, () => {
            if (!laser.alive) return;
            this.tweens.killTweensOf(laser.warning);
            laser.warning.destroy();
            laser.markers.forEach(m => m.destroy());

            // Active beam — thick red core with bright inner highlight.
            const beam = this.add.rectangle(400, y, 800, 20, 0xff3a3a).setStrokeStyle(2, 0xffd166, 0.9);
            beam.setDepth(7);
            const innerBeam = this.add.rectangle(400, y, 800, 8, 0xffffff, 0.9);
            innerBeam.setDepth(8);
            this.tweens.add({
                targets: [beam, innerBeam], scaleY: 1.15,
                duration: 90, yoyo: true, repeat: -1
            });
            laser.beam = beam;
            laser.innerBeam = innerBeam;
            laser.phase = 'active';
            sfx.laserFire();

            this.time.delayedCall(LASER_ACTIVE_MS, () => {
                if (!laser.alive) return;
                laser.alive = false;
                this.tweens.killTweensOf([beam, innerBeam]);
                beam.destroy();
                innerBeam.destroy();
            });
        });
    }

    checkLasers() {
        if (this.transitioning || this.gameOver || this.victory) return;
        const playerHitR = this.time.now < this.effects.tiny ? TINY_HIT_RADIUS : PLAYER_HIT_RADIUS;
        for (let i = this.activeLasers.length - 1; i >= 0; i--) {
            const l = this.activeLasers[i];
            if (!l.alive) { this.activeLasers.splice(i, 1); continue; }
            if (l.phase !== 'active') continue;
            const dy = Math.abs(this.player.y - l.y);
            if (dy < LASER_HIT_HALF_THICKNESS + playerHitR) {
                this.handleDeath();
                return;
            }
        }
    }

    clearLasers() {
        for (const l of this.activeLasers) {
            l.alive = false;
            if (l.warning) { this.tweens.killTweensOf(l.warning); l.warning.destroy(); }
            if (l.markers) l.markers.forEach(m => m.destroy());
            if (l.beam) { this.tweens.killTweensOf(l.beam); l.beam.destroy(); }
            if (l.innerBeam) l.innerBeam.destroy();
        }
        this.activeLasers.length = 0;
    }

    // ----- Power-ups -----
    spawnPowerup() {
        if (this.gameOver || this.victory || this.isPaused || this.transitioning) return;
        if (!this.bossActive) return;
        const x = Phaser.Math.Between(80, 720);
        const y = Phaser.Math.Between(220, 500);
        this.createPowerupAt(x, y, POWERUP_LIFETIME_MS, null);
        sfx.blip(880, 0.05, 'sine', 0.05);
    }

    // Boss-defeat drops live longer so the player has time to grab one.
    dropPowerupAt(x, y) {
        this.createPowerupAt(x, y, 15000, null);
    }

    createPowerupAt(x, y, lifetimeMs, forcedTypeId) {
        const typeId = forcedTypeId || Phaser.Utils.Array.GetRandom(POWERUP_IDS);
        const def = POWERUPS[typeId];

        const container = this.add.container(x, y).setDepth(7);
        const halo = this.add.circle(0, 0, 18, def.color, 0.3).setStrokeStyle(2, def.color, 0.9);
        const inner = this.add.circle(0, 0, 13, def.color, 0.55);
        const icon = this.add.text(0, 0, def.icon, {
            fontSize: '18px', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        container.add([halo, inner, icon]);

        container.typeId = typeId;
        container.alive = true;
        container.halo = halo;

        this.tweens.add({
            targets: container, y: y - 8,
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });
        this.tweens.add({
            targets: halo, scale: 1.25,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        this.time.delayedCall(lifetimeMs, () => {
            if (!container.alive) return;
            this.tweens.add({
                targets: container, alpha: 0, duration: 400,
                onComplete: () => this.destroyPowerup(container)
            });
        });

        this.powerups.push(container);
    }

    destroyPowerup(container) {
        container.alive = false;
        this.tweens.killTweensOf(container);
        if (container.halo) this.tweens.killTweensOf(container.halo);
        container.destroy();
    }

    clearPowerups() {
        for (const p of this.powerups) {
            if (p && p.alive) this.destroyPowerup(p);
        }
        this.powerups.length = 0;
    }

    activatePowerup(typeId) {
        const def = POWERUPS[typeId];
        if (typeId === 'shield') {
            this.effects.shield = 1;
            this.shieldAura.setVisible(true);
        } else {
            this.effects[typeId] = this.time.now + def.durationMs;
        }
        sfx.collect();
        this.showPickupToast(def);
    }

    showPickupToast(def) {
        const toast = this.add.text(this.player.x, this.player.y - 50, def.name.toUpperCase(), {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(60);
        this.tweens.add({
            targets: toast, y: toast.y - 24, alpha: 0,
            duration: 700, ease: 'Cubic.out',
            onComplete: () => toast.destroy()
        });
    }

    // Wipe expired timestamps so subsequent comparisons see them as inactive.
    expirePowerups(time) {
        for (const id of POWERUP_IDS) {
            if (id === 'shield') continue;
            if (this.effects[id] && time >= this.effects[id]) {
                this.effects[id] = 0;
            }
        }
    }

    moveBullets(delta) {
        const dt = delta / 1000;
        for (const b of this.playerBullets) {
            if (!b || !b.active) continue;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Wall bounce for bullets fired during the Bouncing buff.
            // Triggers a short distance inside the edge so the bullet stays visible.
            if (b.bouncy && b.bouncesLeft > 0) {
                let bounced = false;
                if (b.x < BOUNCE_MARGIN)      { b.x = BOUNCE_MARGIN;       b.vx =  Math.abs(b.vx); bounced = true; }
                else if (b.x > 800 - BOUNCE_MARGIN) { b.x = 800 - BOUNCE_MARGIN; b.vx = -Math.abs(b.vx); bounced = true; }
                if (b.y < BOUNCE_MARGIN)      { b.y = BOUNCE_MARGIN;       b.vy =  Math.abs(b.vy); bounced = true; }
                else if (b.y > 600 - BOUNCE_MARGIN) { b.y = 600 - BOUNCE_MARGIN; b.vy = -Math.abs(b.vy); bounced = true; }
                if (bounced) {
                    b.bouncesLeft -= 1;
                    b.rotation = Math.atan2(b.vy, b.vx) + Math.PI / 2;
                    sfx.blip(660, 0.03, 'square', 0.03);
                }
            }
        }
        const now = this.time.now;
        for (const b of this.bossBullets) {
            if (!b || !b.active) continue;
            if (b.mortar) {
                // Phase 1: flying.
                if (now < b.armAt) {
                    b.x += b.vx * dt;
                    b.y += b.vy * dt;
                    if (b.fuse) { b.fuse.x = b.x; b.fuse.y = b.y - 5; }
                    continue;
                }
                // Phase 2: armed — radius telegraph visible.
                if (!b.radiusIndicator) {
                    // Snap to exact target so the explosion lines up with the radius circle.
                    b.x = b.targetX;
                    b.y = b.targetY;
                    if (b.fuse) { b.fuse.x = b.x; b.fuse.y = b.y; }
                    b.radiusIndicator = this.add.circle(b.x, b.y, b.radius, 0xff3a3a, 0.18)
                        .setStrokeStyle(2, 0xff5e5e, 0.95).setDepth(7);
                    b.radiusInner = this.add.circle(b.x, b.y, b.radius * 0.45, 0xff5e5e, 0.3).setDepth(7);
                    this.tweens.add({
                        targets: b.radiusIndicator, alpha: 0.4,
                        duration: 220, yoyo: true, repeat: -1
                    });
                    this.tweens.add({
                        targets: b.fuse, scale: 1.8, alpha: 0.4,
                        duration: 120, yoyo: true, repeat: -1
                    });
                }
                // Phase 3: detonate.
                if (now >= b.detonateAt) this.detonateMortar(b);
                continue;
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        }
    }

    detonateMortar(b) {
        if (!b || !b.active) return;
        // AoE check against the player.
        const playerHitR = this.time.now < this.effects.tiny ? TINY_HIT_RADIUS : PLAYER_HIT_RADIUS;
        const dx = this.player.x - b.x;
        const dy = this.player.y - b.y;
        const reach = b.radius + playerHitR * 0.6;
        const hit = dx * dx + dy * dy < reach * reach;

        // Explosion visual.
        const flash = this.add.circle(b.x, b.y, b.radius * 1.15, 0xfff04d, 0.85).setDepth(11);
        this.tweens.add({
            targets: flash, scale: 1.35, alpha: 0,
            duration: 320, ease: 'Cubic.out',
            onComplete: () => flash.destroy()
        });
        for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
            const p = this.add.circle(b.x, b.y, 4, 0xff8a3a).setDepth(11);
            const reachOut = b.radius + Phaser.Math.Between(10, 40);
            this.tweens.add({
                targets: p,
                x: b.x + Math.cos(ang) * reachOut,
                y: b.y + Math.sin(ang) * reachOut,
                alpha: 0, duration: 380, ease: 'Cubic.out',
                onComplete: () => p.destroy()
            });
        }
        this.cameras.main.shake(140, 0.008);
        sfx.shieldHit();

        this.cleanupMortarVisuals(b);
        b.destroy();

        if (hit) this.handleDeath();
    }

    cleanupMortarVisuals(b) {
        if (b.fuse) { this.tweens.killTweensOf(b.fuse); b.fuse.destroy(); b.fuse = null; }
        if (b.radiusIndicator) { this.tweens.killTweensOf(b.radiusIndicator); b.radiusIndicator.destroy(); b.radiusIndicator = null; }
        if (b.radiusInner) { b.radiusInner.destroy(); b.radiusInner = null; }
    }

    // Manual circle-vs-circle hit detection.
    checkCollisions() {
        if (this.transitioning || this.gameOver || this.victory) return;
        if (!this.boss || !this.bossActive) return;

        const time = this.time.now;
        const playerHitR = time < this.effects.tiny ? TINY_HIT_RADIUS : PLAYER_HIT_RADIUS;

        // Power-up pickups.
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            if (!p || !p.alive) { this.powerups.splice(i, 1); continue; }
            const dx = p.x - this.player.x;
            const dy = p.y - this.player.y;
            if (dx * dx + dy * dy < (POWERUP_PICKUP_RADIUS + playerHitR) ** 2) {
                this.activatePowerup(p.typeId);
                this.destroyPowerup(p);
                this.powerups.splice(i, 1);
            }
        }

        // Player bullets → minions first (they're closer to the player), then boss.
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            if (!b || !b.active) { this.playerBullets.splice(i, 1); continue; }

            let consumed = false;
            if (this.minions && this.minions.length > 0) {
                for (const m of this.minions) {
                    if (!m || !m.alive) continue;
                    const mdx = b.x - m.x;
                    const mdy = b.y - m.y;
                    if (mdx * mdx + mdy * mdy < 17 * 17) {
                        m.hp -= (b.dmg || 1);
                        b.destroy();
                        this.playerBullets.splice(i, 1);
                        if (m.hp <= 0) {
                            m.alive = false;
                            this.tweens.add({
                                targets: m, scale: 0, alpha: 0, duration: 200,
                                onComplete: () => m.destroy()
                            });
                            sfx.collect();
                        } else {
                            sfx.blip(420, 0.03, 'square', 0.04);
                        }
                        consumed = true;
                        break;
                    }
                }
            }
            if (consumed) continue;

            const dx = b.x - this.boss.x;
            const dy = b.y - this.boss.y;
            if (dx * dx + dy * dy < BOSS_HIT_RADIUS * BOSS_HIT_RADIUS) {
                const dmg = b.dmg || 1;
                b.destroy();
                this.playerBullets.splice(i, 1);
                this.damageBoss(dmg);
                if (this.transitioning) return;
            }
        }

        // Boss body contact during a charge attack (Crimson Eye).
        if (this.boss.charging) {
            const cdx = this.boss.x - this.player.x;
            const cdy = this.boss.y - this.player.y;
            const r = BOSS_HIT_RADIUS + playerHitR;
            if (cdx * cdx + cdy * cdy < r * r) {
                this.handleDeath();
                return;
            }
        }

        // Boss bullets → player. One-shot (or absorbed by Shield).
        const now = this.time.now;
        for (let i = this.bossBullets.length - 1; i >= 0; i--) {
            const b = this.bossBullets[i];
            if (!b || !b.active) { this.bossBullets.splice(i, 1); continue; }
            // Mortars only do contact damage while flying. Once armed the AoE
            // handles damage at detonation, so brushing past an armed shell is safe.
            if (b.mortar && now >= b.armAt) continue;
            const dx = b.x - this.player.x;
            const dy = b.y - this.player.y;
            if (dx * dx + dy * dy < playerHitR * playerHitR) {
                if (b.mortar) this.cleanupMortarVisuals(b);
                b.destroy();
                this.bossBullets.splice(i, 1);
                this.handleDeath();
                return;
            }
        }
    }

    damageBoss(amount) {
        this.boss.hp -= amount;
        this.refreshBossHpBar();
        // Skip the hit-flash scale tween while a scripted-movement tween is running
        // (teleport / charge). killTweensOf would cancel them and strand their state flags.
        if (!this.boss.teleporting && !this.boss.charging) {
            this.tweens.killTweensOf(this.boss);
            this.tweens.add({ targets: this.boss, scale: 1.08, duration: 70, yoyo: true });
        }
        sfx.blip(540, 0.03, 'square', 0.04);

        // Phase 2 enrage at 50% HP.
        if (this.boss.phase === 1 && this.boss.hp > 0 && this.boss.hp <= this.boss.phase2HpThreshold) {
            this.triggerPhase2();
        }
        if (this.boss.hp <= 0) this.defeatBoss();
    }

    updatePlayer(time) {
        let vx = 0, vy = 0;
        if (this.keys.a.isDown) vx -= PLAYER_SPEED;
        if (this.keys.d.isDown) vx += PLAYER_SPEED;
        if (this.keys.w.isDown) vy -= PLAYER_SPEED;
        if (this.keys.s.isDown) vy += PLAYER_SPEED;
        // Normalize diagonals.
        if (vx !== 0 && vy !== 0) {
            const inv = 1 / Math.SQRT2;
            vx *= inv; vy *= inv;
        }
        this.player.body.setVelocity(vx, vy);

        const sniperActive = time < this.effects.sniper;
        const cooldown = sniperActive ? FIRE_COOLDOWN_MS * SNIPER_COOLDOWN_MUL : FIRE_COOLDOWN_MS;
        if (this.keys.space.isDown && time - this.lastFireTime > cooldown) {
            this.fireFromPlayer(time);
            this.lastFireTime = time;
        }
    }

    updateBoss(time) {
        if (!this.boss || !this.boss.active) return;
        // During scripted movement (charge/teleport/sweep lock), tweens drive position.
        if (this.boss.charging || this.boss.teleporting || this.boss.locked) {
            this.updateMinions(time);
            return;
        }
        const t = (time - this.boss.spawnTime) * 0.001;
        if (this.boss.movementType === 'teleport') {
            // Continuous sway around the teleport landing point so the boss feels
            // alive between hops. Sway range is smaller than the full-sway bosses.
            this.boss.x = this.boss.baseX + Math.sin(t * this.boss.swaySpeed * 0.9) * 50;
            this.boss.y = this.boss.baseY + Math.sin(t * 1.2) * 12;
        } else {
            this.boss.x = 400 + Math.sin(t * this.boss.swaySpeed) * this.boss.def.sway;
            this.boss.y = 120 + Math.sin(t * 1.4) * 14;
        }

        // Eye tracks the player.
        if (this.boss.eyePupil && this.player) {
            const dx = this.player.x - this.boss.x;
            const dy = this.player.y - this.boss.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            this.boss.eyePupil.x = (dx / len) * 4;
            this.boss.eyePupil.y = -4 + (dy / len) * 3;
        }

        this.updateMinions(time);
    }

    cleanupBullets() {
        const purgePlayer = (arr) => {
            for (let i = arr.length - 1; i >= 0; i--) {
                const b = arr[i];
                if (!b || !b.active) { arr.splice(i, 1); continue; }
                if (b.x < -30 || b.x > 830 || b.y < -30 || b.y > 630) {
                    b.destroy();
                    arr.splice(i, 1);
                }
            }
        };
        const purgeBoss = (arr) => {
            for (let i = arr.length - 1; i >= 0; i--) {
                const b = arr[i];
                if (!b || !b.active) { arr.splice(i, 1); continue; }
                // Armed/detonating mortars stay put even when their off-screen-flying
                // counterparts would be culled — only purge while they're still flying.
                const isStationaryMortar = b.mortar && this.time.now >= b.armAt;
                if (!isStationaryMortar && (b.x < -30 || b.x > 830 || b.y < -30 || b.y > 630)) {
                    if (b.mortar) this.cleanupMortarVisuals(b);
                    b.destroy();
                    arr.splice(i, 1);
                }
            }
        };
        purgePlayer(this.playerBullets);
        purgeBoss(this.bossBullets);
    }

    // ----- Shooting -----
    fireFromPlayer(time) {
        const shotgun = time < this.effects.shotgun;
        const sniper = time < this.effects.sniper;
        const bouncing = time < this.effects.bouncing;

        // Sniper rounds are bigger, brighter, and deal heavy damage. Shotgun rounds
        // just fan out three normal-speed rounds. Bouncing rounds get a pink tint.
        const dmg = sniper ? SNIPER_DAMAGE : 1;
        // Visual priorities: sniper > bouncing > base.
        const bulletColor = sniper ? 0xffd166 : (bouncing ? 0xff7ac4 : 0xc8ff70);
        const bulletStroke = sniper ? 0x8a4a00 : (bouncing ? 0x7c2d4a : 0x2a5f12);
        const bulletW = sniper ? 7 : 4;
        const bulletH = sniper ? 22 : 16;

        // Spawn at the gun's muzzle (top of the player container).
        // Scales with player size so Tiny mode still spawns at the visual muzzle.
        const muzzleOffset = 44 * this.player.scaleY;
        const bx = this.player.x;
        const by = this.player.y - muzzleOffset;

        const angles = shotgun
            ? [-SHOTGUN_SPREAD_RAD, 0, SHOTGUN_SPREAD_RAD]
            : [0];

        for (const ang of angles) {
            const bullet = this.add.rectangle(bx, by, bulletW, bulletH, bulletColor)
                .setStrokeStyle(1, bulletStroke);
            bullet.setDepth(9);
            // Aim is straight up plus a slight angular offset.
            const dir = ang - Math.PI / 2; // -PI/2 is straight up in screen coords
            bullet.vx = Math.cos(dir) * PLAYER_BULLET_SPEED;
            bullet.vy = Math.sin(dir) * PLAYER_BULLET_SPEED;
            bullet.rotation = dir + Math.PI / 2; // align bullet long-axis with travel direction
            bullet.dmg = dmg;
            if (bouncing) {
                bullet.bouncy = true;
                bullet.bouncesLeft = BOUNCE_MAX;
            }
            this.playerBullets.push(bullet);
        }

        // Muzzle flash pop.
        this.muzzleFlash.setAlpha(1);
        this.muzzleFlash.setStrokeStyle(2, 0xff8a3a, 1);
        this.tweens.killTweensOf(this.muzzleFlash);
        this.tweens.add({
            targets: this.muzzleFlash, alpha: 0, duration: 70,
            onComplete: () => { this.muzzleFlash.setStrokeStyle(2, 0xff8a3a, 0); }
        });

        sfx.blip(820, 0.03, 'square', 0.035);
    }

    bossFire() {
        if (!this.boss || !this.boss.active || !this.bossActive) return;
        if (this.gameOver || this.victory) return;
        // Bullets don't emit while the boss is mid-charge or mid-teleport.
        if (this.boss.charging || this.boss.teleporting) return;

        const speed = this.boss.bulletSpeed;
        const burst = this.boss.burst;
        const pattern = this.boss.def.pattern;

        const aimDx = this.player.x - this.boss.x;
        const aimDy = this.player.y - this.boss.y;
        const aim = Math.atan2(aimDy, aimDx);

        // Blob King phase 2 → spiral. Each shot advances the angle so a rotating
        // arm of bullets sweeps outward.
        if (this.boss.def.name === 'Blob King' && this.boss.phase === 2) {
            this.boss.spiralAngle += 0.45;
            for (let i = 0; i < burst; i++) {
                const ang = (i / burst) * Math.PI * 2 + this.boss.spiralAngle;
                this.spawnBossBullet(ang, speed);
            }
            sfx.blip(180, 0.06, 'sawtooth', 0.05);
            return;
        }

        // Boomshell: lob two mortars at flanking points around the player so they
        // can't just hold still. The mortars travel, stop, telegraph an explosion
        // radius, then detonate.
        if (pattern === 'mortar') {
            const flank = 70;
            const targets = [
                { x: Phaser.Math.Clamp(this.player.x - flank, 30, 770),
                  y: Phaser.Math.Clamp(this.player.y, 80, 560) },
                { x: Phaser.Math.Clamp(this.player.x + flank, 30, 770),
                  y: Phaser.Math.Clamp(this.player.y, 80, 560) }
            ];
            for (const t of targets) this.spawnMortar(t.x, t.y, speed);
            sfx.blip(150, 0.08, 'sawtooth', 0.06);
            return;
        }

        if (pattern === 'ring') {
            for (let i = 0; i < burst; i++) {
                const ang = (i / burst) * Math.PI * 2;
                this.spawnBossBullet(ang, speed);
            }
        } else if (pattern === 'cross') {
            for (let i = 0; i < 4; i++) {
                const ang = (i / 4) * Math.PI * 2;
                this.spawnBossBullet(ang, speed);
            }
        } else {
            // 'aimed' or 'spread' — fan around aim direction.
            const spread = pattern === 'spread' ? Math.PI / 2.4 : Math.PI / 5;
            for (let i = 0; i < burst; i++) {
                const t = burst === 1 ? 0 : (i / (burst - 1)) - 0.5;
                const ang = aim + t * spread;
                this.spawnBossBullet(ang, speed);
            }
        }
        sfx.blip(180, 0.06, 'sawtooth', 0.05);
    }

    spawnBossBullet(angle, speed) {
        const bx = this.boss.x + Math.cos(angle) * 40;
        const by = this.boss.y + Math.sin(angle) * 40;
        const color = this.boss.def.color;
        const bullet = this.add.circle(bx, by, 7, color).setStrokeStyle(2, 0xffffff, 0.85);
        bullet.setDepth(9);
        bullet.vx = Math.cos(angle) * speed;
        bullet.vy = Math.sin(angle) * speed;
        this.bossBullets.push(bullet);
    }

    // Lobbed explosive projectile (Boomshell). Phases:
    //   flying  → moves toward (targetX, targetY) for MORTAR_TRAVEL_MS
    //   arming  → snaps to target, paints a radius indicator, pulses for MORTAR_ARM_MS
    //   detonate → AoE-checks the player, plays an explosion, then is destroyed
    spawnMortar(targetX, targetY, speed) {
        const bx = this.boss.x;
        const by = this.boss.y + 18;
        const dx = targetX - bx;
        const dy = targetY - by;
        const dist = Math.max(1, Math.hypot(dx, dy));
        // Pick a travel speed that lands at the target in MORTAR_TRAVEL_MS regardless
        // of distance, so the explosion timing is predictable.
        const travelSec = MORTAR_TRAVEL_MS / 1000;
        const v = dist / travelSec;

        const bullet = this.add.circle(bx, by, 9, 0xff7a3a).setStrokeStyle(2, 0xffd166, 0.95);
        bullet.setDepth(9);
        bullet.vx = (dx / dist) * v;
        bullet.vy = (dy / dist) * v;
        bullet.mortar = true;
        bullet.armAt = this.time.now + MORTAR_TRAVEL_MS;
        bullet.detonateAt = bullet.armAt + MORTAR_ARM_MS;
        bullet.radius = MORTAR_RADIUS;
        bullet.targetX = targetX;
        bullet.targetY = targetY;
        bullet.radiusIndicator = null;
        bullet.radiusInner = null;
        // Bright fuse on top of the shell.
        bullet.fuse = this.add.circle(bx, by - 5, 3, 0xfff04d, 1).setDepth(10);

        this.bossBullets.push(bullet);
    }

    // ----- Defeat / advance / death -----
    defeatBoss() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.bossActive = false;
        if (this.bossFireEvent) { this.bossFireEvent.remove(); this.bossFireEvent = null; }
        this.clearBossMechanics();

        // Sweep boss bullets so the player isn't punished mid-celebration.
        for (const b of this.bossBullets) {
            if (b && b.active) {
                if (b.mortar) this.cleanupMortarVisuals(b);
                b.destroy();
            }
        }
        this.bossBullets.length = 0;

        const boss = this.boss;
        const dropX = boss.x;
        const dropY = boss.y;

        // Explosion: scale up, fade out.
        this.tweens.add({
            targets: boss, scale: 1.5, alpha: 0, duration: 600, ease: 'Cubic.in',
            onComplete: () => boss.destroy()
        });
        // Particle ring.
        for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2;
            const p = this.add.circle(boss.x, boss.y, 6, boss.def.accent);
            this.tweens.add({
                targets: p, x: boss.x + Math.cos(ang) * 220, y: boss.y + Math.sin(ang) * 220,
                alpha: 0, duration: 700, ease: 'Cubic.out',
                onComplete: () => p.destroy()
            });
        }
        sfx.collect();
        sfx.blip(880, 0.2, 'square', 0.08);

        // Guaranteed power-up drop, unless this defeat ends the run.
        const isFinalDefeat =
            this.practiceBossIndex !== null ||
            this.bossIndex + 1 >= BOSSES.length;
        if (!isFinalDefeat) {
            const dropClampedY = Phaser.Math.Clamp(dropY, 180, 500);
            this.dropPowerupAt(dropX, dropClampedY);
        }

        this.time.delayedCall(900, () => {
            // Practice mode: defeating the chosen boss ends the run as a win.
            if (this.practiceBossIndex !== null) {
                this.handleVictory();
                return;
            }
            this.bossIndex += 1;
            if (this.bossIndex >= BOSSES.length) {
                this.handleVictory();
            } else {
                this.transitioning = false;
                this.spawnBoss(this.bossIndex);
            }
        });
    }

    handleDeath() {
        if (this.gameOver) return;
        // I-frames after a non-lethal hit suppress damage so a wall of bullets
        // can't drain all lives in one frame.
        if (this.time.now < this.invulnUntil) return;

        // Shield absorbs the hit and pops with a flash. Doesn't cost a life.
        if (this.effects.shield > 0) {
            this.effects.shield = 0;
            this.shieldAura.setVisible(false);
            this.cameras.main.flash(150, 100, 220, 240, true);
            const aura = this.add.circle(this.player.x, this.player.y, 24, 0x06b6d4, 0.6)
                .setStrokeStyle(3, 0x67e8f9, 1).setDepth(11);
            this.tweens.add({
                targets: aura, scale: 2.2, alpha: 0, duration: 350,
                onComplete: () => aura.destroy()
            });
            this.invulnUntil = this.time.now + HIT_INVULN_MS;
            sfx.shieldHit();
            return;
        }

        this.lives -= 1;
        this.updateHeartsUI();

        if (this.lives > 0) {
            // Took a hit but still alive — invuln frames + visual feedback.
            this.invulnUntil = this.time.now + HIT_INVULN_MS;
            this.cameras.main.shake(220, 0.014);
            this.cameras.main.flash(120, 255, 80, 80, true);
            sfx.shieldHit();
            return;
        }

        // Out of lives — real death.
        this.gameOver = true;
        if (this.bossFireEvent) { this.bossFireEvent.remove(); this.bossFireEvent = null; }
        if (this.laserEvent) { this.laserEvent.remove(); this.laserEvent = null; }
        if (this.powerupEvent) { this.powerupEvent.remove(); this.powerupEvent = null; }
        this.clearBossMechanics();
        this.clearLasers();
        this.clearPowerups();
        this.player.body.setVelocity(0, 0);
        for (const h of this.hearts) {
            this.tweens.killTweensOf(h);
            this.tweens.add({ targets: h, alpha: 0.2, scale: 0.7, duration: 300 });
        }
        this.tweens.add({ targets: this.player, alpha: 0, scale: 0.2, duration: 500 });
        this.cameras.main.shake(220, 0.015);
        sfx.death();

        this.showEndPanel(false);
    }

    updateHeartsUI() {
        for (let i = 0; i < this.maxLives; i++) {
            const h = this.hearts[i];
            if (!h) continue;
            const alive = i < this.lives;
            h.setAlpha(alive ? 1 : 0.15);
            if (!alive) this.tweens.killTweensOf(h);
        }
    }

    handleVictory() {
        this.victory = true;
        if (this.laserEvent) { this.laserEvent.remove(); this.laserEvent = null; }
        if (this.powerupEvent) { this.powerupEvent.remove(); this.powerupEvent = null; }
        this.clearBossMechanics();
        this.clearLasers();
        this.clearPowerups();

        // Compute clear time + commit to high score if it's a new best.
        const elapsed = this.runStartTime > 0 ? this.time.now - this.runStartTime : 0;
        const key = this.practiceBossIndex !== null
            ? `attackBest_boss${this.practiceBossIndex}_${this.difficultyId}`
            : `attackBest_full_${this.difficultyId}`;
        const prev = Number(localStorage.getItem(key) || 0);
        let newBest = false;
        if (elapsed > 0 && (prev === 0 || elapsed < prev)) {
            localStorage.setItem(key, String(elapsed));
            newBest = true;
        }
        this.lastRunMs = elapsed;
        this.lastRunNewBest = newBest;
        this.lastRunPrevBest = prev;

        sfx.achievement();
        this.showEndPanel(true);
    }

    showEndPanel(isWin) {
        const overlay = this.add.graphics().setDepth(80);
        overlay.fillStyle(0x000000, 0.65);
        overlay.fillRect(0, 0, 800, 600);

        const headline = isWin ? 'VICTORY' : 'DEFEATED';
        let sub;
        if (isWin) {
            if (this.practiceBossIndex !== null) {
                sub = `Practice — ${BOSSES[this.practiceBossIndex].name} cleared on ${this.difficulty.name}.`;
            } else {
                sub = `You bested all ${BOSSES.length} bosses on ${this.difficulty.name}.`;
            }
        } else {
            sub = `Boss ${this.bossIndex + 1} / ${BOSSES.length}: ${BOSSES[this.bossIndex].name}`;
        }

        this.add.text(400, 210, headline, {
            fontSize: '56px', color: isWin ? '#ffd166' : '#ff5e5e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(81);

        this.add.text(400, 270, sub, {
            fontSize: '16px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(81);

        // Time display on victory.
        if (isWin && this.lastRunMs > 0) {
            const timeStr = AttackScene.formatMs(this.lastRunMs);
            const timeLabel = this.lastRunNewBest
                ? `Clear ${timeStr}  •  NEW BEST!`
                : (this.lastRunPrevBest > 0
                    ? `Clear ${timeStr}  •  Best ${AttackScene.formatMs(this.lastRunPrevBest)}`
                    : `Clear ${timeStr}`);
            this.add.text(400, 300, timeLabel, {
                fontSize: '16px',
                color: this.lastRunNewBest ? '#ffd166' : '#cfe4ff',
                fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(81);
        }

        const retry = this.add.text(400, 360, '[ R ] Retry', {
            fontSize: '22px', color: '#9be7ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(81).setInteractive({ useHandCursor: true });
        retry.on('pointerdown', () => this.scene.restart());

        const menu = this.add.text(400, 405, '[ M ] Menu', {
            fontSize: '20px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(81).setInteractive({ useHandCursor: true });
        menu.on('pointerdown', () => this.scene.start('AttackMenuScene'));

        const title = this.add.text(400, 450, '[ T ] Title', {
            fontSize: '18px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(81).setInteractive({ useHandCursor: true });
        title.on('pointerdown', () => this.scene.start('TitleScene'));

        this.input.keyboard.once('keydown-R', () => this.scene.restart());
        // Use 'B' for back-to-menu so it doesn't collide with the mute key (M).
        this.input.keyboard.once('keydown-B', () => this.scene.start('AttackMenuScene'));
        this.input.keyboard.once('keydown-T', () => this.scene.start('TitleScene'));
    }

    // Format ms as M:SS.mm (e.g. 1:23.45).
    static formatMs(ms) {
        const totalSec = ms / 1000;
        const m = Math.floor(totalSec / 60);
        const s = totalSec - m * 60;
        const sStr = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
        return m > 0 ? `${m}:${sStr}` : `0:${sStr}`;
    }

    // ----- Pause -----
    togglePause() {
        if (this.gameOver || this.victory) return;
        if (this.isPaused) {
            this.physics.world.resume();
            this.time.paused = false;
            this.isPaused = false;
            if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
            if (this.pauseText) { this.pauseText.destroy(); this.pauseText = null; }
        } else {
            this.physics.world.pause();
            this.time.paused = true;
            this.isPaused = true;
            this.pauseOverlay = this.add.graphics().setDepth(80);
            this.pauseOverlay.fillStyle(0x000000, 0.55);
            this.pauseOverlay.fillRect(0, 0, 800, 600);
            this.pauseText = this.add.text(400, 300, 'PAUSED\nP or ESC to resume', {
                fontSize: '28px', color: '#ffffff', fontStyle: 'bold', align: 'center',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(81);
        }
        sfx.pause();
    }
}
