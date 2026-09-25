import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { achievements, ACHIEVEMENTS, SKINS, loadSkin, saveSkin } from '../achievements.js';

export default class StartMenuScene extends Phaser.Scene {
    constructor() {
        super('StartMenuScene');
    }

    create() {
        const highScore = Number(localStorage.getItem('parkourHighScore') || 0);
        this.currentSkin = loadSkin();
        this.viewMode = 'main'; // 'main' | 'achievements'

        this.buildSky();
        this.buildMountains();
        this.buildClouds();

        this.mainGroup = this.add.container(0, 0);
        this.achievementsGroup = this.add.container(0, 0).setVisible(false);

        this.buildMain(highScore);
        this.buildAchievements();

        // First click/keypress unlocks the audio context (browsers gate it).
        const unlockAudio = () => sfx.init();
        this.input.once('pointerdown', unlockAudio);
        this.input.keyboard.once('keydown', unlockAudio);

        this.input.keyboard.once('keydown-SPACE', () => {
            if (this.viewMode === 'main') this.scene.start('GameScene');
        });

        this.input.keyboard.on('keydown-A', () => {
            if (this.viewMode === 'main') this.toggleAchievements();
            else this.toggleAchievements();
        });
    }

    buildMain(highScore) {
        const c = this.mainGroup;

        const titleShadow = this.add.text(404, 124, 'Blob Ascent', {
            fontSize: '64px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0.45);

        const title = this.add.text(400, 120, 'Blob Ascent', {
            fontSize: '64px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#1f3a68', strokeThickness: 6
        }).setOrigin(0.5);

        // Back-to-title button.
        const back = this.add.text(16, 12, '← Title', {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.start('TitleScene'));
        back.on('pointerover', () => back.setScale(1.1));
        back.on('pointerout', () => back.setScale(1));
        c.add(back);

        this.tweens.add({
            targets: [title, titleShadow], y: '+=6',
            duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });
        c.add([titleShadow, title]);

        // Player preview, idle bob, reflects current skin.
        this.previewContainer = this.add.container(400, 210);
        this.rebuildPreview();
        this.tweens.add({
            targets: this.previewContainer, y: '+=8',
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });
        c.add(this.previewContainer);

        // Skin picker row.
        const skinLabel = this.add.text(400, 268, 'Character', {
            fontSize: '16px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        c.add(skinLabel);

        const skinIds = Object.keys(SKINS);
        const totalW = skinIds.length * 50;
        const startX = 400 - totalW / 2 + 25;
        skinIds.forEach((id, i) => {
            const x = startX + i * 50;
            const skin = SKINS[id];
            const swatch = this.add.rectangle(x, 300, 36, 36, skin.body)
                .setStrokeStyle(2, skin.stroke)
                .setInteractive({ useHandCursor: true });
            swatch.on('pointerover', () => swatch.setScale(1.1));
            swatch.on('pointerout', () => swatch.setScale(this.currentSkin === id ? 1.15 : 1));
            swatch.on('pointerdown', () => {
                this.currentSkin = id;
                saveSkin(id);
                sfx.blip(660, 0.05, 'sine', 0.06);
                this.skinSwatches.forEach((s, j) => s.setScale(skinIds[j] === id ? 1.15 : 1));
                this.rebuildPreview();
                this.skinNameText.setText(skin.name);
            });
            if (id === this.currentSkin) swatch.setScale(1.15);
            this.skinSwatches = this.skinSwatches || [];
            this.skinSwatches.push(swatch);
            c.add(swatch);
        });

        this.skinNameText = this.add.text(400, 326, SKINS[this.currentSkin].name, {
            fontSize: '14px', color: '#ffd166', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        c.add(this.skinNameText);

        // Controls panel.
        const controlsPanel = this.add.graphics();
        controlsPanel.fillStyle(0x000000, 0.45);
        controlsPanel.fillRoundedRect(140, 350, 520, 110, 12);
        controlsPanel.lineStyle(2, 0xffffff, 0.3);
        controlsPanel.strokeRoundedRect(140, 350, 520, 110, 12);
        c.add(controlsPanel);

        const controlsText = this.add.text(400, 380, 'Move: A/D or Arrow Keys', {
            fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        const controlsText2 = this.add.text(400, 405, 'Jump: W or SPACE  (double jump)', {
            fontSize: '18px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        const controlsText3 = this.add.text(400, 430, 'Dash: SHIFT      Pause: P or ESC', {
            fontSize: '18px', color: '#a0e8a0', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        c.add([controlsText, controlsText2, controlsText3]);

        // High score panel.
        const hsPanel = this.add.graphics();
        hsPanel.fillStyle(0x000000, 0.45);
        hsPanel.fillRoundedRect(280, 478, 240, 44, 10);
        hsPanel.lineStyle(2, 0xffd166, 0.55);
        hsPanel.strokeRoundedRect(280, 478, 240, 44, 10);
        c.add(hsPanel);

        const hsText = this.add.text(400, 500, `High Score: ${highScore}`, {
            fontSize: '22px', color: '#ffd166', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        c.add(hsText);

        // Pulsing prompt.
        const prompt = this.add.text(400, 548, 'Press SPACE to Start', {
            fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({
            targets: prompt, alpha: 0.55,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });
        c.add(prompt);

        // Bottom-right hint about achievements.
        const achText = this.add.text(792, 580,
            `Press A: Achievements (${achievements.unlockedCount()}/${achievements.totalCount()})`, {
            fontSize: '14px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 1);
        c.add(achText);

        // Mute hint top-right.
        this.muteText = this.add.text(792, 12, sfx.isMuted() ? '🔇 M to unmute' : '🔊 M to mute', {
            fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0);
        c.add(this.muteText);

        this.input.keyboard.on('keydown-M', () => {
            sfx.toggle();
            this.muteText.setText(sfx.isMuted() ? '🔇 M to unmute' : '🔊 M to mute');
            sfx.blip(440, 0.05, 'square', 0.05);
        });
    }

    rebuildPreview() {
        const skin = SKINS[this.currentSkin];
        this.previewContainer.removeAll(true);
        const body = this.add.rectangle(0, 0, 30, 40, skin.body).setStrokeStyle(2, skin.stroke);
        const eyeL = this.add.circle(-7, -7, 4, skin.eye);
        const eyeR = this.add.circle(7, -7, 4, skin.eye);
        const pupilL = this.add.circle(-7, -7, 2, skin.pupil);
        const pupilR = this.add.circle(7, -7, 2, skin.pupil);
        const mouth = this.add.rectangle(0, 7, 8, 2, skin.mouth);
        this.previewContainer.add([body, eyeL, eyeR, pupilL, pupilR, mouth]);
    }

    buildAchievements() {
        const c = this.achievementsGroup;
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.65);
        c.add(overlay);

        const title = this.add.text(400, 50, 'Achievements', {
            fontSize: '38px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#1f3a68', strokeThickness: 5
        }).setOrigin(0.5);
        c.add(title);

        const ids = Object.keys(ACHIEVEMENTS);
        const cols = 2;
        const colW = 360;
        const rowH = 42;
        const startY = 110;
        ids.forEach((id, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = 30 + col * colW;
            const y = startY + row * rowH;
            const unlocked = achievements.isUnlocked(id);
            const def = ACHIEVEMENTS[id];

            const bg = this.add.graphics();
            bg.fillStyle(unlocked ? 0x2ecc71 : 0x444444, 0.5);
            bg.fillRoundedRect(x, y, colW - 20, rowH - 6, 6);
            bg.lineStyle(1, unlocked ? 0xffffff : 0x888888, 0.6);
            bg.strokeRoundedRect(x, y, colW - 20, rowH - 6, 6);
            c.add(bg);

            const icon = this.add.text(x + 12, y + (rowH - 6) / 2, unlocked ? '★' : '·', {
                fontSize: '20px', color: unlocked ? '#ffd166' : '#888888', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            c.add(icon);

            const name = this.add.text(x + 36, y + 6, def.name, {
                fontSize: '14px',
                color: unlocked ? '#ffffff' : '#aaaaaa',
                fontStyle: 'bold'
            });
            const desc = this.add.text(x + 36, y + 22, def.desc, {
                fontSize: '11px',
                color: unlocked ? '#dfe7f0' : '#888888'
            });
            c.add([name, desc]);
        });

        const back = this.add.text(400, 565, 'Press A to go back', {
            fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        c.add(back);
    }

    toggleAchievements() {
        if (this.viewMode === 'main') {
            this.viewMode = 'achievements';
            this.mainGroup.setVisible(false);
            this.achievementsGroup.setVisible(true);
        } else {
            this.viewMode = 'main';
            this.mainGroup.setVisible(true);
            this.achievementsGroup.setVisible(false);
        }
        sfx.blip(523, 0.05, 'sine', 0.05);
    }

    buildSky() {
        const g = this.add.graphics();
        const top = Phaser.Display.Color.IntegerToColor(0x6ec6ff);
        const bot = Phaser.Display.Color.IntegerToColor(0xbfe9ff);
        const stripes = 36;
        const stripeH = Math.ceil(600 / stripes) + 1;
        for (let i = 0; i < stripes; i++) {
            const t = i / (stripes - 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, 1, t);
            g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            g.fillRect(0, i * (600 / stripes), 800, stripeH);
        }
    }

    buildMountains() {
        const far = this.add.graphics();
        far.fillStyle(0x668fb0, 1);
        for (let i = 0; i < 6; i++) {
            const x = i * 160 + Phaser.Math.Between(-20, 20);
            const h = Phaser.Math.Between(70, 120);
            far.beginPath();
            far.moveTo(x - 100, 600);
            far.lineTo(x, 600 - h);
            far.lineTo(x + 100, 600);
            far.closePath();
            far.fillPath();
        }
        const mid = this.add.graphics();
        mid.fillStyle(0x40607a, 1);
        for (let i = 0; i < 5; i++) {
            const x = i * 200 + Phaser.Math.Between(-30, 30);
            const h = Phaser.Math.Between(110, 170);
            mid.beginPath();
            mid.moveTo(x - 110, 600);
            mid.lineTo(x, 600 - h);
            mid.lineTo(x + 110, 600);
            mid.closePath();
            mid.fillPath();
        }
    }

    buildClouds() {
        const cloud = (x, y, scale = 1) => {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 0.85);
            g.fillCircle(0, 0, 22 * scale);
            g.fillCircle(22 * scale, 5 * scale, 26 * scale);
            g.fillCircle(44 * scale, 0, 20 * scale);
            g.fillCircle(60 * scale, 4 * scale, 16 * scale);
            g.x = x; g.y = y;
            this.tweens.add({
                targets: g, x: x + 60,
                duration: Phaser.Math.Between(18000, 26000),
                yoyo: true, repeat: -1, ease: 'Sine.inOut'
            });
        };
        cloud(120, 90, 0.9);
        cloud(560, 70, 1.1);
        cloud(300, 130, 0.8);
        cloud(680, 180, 0.7);
    }
}
