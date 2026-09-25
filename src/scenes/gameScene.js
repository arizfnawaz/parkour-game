import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { achievements, SKINS, loadSkin } from '../achievements.js';

const SKY_BANDS = [
    { top: 0x6ec6ff, bottom: 0xbfe9ff, fade: 1.00, stars: 0 },
    { top: 0x4f9bd6, bottom: 0xa8d1ec, fade: 0.85, stars: 0 },
    { top: 0xff9b6b, bottom: 0xffd1a3, fade: 0.55, stars: 0 },
    { top: 0x6649a8, bottom: 0xff8c6b, fade: 0.30, stars: 0.4 },
    { top: 0x1c1c4a, bottom: 0x483a78, fade: 0.10, stars: 0.85 },
    { top: 0x05050f, bottom: 0x1a0828, fade: 0.00, stars: 1.0 }
];

const PLATFORM_COLORS = {
    normal:        0xb7d7a8,
    blueSlide:     0x1e88ff,
    brownBreak:    0x8b4513,
    purpleFloat:   0x8e44ad,
    redDrop:       0xe74c3c,
    greenBounce:   0x2ecc71,
    crackedBroken: 0x9ca3af,
    ice:           0x9be7ff,
    conveyor:      0xfb923c
};

const PLATFORM_ICONS = {
    blueSlide:   '↔',
    brownBreak:  'X',
    purpleFloat: '↕',
    redDrop:     '↓',
    greenBounce: '↑',
    ice:         '≈'
};

// Difficulty tiering. As the player climbs, harder platform types appear,
// and spikes / powerups gradually become possible.
//   Beginner     (tier 0): height < 900   — only easy + normal, no spikes, no powerups
//   Intermediate (tier 1): height < 2400  — medium types unlocked, spikes + powerups begin
//   Advanced     (tier 2): height < 4500  — hard types added
//   Expert       (tier 3): height ≥ 4500  — full mix, hard types dominate
const TIER_HEIGHT_THRESHOLDS = [900, 2400, 4500];
const TIER_NAMES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const TIER_COLORS = ['#a0e8a0', '#9be7ff', '#ffd166', '#ff9b9b'];

// Weighted spawn tables per tier. Normal stays fixed at 25% across all tiers.
// Easy types: blueSlide, greenBounce, conveyor.
// Medium:     brownBreak, purpleFloat, ice.
// Hard:       redDrop,    crackedBroken.
const TIER_WEIGHTS = [
    // Beginner: 25% normal + 75% easy
    { normal: 25, blueSlide: 25, greenBounce: 25, conveyor: 25 },
    // Intermediate: 25% normal + 35% easy + 40% medium
    { normal: 25, blueSlide: 12, greenBounce: 12, conveyor: 11, brownBreak: 14, purpleFloat: 13, ice: 13 },
    // Advanced: 25% normal + 20% easy + 35% medium + 20% hard
    { normal: 25, blueSlide: 7, greenBounce: 7, conveyor: 6, brownBreak: 12, purpleFloat: 12, ice: 11, redDrop: 10, crackedBroken: 10 },
    // Expert: 25% normal + 10% easy + 30% medium + 35% hard
    { normal: 25, blueSlide: 4, greenBounce: 3, conveyor: 3, brownBreak: 10, purpleFloat: 10, ice: 10, redDrop: 18, crackedBroken: 17 }
];

const SPIKE_CHANCE_BY_TIER   = [0, 0.05, 0.09, 0.13];
const POWERUP_CHANCE_BY_TIER = [0, 0.12, 0.18, 0.22];

function tierForHeight(h) {
    for (let i = 0; i < TIER_HEIGHT_THRESHOLDS.length; i++) {
        if (h < TIER_HEIGHT_THRESHOLDS[i]) return i;
    }
    return TIER_HEIGHT_THRESHOLDS.length;
}

