import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { SKINS, loadSkin, saveSkin } from '../achievements.js';
import { ATTACK_DIFFICULTY_CONFIG, BOSSES } from './attackScene.js';

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'insane'];
const DIFFICULTY_BLURBS = {
    easy:   'Baseline. Just you, the bosses, and bullets.',
    medium: '+20% boss HP. Bosses shoot 20% faster.',
    hard:   '+50% HP. 20% faster fire & movement. Lasers.',
    insane: '+100% HP. 50% faster fire & movement. Lasers.'
};

function formatMs(ms) {
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = totalSec - m * 60;
    const sStr = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
    return m > 0 ? `${m}:${sStr}` : `0:${sStr}`;
}

export default class AttackMenuScene extends Phaser.Scene {
    constructor() {
        super('AttackMenuScene');
    }

    create() {
        this.currentSkin = loadSkin();
        this.currentDifficulty = localStorage.getItem('attackDifficulty') || 'easy';
        if (!ATTACK_DIFFICULTY_CONFIG[this.currentDifficulty]) this.currentDifficulty = 'easy';
        this.practiceMode = localStorage.getItem('attackPracticeMode') === '1';
        this.practiceBossIndex = Number(localStorage.getItem('attackPracticeBoss') || 0);
        if (!Number.isInteger(this.practiceBossIndex) || this.practiceBossIndex < 0 || this.practiceBossIndex >= BOSSES.length) {
            this.practiceBossIndex = 0;
        }

        this.buildBackground();

        // Back button.
        const back = this.add.text(16, 12, '← Title', {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.start('TitleScene'));
        back.on('pointerover', () => back.setScale(1.1));
        back.on('pointerout', () => back.setScale(1));

        // Title.
        const titleShadow = this.add.text(404, 50, 'BLOB ATTACK', {
            fontSize: '40px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0.45);
        const title = this.add.text(400, 46, 'BLOB ATTACK', {
            fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#7c2d4a', strokeThickness: 5
        }).setOrigin(0.5);
        this.tweens.add({
            targets: [title, titleShadow], y: '+=4',
            duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        this.add.text(400, 84, 'Five bosses. One blob. Don\'t get hit.', {
            fontSize: '13px', color: '#ffd1dc', fontStyle: 'italic',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Blob preview.
        this.previewContainer = this.add.container(400, 130);
        this.previewContainer.setScale(1.2);
        this.rebuildPreview();
        this.tweens.add({
            targets: this.previewContainer, y: '+=6',
            duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        // ----- Boss lineup row (clickable in practice mode) -----
        this.add.text(255, 184, 'Boss Lineup', {
            fontSize: '13px', color: '#ffd166', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Practice toggle, inline with the lineup label.
        this.practiceToggle = this.add.text(545, 184, '', {
            fontSize: '13px', color: '#9be7ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.practiceToggle.on('pointerdown', () => {
            this.practiceMode = !this.practiceMode;
            localStorage.setItem('attackPracticeMode', this.practiceMode ? '1' : '0');
            sfx.blip(660, 0.05, 'sine', 0.06);
            this.refreshPracticeToggle();
            this.refreshBossLineup();
            this.refreshHighScore();
            this.refreshLaunchPrompt();
        });
        this.refreshPracticeToggle();

        this.bossSlots = [];
        this.buildBossLineup(218);

        // High score (per selection).
        this.highScoreText = this.add.text(400, 268, '', {
            fontSize: '13px', color: '#ffd166', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        this.refreshHighScore();

        // ----- Difficulty picker -----
        this.add.text(400, 296, 'Difficulty', {
            fontSize: '14px', color: '#ffd1dc', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        this.difficultyButtons = [];
        this.buildDifficultyRow(316, 110, 32);

        this.difficultyBlurb = this.add.text(400, 364, DIFFICULTY_BLURBS[this.currentDifficulty], {
            fontSize: '13px', color: '#ffd1dc', fontStyle: 'italic',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // ----- Skin picker -----
        this.add.text(400, 400, 'Character', {
            fontSize: '14px', color: '#ffd1dc', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        const skinIds = Object.keys(SKINS);
        const swatchSize = 26;
        const swatchGap = 8;
        const swatchRow = skinIds.length * swatchSize + (skinIds.length - 1) * swatchGap;
        const swatchStart = 400 - swatchRow / 2 + swatchSize / 2;
        this.skinSwatches = [];
        skinIds.forEach((id, i) => {
            const x = swatchStart + i * (swatchSize + swatchGap);
            const skin = SKINS[id];
            const swatch = this.add.rectangle(x, 424, swatchSize, swatchSize, skin.body)
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

        // Controls + launch.
        this.add.text(400, 475, 'Move: WASD    Shoot: SPACE    Pause: P / ESC', {
            fontSize: '12px', color: '#cfe4ff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        this.launchPrompt = this.add.text(400, 520, '', {
            fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.refreshLaunchPrompt();
        this.tweens.add({
            targets: this.launchPrompt, alpha: 0.55,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        // Lives summary hint.
        this.add.text(400, 555, this.currentDifficulty === 'insane'
            ? '⚠ Insane: 1 life, no second chances.'
            : '3 lives. Boss bullets cost a life; shields absorb one hit.', {
            fontSize: '11px', color: '#cfe4ff', fontStyle: 'italic',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        this.livesHint = this.children.list[this.children.list.length - 1];

        this.input.once('pointerdown', () => sfx.init());
        this.input.keyboard.once('keydown', () => sfx.init());
        this.input.keyboard.once('keydown-SPACE', () => this.launch());
    }

    launch() {
        const payload = { difficulty: this.currentDifficulty };
        if (this.practiceMode) payload.practiceBossIndex = this.practiceBossIndex;
        this.scene.start('AttackScene', payload);
    }

    refreshPracticeToggle() {
        const label = this.practiceMode ? '[ Practice: ON ]' : '[ Practice: OFF ]';
        const color = this.practiceMode ? '#ffd166' : '#9be7ff';
        this.practiceToggle.setText(label);
        this.practiceToggle.setColor(color);
    }

    refreshLaunchPrompt() {
        if (!this.launchPrompt) return;
        const target = this.practiceMode
            ? `Press SPACE — ${BOSSES[this.practiceBossIndex].name} Practice`
            : 'Press SPACE to Fight';
        this.launchPrompt.setText(target);
    }

    refreshHighScore() {
        if (!this.highScoreText) return;
        const diff = ATTACK_DIFFICULTY_CONFIG[this.currentDifficulty].name;
        if (this.practiceMode) {
            const key = `attackBest_boss${this.practiceBossIndex}_${this.currentDifficulty}`;
            const ms = Number(localStorage.getItem(key) || 0);
            const bossName = BOSSES[this.practiceBossIndex].name;
            this.highScoreText.setText(
                ms > 0
                    ? `Best ${bossName} / ${diff}: ${formatMs(ms)}`
                    : `Best ${bossName} / ${diff}: —`
            );
        } else {
            const key = `attackBest_full_${this.currentDifficulty}`;
            const ms = Number(localStorage.getItem(key) || 0);
            this.highScoreText.setText(
                ms > 0
                    ? `Best full run / ${diff}: ${formatMs(ms)}`
                    : `Best full run / ${diff}: —`
            );
        }
    }

    buildBossLineup(y) {
        const slotW = 52, slotGap = 12;
        const rowW = BOSSES.length * slotW + (BOSSES.length - 1) * slotGap;
        const startX = 400 - rowW / 2 + slotW / 2;
        BOSSES.forEach((b, i) => {
            const x = startX + i * (slotW + slotGap);
            const ring = this.add.circle(x, y, slotW / 2, b.color, 0).setStrokeStyle(2, b.color, 0.6);
            const blob = this.add.circle(x, y, slotW / 2 - 8, b.color);
            const eyeWhite = this.add.circle(x, y - 3, 6, 0xffffff);
            const eyePupil = this.add.circle(x, y - 3, 3, 0x111111);
            const idx = this.add.text(x, y + slotW / 2 + 8, `${i + 1}`, {
                fontSize: '12px', color: '#ffd166', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);

            // Bob.
            this.tweens.add({
                targets: [blob, ring, eyeWhite, eyePupil], y: '+=4',
                duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.inOut'
            });

            // Clickable for practice select.
            const hit = this.add.circle(x, y, slotW / 2 + 4, 0xffffff, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                if (!this.practiceMode) return;
                this.practiceBossIndex = i;
                localStorage.setItem('attackPracticeBoss', String(i));
                sfx.blip(660, 0.05, 'sine', 0.06);
                this.refreshBossLineup();
                this.refreshHighScore();
                this.refreshLaunchPrompt();
            });

            this.bossSlots.push({ i, ring, blob, idx, hit });
        });
        this.refreshBossLineup();
    }

    refreshBossLineup() {
        for (const s of this.bossSlots) {
            const isSelected = this.practiceMode && s.i === this.practiceBossIndex;
            // Selected boss gets a bright ring and bumped scale.
            s.ring.setStrokeStyle(2, BOSSES[s.i].color, isSelected ? 1 : 0.55);
            s.ring.setScale(isSelected ? 1.18 : 1);
            s.blob.setScale(isSelected ? 1.18 : 1);
            s.idx.setColor(isSelected ? '#ffd166' : '#cfe4ff');
            s.idx.setText(isSelected ? `★ ${s.i + 1}` : `${s.i + 1}`);
        }
    }

    buildDifficultyRow(y, btnW, btnH) {
        const gap = 14;
        const rowW = DIFFICULTY_ORDER.length * btnW + (DIFFICULTY_ORDER.length - 1) * gap;
        const startX = 400 - rowW / 2;
        DIFFICULTY_ORDER.forEach((id, i) => {
            const cfg = ATTACK_DIFFICULTY_CONFIG[id];
            const bx = startX + i * (btnW + gap);
            const accentInt = Phaser.Display.Color.HexStringToColor(cfg.color).color;

            const bg = this.add.graphics();
            const drawBg = (selected) => {
                bg.clear();
                bg.fillStyle(0x000000, selected ? 0.7 : 0.4);
                bg.fillRoundedRect(bx, y, btnW, btnH, 8);
                bg.lineStyle(2, accentInt, selected ? 1 : 0.5);
                bg.strokeRoundedRect(bx, y, btnW, btnH, 8);
            };
            drawBg(id === this.currentDifficulty);

            const label = this.add.text(bx + btnW / 2, y + btnH / 2, cfg.name, {
                fontSize: '14px', color: cfg.color, fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
            if (id === this.currentDifficulty) label.setScale(1.08);

            const hit = this.add.rectangle(bx + btnW / 2, y + btnH / 2, btnW, btnH, 0xffffff, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerover', () => label.setScale(1.12));
            hit.on('pointerout', () => label.setScale(id === this.currentDifficulty ? 1.08 : 1));
            hit.on('pointerdown', () => this.selectDifficulty(id));

            this.difficultyButtons.push({ id, drawBg, label });
        });
    }

    selectDifficulty(id) {
        if (id === this.currentDifficulty) return;
        this.currentDifficulty = id;
        localStorage.setItem('attackDifficulty', id);
        sfx.blip(660, 0.05, 'sine', 0.06);
        this.difficultyButtons.forEach(b => {
            b.drawBg(b.id === id);
            b.label.setScale(b.id === id ? 1.08 : 1);
        });
        this.difficultyBlurb.setText(DIFFICULTY_BLURBS[id]);
        this.refreshHighScore();
        if (this.livesHint) {
            this.livesHint.setText(id === 'insane'
                ? '⚠ Insane: 1 life, no second chances.'
                : '3 lives. Boss bullets cost a life; shields absorb one hit.');
        }
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
        // Tiny aiming reticle above the blob to hint at the shooting.
        const reticle = this.add.circle(0, -28, 4, 0xff5e5e, 0).setStrokeStyle(1, 0xff5e5e, 0.9);
        this.previewContainer.add([body, eyeL, eyeR, pupilL, pupilR, mouth, reticle]);
        this.tweens.add({
            targets: reticle, alpha: 0.3, duration: 500, yoyo: true, repeat: -1
        });
    }

    buildBackground() {
        const g = this.add.graphics();
        const top = Phaser.Display.Color.IntegerToColor(0x1a0a2e);
        const bot = Phaser.Display.Color.IntegerToColor(0x4a1f56);
        const stripes = 36;
        for (let i = 0; i < stripes; i++) {
            const t = i / (stripes - 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, 1, t);
            g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            g.fillRect(0, i * (600 / stripes), 800, Math.ceil(600 / stripes) + 1);
        }
        for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
            const s = Phaser.Math.FloatBetween(0.4, 1.2);
            this.add.circle(x, y, s, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.7));
        }
    }
}
