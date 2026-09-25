import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { SKINS, loadSkin } from '../achievements.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        this.skinId = loadSkin();

        this.buildSky();
        this.buildMountains();
        this.buildClouds();

        // Big title.
        const titleShadow = this.add.text(404, 84, 'BLOB UNIVERSE', {
            fontSize: '60px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0.45);

        const title = this.add.text(400, 80, 'BLOB UNIVERSE', {
            fontSize: '60px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#1f3a68', strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({
            targets: [title, titleShadow], y: '+=5',
            duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        this.add.text(400, 130, 'Two adventures, one blob', {
            fontSize: '18px', color: '#cfe4ff', fontStyle: 'italic',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Game cards (three across — 240 wide each, at x=140 / 400 / 660).
        this.buildCard(140, 360, 'Blob Ascent',
            'Climb procedural platforms.\nDouble jump, dash, combo.',
            0x2ecc71, 'plain', 'StartMenuScene');
        this.buildCard(400, 360, 'Rise of the Blob',
            'Jetpack up forever.\nDodge everything.',
            0xfb7185, 'jetpack', 'RiseMenuScene');
        this.buildCard(660, 360, 'Blob Attack',
            'Bullet-hell bosses.\nWASD to fly, SPACE to shoot.',
            0xc084fc, 'shooter', 'AttackMenuScene');

        // Bottom hint + mute.
        this.add.text(400, 575, 'Click a game to begin', {
            fontSize: '16px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0.85);

        this.muteText = this.add.text(792, 12,
            sfx.isMuted() ? '🔇 M' : '🔊 M', {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0);

        this.input.keyboard.on('keydown-M', () => {
            sfx.toggle();
            sfx.blip(440, 0.05, 'square', 0.05);
            this.muteText.setText(sfx.isMuted() ? '🔇 M' : '🔊 M');
        });

        // Unlock audio on first input.
        this.input.once('pointerdown', () => sfx.init());
        this.input.keyboard.once('keydown', () => sfx.init());
    }

    buildCard(x, y, name, subtitle, accent, kind, targetScene) {
        const w = 240, h = 360;
        const card = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.55);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
        bg.lineStyle(3, accent, 0.9);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
        card.add(bg);

        const nameText = this.add.text(0, -h / 2 + 28, name, {
            fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        card.add(nameText);

        const preview = this.buildBlobPreview(kind);
        preview.x = 0;
        preview.y = -10;
        preview.setScale(1.7);
        card.add(preview);

        this.tweens.add({
            targets: preview, y: -18,
            duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        });

        const sub = this.add.text(0, 75, subtitle, {
            fontSize: '13px', color: '#cfe4ff', align: 'center',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        card.add(sub);

        const btn = this.add.graphics();
        btn.fillStyle(accent, 0.9);
        btn.fillRoundedRect(-70, h / 2 - 60, 140, 40, 10);
        btn.lineStyle(2, 0xffffff, 0.85);
        btn.strokeRoundedRect(-70, h / 2 - 60, 140, 40, 10);
        card.add(btn);

        const btnText = this.add.text(0, h / 2 - 40, 'PLAY', {
            fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        card.add(btnText);

        const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });
        card.add(hit);

        hit.on('pointerover', () => {
            this.tweens.killTweensOf(card);
            this.tweens.add({ targets: card, scale: 1.04, duration: 150 });
        });
        hit.on('pointerout', () => {
            this.tweens.killTweensOf(card);
            this.tweens.add({ targets: card, scale: 1, duration: 150 });
        });
        hit.on('pointerdown', () => {
            sfx.blip(523, 0.08, 'sine', 0.08);
            this.tweens.add({
                targets: card, scale: 0.95, duration: 100, yoyo: true,
                onComplete: () => this.scene.start(targetScene)
            });
        });
    }

    buildBlobPreview(kind) {
        const skin = SKINS[this.skinId] || SKINS.yellow;
        const c = this.add.container(0, 0);

        if (kind === 'jetpack') {
            const pack = this.add.rectangle(-18, 2, 8, 24, 0x4a4a4a).setStrokeStyle(1, 0x111111);
            const tank = this.add.rectangle(-18, -4, 6, 8, 0xffd166).setStrokeStyle(1, 0x111111);
            const flame = this.add.triangle(-18, 18, 0, 0, 6, 12, -6, 12, 0xff6b35);
            const flameInner = this.add.triangle(-18, 18, 0, 2, 3, 8, -3, 8, 0xfff04d);
            this.tweens.add({
                targets: [flame, flameInner], scaleY: 1.4, alpha: 0.7,
                duration: 100, yoyo: true, repeat: -1
            });
            c.add([pack, tank, flame, flameInner]);
        }

        const body = this.add.rectangle(0, 0, 30, 40, skin.body).setStrokeStyle(2, skin.stroke);
        const eyeL = this.add.circle(-7, -7, 4, skin.eye);
        const eyeR = this.add.circle(7, -7, 4, skin.eye);
        const pupilL = this.add.circle(-7, -7, 2, skin.pupil);
        const pupilR = this.add.circle(7, -7, 2, skin.pupil);
        const mouth = this.add.rectangle(0, 7, 8, 2, skin.mouth);
        c.add([body, eyeL, eyeR, pupilL, pupilR, mouth]);

        if (kind === 'shooter') {
            // Small green projectile rising above the blob to telegraph the shooting mechanic.
            const bullet = this.add.rectangle(0, -32, 5, 12, 0x9bff9b).setStrokeStyle(1, 0x1f3a1f);
            this.tweens.add({
                targets: bullet, y: -56, alpha: 0,
                duration: 600, repeat: -1, ease: 'Cubic.out',
                onRepeat: () => { bullet.y = -32; bullet.alpha = 1; }
            });
            c.add(bullet);
        }

        return c;
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
        cloud(120, 220, 0.9);
        cloud(560, 200, 1.1);
        cloud(300, 250, 0.8);
        cloud(680, 280, 0.7);
    }
}