function pickWeighted(weights) {
    let total = 0;
    for (const k in weights) total += weights[k];
    let roll = Math.random() * total;
    for (const k in weights) {
        if (roll < weights[k]) return k;
        roll -= weights[k];
    }
    return 'normal';
}

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // --- Game state ---
        this.gameOver = false;
        this.isPaused = false;
        this.platformSpacing = 50;
        this.nextPlatformY = -3000;
        this.baseJumpVelocity = -450;
        this.horizontalSpeed = 220;
        this.lastGrounded = false;
        this.skyBandIndex = -1;

        this.skinId = loadSkin();
        this.highScore = Number(localStorage.getItem('parkourHighScore') || 0);
        this.height = 0;
        this.score = 0;
        this.lastHeightForScore = 0;
        this.difficulty = 0;

        // Combo state.
        this.combo = 0;
        this.maxCombo = 0;
        // Initialised after the player is created in buildPlayer().
        this.lastComboLandY = 0;

        // Dash state.
        this.dashAvailable = true;
        this.lastDashTime = -10000;

        // Run stats (for achievements).
        this.runPowerupCount = 0;
        this.runBounceCount = 0;
        this.invulnerableUntil = 0;
        this.shieldCharges = 0;

        // Wind state.
        this.windDirection = 0;
        this.windUntil = 0;

        // Conveyor direction we're standing on.
        this.groundConveyorDir = 0;

        this.doublePointsMultiplier = 1;
        this.activeEffects = {
            dimensionRift: 0,
            doublePoints: 0,
            magnet: 0,
            jetpack: 0
        };

        sfx.init();

        this.physics.world.setBounds(0, -500000, 800, 500600);
        this.physics.world.timeScale = 1;

        this.buildBackground();
        this.buildPlayer();

        this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.powerups = this.physics.add.group({ allowGravity: false, immovable: true });
        this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });

        this.groundPlatformType = null;

        this.createPlatform(400, 580, 200, 'normal');
        for (let i = 0; i < 65; i++) {
            const y = 500 - (i * this.platformSpacing);
            this.spawnProceduralPlatform(y);
        }

        this.physics.add.collider(this.player, this.platforms, this.handlePlatformCollision, null, this);
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleCollision, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            shift: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
        };

        this.input.keyboard.on('keydown-P', () => this.togglePause());
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-M', () => {
            sfx.toggle();
            sfx.blip(440, 0.05, 'square', 0.06);
            this.muteHint.setText(sfx.isMuted() ? '🔇' : '🔊');
        });

        this.buildHUD();

        this.jumpCount = 0;
        this.sceneStartTime = this.time.now;
        this.horizontalArrowEvent = null;
        this.warningDropEvent = null;
        this.laserEvent = null;
        this.windEvent = null;

        this.enableObstacleMode();
        this.refreshSky();

        // Achievement banner queue.
        this.banners = [];

        this.time.delayedCall(60000, () => {
            if (!this.gameOver) this.tryUnlock('survivor60');
        });
    }

    buildBackground() {
        this.skyBg = this.add.graphics().setScrollFactor(0).setDepth(-100);
        this.starsBg = this.add.graphics().setScrollFactor(0).setDepth(-99);
        this.starsBg.setAlpha(0);
        this.starsDrawn = false;

        this.farMountains = this.add.graphics().setScrollFactor(0, 0.18).setDepth(-90);
        this.drawMountains(this.farMountains, 0x668fb0, 50, 90, 60, 220);

        this.midMountains = this.add.graphics().setScrollFactor(0, 0.35).setDepth(-80);
        this.drawMountains(this.midMountains, 0x40607a, 70, 130, 50, 240);

        this.clouds = this.add.graphics().setScrollFactor(0, 0.5).setDepth(-70);
        this.drawClouds(this.clouds, 60);
    }

    drawMountains(g, color, minH, maxH, rows, rowSpacing) {
        g.clear();
        g.fillStyle(color, 1);
        for (let r = 0; r < rows; r++) {
            const baseY = 600 - r * rowSpacing;
            for (let i = 0; i < 5; i++) {
                const x = i * 200 + Phaser.Math.Between(-30, 30);
                const h = Phaser.Math.Between(minH, maxH);
                g.beginPath();
                g.moveTo(x - 90, baseY);
                g.lineTo(x, baseY - h);
                g.lineTo(x + 90, baseY);
                g.closePath();
                g.fillPath();
            }
        }
    }

    drawClouds(g, count) {
        g.clear();
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(-50, 850);
            const y = Phaser.Math.Between(-14000, 600);
            const alpha = Phaser.Math.FloatBetween(0.55, 0.9);
            g.fillStyle(0xffffff, alpha);
            g.fillCircle(x, y, 22);
            g.fillCircle(x + 22, y + 5, 26);
            g.fillCircle(x + 44, y, 20);
            g.fillCircle(x + 60, y + 4, 16);
        }
    }

    drawStars() {
        this.starsBg.clear();
        for (let i = 0; i < 110; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
            const r = Phaser.Math.FloatBetween(0.5, 1.7);
            const a = Phaser.Math.FloatBetween(0.5, 1);
            this.starsBg.fillStyle(0xffffff, a);
            this.starsBg.fillCircle(x, y, r);
        }
        this.starsDrawn = true;
    }

    refreshSky() {
        const idx = Phaser.Math.Clamp(Math.floor(this.difficulty / 2), 0, SKY_BANDS.length - 1);
        if (idx === this.skyBandIndex) return;
        this.skyBandIndex = idx;

        const band = SKY_BANDS[idx];
        this.skyBg.clear();
        const top = Phaser.Display.Color.IntegerToColor(band.top);
        const bot = Phaser.Display.Color.IntegerToColor(band.bottom);
        const stripes = 36;
        const stripeH = Math.ceil(600 / stripes) + 1;
        for (let i = 0; i < stripes; i++) {
            const t = i / (stripes - 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, 1, t);
            this.skyBg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            this.skyBg.fillRect(0, i * (600 / stripes), 800, stripeH);
        }

        if (band.stars > 0 && !this.starsDrawn) this.drawStars();
        this.tweens.add({ targets: this.starsBg, alpha: band.stars, duration: 1500 });
        this.tweens.add({
            targets: [this.farMountains, this.midMountains, this.clouds],
            alpha: band.fade,
            duration: 1500
        });
    }

    buildPlayer() {
        const skin = SKINS[this.skinId] || SKINS.yellow;

        this.player = this.add.container(400, 550);
        const body = this.add.rectangle(0, 0, 30, 40, skin.body).setStrokeStyle(2, skin.stroke);
        this.playerEyeL = this.add.circle(-7, -7, 4, skin.eye);
        this.playerEyeR = this.add.circle(7, -7, 4, skin.eye);
        this.playerPupilL = this.add.circle(-7, -7, 2, skin.pupil);
        this.playerPupilR = this.add.circle(7, -7, 2, skin.pupil);
        const mouth = this.add.rectangle(0, 7, 8, 2, skin.mouth);
        this.player.add([body, this.playerEyeL, this.playerEyeR, this.playerPupilL, this.playerPupilR, mouth]);
        this.player.setSize(30, 40);
        this.player.setDepth(10);

        this.physics.world.enable(this.player);
        this.player.body.setBounce(0.05);
        this.player.body.setCollideWorldBounds(false);
        this.lastComboLandY = this.player.y;

        // Shield aura ring (hidden until shield active).
        this.shieldAura = this.add.circle(0, 0, 26, 0x06b6d4, 0.25);
        this.shieldAura.setStrokeStyle(2, 0x06b6d4, 0.9);
        this.shieldAura.setVisible(false);
        this.shieldAura.setDepth(9);
    }

    buildHUD() {
        // Left panel.
        const leftPanel = this.add.graphics().setScrollFactor(0).setDepth(50);
        leftPanel.fillStyle(0x000000, 0.45);
        leftPanel.fillRoundedRect(8, 8, 240, 170, 10);
        leftPanel.lineStyle(2, 0xffffff, 0.25);
        leftPanel.strokeRoundedRect(8, 8, 240, 170, 10);

        // Right panel (effects + dash).
        const rightPanel = this.add.graphics().setScrollFactor(0).setDepth(50);
        rightPanel.fillStyle(0x000000, 0.45);
        rightPanel.fillRoundedRect(540, 8, 252, 192, 10);
        rightPanel.lineStyle(2, 0xffffff, 0.25);
        rightPanel.strokeRoundedRect(540, 8, 252, 192, 10);

        const lbl = (color, size = 20) => ({
            fontSize: `${size}px`, color, fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        });

        this.scoreText      = this.add.text(20, 14, 'Score: 0',     lbl('#ffffff', 24)).setScrollFactor(0).setDepth(51);
        this.heightText     = this.add.text(20, 50, 'Height: 0',    lbl('#ffffff')).setScrollFactor(0).setDepth(51);
        this.highScoreText  = this.add.text(20, 80, `High: ${this.highScore}`, lbl('#ffd166')).setScrollFactor(0).setDepth(51);
        this.diffText       = this.add.text(20, 110, 'Difficulty: 0', lbl('#9be7ff')).setScrollFactor(0).setDepth(51);
        this.comboText      = this.add.text(20, 140, 'Combo: --',   lbl('#ff9bbf')).setScrollFactor(0).setDepth(51);

        this.dashText           = this.add.text(552, 14, 'Dash: READY',     lbl('#a0e8a0')).setScrollFactor(0).setDepth(51);
        this.shieldText         = this.add.text(552, 42, 'Shield: --',      lbl('#06b6d4')).setScrollFactor(0).setDepth(51);
        this.magnetText         = this.add.text(552, 70, 'Magnet: --',      lbl('#fcd34d')).setScrollFactor(0).setDepth(51);
        this.jetpackText        = this.add.text(552, 98, 'Jetpack: --',     lbl('#fb7185')).setScrollFactor(0).setDepth(51);
        this.riftTimerText      = this.add.text(552, 126, 'Rift: --',       lbl('#9be7ff')).setScrollFactor(0).setDepth(51);
        this.doublePointsTimerText = this.add.text(552, 154, '2x Points: --', lbl('#ffd166')).setScrollFactor(0).setDepth(51);

        this.muteHint = this.add.text(792, 212, sfx.isMuted() ? '🔇' : '🔊', {
            fontSize: '18px'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(51);

        this.gameOverText = this.add.text(400, 300, '', {
            fontSize: '40px', color: '#ffffff', align: 'center',
            stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

        // Pause overlay.
        this.pauseOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(150).setVisible(false);
        const pBg = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        const pTitle = this.add.text(400, 250, 'PAUSED', {
            fontSize: '64px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#1f3a68', strokeThickness: 6
        }).setOrigin(0.5);
        const pHint = this.add.text(400, 330, 'Press P or ESC to resume', {
            fontSize: '22px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        this.pauseOverlay.add([pBg, pTitle, pHint]);
    }

    update() {
        if (this.gameOver || this.isPaused) return;

        const now = this.time.now;

        // --- Movement ---
        let movingX = 0;
        if (this.cursors.left.isDown || this.keys.a.isDown) movingX = -1;
        else if (this.cursors.right.isDown || this.keys.d.isDown) movingX = 1;

        const onIce = this.groundPlatformType === 'ice';
        if (movingX !== 0) {
            this.player.body.setVelocityX(movingX * this.horizontalSpeed);
        } else if (!onIce) {
            this.player.body.setVelocityX(0);
        }
        // Ice: no friction — preserve current velocity when no key pressed.

        // Conveyor adds to whatever velocity the input set.
        if (this.groundPlatformType === 'conveyor' && this.groundConveyorDir !== 0) {
            const conveyorSpeed = 110;
            this.player.body.setVelocityX(this.player.body.velocity.x + this.groundConveyorDir * conveyorSpeed);
        }

        // Wind gust push.
        if (this.windUntil > now) {
            const windPush = 90;
            this.player.body.setVelocityX(this.player.body.velocity.x + this.windDirection * windPush);
        }

        // Pupils tilt toward movement direction.
        this.playerPupilL.x = -7 + movingX * 1.5;
        this.playerPupilR.x = 7 + movingX * 1.5;

        // --- Grounded transition ---
        const isGrounded = this.player.body.touching.down || this.player.body.blocked.down;
        if (!isGrounded) {
            this.groundPlatformType = null;
            this.groundConveyorDir = 0;
        }

        if (isGrounded && !this.lastGrounded) {
            this.jumpCount = 0;
            this.dashAvailable = true;
            this.spawnLandDust(this.player.x, this.player.y + 20);
            this.tweens.killTweensOf(this.player);
            this.player.rotation = 0;

            sfx.land();
            this.handleComboOnLand();

            if (this.groundPlatformType === 'greenBounce') {
                this.player.body.setVelocityY(-720);
                this.player.scaleX = 0.7;
                this.player.scaleY = 1.4;
                this.spawnLandDust(this.player.x, this.player.y + 20);
                sfx.bounce();
                this.runBounceCount += 1;
                if (this.runBounceCount >= 10) this.tryUnlock('bounce10');
            } else {
                this.player.scaleX = 1.3;
                this.player.scaleY = 0.7;
            }

            this.tweens.add({
                targets: this.player,
                scaleX: 1, scaleY: 1,
                duration: 130,
                ease: 'Sine.out'
            });
        }
        this.lastGrounded = isGrounded;

        // --- Jump ---
        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.w);
        const maxJumps = 2;
        if (jumpPressed && this.jumpCount < maxJumps) {
            this.player.body.setVelocityY(this.baseJumpVelocity);

            this.tweens.killTweensOf(this.player);
            this.player.scaleX = 0.85;
            this.player.scaleY = 1.2;
            this.tweens.add({
                targets: this.player,
                scaleX: 1, scaleY: 1,
                duration: 220,
                ease: 'Sine.out'
            });

            if (this.jumpCount === 0) {
                sfx.jump();
                this.tryUnlock('firstJump');
            } else if (this.jumpCount === 1) {
                sfx.doubleJump();
                this.tryUnlock('firstFlip');
                const dir = movingX >= 0 ? 1 : -1;
                this.player.rotation = 0;
                this.tweens.add({
                    targets: this.player,
                    rotation: dir * Math.PI * 2,
                    duration: 380,
                    ease: 'Cubic.out',
                    onComplete: () => { this.player.rotation = 0; }
                });
            }

            this.jumpCount += 1;
        }

        // --- Dash ---
        const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.shift);
        if (dashPressed && this.dashAvailable && !isGrounded && now - this.lastDashTime > 250) {
            this.dashAvailable = false;
            this.lastDashTime = now;
            const dir = movingX !== 0 ? movingX : (this.player.body.velocity.x >= 0 ? 1 : -1);
            this.player.body.setVelocityX(dir * 580);
            this.player.body.setVelocityY(Math.min(this.player.body.velocity.y, 80));
            sfx.dash();
            this.tryUnlock('firstDash');
            this.spawnDashTrail(dir);
        }

        // --- Jetpack ---
        if (this.activeEffects.jetpack > now) {
            this.player.body.setVelocityY(-300);
            this.jetFlameTick = (this.jetFlameTick || 0) + 1;
            if (this.jetFlameTick % 3 === 0) this.spawnJetFlame();
        }

        // --- Death by fall ---
        if (this.player.y > this.cameras.main.height + 100) {
            this.endGame();
            return;
        }

        // --- Spawning new platforms ---
        while (this.nextPlatformY > this.cameras.main.scrollY - 200) {
            this.spawnProceduralPlatform(this.nextPlatformY);
            this.nextPlatformY -= this.platformSpacing;
        }

        // --- Cleanup loops ---
        this.platforms.getChildren().forEach(platform => {
            if (!platform.body) return;
            this.syncPlatformDecorations(platform);
            if (platform.y > this.cameras.main.scrollY + this.cameras.main.height + 100) {
                this.destroyPlatform(platform);
            }
        });

        // Magnet pull on powerups.
        const magnetActive = this.activeEffects.magnet > now;
        this.powerups.getChildren().forEach(powerup => {
            if (magnetActive) {
                const dx = this.player.x - powerup.x;
                const dy = this.player.y - powerup.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 250 && dist > 2) {
                    const speed = 6;
                    powerup.x += (dx / dist) * speed;
                    powerup.y += (dy / dist) * speed;
                }
            }
            if (powerup.glow) { powerup.glow.x = powerup.x; powerup.glow.y = powerup.y; }
            if (powerup.labelText) { powerup.labelText.x = powerup.x; powerup.labelText.y = powerup.y - 22; }
            if (powerup.y > this.cameras.main.scrollY + this.cameras.main.height + 100) {
                this.cleanupPowerup(powerup);
            }
        });

        this.obstacles.getChildren().forEach(obstacle => {
            if (obstacle.attachedPlatform) {
                if (!obstacle.attachedPlatform.active) {
                    obstacle.destroy();
                    return;
                }
                obstacle.x = obstacle.attachedPlatform.x + (obstacle.offsetX || 0);
                obstacle.y = obstacle.attachedPlatform.y + (obstacle.offsetY || -16);
            }
            if (obstacle.y > this.cameras.main.scrollY + this.cameras.main.height + 200) {
                obstacle.destroy(); return;
            }
            if (obstacle.x < -120 || obstacle.x > 920) {
                obstacle.destroy(); return;
            }
            if (obstacle.y < this.cameras.main.scrollY - 400) {
                obstacle.destroy();
            }
        });

        // --- Score / height ---
        const rawHeight = Math.max(0, Math.floor(550 - this.player.y));
        this.height = Math.max(this.height, rawHeight);
        if (this.height > this.lastHeightForScore) {
            const heightGained = this.height - this.lastHeightForScore;
            const comboMult = 1 + Math.min(this.combo / 10, 4);
            const total = heightGained * this.doublePointsMultiplier * comboMult;
            this.score += Math.floor(total);
            this.lastHeightForScore = this.height;
        }
        this.difficulty = Math.floor(this.height / 300);

        if (this.height >= 500)  this.tryUnlock('height500');
        if (this.height >= 2000) this.tryUnlock('height2000');
        if (this.height >= 5000) this.tryUnlock('height5000');
        if (this.score >= 1000)  this.tryUnlock('score1000');
        if (this.score >= 5000)  this.tryUnlock('score5000');

        // --- Rift wrap / clamp ---
        if (this.activeEffects.dimensionRift > now) {
            if (this.player.x < -15) this.player.x = 815;
            if (this.player.x > 815) this.player.x = -15;
        } else {
            this.player.x = Phaser.Math.Clamp(this.player.x, 15, 785);
        }

        // --- Camera follow ---
        this.cameras.main.scrollY = this.player.y - 300;

        // --- Shield aura sync ---
        this.shieldAura.x = this.player.x;
        this.shieldAura.y = this.player.y;
        this.shieldAura.setVisible(this.shieldCharges > 0);

        this.updateEffectTimers();
        this.refreshSky();
        this.updateHUD();
    }

    handleComboOnLand() {
        const heightGained = this.lastComboLandY - this.player.y;
        if (heightGained > 30) {
            this.combo += 1;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            if (this.combo >= 10) this.tryUnlock('combo10');
            if (this.combo >= 25) this.tryUnlock('combo25');
            if (this.combo >= 5 && this.combo % 5 === 0) {
                sfx.blip(660 + this.combo * 10, 0.08, 'square', 0.06);
                this.flashComboText();
            }
        } else if (heightGained < -200) {
            this.combo = 0;
        }
        this.lastComboLandY = this.player.y;
    }

    flashComboText() {
        this.tweens.killTweensOf(this.comboText);
        this.comboText.setScale(1.3);
        this.tweens.add({
            targets: this.comboText,
            scale: 1,
            duration: 250,
            ease: 'Cubic.out'
        });
    }

    spawnDashTrail(dir) {
        const skin = SKINS[this.skinId] || SKINS.yellow;
        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 35, () => {
                if (this.gameOver) return;
                const ghost = this.add.rectangle(this.player.x, this.player.y, 30, 40, skin.body, 0.45);
                ghost.setDepth(9);
                this.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    scaleX: 0.6,
                    duration: 280,
                    onComplete: () => ghost.destroy()
                });
            });
        }
    }

    spawnJetFlame() {
        const flame = this.add.triangle(this.player.x, this.player.y + 22, 6, 0, 12, 16, 0, 16, 0xfb7185);
        flame.setDepth(9);
        this.tweens.add({
            targets: flame,
            y: flame.y + 30,
            alpha: 0,
            scaleX: 1.5,
            duration: 280,
            onComplete: () => flame.destroy()
        });
    }

    syncPlatformDecorations(platform) {
        if (platform.shadow) {
            platform.shadow.x = platform.x + 2;
            platform.shadow.y = platform.y + 6;
        }
        if (platform.highlight) {
            platform.highlight.x = platform.x;
            platform.highlight.y = platform.y - 8;
        }
        if (platform.icon) {
            platform.icon.x = platform.x;
            platform.icon.y = platform.y;
        }
        if (platform.crackGraphics) {
            platform.crackGraphics.x = platform.x;
            platform.crackGraphics.y = platform.y;
        }
    }

    enableObstacleMode() {
        if (this.horizontalArrowEvent) return;

        this.horizontalArrowEvent = this.time.addEvent({
            delay: 1900, loop: true,
            callback: () => this.spawnHorizontalArrow()
        });

        this.warningDropEvent = this.time.addEvent({
            delay: 2400, loop: true,
            callback: () => this.spawnWarningDropArrow()
        });

        this.laserEvent = this.time.addEvent({
            delay: 7500, loop: true,
            callback: () => this.spawnLaserSweep()
        });

        this.windEvent = this.time.addEvent({
            delay: 11000, loop: true,
            callback: () => this.spawnWindGust()
        });
    }

    spawnHorizontalArrow() {
        if (this.gameOver || this.isPaused) return;
        const fromLeft = Math.random() < 0.5;
        const x = fromLeft ? -20 : 820;
        const y = this.cameras.main.scrollY + Phaser.Math.Between(120, 520);
        const arrow = this.add.triangle(x, y, 0, 10, 30, 20, 0, 30, 0xff1e1e);
        arrow.setStrokeStyle(2, 0x6b0000);
        arrow.setAngle(fromLeft ? 0 : 180);
        this.physics.add.existing(arrow);
        arrow.body.setAllowGravity(false);
        arrow.body.setImmovable(true);
        arrow.body.setVelocityX(fromLeft ? 260 : -260);
        this.obstacles.add(arrow);
    }

    spawnWarningDropArrow() {
        if (this.gameOver || this.isPaused) return;

        const x = Phaser.Math.Between(70, 730);
        const warning = this.add.text(x, 40, '▼', {
            fontSize: '32px', color: '#ff1e1e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(60);

        this.tweens.add({
            targets: warning, alpha: 0.15,
            yoyo: true, repeat: -1, duration: 200, ease: 'Sine.inOut'
        });
        sfx.warning();

        this.time.delayedCall(2000, () => {
            this.tweens.killTweensOf(warning);
            warning.destroy();
            if (!this.scene.isActive('GameScene') || this.gameOver) return;

            const arrow = this.add.triangle(x, this.cameras.main.scrollY - 30, 15, 0, 30, 30, 0, 30, 0xff1e1e);
            arrow.setStrokeStyle(2, 0x6b0000);
            this.physics.add.existing(arrow);
            arrow.body.setAllowGravity(false);
            arrow.body.setImmovable(true);
            arrow.body.setVelocityY(550);
            this.obstacles.add(arrow);
        });
    }

    spawnLaserSweep() {
        if (this.gameOver || this.isPaused) return;
        // Aim near the player so it's a real threat.
        const laserY = this.player.y + Phaser.Math.Between(-80, 80);

        const dashedLine = this.add.rectangle(400, laserY, 800, 2, 0xff1e1e, 0.6);
        dashedLine.setDepth(48);
        const warnL = this.add.text(20, laserY, '⚠', {
            fontSize: '22px', color: '#ff1e1e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        const warnR = this.add.text(780, laserY, '⚠', {
            fontSize: '22px', color: '#ff1e1e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        const blink = [dashedLine, warnL, warnR];
        blink.forEach(o => this.tweens.add({
            targets: o, alpha: 0.35,
            yoyo: true, repeat: -1, duration: 160
        }));
        sfx.laserCharge();

        this.time.delayedCall(1500, () => {
            blink.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
            if (this.gameOver) return;

            const beam = this.add.rectangle(400, laserY, 800, 14, 0xff1e1e);
            beam.setStrokeStyle(2, 0xffd166);
            beam.setDepth(48);
            this.physics.add.existing(beam);
            beam.body.setAllowGravity(false);
            beam.body.setImmovable(true);
            this.obstacles.add(beam);
            sfx.laserFire();

            // Glow flash.
            const glow = this.add.rectangle(400, laserY, 800, 30, 0xff1e1e, 0.25);
            glow.setDepth(47);
            this.tweens.add({
                targets: glow, alpha: 0,
                duration: 800, onComplete: () => glow.destroy()
            });

            this.time.delayedCall(800, () => {
                if (beam.active) beam.destroy();
            });
        });
    }

    spawnWindGust() {
        if (this.gameOver || this.isPaused) return;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const duration = 3000;
        this.windDirection = dir;
        this.windUntil = this.time.now + duration;
        sfx.wind();

        // Visual streaks.
        for (let i = 0; i < 10; i++) {
            const startX = dir > 0 ? -40 : 840;
            const endX = dir > 0 ? 840 : -40;
            const ay = 60 + i * 50;
            const arrow = this.add.text(startX, ay, dir > 0 ? '»' : '«', {
                fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
                stroke: '#1f3a68', strokeThickness: 3
            }).setOrigin(0.5).setScrollFactor(0).setDepth(45).setAlpha(0.7);
            this.tweens.add({
                targets: arrow, x: endX,
                duration: Phaser.Math.Between(900, 1500),
                onComplete: () => {
                    if (this.windUntil > this.time.now) {
                        arrow.x = startX;
                        this.tweens.add({
                            targets: arrow, x: endX,
                            duration: Phaser.Math.Between(900, 1500),
                            onComplete: () => arrow.destroy()
                        });
                    } else {
                        arrow.destroy();
                    }
                }
            });
        }
    }

    spawnProceduralPlatform(y) {
        const x = Phaser.Math.Between(60, 740);
        // Tier is based on the platform's own y, so the initial pre-spawned batch
        // grades from beginner near the start to harder up high.
        const projectedHeight = Math.max(0, 550 - y);
        const tier = tierForHeight(projectedHeight);
        const projectedDifficulty = Math.floor(projectedHeight / 300);
        const width = Math.max(40, 95 - (projectedDifficulty * 3));

        const type = pickWeighted(TIER_WEIGHTS[tier]);
        const platform = this.createPlatform(x, y, width, type);

        // Spikes only from intermediate onwards.
        if (Math.random() < SPIKE_CHANCE_BY_TIER[tier]) {
            this.addPlatformSpike(platform);
        }
        // Powerups only from intermediate onwards.
        if (Math.random() < POWERUP_CHANCE_BY_TIER[tier]) {
            this.spawnPowerup(x, y - 28);
        }
    }

    createPlatform(x, y, width, type) {
        const color = PLATFORM_COLORS[type] || PLATFORM_COLORS.normal;

        const shadow = this.add.rectangle(x + 2, y + 6, width, 12, 0x000000, 0.28);
        shadow.setDepth(-1);

        const platform = this.add.rectangle(x, y, width, 20, color);
        platform.setStrokeStyle(2, 0x000000, 0.35);
        platform.setDepth(0);
        this.physics.add.existing(platform);
        const body = platform.body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setVelocity(0, 0);

        const highlight = this.add.rectangle(x, y - 8, Math.max(8, width - 8), 3, 0xffffff, 0.55);
        highlight.setDepth(1);

        platform.platformType = type;
        platform.breaking = false;
        platform.dropping = false;
        platform.shadow = shadow;
        platform.highlight = highlight;

        if (type === 'blueSlide') {
            const distance = 350;
            const duration = Phaser.Math.Between(1600, 2300);
            this.tweens.add({
                targets: platform, x: x - distance,
                duration, yoyo: true, repeat: -1, ease: 'Sine.inOut'
            });
        } else if (type === 'purpleFloat') {
            const distanceY = 70;
            const duration = Phaser.Math.Between(1500, 2200);
            this.tweens.add({
                targets: platform, y: y - distanceY,
                duration, yoyo: true, repeat: -1, ease: 'Sine.inOut'
            });
        } else if (type === 'redDrop') {
            body.setVelocityY(0);
        } else if (type === 'crackedBroken') {
            const crack = this.add.graphics();
            crack.lineStyle(3, 0x4b5563, 1);
            const crackW = width * 0.35;
            crack.beginPath();
            crack.moveTo(-crackW, -2); crack.lineTo(crackW, 2); crack.strokePath();
            crack.beginPath();
            crack.moveTo(crackW * 0.1, -6); crack.lineTo(-crackW * 0.1, 6); crack.strokePath();
            crack.x = x; crack.y = y;
            crack.setDepth(2);
            platform.crackGraphics = crack;
        } else if (type === 'conveyor') {
            platform.conveyorDir = Math.random() < 0.5 ? -1 : 1;
        }

        const iconChar = type === 'conveyor'
            ? (platform.conveyorDir > 0 ? '»' : '«')
            : PLATFORM_ICONS[type];
        if (iconChar) {
            const icon = this.add.text(x, y, iconChar, {
                fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(2);
            platform.icon = icon;
        }

        this.platforms.add(platform);
        return platform;
    }

    addPlatformSpike(platform) {
        const spike = this.add.triangle(platform.x, platform.y - 16, 7, 14, 14, 0, 0, 0, 0xff1e1e);
        spike.setStrokeStyle(1, 0x6b0000);
        this.physics.add.existing(spike);
        spike.body.setAllowGravity(false);
        spike.body.setImmovable(true);
        spike.attachedPlatform = platform;
        spike.offsetX = 0;
        spike.offsetY = -16;
        platform.attachedSpike = spike;
        this.obstacles.add(spike);
    }

    spawnPowerup(x, y) {
        const types = ['dimensionRift', 'doublePoints', 'shield', 'magnet', 'jetpack'];
        const powerType = Phaser.Utils.Array.GetRandom(types);
        const colors = {
            dimensionRift: 0x06b6d4,
            doublePoints:  0xfacc15,
            shield:        0x06b6d4,
            magnet:        0xfcd34d,
            jetpack:       0xfb7185
        };
        const labels = {
            dimensionRift: 'Rift',
            doublePoints:  '2x',
            shield:        'Shield',
            magnet:        'Magnet',
            jetpack:       'Jetpack'
        };
        const color = colors[powerType];

        const glow = this.add.circle(x, y, 18, color, 0.4);
        glow.setDepth(0);
        this.tweens.add({
            targets: glow, scaleX: 1.6, scaleY: 1.6, alpha: 0.1,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        const powerup = this.add.circle(x, y, 11, color);
        powerup.setStrokeStyle(2, 0xffffff, 0.85);
        powerup.setDepth(3);
        this.physics.add.existing(powerup);
        powerup.body.setAllowGravity(false);
        powerup.body.setImmovable(true);
        powerup.powerType = powerType;
        powerup.glow = glow;

        powerup.labelText = this.add.text(x, y - 22, labels[powerType], {
            fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(3);
        this.powerups.add(powerup);
    }

    handlePlatformCollision(player, platform) {
        if (!player.body || !platform.active) return;
        const landedOnTop = player.body.touching.down && platform.body.touching.up;
        if (!landedOnTop) return;

        this.groundPlatformType = platform.platformType;
        this.groundConveyorDir = platform.conveyorDir || 0;

        if (platform.platformType === 'brownBreak' && !platform.breaking) {
            platform.breaking = true;
            platform.setAlpha(0.8);
            if (platform.highlight) platform.highlight.setAlpha(0.5);
            this.time.delayedCall(1000, () => {
                if (platform.active) {
                    this.spawnDebris(platform.x, platform.y, PLATFORM_COLORS.brownBreak);
                    this.destroyPlatform(platform);
                }
            });
        } else if (platform.platformType === 'redDrop' && !platform.dropping) {
            platform.dropping = true;
            platform.body.setAllowGravity(false);
            platform.body.setVelocityY(320);
        } else if (platform.platformType === 'crackedBroken' && !platform.breaking) {
            platform.breaking = true;
            if (platform.body && platform.body.checkCollision) {
                platform.body.checkCollision.up = false;
                platform.body.checkCollision.down = false;
                platform.body.checkCollision.left = false;
                platform.body.checkCollision.right = false;
            }
            platform.setAlpha(0.6);
            this.time.delayedCall(80, () => {
                if (platform.active) {
                    this.spawnDebris(platform.x, platform.y, PLATFORM_COLORS.crackedBroken);
                    this.destroyPlatform(platform);
                }
            });
        }
    }

    handleObstacleCollision(_player, obstacle) {
        if (this.gameOver) return;
        if (this.time.now < this.invulnerableUntil) return;

        // Shield absorbs the hit.
        if (this.shieldCharges > 0) {
            this.shieldCharges -= 1;
            this.invulnerableUntil = this.time.now + 1000;
            sfx.shieldHit();
            this.cameras.main.flash(180, 50, 200, 255);
            this.tweens.add({
                targets: this.shieldAura, scaleX: 1.6, scaleY: 1.6, alpha: 0,
                duration: 350,
                onComplete: () => {
                    this.shieldAura.setScale(1);
                    this.shieldAura.setAlpha(this.shieldCharges > 0 ? 0.25 : 0);
                }
            });
            this.tryUnlock('shieldSave');
            // Destroy the obstacle that hit so it doesn't re-trigger.
            if (obstacle && obstacle.active && !obstacle.attachedPlatform) {
                obstacle.destroy();
            }
            return;
        }

        this.endGame('GAME OVER\nHit by obstacle');
    }

    destroyPlatform(platform) {
        if (!platform || !platform.active) return;
        this.tweens.killTweensOf(platform);
        if (platform.crackGraphics) platform.crackGraphics.destroy();
        if (platform.shadow) platform.shadow.destroy();
        if (platform.highlight) platform.highlight.destroy();
        if (platform.icon) platform.icon.destroy();
        if (platform.attachedSpike && platform.attachedSpike.active) {
            platform.attachedSpike.destroy();
        }
        platform.destroy();
    }

    cleanupPowerup(powerup) {
        if (!powerup) return;
        if (powerup.glow) {
            this.tweens.killTweensOf(powerup.glow);
            powerup.glow.destroy();
        }
        if (powerup.labelText) powerup.labelText.destroy();
        if (powerup.active) powerup.destroy();
    }

    collectPowerup(_player, powerup) {
        if (!powerup.active) return;

        const expiresAt = this.time.now + 30000;
        const type = powerup.powerType;
        if (type === 'dimensionRift') {
            this.activeEffects.dimensionRift = expiresAt;
        } else if (type === 'doublePoints') {
            this.activeEffects.doublePoints = expiresAt;
        } else if (type === 'shield') {
            this.shieldCharges += 1;
        } else if (type === 'magnet') {
            this.activeEffects.magnet = this.time.now + 10000;
        } else if (type === 'jetpack') {
            this.activeEffects.jetpack = this.time.now + 4000;
        }

        sfx.collect();
        this.runPowerupCount += 1;
        if (this.runPowerupCount >= 5) this.tryUnlock('powerups5');

        // Capture glow locally so the onComplete doesn't deref a nulled property.
        const glow = powerup.glow;
        powerup.glow = null;
        if (glow) {
            this.tweens.killTweensOf(glow);
            this.tweens.add({
                targets: glow, scaleX: 2.2, scaleY: 2.2, alpha: 0,
                duration: 280, onComplete: () => glow.destroy()
            });
        }

        this.cleanupPowerup(powerup);
    }

    updateEffectTimers() {
        const now = this.time.now;
        this.doublePointsMultiplier = this.activeEffects.doublePoints > now ? 2 : 1;
    }

    updateHUD() {
        const now = this.time.now;
        this.scoreText.setText(`Score: ${this.score}`);
        this.heightText.setText(`Height: ${this.height}`);
        this.highScoreText.setText(`High: ${this.highScore}`);
        const tier = tierForHeight(this.height);
        this.diffText.setText(`${TIER_NAMES[tier]} (${this.difficulty})`);
        this.diffText.setColor(TIER_COLORS[tier]);
        this.comboText.setText(this.combo > 0 ? `Combo: ${this.combo}x` : 'Combo: --');
        this.comboText.setAlpha(this.combo > 0 ? 1 : 0.5);

        // Dash state.
        if (this.dashAvailable) {
            this.dashText.setText('Dash: READY');
            this.dashText.setAlpha(this.lastGrounded ? 0.55 : 1);
        } else {
            this.dashText.setText('Dash: USED');
            this.dashText.setAlpha(0.5);
        }

        const fmt = (label, expiresAt) => {
            const remaining = Math.max(0, expiresAt - now);
            return remaining > 0 ? `${label}: ${(remaining / 1000).toFixed(1)}s` : `${label}: --`;
        };
        const dimText = (txt, hasEffect) => { txt.setAlpha(hasEffect ? 1 : 0.5); };

        this.shieldText.setText(this.shieldCharges > 0 ? `Shield x ${this.shieldCharges}` : 'Shield: --');
        dimText(this.shieldText, this.shieldCharges > 0);

        this.magnetText.setText(fmt('Magnet', this.activeEffects.magnet));
        dimText(this.magnetText, this.activeEffects.magnet > now);

        this.jetpackText.setText(fmt('Jetpack', this.activeEffects.jetpack));
        dimText(this.jetpackText, this.activeEffects.jetpack > now);

        this.riftTimerText.setText(fmt('Rift', this.activeEffects.dimensionRift));
        dimText(this.riftTimerText, this.activeEffects.dimensionRift > now);

        this.doublePointsTimerText.setText(fmt('2x Points', this.activeEffects.doublePoints));
        dimText(this.doublePointsTimerText, this.activeEffects.doublePoints > now);
    }

    spawnLandDust(x, y) {
        for (let i = 0; i < 8; i++) {
            const d = this.add.circle(x, y, 3, 0xddd6c4, 0.85);
            d.setDepth(5);
            const dx = (Math.random() - 0.5) * 60;
            const dy = -Math.random() * 18 - 4;
            this.tweens.add({
                targets: d, x: x + dx, y: y + dy + 12,
                alpha: 0, scale: 0.3,
                duration: 420, ease: 'Cubic.out',
                onComplete: () => d.destroy()
            });
        }
    }

    spawnDebris(x, y, color) {
        for (let i = 0; i < 7; i++) {
            const piece = this.add.rectangle(x, y, 5, 5, color);
            piece.setDepth(5);
            const dx = (Math.random() - 0.5) * 100;
            const dy = -Math.random() * 40 - 5;
            this.tweens.add({
                targets: piece, x: x + dx, y: y + dy + 120,
                angle: (Math.random() - 0.5) * 360, alpha: 0,
                duration: 600, ease: 'Cubic.in',
                onComplete: () => piece.destroy()
            });
        }
    }

    togglePause() {
        if (this.gameOver) return;
        this.isPaused = !this.isPaused;
        sfx.pause();
        if (this.isPaused) {
            this.physics.pause();
            this.pauseOverlay.setVisible(true);
        } else {
            this.physics.resume();
            this.pauseOverlay.setVisible(false);
        }
    }

    tryUnlock(id) {
        const unlocked = achievements.unlock(id);
        if (unlocked) this.showAchievementBanner(unlocked);
    }

    showAchievementBanner(ach) {
        sfx.achievement();
        const banner = this.add.container(400, -60);
        banner.setScrollFactor(0).setDepth(200);

        const bg = this.add.graphics();
        bg.fillStyle(0x2ecc71, 0.92);
        bg.fillRoundedRect(-200, -28, 400, 56, 12);
        bg.lineStyle(2, 0xffd166, 1);
        bg.strokeRoundedRect(-200, -28, 400, 56, 12);

        const icon = this.add.text(-170, 0, '★', {
            fontSize: '28px', color: '#ffd166', fontStyle: 'bold'
        }).setOrigin(0.5);

        const name = this.add.text(-140, -12, `Achievement Unlocked: ${ach.name}`, {
            fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        });
        const desc = this.add.text(-140, 6, ach.desc, {
            fontSize: '12px', color: '#dfffe7'
        });
        banner.add([bg, icon, name, desc]);

        const slot = this.banners.length;
        this.banners.push(banner);

        this.tweens.add({
            targets: banner, y: 60 + slot * 64,
            duration: 350, ease: 'Cubic.out',
            onComplete: () => {
                this.time.delayedCall(2400, () => {
                    this.tweens.add({
                        targets: banner, y: -80,
                        duration: 350, ease: 'Cubic.in',
                        onComplete: () => {
                            banner.destroy();
                            this.banners = this.banners.filter(b => b !== banner);
                        }
                    });
                });
            }
        });
    }

    endGame(reasonText = 'GAME OVER') {
        this.gameOver = true;

        // Reset world state that may have been altered.
        this.physics.world.timeScale = 1;

        this.cameras.main.shake(320, 0.015);
        const flash = this.add.rectangle(400, 300, 800, 600, 0xff3030, 0.55)
            .setScrollFactor(0).setDepth(99);
        this.tweens.add({
            targets: flash, alpha: 0,
            duration: 500, onComplete: () => flash.destroy()
        });

        sfx.death();

        this.highScore = Math.max(this.highScore, this.score);
        localStorage.setItem('parkourHighScore', String(this.highScore));

        // Update death-count achievement (only counts as a "death" if it's a real game over).
        const deathAch = achievements.incrementDeaths();
        if (deathAch) this.showAchievementBanner(deathAch);

        if (this.horizontalArrowEvent) this.horizontalArrowEvent.remove(false);
        if (this.warningDropEvent) this.warningDropEvent.remove(false);
        if (this.laserEvent) this.laserEvent.remove(false);
        if (this.windEvent) this.windEvent.remove(false);

        this.gameOverText.setText(
            `${reasonText}\nScore: ${this.score}\nHeight: ${this.height}\nMax Combo: ${this.maxCombo}\nHigh Score: ${this.highScore}\nPress SPACE for Menu`
        );
        this.player.body.setVelocity(0, 0);

        this.time.delayedCall(450, () => {
            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('StartMenuScene');
            });
        });
    }
}
