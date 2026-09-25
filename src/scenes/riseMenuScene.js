import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { SKINS, loadSkin, saveSkin } from '../achievements.js';
import { DIFFICULTY_CONFIG, LEVELS, LEVEL_ORDER } from './riseScene.js';

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'insane'];
const DIFFICULTY_BLURBS = {
    easy:   'Basic platforms. Powerups included.',
    medium: 'Adds side-to-side moving platforms.',
    hard:   'Adds vertical movers + wild platform lengths.',
    insane: 'All of the above + level-themed rain from above.'
};

export default class RiseMenuScene extends Phaser.Scene {
    constructor() {
        super('RiseMenuScene');
    }

    create() {
        this.currentSkin = loadSkin();
        this.currentLevel = localStorage.getItem('riseLevel') || 'grass';
        if (!LEVELS[this.currentLevel]) this.currentLevel = 'grass';
        this.currentDifficulty = localStorage.getItem('riseDifficulty') || 'easy';
        if (!DIFFICULTY_CONFIG[this.currentDifficulty]) this.currentDifficulty = 'easy';

        this.buildSky();
        this.buildClouds();

        // Back button.
        const back = this.add.text(16, 12, '← Title', {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.start('TitleScene'));
        back.on('pointerover', () => back.setScale(1.1));
        back.on('pointerout', () => back.setScale(1));

        // Title.
        const titleShadow = this.add.text(404, 54, 'RISE OF THE BLOB', {
            fontSize: '40px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0.45);
        const title = this.add.text(400, 50, 'RISE OF THE BLOB', {
            fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#7c2d4a', strokeThickness: 5
        }).setOrigin(0.5);
        this.tweens.add({
            targets: [title, titleShadow], y: '+=4',
            duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        // Tagline updates with selected level.
        this.taglineText = this.add.text(400, 90, LEVELS[this.currentLevel].tagline, {
            fontSize: '14px', color: '#ffd1dc', fontStyle: 'italic',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Blob preview with jetpack.
        this.previewContainer = this.add.container(400, 142);
        this.previewContainer.setScale(1.3);
        this.rebuildPreview();
        this.tweens.add({
            targets: this.previewContainer, y: '+=8',
            duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        // ----- Level picker (row of 4) -----
        this.add.text(400, 196, 'Level', {
            fontSize: '14px', color: '#ffd1dc', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        this.levelButtons = [];
        this.buildButtonRow(LEVEL_ORDER, 218, 110, 32, id => LEVELS[id], (id, btn) => {
            this.levelButtons.push({ id, ...btn });
        }, id => this.selectLevel(id), this.currentLevel);

        // ----- Difficulty picker (row of 4) -----
        this.add.text(400, 268, 'Difficulty', {
            fontSize: '14px', color: '#ffd1dc', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        this.difficultyButtons = [];
        this.buildButtonRow(DIFFICULTY_ORDER, 290, 110, 32, id => DIFFICULTY_CONFIG[id], (id, btn) => {
            this.difficultyButtons.push({ id, ...btn });
        }, id => this.selectDifficulty(id), this.currentDifficulty);

        this.difficultyBlurb = this.add.text(400, 338, DIFFICULTY_BLURBS[this.currentDifficulty], {
            fontSize: '13px', color: '#ffd1dc', fontStyle: 'italic',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // ----- Skin picker -----
        this.add.text(400, 376, 'Character', {
            fontSize: '14px', color: '#ffd1dc', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        const skinIds = Object.keys(SKINS);
        const swatchSize = 30;
        const swatchGap = 8;
        const swatchRow = skinIds.length * swatchSize + (skinIds.length - 1) * swatchGap;
        const swatchStart = 400 - swatchRow / 2 + swatchSize / 2;
        this.skinSwatches = [];
        skinIds.forEach((id, i) => {
            const x = swatchStart + i * (swatchSize + swatchGap);
            const skin = SKINS[id];
            const swatch = this.add.rectangle(x, 402, swatchSize, swatchSize, skin.body)
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
            });
            if (id === this.currentSkin) swatch.setScale(1.15);
            this.skinSwatches.push(swatch);
        });

        // ----- High score + start prompt -----
        const hsPanel = this.add.graphics();
        hsPanel.fillStyle(0x000000, 0.5);
        hsPanel.fillRoundedRect(280, 440, 240, 38, 10);
        hsPanel.lineStyle(2, 0xffd166, 0.55);
        hsPanel.strokeRoundedRect(280, 440, 240, 38, 10);

        this.highScoreText = this.add.text(400, 459, '', {
            fontSize: '16px', color: '#ffd166', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        this.refreshHighScore();

        this.add.text(400, 495, 'Move: A/D    Dash: W (10s cooldown)    Pause: P / ESC', {
            fontSize: '12px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        const prompt = this.add.text(400, 540, 'Press SPACE to Launch', {
            fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({
            targets: prompt, alpha: 0.55,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        this.input.once('pointerdown', () => sfx.init());
        this.input.keyboard.once('keydown', () => sfx.init());
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('RiseScene', {
                level: this.currentLevel,
                difficulty: this.currentDifficulty
            });
        });
    }

    // Generic button row helper. Each button id is looked up via `cfgFor`
    // to get a config object with `name` and a color (`accent` or `color`).
    buildButtonRow(ids, y, btnW, btnH, cfgFor, onCreate, onClick, selectedId) {
        const gap = 14;
        const rowW = ids.length * btnW + (ids.length - 1) * gap;
        const startX = 400 - rowW / 2;
        ids.forEach((id, i) => {
            const cfg = cfgFor(id);
            const bx = startX + i * (btnW + gap);
            const accentColor = cfg.color || cfg.accent || '#ffffff';
            const accentInt = Phaser.Display.Color.HexStringToColor(accentColor).color;

            const bg = this.add.graphics();
            const drawBg = (selected) => {
                bg.clear();
                bg.fillStyle(0x000000, selected ? 0.7 : 0.4);
                bg.fillRoundedRect(bx, y, btnW, btnH, 8);
                bg.lineStyle(2, accentInt, selected ? 1 : 0.5);
                bg.strokeRoundedRect(bx, y, btnW, btnH, 8);
            };
            drawBg(id === selectedId);

            const label = this.add.text(bx + btnW / 2, y + btnH / 2, cfg.name, {
                fontSize: '14px', color: accentColor, fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
            if (id === selectedId) label.setScale(1.08);

            const hit = this.add.rectangle(bx + btnW / 2, y + btnH / 2, btnW, btnH, 0xffffff, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerover', () => label.setScale(1.12));
            hit.on('pointerout', () => label.setScale(id === selectedId ? 1.08 : 1));
            hit.on('pointerdown', () => onClick(id));

            onCreate(id, { bg, label, drawBg });
        });
    }

    selectLevel(id) {
        if (id === this.currentLevel) return;
        this.currentLevel = id;
        localStorage.setItem('riseLevel', id);
        sfx.blip(523, 0.05, 'sine', 0.06);
        this.levelButtons.forEach(b => {
            b.drawBg(b.id === id);
            b.label.setScale(b.id === id ? 1.08 : 1);
        });
        this.taglineText.setText(LEVELS[id].tagline);
        this.refreshHighScore();
    }

    selectDifficulty(id) {
        if (id === this.currentDifficulty) return;
        this.currentDifficulty = id;
        localStorage.setItem('riseDifficulty', id);
        sfx.blip(660, 0.05, 'sine', 0.06);
        this.difficultyButtons.forEach(b => {
            b.drawBg(b.id === id);
            b.label.setScale(b.id === id ? 1.08 : 1);
        });
        this.difficultyBlurb.setText(DIFFICULTY_BLURBS[id]);
        this.refreshHighScore();
    }

    refreshHighScore() {
        const key = `riseHighScore_${this.currentLevel}_${this.currentDifficulty}`;
        const hs = Number(localStorage.getItem(key) || 0);
        const levelName = LEVELS[this.currentLevel].name;
        const diffName = DIFFICULTY_CONFIG[this.currentDifficulty].name;
        this.highScoreText.setText(`High (${levelName} / ${diffName}): ${hs}`);
    }

    rebuildPreview() {
        const skin = SKINS[this.currentSkin];
        this.previewContainer.removeAll(true);

        const pack = this.add.rectangle(-18, 2, 8, 24, 0x4a4a4a).setStrokeStyle(1, 0x111111);
        const tank = this.add.rectangle(-18, -4, 6, 8, 0xffd166).setStrokeStyle(1, 0x111111);
        const flame = this.add.triangle(-18, 18, 0, 0, 6, 12, -6, 12, 0xff6b35);
        const flameInner = this.add.triangle(-18, 18, 0, 2, 3, 8, -3, 8, 0xfff04d);
        this.tweens.add({
            targets: [flame, flameInner], scaleY: 1.4, alpha: 0.7,
            duration: 100, yoyo: true, repeat: -1
        });

        const body = this.add.rectangle(0, 0, 30, 40, skin.body).setStrokeStyle(2, skin.stroke);
        const eyeL = this.add.circle(-7, -7, 4, skin.eye);
        const eyeR = this.add.circle(7, -7, 4, skin.eye);
        const pupilL = this.add.circle(-7, -7, 2, skin.pupil);
        const pupilR = this.add.circle(7, -7, 2, skin.pupil);
        const mouth = this.add.rectangle(0, 7, 8, 2, skin.mouth);
        this.previewContainer.add([pack, tank, flame, flameInner, body, eyeL, eyeR, pupilL, pupilR, mouth]);
    }

    buildSky() {
        const g = this.add.graphics();
        const top = Phaser.Display.Color.IntegerToColor(0x5b9bd6);
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
