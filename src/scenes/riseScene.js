import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { SKINS, loadSkin } from '../achievements.js';

const RISE_SPEED = 230;       // constant upward px/sec
const HORIZONTAL_SPEED = 240; // px/sec for A/D

// All levels share the same height thresholds; only the themes differ.
const BAND_THRESHOLDS = [3000, 7000, 12000];

// Per-level theme data. Each level has:
//   bands         — 4 entries, each with: top/bot gradient, stars, landscape (0..1
//                   fade for the cave-ground / grass-hills layer), crystals, name, textColor.
//   platforms     — 4 platform style entries (color, accent, hint).
//   levelHazard   — periodic threat baked into the level (null = none).
//                   'monkey' / 'current' / 'helicopter' so far.
//   rainHazard    — emoji that falls from the sky in Insane mode.
//   tagline       — shown on the menu when this level is selected.
export const LEVELS = {
    grass: {
        id: 'grass',
        name: 'Grassland',
        accent: '#7cc44e',
        tagline: 'Cave → Grass → Sky → Space',
        bands: [
            // Cave — deep navy → mid blue, stalactites + god rays.
            { top: 0x0a1a35, bot: 0x355680, stars: 0, landscape: 0, crystals: 0,
              stalactites: 0.9, godRays: 0.5, caveFog: 0.7, trees: 0, bigClouds: 0, planets: 0, nebula: 0,
              name: 'Cave', textColor: '#88c8f0' },
            // Grassland — bright sky, fluffy clouds, hills + tree silhouettes.
            { top: 0x7bb8e6, bot: 0xc8e0f0, stars: 0, landscape: 1, crystals: 0,
              stalactites: 0, godRays: 0, caveFog: 0, trees: 1, bigClouds: 0.8, planets: 0, nebula: 0,
              name: 'Grassland', textColor: '#7cc44e' },
            // Sky — fluffy anime clouds, lighter gradient.
            { top: 0x5a9fd4, bot: 0xcfe4f0, stars: 0, landscape: 0.3, crystals: 0,
              stalactites: 0, godRays: 0, caveFog: 0, trees: 0.2, bigClouds: 1, planets: 0, nebula: 0,
              name: 'Sky', textColor: '#cfe4ff' },
            // Space — pure black, white-dot stars, distant planets, edge asteroids.
            { top: 0x000000, bot: 0x000000, stars: 1, landscape: 0, crystals: 0,
              stalactites: 0, godRays: 0, caveFog: 0, trees: 0, bigClouds: 0, planets: 1, nebula: 0,
              name: 'Space', textColor: '#ffffff' }
        ],
        platforms: [
            { color: 0x2c3a55, accent: 0x88c8f0, hint: 'stone' },   // cave: dark stone + cyan
            { color: 0x6b3f2e, accent: 0x7cc44e, hint: 'plank' },   // grass: dirt + grass top
            { color: 0xffffff, accent: 0x88d0e8, hint: 'cloud' },   // sky: white + teal outline
            { color: 0x4a2a78, accent: 0x88d8e8, hint: 'rock'  }    // space: purple + cyan crystals
        ],
        levelHazard: null,
        rainHazard:  { emoji: '☄️', color: 0x6b5b40 }
    },
    jungle: {
        id: 'jungle',
        name: 'Jungle',
        accent: '#84cc16',
        tagline: 'Forest Floor → Treetops → Ruins → Skybreak',
        bands: [
            // Forest Floor — atmospheric teal swamp
            { top: 0x0a2530, bot: 0x18404a, stars: 0, name: 'Forest Floor',   textColor: '#88c0c8' },
            // Treetops — pastel sky with pink/cream clouds
            { top: 0x88b8e0, bot: 0xc8dcec, stars: 0, name: 'Treetops',       textColor: '#fcd8e0' },
            // Ancient Ruins — bright blue sky over the aqueduct
            { top: 0x88c0e4, bot: 0xc8dce8, stars: 0, name: 'Ancient Ruins',  textColor: '#9b8a6a' },
            // Skybreak — opening sky, sun rays piercing
            { top: 0x6cb6e4, bot: 0xfff0c8, stars: 0, name: 'Skybreak',       textColor: '#fef08a' }
        ],
        platforms: [
            { color: 0x553b1f, accent: 0x8b6b3a, hint: 'log' },
            { color: 0x355a25, accent: 0x86c266, hint: 'leaves' },
            { color: 0x9b8a6a, accent: 0x4a8c2e, hint: 'stone' },
            { color: 0xa3e635, accent: 0xfef08a, hint: 'leaves' }
        ],
        levelHazard: 'monkey',
        rainHazard:  { emoji: '🥥', color: 0x553b1f }
    },
    ocean: {
        id: 'ocean',
        name: 'Ocean',
        accent: '#67e8f9',
        tagline: 'Ocean Floor → Deep → Mid → Beach',
        bands: [
            // Ocean Floor — sandy bottom with coral, reefs, distant shipwrecks
            { top: 0x1a5a8a, bot: 0x3b95cf, stars: 0, name: 'Ocean Floor',   textColor: '#fb923c' },
            // Deep Ocean — black murky water, bioluminescent life
            { top: 0x010408, bot: 0x041020, stars: 0, name: 'Deep Ocean',    textColor: '#88d8e8' },
            // Mid Ocean — bright blue, fish + whales + dolphins
            { top: 0x3b95cf, bot: 0x88c4e0, stars: 0, name: 'Mid Ocean',     textColor: '#bae6fd' },
            // Surface / Beach — sunset over the water
            { top: 0xff8a3a, bot: 0xffd4a8, stars: 0, name: 'Beach Sunset',  textColor: '#fff2d8' }
        ],
        platforms: [
            { color: 0xfb923c, accent: 0xff7ac4, hint: 'reef' },   // ocean floor: coral
            { color: 0x0a2840, accent: 0x88d8e8, hint: 'reef' },   // deep: dark with bio
            { color: 0x6b8bd4, accent: 0xbae6fd, hint: 'wave' },   // mid: blue water
            { color: 0xfde68a, accent: 0xefc88c, hint: 'wave' }    // beach: sand
        ],
        levelHazard: 'current',
        rainHazard:  { emoji: '🦈', color: 0x6b8bd4 }
    },
    city: {
        id: 'city',
        name: 'City',
        accent: '#fbbf24',
        tagline: 'Street → Skyscrapers → Rooftops → Night Sky',
        bands: [
            // Street Level — bright morning sky
            { top: 0x88c4e0, bot: 0xc8e0ec, stars: 0, name: 'Street Level', textColor: '#fbbf24' },
            // Skyscrapers — clear daytime blue
            { top: 0x6cb6e4, bot: 0xa8d4ec, stars: 0, name: 'Skyscrapers',  textColor: '#fde68a' },
            // Rooftops — dusk / sunset
            { top: 0xff8a3a, bot: 0xfde68a, stars: 0, name: 'Rooftops',     textColor: '#ff8a3a' },
            // Night Sky — deep night with stars
            { top: 0x05050f, bot: 0x1a1c4a, stars: 1, name: 'Night Sky',    textColor: '#fbcfe8' }
        ],
        platforms: [
            { color: 0x6b6b80, accent: 0x9b9bb0, hint: 'concrete' },  // street: gray concrete
            { color: 0x4a5a70, accent: 0xfde890, hint: 'glass' },     // skyscrapers: window glass
            { color: 0x9b3b1c, accent: 0x2a8c4a, hint: 'concrete' },  // rooftops: brick with moss
            { color: 0x2a2a4a, accent: 0xfdc870, hint: 'neon' }       // night: lit window panels
        ],
        levelHazard: 'helicopter',
        rainHazard:  { emoji: '🧱', color: 0x9b3b1c }
    }
};

export const LEVEL_ORDER = ['grass', 'jungle', 'ocean', 'city'];

function bandForHeight(h) {
    for (let i = 0; i < BAND_THRESHOLDS.length; i++) {
        if (h < BAND_THRESHOLDS[i]) return i;
    }
    return BAND_THRESHOLDS.length;
}

// Each band gets a quiet "ease-in" stretch at the start so the player can
// reposition before obstacles arrive.
const SAFE_ZONES = [
    { start: 0,     length: 700 },  // cave start — generous first-launch buffer
    { start: 3000,  length: 300 },  // grass transition
    { start: 7000,  length: 300 },  // sky transition
    { start: 12000, length: 400 }   // space transition
];

function inSafeZone(h) {
    for (const z of SAFE_ZONES) {
        if (h >= z.start && h < z.start + z.length) return true;
    }
    return false;
}

// Difficulty modes. Each picks what platform variants can spawn + whether
// asteroids rain from the top.
//
// Variants:
//   basic    — static bar
//   hMove    — slides side to side
//   vMove    — small up/down bob
//   long     — wider span (only available in hard+)
//   short    — narrow span (only available in hard+)
export const DIFFICULTY_CONFIG = {
    easy:   { name: 'Easy',   color: '#a0e8a0', variants: ['basic'],
              asteroids: false, asteroidDelay: 0,    twoBarBias: 0 },
    medium: { name: 'Medium', color: '#9be7ff', variants: ['basic', 'basic', 'hMove'],
              asteroids: false, asteroidDelay: 0,    twoBarBias: 0.1 },
    hard:   { name: 'Hard',   color: '#ffd166', variants: ['basic', 'hMove', 'vMove', 'long', 'short'],
              asteroids: false, asteroidDelay: 0,    twoBarBias: 0.2 },
    insane: { name: 'Insane', color: '#ff5e5e', variants: ['basic', 'hMove', 'vMove', 'long', 'short'],
              asteroids: true,  asteroidDelay: 1800, twoBarBias: 0.25 }
};

export default class RiseScene extends Phaser.Scene {
    constructor() {
        super('RiseScene');
    }

    init(data) {
        const diffId = (data && data.difficulty) || localStorage.getItem('riseDifficulty') || 'easy';
        this.difficultyId = DIFFICULTY_CONFIG[diffId] ? diffId : 'easy';
        this.difficulty = DIFFICULTY_CONFIG[this.difficultyId];

        const levelId = (data && data.level) || localStorage.getItem('riseLevel') || 'grass';
        this.levelId = LEVELS[levelId] ? levelId : 'grass';
        this.level = LEVELS[this.levelId];

        // High score is per-(level, difficulty).
        this.highScoreKey = `riseHighScore_${this.levelId}_${this.difficultyId}`;
    }

    create() {
        this.gameOver = false;
        this.isPaused = false;
        this.skinId = loadSkin();
        this.highScore = Number(localStorage.getItem(this.highScoreKey) || 0);
        this.height = 0;
        this.score = 0;
        this.lastHeightForScore = 0;
        this.bandIndex = -1;

        this.shieldCharges = 0;
        this.invulnerableUntil = 0;
        this.tinyActive = false;
        this.activeEffects = {
            doublePoints: 0,
            juggernaut: 0,
            speedBoost: 0,
            tinyMode: 0
        };
        this.doublePointsMultiplier = 1;

        this.physics.world.setBounds(0, -500000, 800, 500600);

        sfx.init();

        this.buildBackground();
        this.buildPlayer();

        this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.powerups  = this.physics.add.group({ allowGravity: false, immovable: true });

        // Pre-spawn rows so the player has room to read incoming obstacles.
        this.nextRowY = 380;
        this.spawnRow(this.nextRowY);
        for (let i = 0; i < 30; i++) {
            this.nextRowY -= this.rowSpacing();
            this.spawnRow(this.nextRowY);
        }

        this.physics.add.overlap(this.player, this.platforms, this.handlePlatformOverlap, null, this);
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);

        this.keys = {
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
        };
        this.cursors = this.input.keyboard.createCursorKeys();

        this.dashCooldownUntil = 0;
        this.dashUntil = 0;
        this.dashDir = 1;
        this.lastMoveDir = 1;

        this.input.keyboard.on('keydown-P', () => this.togglePause());
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-M', () => {
            sfx.toggle();
            sfx.blip(440, 0.05, 'square', 0.05);
            this.muteHint.setText(sfx.isMuted() ? '🔇' : '🔊');
        });

        this.buildHUD();
        this.refreshBand();

        // Insane mode rains the level's themed hazard from the top.
        this.asteroidEvent = null;
        if (this.difficulty.asteroids) {
            this.asteroidEvent = this.time.addEvent({
                delay: this.difficulty.asteroidDelay,
                loop: true,
                callback: () => this.spawnRainHazard()
            });
        }

        // Level-specific recurring hazard (present at all difficulties).
        this.levelHazardEvent = null;
        this.currentDir = 0;
        this.currentUntil = 0;
        if (this.level.levelHazard === 'monkey') {
            this.levelHazardEvent = this.time.addEvent({
                delay: 3800, loop: true,
                callback: () => this.spawnSideHazard('🐒', 360, '#fbbf24')
            });
        } else if (this.level.levelHazard === 'helicopter') {
            this.levelHazardEvent = this.time.addEvent({
                delay: 5200, loop: true,
                callback: () => this.spawnSideHazard('🚁', 230, '#fbbf24')
            });
        } else if (this.level.levelHazard === 'current') {
            this.levelHazardEvent = this.time.addEvent({
                delay: 5500, loop: true,
                callback: () => this.spawnCurrent()
            });
        }
    }

    rowSpacing() {
        return 110;
    }

    // ----- Drawing helpers for irregular painterly silhouettes -----
    drawJaggedStalactite(g, topX, topY, w, h) {
        const pts = [];
        const segs = 4;
        pts.push({ x: topX - w / 2, y: topY });
        pts.push({ x: topX + w / 2, y: topY });
        // Right side tapering to bottom point.
        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const baseX = topX + (w / 2) * (1 - t);
            pts.push({ x: baseX + (Math.random() - 0.5) * w * 0.35, y: topY + t * h });
        }
        // Left side back up.
        for (let i = segs - 1; i >= 1; i--) {
            const t = i / segs;
            const baseX = topX - (w / 2) * (1 - t);
            pts.push({ x: baseX + (Math.random() - 0.5) * w * 0.35, y: topY + t * h });
        }
        g.fillPoints(pts, true);
    }

    drawCliffEdge(g, side, topY, height) {
        const isLeft = side === 'left';
        const baseX = isLeft ? -10 : 810;
        const dir = isLeft ? 1 : -1;
        const innerWidth = Phaser.Math.Between(45, 90);
        const pts = [];
        pts.push({ x: baseX, y: topY });
        pts.push({ x: baseX, y: topY + height });
        pts.push({ x: baseX + dir * Phaser.Math.Between(20, 50), y: topY + height });
        // Jagged inner edge going up.
        const segs = 10;
        for (let i = 0; i < segs; i++) {
            const t = i / segs;
            const px = baseX + dir * (innerWidth * (0.55 + Math.random() * 0.65));
            const py = topY + height - t * height + (Math.random() - 0.5) * 18;
            pts.push({ x: px, y: py });
        }
        pts.push({ x: baseX + dir * Phaser.Math.Between(15, 30), y: topY });
        g.fillPoints(pts, true);
    }

    drawBigCloud(g, cx, cy, scale, baseAlpha, shadow) {
        // Shadow base layer.
        g.fillStyle(shadow, baseAlpha * 0.9);
        g.fillCircle(cx - 36 * scale, cy + 12 * scale, 30 * scale);
        g.fillCircle(cx + 30 * scale, cy + 14 * scale, 34 * scale);
        g.fillCircle(cx + 64 * scale, cy + 8 * scale, 26 * scale);
        // Bright top.
        g.fillStyle(0xffffff, baseAlpha);
        g.fillCircle(cx - 36 * scale, cy, 30 * scale);
        g.fillCircle(cx - 8 * scale, cy - 16 * scale, 34 * scale);
        g.fillCircle(cx + 24 * scale, cy - 6 * scale, 40 * scale);
        g.fillCircle(cx + 58 * scale, cy, 28 * scale);
        g.fillCircle(cx + 82 * scale, cy + 8 * scale, 24 * scale);
    }

    drawIrregularRock(g, cx, cy, r) {
        const pts = [];
        const segs = 10;
        for (let i = 0; i < segs; i++) {
            const angle = (i / segs) * Math.PI * 2;
            const rad = r * (0.7 + Math.random() * 0.55);
            pts.push({ x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad });
        }
        g.fillPoints(pts, true);
    }

    buildBackground() {
        // ===== Sky gradient (drawn dynamically on band change) =====
        this.skyBg = this.add.graphics().setScrollFactor(0).setDepth(-100);

        // ===== Stars (space band, drawn lazily on first space entry) =====
        this.starsBg = this.add.graphics().setScrollFactor(0).setDepth(-99);
        this.starsBg.setAlpha(0);
        this.starsDrawn = false;

        // ===== Per-band fixed backdrops + scrolling edge silhouettes =====
        // Backdrops are scrollFactor (0,0) — they stay glued to the camera viewport
        // so the "back background" doesn't repeat as the player climbs.
        // Edges scroll at high parallax to create the sense of movement.
        this.bandBackdrops = [];
        this.bandEdges = [];
        for (let i = 0; i < 4; i++) {
            const backdrop = this.add.graphics().setScrollFactor(0).setDepth(-95);
            backdrop.setAlpha(0);
            this.drawBackdrop(backdrop, i);
            this.bandBackdrops.push(backdrop);

            const edges = this.add.graphics().setScrollFactor(0, 0.85).setDepth(-82);
            edges.setAlpha(0);
            this.drawEdges(edges, i);
            this.bandEdges.push(edges);
        }

        // ===== Starting ground (visible briefly, scrolls out of view) =====
        this.ground = this.add.graphics().setDepth(-70);
        this.drawGroundForLevel();
    }

    drawGroundForLevel() {
        const g = this.ground;
        g.clear();
        if (this.levelId === 'jungle') {
            g.fillStyle(0x0a2418, 1);
            g.fillRect(0, 620, 800, 200);
            g.fillStyle(0x355a25, 1);
            g.fillRect(0, 614, 800, 8);
        } else if (this.levelId === 'ocean') {
            g.fillStyle(0xc8b884, 1);
            g.fillRect(0, 620, 800, 200);
            g.fillStyle(0xfde68a, 1);
            g.fillRect(0, 614, 800, 8);
        } else if (this.levelId === 'city') {
            // Asphalt road with sidewalk curb.
            g.fillStyle(0x3a3a3a, 1);
            g.fillRect(0, 620, 800, 200);
            g.fillStyle(0xc8c8c8, 1);
            g.fillRect(0, 614, 800, 8);
        } else {
            // Grass + default: dark cave floor.
            g.fillStyle(0x0a1428, 1);
            g.fillRect(0, 620, 800, 200);
            g.fillStyle(0x223656, 1);
            g.fillRect(0, 614, 800, 8);
        }
    }

    drawBackdrop(g, bandIdx) {
        if (this.levelId === 'jungle') {
            [
                () => this.drawJungleFloorBg(g),
                () => this.drawJungleTreetopsBg(g),
                () => this.drawJungleRuinsBg(g),
                () => this.drawJungleSkybreakBg(g)
            ][bandIdx]();
        } else if (this.levelId === 'ocean') {
            [
                () => this.drawOceanFloorBg(g),
                () => this.drawDeepOceanBg(g),
                () => this.drawMidOceanBg(g),
                () => this.drawBeachSunsetBg(g)
            ][bandIdx]();
        } else if (this.levelId === 'city') {
            [
                () => this.drawCityStreetBg(g),
                () => this.drawCitySkyscrapersBg(g),
                () => this.drawCityRooftopsBg(g),
                () => this.drawCityNightBg(g)
            ][bandIdx]();
        } else {
            [
                () => this.drawGrassCaveBg(g),
                () => this.drawGrassGrasslandBg(g),
                () => this.drawGrassSkyBg(g),
                () => this.drawGrassSpaceBg(g)
            ][bandIdx]();
        }
    }

    drawEdges(g, bandIdx) {
        if (this.levelId === 'jungle') {
            [
                () => this.drawJungleFloorEdges(g),
                () => this.drawJungleTreetopsEdges(g),
                () => this.drawJungleRuinsEdges(g),
                () => this.drawJungleSkybreakEdges(g)
            ][bandIdx]();
        } else if (this.levelId === 'ocean') {
            [
                () => this.drawOceanFloorEdges(g),
                () => this.drawDeepOceanEdges(g),
                () => this.drawMidOceanEdges(g),
                () => this.drawBeachSunsetEdges(g)
            ][bandIdx]();
        } else if (this.levelId === 'city') {
            [
                () => this.drawCityStreetEdges(g),
                () => this.drawCitySkyscrapersEdges(g),
                () => this.drawCityRooftopsEdges(g),
                () => this.drawCityNightEdges(g)
            ][bandIdx]();
        } else {
            [
                () => this.drawGrassCaveEdges(g),
                () => this.drawGrassGrasslandEdges(g),
                () => this.drawGrassSkyEdges(g),
                () => this.drawGrassSpaceEdges(g)
            ][bandIdx]();
        }
    }

    // ============================================================
    // GRASS LEVEL — fixed backdrops (drawn in 800x600 screen space)
    // ============================================================

    drawGrassCaveBg(g) {
        // Far mist blobs.
        const mistColors = [0x88b8d8, 0x6890b8];
        for (let i = 0; i < 6; i++) {
            const positions = [[150,200], [400,380], [650,180], [550,480], [100,500], [380,80]];
            const [x, y] = positions[i];
            g.fillStyle(mistColors[i % 2], 0.18);
            g.fillCircle(x, y, Phaser.Math.Between(170, 230));
        }

        // Distant stalactites (lighter, smaller).
        for (let i = 0; i < 24; i++) {
            const x = 20 + i * 34 + Phaser.Math.Between(-10, 10);
            const w = Phaser.Math.Between(14, 28);
            const h = Phaser.Math.Between(20, 65);
            const tints = [0x3e5c80, 0x4f7098, 0x5980a8];
            g.fillStyle(tints[i % tints.length], 0.7);
            this.drawJaggedStalactite(g, x, 0, w, h);
        }

        // Mid stalactites (bigger, darker, jagged).
        for (let i = 0; i < 14; i++) {
            const x = Phaser.Math.Between(40, 760);
            const w = Phaser.Math.Between(28, 50);
            const h = Phaser.Math.Between(60, 140);
            g.fillStyle(0x1a2a48, 0.95);
            this.drawJaggedStalactite(g, x, 0, w, h);
        }

        // God rays.
        for (let i = 0; i < 3; i++) {
            const x = 180 + i * 220 + Phaser.Math.Between(-40, 40);
            g.fillStyle(0xb8d8f0, 0.10);
            g.beginPath();
            g.moveTo(x - 18, 0); g.lineTo(x + 18, 0);
            g.lineTo(x + 130, 600); g.lineTo(x - 130, 600);
            g.closePath(); g.fillPath();
            g.fillStyle(0xd8edff, 0.06);
            g.beginPath();
            g.moveTo(x - 8, 0); g.lineTo(x + 8, 0);
            g.lineTo(x + 60, 600); g.lineTo(x - 60, 600);
            g.closePath(); g.fillPath();
        }

        // Fog wisps lower in the scene.
        g.fillStyle(0xa8d0e8, 0.12);
        g.fillEllipse(200, 480, 360, 60);
        g.fillEllipse(550, 520, 420, 70);
        g.fillStyle(0xa8d0e8, 0.08);
        g.fillEllipse(400, 420, 500, 50);
        g.fillStyle(0xa8d0e8, 0.18);
        g.fillEllipse(400, 580, 750, 60);
    }

    drawGrassGrasslandBg(g) {
        // Distant lighter mountains.
        g.fillStyle(0xa8bcc8, 0.85);
        for (let i = 0; i < 4; i++) {
            const x = i * 230 - 50 + Phaser.Math.Between(-20, 20);
            const h = Phaser.Math.Between(120, 170);
            g.beginPath();
            g.moveTo(x - 150, 380);
            g.lineTo(x, 380 - h);
            g.lineTo(x + 150, 380);
            g.closePath(); g.fillPath();
        }
        // Closer darker mountains.
        g.fillStyle(0x6b8a9a, 0.95);
        const peaks = [];
        for (let i = 0; i < 4; i++) {
            const x = i * 230 - 160 + Phaser.Math.Between(-10, 10);
            const h = Phaser.Math.Between(80, 130);
            peaks.push({ x, h });
            g.beginPath();
            g.moveTo(x - 140, 380);
            g.lineTo(x, 380 - h);
            g.lineTo(x + 140, 380);
            g.closePath(); g.fillPath();
        }
        // Snow caps on the closer peaks.
        g.fillStyle(0xe8ecf0, 0.95);
        peaks.forEach(p => {
            const peakY = 380 - p.h;
            g.beginPath();
            g.moveTo(p.x - 18, peakY + 18);
            g.lineTo(p.x, peakY);
            g.lineTo(p.x + 18, peakY + 18);
            g.closePath(); g.fillPath();
        });

        // Lake band.
        g.fillStyle(0x2c4d5f, 1);
        g.fillRect(0, 380, 800, 2);
        g.fillStyle(0x4a86b0, 0.95);
        g.fillRect(0, 382, 800, 100);
        g.fillStyle(0x6da8cc, 0.45);
        g.fillRect(0, 384, 800, 5);
        // Ripple highlights.
        g.fillStyle(0xc8e0ee, 0.6);
        for (let i = 0; i < 12; i++) {
            g.fillRect(
                Phaser.Math.Between(20, 720),
                Phaser.Math.Between(400, 478),
                Phaser.Math.Between(30, 70), 1
            );
        }

        // Foreground green grass band at the bottom (suggests cliff edge ground).
        g.fillStyle(0x3a7d2a, 0.85);
        g.fillRect(0, 560, 800, 40);
        g.fillStyle(0x2a5f1c, 0.95);
        g.fillRect(0, 588, 800, 12);
    }

    drawGrassSkyBg(g) {
        // Sun.
        g.fillStyle(0xfff2cc, 0.4); g.fillCircle(680, 110, 50);
        g.fillStyle(0xffe890, 0.6); g.fillCircle(680, 110, 32);
        g.fillStyle(0xffffff, 0.85); g.fillCircle(680, 110, 18);

        // Big stylised clouds at fixed positions.
        this.drawBigCloud(g, 200, 280, 1.1, 0.95, 0xa5c2dc);
        this.drawBigCloud(g, 550, 220, 1.0, 0.95, 0xa5c2dc);
        this.drawBigCloud(g, 350, 130, 1.0, 0.92, 0xa5c2dc);
        this.drawBigCloud(g, 100, 380, 0.9, 0.95, 0xa5c2dc);
        this.drawBigCloud(g, 700, 380, 0.85, 0.95, 0xa5c2dc);
        this.drawBigCloud(g, 380, 470, 1.1, 0.95, 0x8aa8c4);
    }

    drawGrassSpaceBg(g) {
        // Planets at fixed positions (varied sizes, no overlap with HUD).
        const palette = [
            { color: 0xefd58c, ring: true,  rim: 0xffdc8a },
            { color: 0x4faaff, ring: false, rim: 0x88c8ff },
            { color: 0xc24a33, ring: false, rim: 0xff8a6b },
            { color: 0x9ddbe0, ring: true,  rim: 0xb8eff5 },
            { color: 0xd9985d, ring: false, rim: 0xf2b97a },
            { color: 0xaaaaaa, ring: false, rim: 0xcccccc }
        ];
        const positions = [
            { x: 130, y: 200, size: 38 },
            { x: 620, y: 130, size: 56 },
            { x: 400, y: 210, size: 26 },
            { x: 720, y: 320, size: 22 },
            { x: 100, y: 420, size: 44 },
            { x: 510, y: 460, size: 30 },
            { x: 280, y: 540, size: 24 }
        ];
        positions.forEach((pos, i) => {
            const p = palette[i % palette.length];
            g.fillStyle(p.color, 0.92);
            g.fillCircle(pos.x, pos.y, pos.size);
            g.fillStyle(p.rim, 0.4);
            g.fillCircle(pos.x - pos.size * 0.35, pos.y - pos.size * 0.35, pos.size * 0.55);
            if (p.ring) {
                g.lineStyle(3, p.color, 0.55);
                g.strokeEllipse(pos.x, pos.y, pos.size * 2.7, pos.size * 0.55);
            }
        });
    }

    // ============================================================
    // JUNGLE LEVEL — fixed backdrops
    // ============================================================

    drawJungleFloorBg(g) {
        // Atmospheric teal mist wash.
        g.fillStyle(0x4a8a90, 0.12);
        g.fillCircle(180, 280, 260);
        g.fillCircle(610, 320, 280);
        g.fillCircle(400, 180, 200);

        // Far ghostly tree silhouettes (lightest, way back).
        g.fillStyle(0x0d3540, 0.55);
        for (let i = 0; i < 7; i++) {
            const x = 50 + i * 110 + Phaser.Math.Between(-15, 15);
            const h = Phaser.Math.Between(280, 420);
            const w = Phaser.Math.Between(20, 36);
            g.fillRect(x - w / 2, 600 - h, w, h);
            g.fillCircle(x, 600 - h, w);
            g.fillCircle(x - w * 0.6, 600 - h + 15, w * 0.85);
            g.fillCircle(x + w * 0.6, 600 - h + 15, w * 0.85);
        }

        // Reflective pond / swamp water in the middle distance.
        g.fillStyle(0x0a1f24, 1);
        g.fillRect(0, 420, 800, 2);
        g.fillStyle(0x1f4a52, 0.95);
        g.fillRect(0, 422, 800, 60);
        g.fillStyle(0x6a9aa8, 0.35);
        g.fillRect(0, 424, 800, 4);
        // Water reflection highlights.
        g.fillStyle(0x88c0c8, 0.5);
        for (let i = 0; i < 12; i++) {
            g.fillRect(Phaser.Math.Between(20, 720), Phaser.Math.Between(435, 478), Phaser.Math.Between(20, 60), 1);
        }

        // Mid gnarled trees — irregular twisted silhouettes via fillPoints.
        const gnarled = [
            { x: 130, h: 380 }, { x: 290, h: 430 }, { x: 500, h: 400 }, { x: 660, h: 360 }
        ];
        gnarled.forEach((t, idx) => {
            g.fillStyle(0x051820, 0.97);
            const segs = 7;
            const baseW = 22 + (idx % 2) * 8;
            const pts = [];
            // Left side going up — wavy/gnarled.
            for (let i = 0; i <= segs; i++) {
                const tt = i / segs;
                const y = 600 - tt * t.h;
                const taper = (1 - tt * 0.7);
                const xOff = Math.sin(tt * 4 + idx) * 8;
                pts.push({ x: t.x - baseW * taper / 2 + xOff, y: y });
            }
            // Right side coming back down.
            for (let i = segs; i >= 0; i--) {
                const tt = i / segs;
                const y = 600 - tt * t.h;
                const taper = (1 - tt * 0.7);
                const xOff = Math.sin(tt * 4 + idx + 1.5) * 8;
                pts.push({ x: t.x + baseW * taper / 2 + xOff, y: y });
            }
            g.fillPoints(pts, true);

            // Branchy crown at top.
            const crownY = 600 - t.h;
            g.fillCircle(t.x - 22, crownY - 8, 28);
            g.fillCircle(t.x + 22, crownY - 8, 26);
            g.fillCircle(t.x, crownY - 28, 24);
            // A couple of jutting branches.
            g.fillRect(t.x - 35, crownY + 5, 35, 6);
            g.fillRect(t.x + 5, crownY + 15, 35, 6);
        });

        // Spanish moss curtains hanging from the gnarled trees.
        g.fillStyle(0x4a7a6a, 0.85);
        gnarled.forEach((t, idx) => {
            const crownY = 600 - t.h;
            for (let i = 0; i < 5; i++) {
                const dx = t.x + Phaser.Math.Between(-40, 40);
                const dy = crownY + Phaser.Math.Between(-5, 20);
                const len = Phaser.Math.Between(40, 100);
                g.fillRect(dx - 2, dy, 4, len);
                g.fillCircle(dx, dy + len, 3);
            }
            // Lighter moss tips.
            g.fillStyle(0x88b8a8, 0.6);
            for (let i = 0; i < 3; i++) {
                const dx = t.x + Phaser.Math.Between(-30, 30);
                const dy = crownY + Phaser.Math.Between(0, 25);
                g.fillRect(dx - 1, dy, 2, Phaser.Math.Between(20, 50));
            }
            g.fillStyle(0x4a7a6a, 0.85);
        });

        // Mossy logs at the foreground bottom.
        g.fillStyle(0x1a2a1a, 1);
        g.fillEllipse(140, 555, 200, 22);
        g.fillEllipse(530, 565, 220, 22);
        // Moss carpet on logs.
        g.fillStyle(0x4a8c2e, 1);
        g.fillEllipse(140, 549, 200, 8);
        g.fillEllipse(530, 559, 220, 8);
        g.fillStyle(0x6dbf3e, 0.85);
        for (let i = 0; i < 8; i++) {
            g.fillTriangle(50 + i * 22, 545, 53 + i * 22, 540, 56 + i * 22, 545);
            g.fillTriangle(430 + i * 25, 555, 433 + i * 25, 550, 436 + i * 25, 555);
        }

        // Scattered fireflies (sparser for atmosphere).
        for (let i = 0; i < 14; i++) {
            const x = Phaser.Math.Between(40, 760);
            const y = Phaser.Math.Between(140, 500);
            g.fillStyle(0xfef08a, 0.22);
            g.fillCircle(x, y, 7);
            g.fillStyle(0xfef9c3, 0.95);
            g.fillCircle(x, y, 2);
        }

        // Foreground low fog.
        g.fillStyle(0x88c0c8, 0.18);
        g.fillEllipse(400, 590, 800, 70);
    }

    drawJungleTreetopsBg(g) {
        // Pastel pink cloud clusters (top).
        const drawPastelCloud = (cx, cy, scale, color, shadow) => {
            g.fillStyle(shadow, 0.85);
            g.fillCircle(cx - 28 * scale, cy + 10 * scale, 26 * scale);
            g.fillCircle(cx + 22 * scale, cy + 12 * scale, 30 * scale);
            g.fillCircle(cx + 50 * scale, cy + 8 * scale, 24 * scale);
            g.fillStyle(color, 0.95);
            g.fillCircle(cx - 28 * scale, cy, 26 * scale);
            g.fillCircle(cx - 4 * scale, cy - 14 * scale, 32 * scale);
            g.fillCircle(cx + 22 * scale, cy - 6 * scale, 32 * scale);
            g.fillCircle(cx + 52 * scale, cy, 26 * scale);
            g.fillCircle(cx + 72 * scale, cy + 6 * scale, 20 * scale);
        };
        drawPastelCloud(120, 70, 0.85, 0xfcd8e0, 0xe8b4c4);   // pink
        drawPastelCloud(540, 50, 1.05, 0xfcd8e0, 0xe8b4c4);   // pink
        drawPastelCloud(720, 140, 0.75, 0xfff2d8, 0xe8d4b4);  // cream
        drawPastelCloud(300, 150, 0.8,  0xfff2d8, 0xe8d4b4);  // cream

        // Distant snow-capped mountains.
        g.fillStyle(0xb4c4d8, 0.85);
        const peaks = [];
        for (let i = 0; i < 4; i++) {
            const x = 90 + i * 200 + Phaser.Math.Between(-20, 20);
            const h = Phaser.Math.Between(120, 180);
            peaks.push({ x, h });
            g.beginPath();
            g.moveTo(x - 140, 330);
            g.lineTo(x, 330 - h);
            g.lineTo(x + 140, 330);
            g.closePath();
            g.fillPath();
        }
        g.fillStyle(0xe8ecf0, 0.95);
        peaks.forEach(p => {
            const peakY = 330 - p.h;
            g.beginPath();
            g.moveTo(p.x - 16, peakY + 16);
            g.lineTo(p.x, peakY);
            g.lineTo(p.x + 16, peakY + 16);
            g.closePath();
            g.fillPath();
        });

        // Mid forest carpet (rolling green hills).
        g.fillStyle(0x355a25, 1);
        g.fillRect(0, 360, 800, 240);
        // Hill humps.
        g.fillStyle(0x2a4a1c, 1);
        for (let i = 0; i < 6; i++) {
            const x = i * 150 + Phaser.Math.Between(-30, 30);
            g.fillCircle(x, 380, 55);
        }
        // Brighter grass top strip.
        g.fillStyle(0x4a8c2e, 1);
        g.fillRect(0, 358, 800, 6);
        // Small distant tree silhouettes on the carpet.
        g.fillStyle(0x2a4a1c, 0.85);
        for (let i = 0; i < 10; i++) {
            const x = 40 + i * 75 + Phaser.Math.Between(-10, 10);
            g.fillRect(x - 2, 358, 4, 18);
            g.fillCircle(x, 354, 11);
        }

        // Tall pixel-art-style trees in mid foreground.
        const trees = [
            { x: 140, h: 220, crownR: 72 },
            { x: 400, h: 190, crownR: 62 },
            { x: 640, h: 240, crownR: 80 }
        ];
        trees.forEach(t => {
            // Trunk with shading.
            g.fillStyle(0x7a4a2e, 1);
            g.fillRect(t.x - 14, 600 - t.h, 28, t.h);
            g.fillStyle(0x5a3520, 1);
            g.fillRect(t.x + 6, 600 - t.h, 8, t.h);
            // Crown body.
            g.fillStyle(0x2e7d32, 1);
            g.fillCircle(t.x, 600 - t.h - 8, t.crownR);
            g.fillCircle(t.x - t.crownR * 0.55, 600 - t.h + 8, t.crownR * 0.82);
            g.fillCircle(t.x + t.crownR * 0.55, 600 - t.h + 8, t.crownR * 0.82);
            g.fillCircle(t.x, 600 - t.h - t.crownR * 0.55, t.crownR * 0.7);
            // Highlights.
            g.fillStyle(0x4caf50, 0.85);
            g.fillCircle(t.x - t.crownR * 0.25, 600 - t.h - 18, t.crownR * 0.5);
            g.fillCircle(t.x + t.crownR * 0.4, 600 - t.h - 5, t.crownR * 0.4);
            g.fillStyle(0x6dbf3e, 0.7);
            g.fillCircle(t.x - t.crownR * 0.35, 600 - t.h - 28, t.crownR * 0.3);
        });

        // Small mushrooms + grass tufts on the foreground.
        // Red mushroom.
        g.fillStyle(0x7a4a2e, 1); g.fillRect(228, 490, 5, 8);
        g.fillStyle(0xc24a33, 1); g.fillCircle(230, 490, 8);
        g.fillStyle(0xffffff, 1); g.fillCircle(227, 487, 1.8); g.fillCircle(233, 491, 1.4);
        // Tan mushroom.
        g.fillStyle(0x7a4a2e, 1); g.fillRect(556, 510, 4, 6);
        g.fillStyle(0xefc88c, 1); g.fillCircle(558, 510, 6);
        // Grass tufts at very bottom.
        g.fillStyle(0x4a8c2e, 1);
        for (let i = 0; i < 16; i++) {
            const x = 30 + i * 50 + Phaser.Math.Between(-12, 12);
            g.fillTriangle(x - 4, 590, x, 580, x + 4, 590);
        }
    }

    drawJungleRuinsBg(g) {
        // Big bright sky strip at top.
        g.fillStyle(0xddeaf0, 0.55);
        g.fillRect(0, 0, 800, 240);

        // Fluffy white clouds.
        this.drawBigCloud(g, 150, 70, 0.7, 0.92, 0xc4d4e0);
        this.drawBigCloud(g, 520, 50, 0.95, 0.92, 0xc4d4e0);
        this.drawBigCloud(g, 700, 130, 0.65, 0.85, 0xc4d4e0);
        this.drawBigCloud(g, 320, 150, 0.55, 0.85, 0xc4d4e0);

        // Distant blue-gray mountain silhouettes (back layer).
        g.fillStyle(0x88a0b0, 0.75);
        for (let i = 0; i < 4; i++) {
            const x = i * 220 - 50 + Phaser.Math.Between(-20, 20);
            const h = Phaser.Math.Between(90, 140);
            g.beginPath();
            g.moveTo(x - 140, 290);
            g.lineTo(x, 290 - h);
            g.lineTo(x + 140, 290);
            g.closePath(); g.fillPath();
        }
        // Closer mossy green mountain silhouettes (front layer).
        g.fillStyle(0x5a8a6a, 0.8);
        for (let i = 0; i < 3; i++) {
            const x = 150 + i * 250 + Phaser.Math.Between(-20, 20);
            const h = Phaser.Math.Between(70, 110);
            g.beginPath();
            g.moveTo(x - 130, 320);
            g.lineTo(x, 320 - h);
            g.lineTo(x + 130, 320);
            g.closePath(); g.fillPath();
        }

        // ===== Aqueduct of arches across the middle =====
        const archCount = 5;
        const pillarW = 22;
        const archOpeningW = 110;
        const pillarSpacing = pillarW + archOpeningW;
        const startX = 80;
        const beamY = 340;
        const groundY = 500;
        const archRadius = archOpeningW / 2;

        // Pillars.
        g.fillStyle(0x9b8a6a, 1);
        for (let i = 0; i <= archCount; i++) {
            const x = startX + i * pillarSpacing;
            g.fillRect(x, beamY, pillarW, groundY - beamY);
        }

        // Top beam connecting all pillars.
        g.fillRect(startX, beamY - 26, archCount * pillarSpacing + pillarW, 26);

        // Arch curves (semicircle of masonry above each opening).
        for (let i = 0; i < archCount; i++) {
            const leftPillarRightEdge = startX + i * pillarSpacing + pillarW;
            const rightPillarLeftEdge = startX + (i + 1) * pillarSpacing;
            const cx = (leftPillarRightEdge + rightPillarLeftEdge) / 2;
            g.beginPath();
            g.moveTo(leftPillarRightEdge, beamY);
            g.arc(cx, beamY, archRadius, Math.PI, 0, true);
            g.lineTo(rightPillarLeftEdge, beamY);
            g.closePath();
            g.fillPath();
        }

        // Stone shading (darker left edge of each pillar).
        g.fillStyle(0x6b5a42, 0.5);
        for (let i = 0; i <= archCount; i++) {
            const x = startX + i * pillarSpacing;
            g.fillRect(x, beamY, 6, groundY - beamY);
        }
        // Beam shading line at bottom.
        g.fillStyle(0x6b5a42, 0.6);
        g.fillRect(startX, beamY - 4, archCount * pillarSpacing + pillarW, 4);

        // Block lines on pillars (subtle horizontal lines).
        g.lineStyle(1, 0x6b5a42, 0.6);
        for (let i = 0; i <= archCount; i++) {
            const x = startX + i * pillarSpacing;
            for (let y = beamY + 35; y < groundY; y += 30) {
                g.lineBetween(x, y, x + pillarW, y);
            }
        }

        // Moss patches scattered on the aqueduct.
        g.fillStyle(0x4a8c2e, 0.9);
        for (let i = 0; i <= archCount; i++) {
            const x = startX + i * pillarSpacing + pillarW / 2;
            g.fillCircle(x - 6, beamY + Phaser.Math.Between(20, 50), 9);
            g.fillCircle(x + 7, beamY + Phaser.Math.Between(70, 110), 8);
            g.fillCircle(x - 4, beamY + Phaser.Math.Between(130, 155), 7);
        }
        // Moss on beam top.
        for (let i = 0; i < 10; i++) {
            g.fillCircle(startX + Phaser.Math.Between(20, archCount * pillarSpacing + pillarW - 20),
                beamY - 30, Phaser.Math.Between(6, 11));
        }
        // Brighter green moss tufts.
        g.fillStyle(0x6dbf3e, 0.85);
        for (let i = 0; i < 12; i++) {
            const x = startX + i * 60 + Phaser.Math.Between(-10, 10);
            g.fillTriangle(x - 3, beamY - 26, x, beamY - 35, x + 3, beamY - 26);
        }

        // Heavy hanging vines off each arch.
        g.lineStyle(3, 0x355a25, 0.92);
        for (let i = 0; i < archCount; i++) {
            const archLeftX = startX + i * pillarSpacing + pillarW;
            for (let j = 0; j < 3; j++) {
                const x = archLeftX + 20 + j * 30;
                const startVineY = beamY + archRadius - Math.sqrt(archRadius * archRadius - Math.pow(x - (archLeftX + archOpeningW / 2), 2));
                g.beginPath();
                g.moveTo(x, startVineY);
                const vineLen = Phaser.Math.Between(60, 130);
                for (let k = 1; k <= 8; k++) {
                    const t = k / 8;
                    g.lineTo(x + Math.sin(t * Math.PI * 2 + i) * 5, startVineY + t * vineLen);
                }
                g.strokePath();
            }
        }

        // Ground at the bottom — green grass with darker dirt below.
        g.fillStyle(0x4a8c2e, 1);
        g.fillRect(0, 500, 800, 100);
        g.fillStyle(0x6dbf3e, 1);
        g.fillRect(0, 500, 800, 6);
        // Scattered grass blades at the ground line.
        g.fillStyle(0x355a25, 1);
        for (let i = 0; i < 20; i++) {
            const x = 20 + i * 40 + Phaser.Math.Between(-10, 10);
            g.fillTriangle(x - 3, 502, x, 495, x + 3, 502);
        }
    }

    drawJungleSkybreakBg(g) {
        // Soft sun halo.
        g.fillStyle(0xfff0c8, 0.4); g.fillCircle(400, 100, 100);
        g.fillStyle(0xffe890, 0.6); g.fillCircle(400, 100, 60);
        g.fillStyle(0xffffff, 0.85); g.fillCircle(400, 100, 28);
        // Sun rays.
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const r1 = 90, r2 = 320;
            g.lineStyle(10, 0xffe890, 0.10);
            g.lineBetween(
                400 + Math.cos(angle) * r1, 100 + Math.sin(angle) * r1,
                400 + Math.cos(angle) * r2, 100 + Math.sin(angle) * r2
            );
        }

        // Distant fluffy clouds.
        this.drawBigCloud(g, 110, 200, 0.85, 0.85, 0xc8d8e8);
        this.drawBigCloud(g, 660, 240, 0.95, 0.85, 0xc8d8e8);
        this.drawBigCloud(g, 350, 310, 0.7, 0.78, 0xc8d8e8);
        this.drawBigCloud(g, 580, 360, 0.6, 0.75, 0xc8d8e8);

        // Sparse tree silhouettes fading at the bottom (we're breaking out of the trees).
        g.fillStyle(0x2e7d32, 0.85);
        const sparse = [{x:90, h:130}, {x:310, h:100}, {x:520, h:115}, {x:720, h:90}];
        sparse.forEach(t => {
            g.fillRect(t.x - 4, 600 - t.h, 8, t.h);
            g.fillCircle(t.x, 600 - t.h - 8, 30);
            g.fillCircle(t.x - 20, 600 - t.h + 4, 22);
            g.fillCircle(t.x + 20, 600 - t.h + 4, 22);
        });
    }

    // ============================================================
    // GRASS LEVEL — scrolling edge silhouettes
    // ============================================================

    drawGrassCaveEdges(g) {
        g.fillStyle(0x05101e, 0.95);
        for (let r = -20; r <= 2; r++) {
            const topY = r * 360;
            this.drawCliffEdge(g, 'left', topY, 400);
            this.drawCliffEdge(g, 'right', topY, 400);
        }
    }

    drawGrassGrasslandEdges(g) {
        for (let r = -20; r <= 2; r++) {
            const topY = r * 380;
            const height = 400;
            g.fillStyle(0x2a1f12, 0.95);
            this.drawCliffEdge(g, 'left', topY, height);
            this.drawCliffEdge(g, 'right', topY, height);
            g.fillStyle(0x3a7d2a, 1);
            for (let i = 0; i < 14; i++) {
                const lx = Phaser.Math.Between(4, 70);
                const ly = topY + Phaser.Math.Between(0, height);
                g.fillTriangle(lx - 3, ly + 5, lx, ly - 4, lx + 3, ly + 5);
                const rx = Phaser.Math.Between(730, 798);
                const ry = topY + Phaser.Math.Between(0, height);
                g.fillTriangle(rx - 3, ry + 5, rx, ry - 4, rx + 3, ry + 5);
            }
        }
    }

    drawGrassSkyEdges(g) {
        for (let r = -20; r <= 2; r++) {
            const baseY = r * 360 + 200;
            g.fillStyle(0x88a4c0, 0.9);
            g.fillCircle(-10, baseY + 14, 68);
            g.fillCircle(40, baseY + 80, 60);
            g.fillCircle(20, baseY - 50, 52);
            g.fillCircle(810, baseY + 100, 70);
            g.fillCircle(760, baseY + 30, 58);
            g.fillCircle(790, baseY - 40, 50);
            g.fillStyle(0xffffff, 0.95);
            g.fillCircle(-15, baseY, 66);
            g.fillCircle(35, baseY + 60, 58);
            g.fillCircle(15, baseY - 60, 50);
            g.fillCircle(815, baseY + 80, 68);
            g.fillCircle(760, baseY + 14, 56);
            g.fillCircle(795, baseY - 50, 48);
        }
    }

    drawGrassSpaceEdges(g) {
        for (let r = -22; r <= -2; r++) {
            const baseY = r * 280;
            g.fillStyle(0x1a0a2a, 0.95);
            this.drawIrregularRock(g, Phaser.Math.Between(-20, 30), baseY, Phaser.Math.Between(60, 90));
            g.fillStyle(0x2a1840, 0.95);
            this.drawIrregularRock(g, Phaser.Math.Between(10, 60), baseY + 70, Phaser.Math.Between(45, 70));
            g.fillStyle(0x1a0a2a, 0.95);
            this.drawIrregularRock(g, Phaser.Math.Between(770, 820), baseY + 40, Phaser.Math.Between(60, 90));
            g.fillStyle(0x2a1840, 0.95);
            this.drawIrregularRock(g, Phaser.Math.Between(740, 790), baseY + 130, Phaser.Math.Between(45, 70));
            g.fillStyle(0x88d8e8, 0.75);
            g.fillCircle(Phaser.Math.Between(0, 50), baseY + Phaser.Math.Between(-10, 10), 4);
            g.fillCircle(Phaser.Math.Between(20, 70), baseY + 70 + Phaser.Math.Between(-10, 10), 3);
            g.fillCircle(Phaser.Math.Between(750, 800), baseY + 40 + Phaser.Math.Between(-10, 10), 4);
            g.fillCircle(Phaser.Math.Between(740, 790), baseY + 130 + Phaser.Math.Between(-10, 10), 3);
        }
    }

    // ============================================================
    // JUNGLE LEVEL — scrolling edge silhouettes
    // ============================================================

    drawJungleFloorEdges(g) {
        for (let r = -20; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;

            // ----- Left gnarled tree -----
            g.fillStyle(0x051820, 0.97);
            const segs = 10;
            const lPts = [];
            const lBase = Phaser.Math.Between(55, 80);
            // Left silhouette is anchored at x=0 and waves inward.
            lPts.push({ x: 0, y: topY });
            for (let i = 1; i <= segs; i++) {
                const t = i / segs;
                const wave = Math.sin(t * 4 + r) * 12;
                lPts.push({ x: lBase + wave + (r % 2 ? 6 : -6) * Math.sin(t * 6), y: topY + t * height });
            }
            lPts.push({ x: 0, y: topY + height });
            g.fillPoints(lPts, true);

            // Branches sticking out from the left trunk.
            g.fillStyle(0x051820, 0.97);
            for (let i = 0; i < 3; i++) {
                const by = topY + Phaser.Math.Between(30, height - 60);
                g.fillRect(lBase / 2, by, Phaser.Math.Between(30, 60), 8);
            }

            // Spanish moss curtains from the left tree's branches/inner edge.
            g.fillStyle(0x4a7a6a, 0.85);
            for (let i = 0; i < 7; i++) {
                const mx = Phaser.Math.Between(15, lBase + 25);
                const my = topY + Phaser.Math.Between(0, height - 80);
                const ml = Phaser.Math.Between(45, 110);
                g.fillRect(mx - 2, my, 4, ml);
                g.fillCircle(mx, my + ml, 3);
            }
            g.fillStyle(0x88b8a8, 0.6);
            for (let i = 0; i < 4; i++) {
                const mx = Phaser.Math.Between(15, lBase + 25);
                const my = topY + Phaser.Math.Between(0, height - 60);
                g.fillRect(mx - 1, my, 2, Phaser.Math.Between(30, 70));
            }

            // ----- Right gnarled tree -----
            g.fillStyle(0x051820, 0.97);
            const rPts = [];
            const rBase = Phaser.Math.Between(55, 80);
            rPts.push({ x: 800, y: topY });
            for (let i = 1; i <= segs; i++) {
                const t = i / segs;
                const wave = Math.sin(t * 4 + r + 1.5) * 12;
                rPts.push({ x: 800 - rBase - wave + (r % 2 ? -6 : 6) * Math.sin(t * 6), y: topY + t * height });
            }
            rPts.push({ x: 800, y: topY + height });
            g.fillPoints(rPts, true);

            // Right branches.
            g.fillStyle(0x051820, 0.97);
            for (let i = 0; i < 3; i++) {
                const by = topY + Phaser.Math.Between(30, height - 60);
                g.fillRect(800 - rBase / 2 - Phaser.Math.Between(30, 60), by, Phaser.Math.Between(30, 60), 8);
            }

            // Right Spanish moss.
            g.fillStyle(0x4a7a6a, 0.85);
            for (let i = 0; i < 7; i++) {
                const mx = Phaser.Math.Between(800 - rBase - 25, 785);
                const my = topY + Phaser.Math.Between(0, height - 80);
                const ml = Phaser.Math.Between(45, 110);
                g.fillRect(mx - 2, my, 4, ml);
                g.fillCircle(mx, my + ml, 3);
            }
            g.fillStyle(0x88b8a8, 0.6);
            for (let i = 0; i < 4; i++) {
                const mx = Phaser.Math.Between(800 - rBase - 25, 785);
                const my = topY + Phaser.Math.Between(0, height - 60);
                g.fillRect(mx - 1, my, 2, Phaser.Math.Between(30, 70));
            }
        }
    }

    drawJungleTreetopsEdges(g) {
        // Tall full pixel-style trees pressing in from both screen edges.
        for (let r = -22; r <= 2; r++) {
            const baseY = r * 420 + 600;
            const treeH = Phaser.Math.Between(280, 360);
            const trunkW = 32;

            // ----- Left tree -----
            const lx = Phaser.Math.Between(34, 70);
            // Trunk.
            g.fillStyle(0x7a4a2e, 1);
            g.fillRect(lx - trunkW / 2, baseY - treeH, trunkW, treeH);
            // Trunk shading.
            g.fillStyle(0x5a3520, 1);
            g.fillRect(lx + 6, baseY - treeH, 8, treeH);
            // Crown (multiple overlapping circles).
            const lCrownR = 75;
            g.fillStyle(0x2e7d32, 1);
            g.fillCircle(lx, baseY - treeH - 5, lCrownR);
            g.fillCircle(lx - lCrownR * 0.55, baseY - treeH + 10, lCrownR * 0.82);
            g.fillCircle(lx + lCrownR * 0.55, baseY - treeH + 10, lCrownR * 0.82);
            g.fillCircle(lx, baseY - treeH - lCrownR * 0.55, lCrownR * 0.7);
            // Bright highlights.
            g.fillStyle(0x4caf50, 0.85);
            g.fillCircle(lx - lCrownR * 0.3, baseY - treeH - 18, lCrownR * 0.5);
            g.fillCircle(lx + lCrownR * 0.4, baseY - treeH - 4, lCrownR * 0.4);
            g.fillStyle(0x6dbf3e, 0.75);
            g.fillCircle(lx - lCrownR * 0.35, baseY - treeH - 30, lCrownR * 0.3);

            // ----- Right tree (mirrored). -----
            const rx = 800 - Phaser.Math.Between(34, 70);
            const rTreeH = Phaser.Math.Between(280, 360);
            g.fillStyle(0x7a4a2e, 1);
            g.fillRect(rx - trunkW / 2, baseY - rTreeH, trunkW, rTreeH);
            g.fillStyle(0x5a3520, 1);
            g.fillRect(rx + 6, baseY - rTreeH, 8, rTreeH);
            const rCrownR = 75;
            g.fillStyle(0x2e7d32, 1);
            g.fillCircle(rx, baseY - rTreeH - 5, rCrownR);
            g.fillCircle(rx - rCrownR * 0.55, baseY - rTreeH + 10, rCrownR * 0.82);
            g.fillCircle(rx + rCrownR * 0.55, baseY - rTreeH + 10, rCrownR * 0.82);
            g.fillCircle(rx, baseY - rTreeH - rCrownR * 0.55, rCrownR * 0.7);
            g.fillStyle(0x4caf50, 0.85);
            g.fillCircle(rx - rCrownR * 0.3, baseY - rTreeH - 18, rCrownR * 0.5);
            g.fillCircle(rx + rCrownR * 0.4, baseY - rTreeH - 4, rCrownR * 0.4);
            g.fillStyle(0x6dbf3e, 0.75);
            g.fillCircle(rx + rCrownR * 0.35, baseY - rTreeH - 30, rCrownR * 0.3);
        }
    }

    drawJungleRuinsEdges(g) {
        // Repeating ruined arch / pillar fragments hugging both screen edges.
        for (let r = -20; r <= 2; r++) {
            const topY = r * 420;

            // ----- Left ruined arch fragment -----
            const lw = 70;
            // Pillar (full height of fragment).
            g.fillStyle(0x9b8a6a, 0.97);
            g.fillRect(0, topY + 40, lw, 380);
            // Capital block.
            g.fillRect(0, topY + 30, lw + 12, 18);
            // Inner edge of half-arch — semicircle bulging into the frame.
            g.beginPath();
            g.moveTo(lw, topY + 130);
            g.arc(lw, topY + 130, 60, -Math.PI / 2, Math.PI / 2, false);
            g.lineTo(lw, topY + 250);
            g.lineTo(lw + 20, topY + 250);
            g.lineTo(lw + 20, topY + 130);
            g.closePath();
            g.fillPath();
            // Stone shading on left edge.
            g.fillStyle(0x6b5a42, 0.55);
            g.fillRect(0, topY + 30, 14, 390);
            // Jagged broken top.
            g.fillStyle(0x4a3a28, 1);
            g.fillTriangle(0, topY + 30, lw + 12, topY + 30, lw / 2, topY + 48);
            // Block-line texture.
            g.lineStyle(1, 0x6b5a42, 0.6);
            for (let y = topY + 70; y < topY + 410; y += 32) {
                g.lineBetween(0, y, lw, y);
            }
            // Moss patches.
            g.fillStyle(0x4a8c2e, 0.9);
            for (let i = 0; i < 8; i++) {
                g.fillCircle(Phaser.Math.Between(10, lw + 18), topY + Phaser.Math.Between(50, 400), Phaser.Math.Between(8, 14));
            }
            g.fillStyle(0x6dbf3e, 0.75);
            for (let i = 0; i < 5; i++) {
                g.fillTriangle(
                    Phaser.Math.Between(5, lw),
                    topY + Phaser.Math.Between(35, 50),
                    Phaser.Math.Between(5, lw) + 3,
                    topY + Phaser.Math.Between(20, 35),
                    Phaser.Math.Between(5, lw) + 6,
                    topY + Phaser.Math.Between(35, 50)
                );
            }
            // Heavy hanging vines from the capital + arch curve.
            g.lineStyle(3, 0x355a25, 0.92);
            for (let i = 0; i < 4; i++) {
                const vx = 20 + i * 18;
                g.beginPath();
                g.moveTo(vx, topY + 48);
                const len = Phaser.Math.Between(90, 160);
                for (let k = 1; k <= 10; k++) {
                    const t = k / 10;
                    g.lineTo(vx + Math.sin(t * Math.PI * 2 + r) * 6, topY + 48 + t * len);
                }
                g.strokePath();
            }

            // ----- Right ruined arch fragment (mirrored) -----
            const rw = 70;
            g.fillStyle(0x9b8a6a, 0.97);
            g.fillRect(800 - rw, topY + 80, rw, 380);
            g.fillRect(800 - rw - 12, topY + 70, rw + 12, 18);
            // Inner edge half-arch.
            g.beginPath();
            g.moveTo(800 - rw, topY + 170);
            g.arc(800 - rw, topY + 170, 60, -Math.PI / 2, Math.PI / 2, true);
            g.lineTo(800 - rw, topY + 290);
            g.lineTo(800 - rw - 20, topY + 290);
            g.lineTo(800 - rw - 20, topY + 170);
            g.closePath();
            g.fillPath();
            g.fillStyle(0x6b5a42, 0.55);
            g.fillRect(800 - 14, topY + 70, 14, 390);
            g.fillStyle(0x4a3a28, 1);
            g.fillTriangle(800 - rw - 12, topY + 70, 800, topY + 70, 800 - rw / 2 - 6, topY + 88);
            g.lineStyle(1, 0x6b5a42, 0.6);
            for (let y = topY + 110; y < topY + 450; y += 32) {
                g.lineBetween(800 - rw, y, 800, y);
            }
            g.fillStyle(0x4a8c2e, 0.9);
            for (let i = 0; i < 8; i++) {
                g.fillCircle(Phaser.Math.Between(800 - rw - 18, 790), topY + 80 + Phaser.Math.Between(20, 380), Phaser.Math.Between(8, 14));
            }
            g.fillStyle(0x6dbf3e, 0.75);
            for (let i = 0; i < 5; i++) {
                g.fillTriangle(
                    Phaser.Math.Between(800 - rw, 795),
                    topY + Phaser.Math.Between(85, 100),
                    Phaser.Math.Between(800 - rw, 795) + 3,
                    topY + Phaser.Math.Between(70, 85),
                    Phaser.Math.Between(800 - rw, 795) + 6,
                    topY + Phaser.Math.Between(85, 100)
                );
            }
            g.lineStyle(3, 0x355a25, 0.92);
            for (let i = 0; i < 4; i++) {
                const vx = 800 - 20 - i * 18;
                g.beginPath();
                g.moveTo(vx, topY + 88);
                const len = Phaser.Math.Between(90, 160);
                for (let k = 1; k <= 10; k++) {
                    const t = k / 10;
                    g.lineTo(vx + Math.sin(t * Math.PI * 2 + r) * 6, topY + 88 + t * len);
                }
                g.strokePath();
            }
        }
    }

    drawJungleSkybreakEdges(g) {
        // Sparser, thinner tree silhouettes fading at top.
        for (let r = -20; r <= 2; r++) {
            const topY = r * 420;
            // Left tree.
            g.fillStyle(0x2a1810, 0.85);
            g.fillRect(20, topY + 120, 14, 320);
            g.fillStyle(0x1f5023, 0.85);
            g.fillCircle(27, topY + 95, 32);
            g.fillCircle(8, topY + 120, 26);
            g.fillCircle(46, topY + 130, 24);
            g.fillStyle(0x3a7d3a, 0.7);
            g.fillCircle(20, topY + 110, 16);

            // Right tree.
            g.fillStyle(0x2a1810, 0.85);
            g.fillRect(770, topY + 170, 14, 280);
            g.fillStyle(0x1f5023, 0.85);
            g.fillCircle(777, topY + 145, 32);
            g.fillCircle(758, topY + 170, 26);
            g.fillCircle(796, topY + 160, 24);
            g.fillStyle(0x3a7d3a, 0.7);
            g.fillCircle(780, topY + 160, 16);
        }
    }

    // ============================================================
    // OCEAN LEVEL — fixed backdrops
    // ============================================================

    drawOceanFloorBg(g) {
        // Faint sunbeams piercing down through water.
        for (let i = 0; i < 3; i++) {
            const x = 150 + i * 220 + Phaser.Math.Between(-30, 30);
            g.fillStyle(0xb8e0f0, 0.10);
            g.beginPath();
            g.moveTo(x - 20, 0); g.lineTo(x + 20, 0);
            g.lineTo(x + 150, 600); g.lineTo(x - 150, 600);
            g.closePath(); g.fillPath();
            g.fillStyle(0xddf0f8, 0.06);
            g.beginPath();
            g.moveTo(x - 8, 0); g.lineTo(x + 8, 0);
            g.lineTo(x + 70, 600); g.lineTo(x - 70, 600);
            g.closePath(); g.fillPath();
        }

        // Distant underwater ruins (large stone block + spires).
        g.fillStyle(0x4a7a9a, 0.7);
        g.fillRect(280, 200, 240, 280);
        g.fillRect(310, 160, 180, 50);
        g.fillRect(380, 100, 50, 70);
        g.fillStyle(0x355a78, 0.7);
        g.fillRect(340, 230, 30, 60);
        g.fillRect(440, 270, 30, 90);
        g.fillRect(350, 360, 110, 25);

        // Distant shipwreck silhouette.
        g.fillStyle(0x1a3a5a, 0.75);
        // Hull body.
        g.fillRect(50, 380, 180, 50);
        g.fillTriangle(50, 380, 230, 380, 70, 440);
        g.fillTriangle(50, 440, 230, 440, 200, 478);
        // Broken mast.
        g.fillRect(140, 290, 6, 95);
        g.fillRect(110, 320, 70, 5);

        // Sandy floor with mounds.
        g.fillStyle(0xc8b884, 1);
        g.fillRect(0, 460, 800, 140);
        g.fillStyle(0xa89870, 1);
        g.fillEllipse(150, 478, 240, 28);
        g.fillEllipse(550, 488, 280, 30);
        g.fillStyle(0xe8d8a4, 0.55);
        g.fillRect(0, 458, 800, 4);

        // Stones on the floor.
        g.fillStyle(0x6b5a4a, 1);
        g.fillCircle(80, 530, 18);
        g.fillCircle(700, 540, 22);
        g.fillCircle(420, 548, 15);
        g.fillStyle(0x8b7a6a, 0.6);
        g.fillCircle(74, 525, 8);
        g.fillCircle(692, 533, 10);

        // Coral colonies — varied colors.
        const drawCoralCluster = (cx, cy, color, scale) => {
            g.fillStyle(color, 1);
            g.fillEllipse(cx, cy, 32 * scale, 50 * scale);
            g.fillCircle(cx - 14 * scale, cy - 14 * scale, 12 * scale);
            g.fillCircle(cx + 14 * scale, cy - 14 * scale, 12 * scale);
            g.fillCircle(cx, cy - 26 * scale, 14 * scale);
        };
        drawCoralCluster(120, 510, 0xc24a33, 1.0);   // red
        drawCoralCluster(280, 510, 0xff7ac4, 0.95);  // pink
        drawCoralCluster(630, 515, 0xfb923c, 1.1);   // orange
        drawCoralCluster(370, 530, 0xa78bfa, 0.85);  // purple

        // Seaweed strands.
        g.fillStyle(0x2a8c4a, 0.95);
        for (let i = 0; i < 12; i++) {
            const x = 50 + i * 60 + Phaser.Math.Between(-15, 15);
            const baseY = 510;
            const h = Phaser.Math.Between(40, 90);
            const pts = [];
            for (let j = 0; j <= 8; j++) {
                const t = j / 8;
                pts.push({ x: x + Math.sin(t * Math.PI * 1.5 + i) * 6 - 3, y: baseY - t * h });
            }
            for (let j = 8; j >= 0; j--) {
                const t = j / 8;
                pts.push({ x: x + Math.sin(t * Math.PI * 1.5 + i) * 6 + 3, y: baseY - t * h });
            }
            g.fillPoints(pts, true);
        }

        // Small fish silhouettes in the mid-distance.
        g.fillStyle(0x355a78, 0.7);
        [[250, 300, 8], [600, 280, 10], [500, 320, 7], [350, 250, 8]].forEach(([fx, fy, fs]) => {
            g.fillEllipse(fx, fy, fs * 2.5, fs);
            g.fillTriangle(fx - fs * 1.2, fy, fx - fs * 1.8, fy - fs * 0.5, fx - fs * 1.8, fy + fs * 0.5);
        });

        // Rising bubbles.
        for (let i = 0; i < 16; i++) {
            const x = Phaser.Math.Between(20, 780);
            const y = Phaser.Math.Between(60, 400);
            const r = Phaser.Math.Between(3, 7);
            g.lineStyle(1, 0xffffff, 0.7);
            g.strokeCircle(x, y, r);
            g.fillStyle(0xffffff, 0.45);
            g.fillCircle(x - r * 0.3, y - r * 0.3, 1.4);
        }
    }

    drawDeepOceanBg(g) {
        // Murky distant shapes.
        g.fillStyle(0x0a1830, 0.7);
        g.fillCircle(200, 250, 90);
        g.fillCircle(600, 350, 110);
        g.fillCircle(400, 480, 100);

        // Bioluminescent jellyfish.
        const jellies = [
            { x: 150, y: 200, s: 1.0, color: 0x88d8e8 },
            { x: 580, y: 150, s: 1.2, color: 0xa8eaff },
            { x: 350, y: 320, s: 0.9, color: 0x88c8e8 },
            { x: 680, y: 380, s: 1.1, color: 0xa8eaff },
            { x: 100, y: 450, s: 1.0, color: 0xb8f0ff },
            { x: 480, y: 480, s: 0.95, color: 0x88d8e8 }
        ];
        jellies.forEach(j => {
            g.fillStyle(j.color, 0.16);
            g.fillCircle(j.x, j.y, 38 * j.s);
            g.fillStyle(j.color, 0.85);
            g.fillCircle(j.x, j.y, 20 * j.s);
            g.fillStyle(0xffffff, 0.9);
            g.fillCircle(j.x, j.y, 12 * j.s);
            // Tentacles.
            g.lineStyle(2, j.color, 0.7);
            for (let k = 0; k < 6; k++) {
                const tx = j.x - 15 * j.s + k * 6 * j.s;
                g.beginPath();
                g.moveTo(tx, j.y + 15 * j.s);
                g.lineTo(tx + Math.sin(k) * 4, j.y + 55 * j.s);
                g.strokePath();
            }
        });

        // Bioluminescent plankton — scattered white sparkles.
        for (let i = 0; i < 60; i++) {
            const x = Phaser.Math.Between(20, 780);
            const y = Phaser.Math.Between(20, 580);
            const r = Phaser.Math.FloatBetween(0.5, 2.5);
            g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.45, 0.95));
            g.fillCircle(x, y, r);
        }

        // Anglerfish silhouettes with glowing lures.
        [[200, 280], [600, 400]].forEach(([ax, ay]) => {
            // Body.
            g.fillStyle(0x000810, 0.97);
            g.fillEllipse(ax, ay, 90, 55);
            g.fillTriangle(ax - 40, ay - 5, ax - 78, ay - 22, ax - 40, ay + 18);
            // Open mouth with teeth.
            g.fillStyle(0x000408, 1);
            g.fillTriangle(ax + 28, ay - 4, ax + 48, ay + 10, ax + 30, ay + 10);
            g.fillStyle(0xffffff, 0.85);
            for (let t = 0; t < 5; t++) {
                g.fillTriangle(ax + 30 + t * 3, ay, ax + 31 + t * 3, ay + 4, ax + 32 + t * 3, ay);
            }
            // Glowing lure orb.
            g.fillStyle(0xffe890, 0.35);
            g.fillCircle(ax + 22, ay - 38, 18);
            g.fillStyle(0xffe890, 0.95);
            g.fillCircle(ax + 22, ay - 38, 7);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(ax + 22, ay - 38, 2.5);
            // Lure stalk.
            g.lineStyle(2, 0x000810, 1);
            g.lineBetween(ax + 22, ay - 30, ax + 5, ay - 5);
        });
    }

    drawMidOceanBg(g) {
        // Prominent sunbeams from above.
        for (let i = 0; i < 4; i++) {
            const x = 100 + i * 180 + Phaser.Math.Between(-30, 30);
            g.fillStyle(0xc8e8f8, 0.15);
            g.beginPath();
            g.moveTo(x - 18, 0); g.lineTo(x + 18, 0);
            g.lineTo(x + 140, 600); g.lineTo(x - 140, 600);
            g.closePath(); g.fillPath();
            g.fillStyle(0xe8f4fa, 0.10);
            g.beginPath();
            g.moveTo(x - 8, 0); g.lineTo(x + 8, 0);
            g.lineTo(x + 65, 600); g.lineTo(x - 65, 600);
            g.closePath(); g.fillPath();
        }

        // Whale silhouette in far distance.
        const wx = 400, wy = 360;
        g.fillStyle(0x1a4a78, 0.65);
        g.fillEllipse(wx, wy, 260, 75);
        g.fillTriangle(wx - 130, wy, wx - 175, wy - 35, wx - 175, wy + 35);
        g.fillTriangle(wx - 150, wy - 30, wx - 190, wy - 55, wx - 140, wy - 30);
        g.fillStyle(0x0a3a68, 0.7);
        g.fillCircle(wx + 95, wy - 6, 5);
        g.lineStyle(2, 0x0a3a68, 0.4);
        g.lineBetween(wx + 100, wy + 18, wx + 125, wy + 18);

        // Fish schools.
        const schools = [
            { x: 150, y: 200, count: 8, color: 0x355a78 },
            { x: 600, y: 250, count: 6, color: 0x4a7a9a },
            { x: 250, y: 480, count: 7, color: 0x355a78 }
        ];
        schools.forEach(s => {
            g.fillStyle(s.color, 0.88);
            for (let i = 0; i < s.count; i++) {
                const x = s.x + (i % 4) * 22 + Phaser.Math.Between(-5, 5);
                const y = s.y + Math.floor(i / 4) * 20 + Phaser.Math.Between(-3, 3);
                g.fillEllipse(x, y, 18, 8);
                g.fillTriangle(x - 9, y, x - 14, y - 4, x - 14, y + 4);
            }
        });

        // Dolphins.
        [[100, 130, 1], [700, 150, -1]].forEach(([dx, dy, dir]) => {
            g.fillStyle(0x4a7a9a, 0.92);
            g.fillEllipse(dx, dy, 88, 32);
            // Dorsal fin.
            g.fillTriangle(dx, dy - 14, dx + 9 * dir, dy - 30, dx + 22 * dir, dy - 14);
            // Tail flukes.
            g.fillTriangle(dx - 44 * dir, dy, dx - 60 * dir, dy - 12, dx - 60 * dir, dy + 12);
            // Beak.
            g.fillCircle(dx + 38 * dir, dy - 3, 13);
            // Belly highlight.
            g.fillStyle(0xa8d0e4, 0.4);
            g.fillEllipse(dx, dy + 6, 70, 14);
        });

        // Rising bubbles.
        for (let i = 0; i < 22; i++) {
            const x = Phaser.Math.Between(20, 780);
            const y = Phaser.Math.Between(50, 550);
            const r = Phaser.Math.Between(3, 8);
            g.lineStyle(1, 0xffffff, 0.65);
            g.strokeCircle(x, y, r);
            g.fillStyle(0xffffff, 0.45);
            g.fillCircle(x - r * 0.3, y - r * 0.3, 1.4);
        }
    }

    drawBeachSunsetBg(g) {
        // Sun disc with halo.
        g.fillStyle(0xffd4a8, 0.5); g.fillCircle(400, 180, 80);
        g.fillStyle(0xfde68a, 0.85); g.fillCircle(400, 180, 55);
        g.fillStyle(0xfff2d8, 1); g.fillCircle(400, 180, 32);

        // Streaky high cirrus clouds.
        g.fillStyle(0xfcd8e0, 0.7);
        g.fillEllipse(110, 120, 130, 12);
        g.fillEllipse(190, 80, 90, 10);
        g.fillEllipse(640, 100, 140, 14);
        g.fillEllipse(720, 60, 70, 8);

        // Distant rolling mountain silhouettes (warm-toned).
        g.fillStyle(0xc24a33, 0.85);
        for (let i = 0; i < 5; i++) {
            const x = i * 180 - 50 + Phaser.Math.Between(-20, 20);
            const h = Phaser.Math.Between(60, 100);
            g.beginPath();
            g.moveTo(x - 120, 320);
            g.lineTo(x, 320 - h);
            g.lineTo(x + 120, 320);
            g.closePath(); g.fillPath();
        }
        // Closer darker mountains.
        g.fillStyle(0x9b3a23, 0.92);
        for (let i = 0; i < 4; i++) {
            const x = 80 + i * 200 + Phaser.Math.Between(-20, 20);
            const h = Phaser.Math.Between(50, 80);
            g.beginPath();
            g.moveTo(x - 110, 340);
            g.lineTo(x, 340 - h);
            g.lineTo(x + 110, 340);
            g.closePath(); g.fillPath();
        }

        // Ocean strip with sun-reflection.
        g.fillStyle(0x4a7aa8, 0.95);
        g.fillRect(0, 340, 800, 100);
        // Sun reflection on water.
        g.fillStyle(0xfde68a, 0.55);
        for (let i = 0; i < 10; i++) {
            g.fillRect(370 + Phaser.Math.Between(-30, 30), 345 + i * 9, 60 - i * 4, 2);
        }
        // Subtle wave highlights.
        g.fillStyle(0xc8e0ec, 0.4);
        for (let i = 0; i < 8; i++) {
            g.fillRect(Phaser.Math.Between(0, 800), Phaser.Math.Between(355, 432), Phaser.Math.Between(30, 60), 1);
        }
        // Wave crest line at water's edge.
        g.fillStyle(0xffd4a8, 0.55);
        g.fillRect(0, 338, 800, 2);

        // Distant sailboat.
        g.fillStyle(0x2a1810, 0.95);
        g.fillTriangle(620, 348, 690, 348, 665, 362);
        g.fillRect(652, 316, 4, 32);
        g.fillTriangle(656, 318, 656, 348, 680, 348);

        // Beach sand foreground.
        g.fillStyle(0xfde68a, 1);
        g.fillRect(0, 440, 800, 160);
        g.fillStyle(0xefc88c, 1);
        g.fillRect(0, 440, 800, 6);
        // Sand texture bumps.
        g.fillStyle(0xefc88c, 0.5);
        for (let i = 0; i < 18; i++) {
            g.fillEllipse(Phaser.Math.Between(0, 800), Phaser.Math.Between(460, 590), Phaser.Math.Between(20, 60), 2);
        }

        // Mid-foreground palm trees (in addition to edge palms).
        [[300, 220], [560, 200]].forEach(([px, ph]) => {
            // Curved trunk.
            g.lineStyle(10, 0x6b3a1c, 1);
            g.beginPath();
            g.moveTo(px, 600);
            for (let j = 1; j <= 6; j++) {
                const t = j / 6;
                g.lineTo(px + Math.sin(t * Math.PI * 0.6) * 12, 600 - t * ph);
            }
            g.strokePath();
            // Fronds.
            const topX = px + Math.sin(Math.PI * 0.6) * 12;
            const topY = 600 - ph;
            for (let f = 0; f < 7; f++) {
                const angle = (f / 7) * Math.PI * 2 - Math.PI / 2;
                g.fillStyle(0x2a8c4a, 1);
                g.fillTriangle(
                    topX, topY,
                    topX + Math.cos(angle) * 60, topY + Math.sin(angle) * 28,
                    topX + Math.cos(angle + 0.25) * 22, topY + Math.sin(angle + 0.25) * 12
                );
            }
            g.fillStyle(0x4a2a18, 1);
            g.fillCircle(topX - 8, topY + 6, 4);
            g.fillCircle(topX + 8, topY + 6, 4);
        });

        // Beach ball.
        g.fillStyle(0xff5e5e, 1); g.fillCircle(420, 530, 18);
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(420 - 18, 530, 420 + 18, 530, 420, 530 - 18);
        g.fillStyle(0x4faaff, 1);
        g.fillTriangle(420 - 12, 530 + 9, 420 + 12, 530 + 9, 420, 530 - 12);
        g.lineStyle(2, 0xffffff, 1); g.strokeCircle(420, 530, 18);

        // Volleyball net (simple pole + net).
        g.fillStyle(0x6b3a1c, 1);
        g.fillRect(100, 470, 4, 80);
        g.fillRect(196, 470, 4, 80);
        g.lineStyle(1, 0xffffff, 0.9);
        g.lineBetween(104, 478, 196, 478);
        g.lineBetween(104, 510, 196, 510);
        // Net mesh (vertical lines).
        for (let i = 0; i < 8; i++) {
            const x = 110 + i * 12;
            g.lineBetween(x, 478, x, 510);
        }
    }

    // ============================================================
    // OCEAN LEVEL — scrolling edge silhouettes
    // ============================================================

    drawOceanFloorEdges(g) {
        for (let r = -22; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;

            // Left ruined stone column with coral overgrowth.
            g.fillStyle(0x6b5a4a, 0.95);
            g.fillRect(0, topY, 70, height);
            g.fillStyle(0x4a3a2a, 0.5);
            g.fillRect(0, topY, 14, height);
            // Coral clusters on left.
            const lCorals = [
                { y: 50,  color: 0xc24a33 },
                { y: 130, color: 0xfb923c },
                { y: 220, color: 0xff7ac4 },
                { y: 320, color: 0xa78bfa }
            ];
            lCorals.forEach(c => {
                g.fillStyle(c.color, 0.95);
                g.fillEllipse(30, topY + c.y, 60, 40);
                g.fillCircle(15, topY + c.y - 12, 12);
                g.fillCircle(45, topY + c.y - 12, 12);
                g.fillCircle(30, topY + c.y - 22, 14);
            });
            // Seaweed on left.
            g.fillStyle(0x2a8c4a, 0.95);
            for (let i = 0; i < 5; i++) {
                const sx = Phaser.Math.Between(10, 60);
                const sy = topY + Phaser.Math.Between(50, 380);
                const sh = Phaser.Math.Between(60, 110);
                const pts = [];
                for (let j = 0; j <= 6; j++) {
                    const t = j / 6;
                    pts.push({ x: sx + Math.sin(t * Math.PI * 1.5 + i) * 6 - 3, y: sy - t * sh });
                }
                for (let j = 6; j >= 0; j--) {
                    const t = j / 6;
                    pts.push({ x: sx + Math.sin(t * Math.PI * 1.5 + i) * 6 + 3, y: sy - t * sh });
                }
                g.fillPoints(pts, true);
            }

            // Right ruined column.
            g.fillStyle(0x6b5a4a, 0.95);
            g.fillRect(730, topY, 70, height);
            g.fillStyle(0x4a3a2a, 0.5);
            g.fillRect(786, topY, 14, height);
            const rCorals = [
                { y: 70,  color: 0xc24a33 },
                { y: 160, color: 0xa78bfa },
                { y: 260, color: 0xfb923c },
                { y: 360, color: 0xff7ac4 }
            ];
            rCorals.forEach(c => {
                g.fillStyle(c.color, 0.95);
                g.fillEllipse(770, topY + c.y, 60, 40);
                g.fillCircle(755, topY + c.y - 12, 12);
                g.fillCircle(785, topY + c.y - 12, 12);
                g.fillCircle(770, topY + c.y - 22, 14);
            });
            g.fillStyle(0x2a8c4a, 0.95);
            for (let i = 0; i < 5; i++) {
                const sx = Phaser.Math.Between(740, 790);
                const sy = topY + Phaser.Math.Between(50, 380);
                const sh = Phaser.Math.Between(60, 110);
                const pts = [];
                for (let j = 0; j <= 6; j++) {
                    const t = j / 6;
                    pts.push({ x: sx + Math.sin(t * Math.PI * 1.5 + i) * 6 - 3, y: sy - t * sh });
                }
                for (let j = 6; j >= 0; j--) {
                    const t = j / 6;
                    pts.push({ x: sx + Math.sin(t * Math.PI * 1.5 + i) * 6 + 3, y: sy - t * sh });
                }
                g.fillPoints(pts, true);
            }
        }
    }

    drawDeepOceanEdges(g) {
        for (let r = -22; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;

            // Left dark column with bioluminescence.
            g.fillStyle(0x000408, 0.97);
            g.fillRect(0, topY, 60, height);
            // Bio dots.
            for (let i = 0; i < 12; i++) {
                const x = Phaser.Math.Between(5, 55);
                const y = topY + Phaser.Math.Between(20, height - 20);
                g.fillStyle(0x88d8e8, 0.30);
                g.fillCircle(x, y, 9);
                g.fillStyle(0xb8eaff, 0.95);
                g.fillCircle(x, y, 3);
                g.fillStyle(0xffffff, 0.95);
                g.fillCircle(x, y, 1);
            }
            // Glowing tendrils.
            g.lineStyle(2, 0x88d8e8, 0.75);
            for (let i = 0; i < 3; i++) {
                const x = 40 + i * 8;
                const baseY = topY + Phaser.Math.Between(50, 220);
                g.beginPath();
                g.moveTo(x, baseY);
                for (let j = 0; j <= 10; j++) {
                    const t = j / 10;
                    g.lineTo(x + Math.sin(t * Math.PI * 2 + i + r) * 9, baseY + t * 160);
                }
                g.strokePath();
            }

            // Right dark column with bioluminescence.
            g.fillStyle(0x000408, 0.97);
            g.fillRect(740, topY, 60, height);
            for (let i = 0; i < 12; i++) {
                const x = Phaser.Math.Between(745, 795);
                const y = topY + Phaser.Math.Between(20, height - 20);
                g.fillStyle(0xa8eaff, 0.30);
                g.fillCircle(x, y, 9);
                g.fillStyle(0xb8eaff, 0.95);
                g.fillCircle(x, y, 3);
                g.fillStyle(0xffffff, 0.95);
                g.fillCircle(x, y, 1);
            }
            g.lineStyle(2, 0xa8eaff, 0.75);
            for (let i = 0; i < 3; i++) {
                const x = 760 - i * 8;
                const baseY = topY + Phaser.Math.Between(50, 220);
                g.beginPath();
                g.moveTo(x, baseY);
                for (let j = 0; j <= 10; j++) {
                    const t = j / 10;
                    g.lineTo(x + Math.sin(t * Math.PI * 2 + i + r) * 9, baseY + t * 160);
                }
                g.strokePath();
            }
        }
    }

    drawMidOceanEdges(g) {
        // Tall kelp forest forming the edges.
        for (let r = -22; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;

            // Left kelp cluster (4 strands).
            g.fillStyle(0x1a5a3a, 0.92);
            for (let i = 0; i < 4; i++) {
                const x = 10 + i * 18;
                const baseY = topY + height;
                const kelpH = Phaser.Math.Between(280, 380);
                const pts = [];
                for (let j = 0; j <= 10; j++) {
                    const t = j / 10;
                    pts.push({ x: x + Math.sin(t * Math.PI * 1.5 + i + r) * 8 - 4, y: baseY - t * kelpH });
                }
                for (let j = 10; j >= 0; j--) {
                    const t = j / 10;
                    pts.push({ x: x + Math.sin(t * Math.PI * 1.5 + i + r) * 8 + 4, y: baseY - t * kelpH });
                }
                g.fillPoints(pts, true);
            }
            // Kelp leaf blades.
            g.fillStyle(0x2a8c4a, 0.85);
            for (let i = 0; i < 7; i++) {
                const x = Phaser.Math.Between(5, 70);
                const y = topY + Phaser.Math.Between(50, 380);
                g.fillEllipse(x, y, 26, 8);
            }

            // Right kelp cluster.
            g.fillStyle(0x1a5a3a, 0.92);
            for (let i = 0; i < 4; i++) {
                const x = 790 - i * 18;
                const baseY = topY + height;
                const kelpH = Phaser.Math.Between(280, 380);
                const pts = [];
                for (let j = 0; j <= 10; j++) {
                    const t = j / 10;
                    pts.push({ x: x + Math.sin(t * Math.PI * 1.5 + i + r) * 8 - 4, y: baseY - t * kelpH });
                }
                for (let j = 10; j >= 0; j--) {
                    const t = j / 10;
                    pts.push({ x: x + Math.sin(t * Math.PI * 1.5 + i + r) * 8 + 4, y: baseY - t * kelpH });
                }
                g.fillPoints(pts, true);
            }
            g.fillStyle(0x2a8c4a, 0.85);
            for (let i = 0; i < 7; i++) {
                const x = Phaser.Math.Between(730, 795);
                const y = topY + Phaser.Math.Between(50, 380);
                g.fillEllipse(x, y, 26, 8);
            }
        }
    }

    drawBeachSunsetEdges(g) {
        for (let r = -22; r <= 2; r++) {
            const topY = r * 420;
            const baseY = topY + 420;

            // ----- Left palm tree -----
            const lpx = 50;
            const lph = 360;
            g.lineStyle(14, 0x6b3a1c, 1);
            g.beginPath();
            g.moveTo(lpx, baseY);
            for (let j = 1; j <= 6; j++) {
                const t = j / 6;
                g.lineTo(lpx + Math.sin(t * Math.PI * 0.6) * 22, baseY - t * lph);
            }
            g.strokePath();
            g.lineStyle(8, 0x4a2a14, 1);
            g.beginPath();
            g.moveTo(lpx + 3, baseY);
            for (let j = 1; j <= 6; j++) {
                const t = j / 6;
                g.lineTo(lpx + 3 + Math.sin(t * Math.PI * 0.6) * 22, baseY - t * lph);
            }
            g.strokePath();
            const ltopX = lpx + Math.sin(Math.PI * 0.6) * 22;
            const ltopY = baseY - lph;
            for (let f = 0; f < 8; f++) {
                const angle = (f / 8) * Math.PI * 2 - Math.PI / 2;
                g.fillStyle(0x2a8c4a, 1);
                g.fillTriangle(
                    ltopX, ltopY,
                    ltopX + Math.cos(angle) * 78, ltopY + Math.sin(angle) * 36,
                    ltopX + Math.cos(angle + 0.25) * 28, ltopY + Math.sin(angle + 0.25) * 14
                );
            }
            // Brighter highlight on top fronds.
            g.fillStyle(0x4caf50, 0.7);
            for (let f = 0; f < 4; f++) {
                const angle = (f / 8) * Math.PI * 2 - Math.PI / 2;
                g.fillTriangle(
                    ltopX, ltopY,
                    ltopX + Math.cos(angle) * 50, ltopY + Math.sin(angle) * 22,
                    ltopX + Math.cos(angle + 0.2) * 20, ltopY + Math.sin(angle + 0.2) * 10
                );
            }
            g.fillStyle(0x4a2a18, 1);
            g.fillCircle(ltopX - 11, ltopY + 8, 5);
            g.fillCircle(ltopX + 11, ltopY + 8, 5);

            // ----- Right palm tree -----
            const rpx = 750;
            const rph = 360;
            g.lineStyle(14, 0x6b3a1c, 1);
            g.beginPath();
            g.moveTo(rpx, baseY);
            for (let j = 1; j <= 6; j++) {
                const t = j / 6;
                g.lineTo(rpx - Math.sin(t * Math.PI * 0.6) * 22, baseY - t * rph);
            }
            g.strokePath();
            g.lineStyle(8, 0x4a2a14, 1);
            g.beginPath();
            g.moveTo(rpx - 3, baseY);
            for (let j = 1; j <= 6; j++) {
                const t = j / 6;
                g.lineTo(rpx - 3 - Math.sin(t * Math.PI * 0.6) * 22, baseY - t * rph);
            }
            g.strokePath();
            const rtopX = rpx - Math.sin(Math.PI * 0.6) * 22;
            const rtopY = baseY - rph;
            for (let f = 0; f < 8; f++) {
                const angle = (f / 8) * Math.PI * 2 - Math.PI / 2;
                g.fillStyle(0x2a8c4a, 1);
                g.fillTriangle(
                    rtopX, rtopY,
                    rtopX + Math.cos(angle) * 78, rtopY + Math.sin(angle) * 36,
                    rtopX + Math.cos(angle + 0.25) * 28, rtopY + Math.sin(angle + 0.25) * 14
                );
            }
            g.fillStyle(0x4caf50, 0.7);
            for (let f = 0; f < 4; f++) {
                const angle = (f / 8) * Math.PI * 2 - Math.PI / 2;
                g.fillTriangle(
                    rtopX, rtopY,
                    rtopX + Math.cos(angle) * 50, rtopY + Math.sin(angle) * 22,
                    rtopX + Math.cos(angle + 0.2) * 20, rtopY + Math.sin(angle + 0.2) * 10
                );
            }
            g.fillStyle(0x4a2a18, 1);
            g.fillCircle(rtopX - 11, rtopY + 8, 5);
            g.fillCircle(rtopX + 11, rtopY + 8, 5);
        }
    }

    // ============================================================
    // CITY LEVEL — fixed backdrops (morning → daytime → dusk → night)
    // ============================================================

    drawCityStreetBg(g) {
        // Distant skyline — light blue silhouettes.
        g.fillStyle(0xc8d8e8, 0.9);
        const far = [
            [50, 200, 35, 130], [120, 220, 50, 110], [195, 180, 40, 150],
            [260, 230, 60, 100], [340, 200, 45, 130], [410, 190, 50, 140],
            [480, 210, 35, 120], [540, 195, 55, 135], [620, 220, 45, 110],
            [690, 200, 40, 130], [750, 215, 50, 115]
        ];
        far.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
        // Far-building windows.
        g.fillStyle(0xa8b8c8, 0.6);
        far.forEach(([x, y, w, h]) => {
            for (let wy = y + 10; wy < y + h - 5; wy += 12) {
                for (let wx = x + 4; wx < x + w - 4; wx += 8) g.fillRect(wx, wy, 3, 5);
            }
        });

        // Mid skyline — slightly darker, with a few warm window lights and accent roofs.
        g.fillStyle(0x8a9bb4, 0.95);
        const mid = [
            [30, 260, 60, 170], [120, 260, 80, 170], [220, 240, 60, 190],
            [300, 270, 90, 160], [410, 250, 70, 180], [500, 260, 65, 170],
            [580, 245, 75, 185], [670, 260, 70, 170], [750, 250, 60, 180]
        ];
        mid.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
        g.fillStyle(0xfde890, 0.65);
        mid.forEach(([x, y, w, h]) => {
            for (let wy = y + 8; wy < y + h - 5; wy += 14) {
                for (let wx = x + 5; wx < x + w - 5; wx += 12) g.fillRect(wx, wy, 4, 7);
            }
        });
        // A couple of red/yellow roof accents.
        g.fillStyle(0xc24a33, 1);
        g.fillRect(120, 257, 80, 5);
        g.fillRect(580, 242, 75, 5);
        g.fillStyle(0x4faaff, 1);
        g.fillRect(300, 267, 90, 5);

        // Tree line just above the road.
        g.fillStyle(0x2a8c4a, 1);
        for (let i = 0; i < 20; i++) {
            const x = 20 + i * 40;
            g.fillCircle(x, 440, 22);
            g.fillCircle(x - 12, 450, 18);
            g.fillCircle(x + 12, 450, 18);
        }
        g.fillStyle(0x1a6c2a, 1);
        for (let i = 0; i < 20; i++) {
            const x = 20 + i * 40;
            g.fillRect(x - 3, 455, 6, 22);
        }

        // Road.
        g.fillStyle(0x3a3a3a, 1);
        g.fillRect(0, 478, 800, 122);
        // Lane edges.
        g.fillStyle(0xffffff, 0.75);
        g.fillRect(0, 488, 800, 2);
        g.fillRect(0, 595, 800, 2);
        // Dashed center line.
        g.fillStyle(0xfde68a, 1);
        for (let i = 0; i < 15; i++) g.fillRect(i * 60, 538, 30, 5);

        // Yellow taxi.
        g.fillStyle(0xfbbf24, 1);
        g.fillRect(150, 510, 80, 25);
        g.fillRect(165, 495, 55, 18);
        g.fillStyle(0x4a7a9a, 0.85);
        g.fillRect(170, 500, 18, 10);
        g.fillRect(195, 500, 18, 10);
        g.fillStyle(0x2a1810, 1);
        g.fillRect(180, 489, 20, 6);
        g.fillStyle(0xfbbf24, 1);
        g.fillRect(182, 491, 16, 3);
        g.fillStyle(0x1a1a1a, 1);
        g.fillCircle(165, 540, 7);
        g.fillCircle(220, 540, 7);

        // City bus.
        g.fillStyle(0xc24a33, 1);
        g.fillRect(420, 495, 130, 40);
        g.fillStyle(0xa8c8e0, 0.85);
        for (let i = 0; i < 6; i++) g.fillRect(428 + i * 20, 502, 14, 14);
        g.fillStyle(0x1a1a1a, 1);
        g.fillCircle(445, 540, 8);
        g.fillCircle(530, 540, 8);
        // Bus front headlight.
        g.fillStyle(0xfff2d8, 1);
        g.fillCircle(548, 525, 3);

        // Traffic light.
        g.fillStyle(0x2a2a2a, 1);
        g.fillRect(720, 380, 4, 100);
        g.fillRect(710, 380, 24, 30);
        g.fillStyle(0xff5e5e, 1); g.fillCircle(716, 388, 3);
        g.fillStyle(0xfde68a, 1); g.fillCircle(722, 388, 3);
        g.fillStyle(0x4caf50, 1); g.fillCircle(728, 388, 3);

        // Lamp post.
        g.fillStyle(0x2a2a2a, 1);
        g.fillRect(80, 380, 3, 100);
        g.fillRect(76, 376, 22, 6);
        g.fillStyle(0xfde68a, 0.95);
        g.fillCircle(87, 385, 5);

        // Stop sign (octagon-ish).
        g.fillStyle(0x2a2a2a, 1);
        g.fillRect(360, 430, 3, 50);
        g.fillStyle(0xc24a33, 1);
        g.fillCircle(362, 425, 10);
        g.fillStyle(0xffffff, 1);
        g.fillRect(356, 422, 12, 3);
    }

    drawCitySkyscrapersBg(g) {
        // Far layer — faded blue skyscrapers.
        g.fillStyle(0xb4c8d8, 0.85);
        const far = [];
        for (let i = 0; i < 10; i++) {
            const x = i * 80 + Phaser.Math.Between(-10, 10);
            const w = Phaser.Math.Between(55, 80);
            const h = Phaser.Math.Between(280, 460);
            far.push({ x, w, h });
            g.fillRect(x, 600 - h, w, h);
            g.fillRect(x + w / 2 - 2, 600 - h - 12, 4, 14);
        }
        g.fillStyle(0xfde890, 0.4);
        far.forEach(t => {
            for (let wy = 600 - t.h + 10; wy < 590; wy += 14) {
                for (let wx = t.x + 5; wx < t.x + t.w - 5; wx += 10) g.fillRect(wx, wy, 3, 6);
            }
        });

        // Mid layer — closer skyscrapers with lots of lit windows.
        g.fillStyle(0x6a87a8, 0.96);
        const mid = [];
        for (let i = 0; i < 7; i++) {
            const x = 30 + i * 110 + Phaser.Math.Between(-15, 15);
            const w = Phaser.Math.Between(80, 110);
            const h = Phaser.Math.Between(350, 500);
            mid.push({ x, w, h });
            g.fillRect(x, 600 - h, w, h);
            // Roof antenna.
            if (Math.random() < 0.6) {
                g.fillStyle(0x2a3a4a, 1);
                g.fillRect(x + w / 2 - 2, 600 - h - 22, 4, 22);
                g.fillStyle(0x6a87a8, 0.96);
            }
        }
        mid.forEach(t => {
            for (let wy = 600 - t.h + 14; wy < 595; wy += 16) {
                for (let wx = t.x + 8; wx < t.x + t.w - 8; wx += 14) {
                    if (Math.random() < 0.55) {
                        g.fillStyle(0xfde890, 0.92);
                        g.fillRect(wx, wy, 6, 9);
                    }
                }
            }
        });

        // Pigeons silhouettes (V-shapes flying around).
        g.fillStyle(0x2a2a3a, 0.9);
        const pigeons = [
            [150, 100], [350, 180], [550, 130], [700, 220], [250, 280], [480, 320], [620, 90]
        ];
        pigeons.forEach(([px, py]) => {
            g.beginPath();
            g.moveTo(px - 9, py); g.lineTo(px, py - 5);
            g.lineTo(px + 9, py); g.lineTo(px, py + 1);
            g.closePath();
            g.fillPath();
        });

        // Window-washer rig on a cable.
        const wx = 400;
        const wy = 260;
        g.lineStyle(2, 0x2a2a2a, 0.95);
        g.lineBetween(wx - 18, 0, wx - 18, wy);
        g.lineBetween(wx + 38, 0, wx + 38, wy);
        g.fillStyle(0x3a3a4a, 1);
        g.fillRect(wx - 28, wy, 66, 12);
        g.fillStyle(0x4a4a5a, 1);
        g.fillRect(wx - 28, wy + 10, 66, 4);
        // Worker.
        g.fillStyle(0x4faaff, 1);
        g.fillRect(wx, wy - 20, 9, 20);
        g.fillStyle(0xefc88c, 1);
        g.fillCircle(wx + 4, wy - 24, 5);
        // Hard hat.
        g.fillStyle(0xfde68a, 1);
        g.fillRect(wx - 1, wy - 30, 11, 3);
        g.fillCircle(wx + 4, wy - 28, 5);
        // Squeegee.
        g.fillStyle(0x2a2a2a, 1);
        g.fillRect(wx + 10, wy - 18, 16, 2);
    }

    drawCityRooftopsBg(g) {
        // Sun setting through the haze.
        g.fillStyle(0xffd4a8, 0.45); g.fillCircle(550, 200, 70);
        g.fillStyle(0xfde68a, 0.85); g.fillCircle(550, 200, 45);
        g.fillStyle(0xfff2d8, 1); g.fillCircle(550, 200, 24);

        // Streaky cirrus clouds at top.
        g.fillStyle(0xfcd8e0, 0.7);
        g.fillEllipse(120, 120, 130, 12);
        g.fillEllipse(700, 90, 110, 12);
        g.fillEllipse(300, 80, 90, 10);

        // Distant city silhouette against the sunset.
        g.fillStyle(0x4a3a5a, 0.95);
        const skyline = [
            [30, 280, 50, 50], [85, 250, 40, 80], [130, 270, 55, 60],
            [190, 240, 45, 90], [240, 260, 60, 70], [305, 230, 50, 100],
            [360, 270, 40, 60], [405, 245, 55, 85], [465, 260, 45, 70],
            [515, 235, 60, 95], [580, 270, 35, 60], [620, 250, 50, 80],
            [675, 260, 45, 70], [725, 245, 55, 85]
        ];
        skyline.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
        // A scattering of lit windows in the distant skyline.
        skyline.forEach(([x, y, w, h]) => {
            for (let wy = y + 5; wy < y + h - 5; wy += 8) {
                for (let wx = x + 3; wx < x + w - 3; wx += 6) {
                    if (Math.random() < 0.35) {
                        g.fillStyle(0xfde890, 0.85);
                        g.fillRect(wx, wy, 2, 3);
                    }
                }
            }
        });

        // Tree silhouettes beyond the rooftop wall.
        g.fillStyle(0x2a4a30, 0.95);
        for (let i = 0; i < 8; i++) {
            const x = 30 + i * 105;
            g.fillCircle(x, 340, 25);
            g.fillCircle(x - 15, 350, 20);
            g.fillCircle(x + 15, 350, 20);
        }

        // Brick rooftop wall in foreground.
        g.fillStyle(0x9b3b1c, 1);
        g.fillRect(0, 400, 800, 200);
        // Brick pattern (mortar lines).
        g.fillStyle(0x7a2a14, 1);
        for (let y = 400; y < 600; y += 14) {
            g.fillRect(0, y, 800, 2);
            const offset = ((y - 400) / 14) % 2 === 0 ? 0 : 18;
            for (let x = offset; x < 800; x += 36) g.fillRect(x + 32, y, 2, 14);
        }
        // Stone cap on top of the wall.
        g.fillStyle(0x6b6b80, 1);
        g.fillRect(0, 392, 800, 12);
        g.fillStyle(0x4a4a60, 1);
        g.fillRect(0, 402, 800, 2);

        // Greenery clusters on top of the wall (rooftop garden vibe).
        g.fillStyle(0x2a8c4a, 1);
        for (let i = 0; i < 12; i++) {
            const x = 50 + i * 65 + Phaser.Math.Between(-10, 10);
            g.fillCircle(x, 386, 14);
            g.fillCircle(x - 8, 392, 10);
            g.fillCircle(x + 8, 392, 10);
        }
        // Brighter leaf highlights.
        g.fillStyle(0x4caf50, 0.85);
        for (let i = 0; i < 12; i++) {
            const x = 50 + i * 65 + Phaser.Math.Between(-5, 5);
            g.fillCircle(x - 2, 382, 7);
        }
        // Tiny flowers.
        g.fillStyle(0xff7ac4, 1);
        for (let i = 0; i < 8; i++) g.fillCircle(80 + i * 90 + Phaser.Math.Between(-12, 12), 384, 3);
        g.fillStyle(0xfde68a, 1);
        for (let i = 0; i < 6; i++) g.fillCircle(110 + i * 120 + Phaser.Math.Between(-12, 12), 384, 3);

        // Hanging vines from the wall's top edge.
        g.lineStyle(2, 0x2a6c2a, 0.95);
        for (let i = 0; i < 9; i++) {
            const x = 50 + i * 85 + Phaser.Math.Between(-10, 10);
            g.beginPath();
            g.moveTo(x, 404);
            const len = Phaser.Math.Between(40, 90);
            for (let j = 1; j <= 6; j++) {
                const t = j / 6;
                g.lineTo(x + Math.sin(t * Math.PI * 1.5 + i) * 5, 404 + t * len);
            }
            g.strokePath();
        }
    }

    drawCityNightBg(g) {
        // Stars sprinkled across the sky.
        for (let i = 0; i < 90; i++) {
            const x = Phaser.Math.Between(20, 780);
            const y = Phaser.Math.Between(20, 360);
            const r = Phaser.Math.FloatBetween(0.8, 2.2);
            g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.55, 1));
            g.fillCircle(x, y, r);
        }

        // Moon with subtle glow.
        g.fillStyle(0xfff2d8, 0.4); g.fillCircle(150, 100, 55);
        g.fillStyle(0xfff2d8, 1); g.fillCircle(150, 100, 38);
        g.fillStyle(0xe8d8b4, 0.6);
        g.fillCircle(140, 95, 4);
        g.fillCircle(160, 108, 3);
        g.fillCircle(145, 112, 5);

        // Distant cloud silhouettes against the night sky.
        g.fillStyle(0x2a2a4a, 0.6);
        g.fillEllipse(350, 80, 160, 18);
        g.fillEllipse(520, 60, 130, 14);
        g.fillEllipse(670, 130, 140, 16);

        // Distant city silhouette (mid blue-purple).
        g.fillStyle(0x1c1c2e, 0.95);
        const cityFar = [
            [20, 380, 60, 80], [85, 360, 50, 100], [140, 390, 45, 70],
            [190, 350, 70, 110], [265, 370, 55, 90], [325, 340, 50, 120],
            [380, 380, 60, 80], [445, 360, 45, 100], [495, 350, 60, 110],
            [560, 380, 50, 80], [615, 360, 65, 100], [685, 350, 55, 110],
            [745, 380, 55, 80]
        ];
        cityFar.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
        cityFar.forEach(([x, y, w, h]) => {
            for (let wy = y + 5; wy < y + h - 5; wy += 8) {
                for (let wx = x + 3; wx < x + w - 3; wx += 7) {
                    if (Math.random() < 0.5) {
                        g.fillStyle(Math.random() < 0.7 ? 0xfde890 : 0x88c8e8, 0.9);
                        g.fillRect(wx, wy, 3, 4);
                    }
                }
            }
        });

        // Foreground city (darkest with lit windows).
        g.fillStyle(0x050510, 1);
        const cityNear = [
            [30, 460, 70, 140], [110, 450, 65, 150], [185, 470, 60, 130],
            [255, 440, 80, 160], [345, 460, 70, 140], [425, 450, 65, 150],
            [500, 470, 70, 130], [580, 450, 70, 150], [660, 460, 70, 140],
            [740, 470, 60, 130]
        ];
        cityNear.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
        cityNear.forEach(([x, y, w, h]) => {
            for (let wy = y + 10; wy < y + h - 8; wy += 12) {
                for (let wx = x + 6; wx < x + w - 6; wx += 12) {
                    if (Math.random() < 0.55) {
                        g.fillStyle(0xfde890, 0.18);
                        g.fillCircle(wx + 2, wy + 3, 6);
                        g.fillStyle(Math.random() < 0.75 ? 0xfdc870 : 0x88c8e8, 1);
                        g.fillRect(wx, wy, 5, 7);
                    }
                }
            }
        });

        // Neon signs sprinkled on the foreground buildings.
        g.fillStyle(0xff5e5e, 1); g.fillRect(290, 480, 22, 36);
        g.fillStyle(0xff8a3a, 0.4); g.fillCircle(301, 498, 20);
        g.fillStyle(0x06b6d4, 1); g.fillRect(495, 488, 28, 22);
        g.fillStyle(0x88d8e8, 0.4); g.fillCircle(509, 499, 18);
        g.fillStyle(0xfde68a, 1); g.fillRect(620, 475, 32, 10);
        g.fillStyle(0xfde68a, 0.4); g.fillCircle(636, 480, 16);
        g.fillStyle(0xff7ac4, 1); g.fillRect(120, 510, 18, 30);
        g.fillStyle(0xff7ac4, 0.4); g.fillCircle(129, 525, 18);

        // Tiny helicopter with blinking light high in the sky.
        g.fillStyle(0x4a4a5a, 1);
        g.fillEllipse(600, 200, 30, 10);
        g.fillRect(596, 195, 4, 6);
        g.lineStyle(1, 0x2a2a3a, 0.7);
        g.lineBetween(575, 192, 625, 192);
        g.fillStyle(0xff5e5e, 1);
        g.fillCircle(615, 198, 2);
    }

    // ============================================================
    // CITY LEVEL — scrolling edge silhouettes
    // ============================================================

    drawCityStreetEdges(g) {
        for (let r = -22; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;

            // ----- Left building with fire escape -----
            const lw = 100;
            g.fillStyle(0x6a4a3a, 0.97);
            g.fillRect(0, topY, lw, height);
            g.fillStyle(0x4a2a14, 0.5);
            g.fillRect(0, topY, 14, height);
            // Brick mortar lines.
            g.fillStyle(0x4a2a14, 0.5);
            for (let y = topY; y < topY + height; y += 14) {
                g.fillRect(0, y, lw, 2);
                const off = ((y - topY) / 14) % 2 === 0 ? 0 : 18;
                for (let x = off + 32; x < lw; x += 36) g.fillRect(x, y, 2, 14);
            }
            // Windows.
            g.fillStyle(0x88a8c8, 0.75);
            for (let wy = topY + 28; wy < topY + height - 12; wy += 36) {
                for (let wx = 18; wx < lw - 24; wx += 24) g.fillRect(wx, wy, 14, 18);
            }
            // Fire escape platforms + rails.
            g.fillStyle(0x2a2a2a, 0.95);
            for (let s = 0; s < 6; s++) {
                const sy = topY + 50 + s * 64;
                g.fillRect(lw - 32, sy, 28, 4);
                // Rail uprights.
                g.fillRect(lw - 32, sy - 12, 2, 12);
                g.fillRect(lw - 6, sy - 12, 2, 12);
                // Diagonal stair.
                g.lineStyle(3, 0x2a2a2a, 0.95);
                g.lineBetween(lw - 28, sy + 4, lw - 18, sy + 50);
            }

            // ----- Right building (mirrored) -----
            const rw = 100;
            g.fillStyle(0x6a4a3a, 0.97);
            g.fillRect(800 - rw, topY, rw, height);
            g.fillStyle(0x4a2a14, 0.5);
            g.fillRect(800 - 14, topY, 14, height);
            g.fillStyle(0x4a2a14, 0.5);
            for (let y = topY; y < topY + height; y += 14) {
                g.fillRect(800 - rw, y, rw, 2);
                const off = ((y - topY) / 14) % 2 === 0 ? 0 : 18;
                for (let x = 800 - rw + off + 32; x < 800; x += 36) g.fillRect(x, y, 2, 14);
            }
            g.fillStyle(0x88a8c8, 0.75);
            for (let wy = topY + 28; wy < topY + height - 12; wy += 36) {
                for (let wx = 800 - rw + 10; wx < 800 - 18; wx += 24) g.fillRect(wx, wy, 14, 18);
            }
            g.fillStyle(0x2a2a2a, 0.95);
            for (let s = 0; s < 6; s++) {
                const sy = topY + 50 + s * 64;
                g.fillRect(800 - rw + 4, sy, 28, 4);
                g.fillRect(800 - rw + 4, sy - 12, 2, 12);
                g.fillRect(800 - rw + 30, sy - 12, 2, 12);
                g.lineStyle(3, 0x2a2a2a, 0.95);
                g.lineBetween(800 - rw + 18, sy + 4, 800 - rw + 28, sy + 50);
            }
        }
    }

    drawCitySkyscrapersEdges(g) {
        for (let r = -22; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;
            // Left skyscraper — glass facade.
            g.fillStyle(0x4a5a70, 0.97);
            g.fillRect(0, topY, 90, height);
            g.fillStyle(0x2a3a4a, 0.55);
            g.fillRect(0, topY, 18, height);
            for (let wy = topY + 14; wy < topY + height - 6; wy += 16) {
                for (let wx = 8; wx < 86; wx += 12) {
                    const lit = Math.random() < 0.5;
                    g.fillStyle(lit ? 0xfde890 : 0x88a8c8, lit ? 0.9 : 0.6);
                    g.fillRect(wx, wy, 6, 9);
                }
            }
            // Right skyscraper.
            g.fillStyle(0x4a5a70, 0.97);
            g.fillRect(710, topY, 90, height);
            g.fillStyle(0x2a3a4a, 0.55);
            g.fillRect(782, topY, 18, height);
            for (let wy = topY + 14; wy < topY + height - 6; wy += 16) {
                for (let wx = 716; wx < 794; wx += 12) {
                    const lit = Math.random() < 0.5;
                    g.fillStyle(lit ? 0xfde890 : 0x88a8c8, lit ? 0.9 : 0.6);
                    g.fillRect(wx, wy, 6, 9);
                }
            }
        }
    }

    drawCityRooftopsEdges(g) {
        for (let r = -22; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;

            // ----- Left brick rooftop wall -----
            g.fillStyle(0x9b3b1c, 1);
            g.fillRect(0, topY, 80, height);
            g.fillStyle(0x7a2a14, 1);
            for (let y = topY; y < topY + height; y += 14) {
                g.fillRect(0, y, 80, 2);
                const off = ((y - topY) / 14) % 2 === 0 ? 0 : 18;
                for (let x = off + 32; x < 80; x += 36) g.fillRect(x, y, 2, 14);
            }
            // Stone cap.
            g.fillStyle(0x6b6b80, 1);
            g.fillRect(0, topY, 90, 10);
            // Greenery on top.
            g.fillStyle(0x2a8c4a, 1);
            for (let i = 0; i < 5; i++) {
                const x = 10 + i * 20;
                g.fillCircle(x, topY - 8, 12);
                g.fillCircle(x - 8, topY - 4, 9);
                g.fillCircle(x + 8, topY - 4, 9);
            }
            g.fillStyle(0x4caf50, 0.8);
            for (let i = 0; i < 4; i++) g.fillCircle(15 + i * 22, topY - 12, 7);
            // Hanging vines.
            g.lineStyle(2, 0x2a6c2a, 0.95);
            for (let i = 0; i < 5; i++) {
                const x = 55 + Phaser.Math.Between(0, 20);
                g.beginPath();
                g.moveTo(x, topY + 6);
                const len = Phaser.Math.Between(60, 130);
                for (let j = 1; j <= 8; j++) {
                    const t = j / 8;
                    g.lineTo(x + Math.sin(t * Math.PI * 1.5 + i + r) * 5, topY + 6 + t * len);
                }
                g.strokePath();
            }
            // Leaf accents on the wall.
            g.fillStyle(0x4caf50, 0.85);
            for (let i = 0; i < 8; i++) {
                g.fillCircle(Phaser.Math.Between(5, 75), topY + Phaser.Math.Between(20, height - 20), Phaser.Math.Between(5, 10));
            }

            // ----- Right brick rooftop wall (mirrored) -----
            g.fillStyle(0x9b3b1c, 1);
            g.fillRect(720, topY, 80, height);
            g.fillStyle(0x7a2a14, 1);
            for (let y = topY; y < topY + height; y += 14) {
                g.fillRect(720, y, 80, 2);
                const off = ((y - topY) / 14) % 2 === 0 ? 0 : 18;
                for (let x = 720 + off + 32; x < 800; x += 36) g.fillRect(x, y, 2, 14);
            }
            g.fillStyle(0x6b6b80, 1);
            g.fillRect(710, topY, 90, 10);
            g.fillStyle(0x2a8c4a, 1);
            for (let i = 0; i < 5; i++) {
                const x = 720 + i * 20;
                g.fillCircle(x, topY - 8, 12);
                g.fillCircle(x - 8, topY - 4, 9);
                g.fillCircle(x + 8, topY - 4, 9);
            }
            g.fillStyle(0x4caf50, 0.8);
            for (let i = 0; i < 4; i++) g.fillCircle(725 + i * 22, topY - 12, 7);
            g.lineStyle(2, 0x2a6c2a, 0.95);
            for (let i = 0; i < 5; i++) {
                const x = 745 - Phaser.Math.Between(0, 20);
                g.beginPath();
                g.moveTo(x, topY + 6);
                const len = Phaser.Math.Between(60, 130);
                for (let j = 1; j <= 8; j++) {
                    const t = j / 8;
                    g.lineTo(x + Math.sin(t * Math.PI * 1.5 + i + r) * 5, topY + 6 + t * len);
                }
                g.strokePath();
            }
            g.fillStyle(0x4caf50, 0.85);
            for (let i = 0; i < 8; i++) {
                g.fillCircle(Phaser.Math.Between(725, 795), topY + Phaser.Math.Between(20, height - 20), Phaser.Math.Between(5, 10));
            }
        }
    }

    drawCityNightEdges(g) {
        for (let r = -22; r <= 2; r++) {
            const topY = r * 400;
            const height = 420;
            // Left dark building with warmly lit windows.
            const lw = 100;
            g.fillStyle(0x000408, 0.98);
            g.fillRect(0, topY, lw, height);
            for (let wy = topY + 16; wy < topY + height - 10; wy += 20) {
                for (let wx = 10; wx < lw - 10; wx += 16) {
                    if (Math.random() < 0.55) {
                        g.fillStyle(0xfde890, 0.18);
                        g.fillCircle(wx + 3, wy + 5, 9);
                        g.fillStyle(Math.random() < 0.75 ? 0xfdc870 : 0x88c8e8, 1);
                        g.fillRect(wx, wy, 7, 11);
                    }
                }
            }
            // Occasional neon sign on left edge.
            if ((r + 22) % 3 === 0) {
                g.fillStyle(0xff5e5e, 1); g.fillRect(20, topY + 110, 30, 9);
                g.fillStyle(0xff5e5e, 0.4); g.fillCircle(35, topY + 114, 18);
            }
            if ((r + 22) % 4 === 2) {
                g.fillStyle(0x06b6d4, 1); g.fillRect(15, topY + 240, 30, 9);
                g.fillStyle(0x06b6d4, 0.4); g.fillCircle(30, topY + 244, 18);
            }

            // Right dark building.
            const rw = 100;
            g.fillStyle(0x000408, 0.98);
            g.fillRect(800 - rw, topY, rw, height);
            for (let wy = topY + 16; wy < topY + height - 10; wy += 20) {
                for (let wx = 800 - rw + 10; wx < 800 - 10; wx += 16) {
                    if (Math.random() < 0.55) {
                        g.fillStyle(0xfde890, 0.18);
                        g.fillCircle(wx + 3, wy + 5, 9);
                        g.fillStyle(Math.random() < 0.75 ? 0xfdc870 : 0x88c8e8, 1);
                        g.fillRect(wx, wy, 7, 11);
                    }
                }
            }
            if ((r + 22) % 3 === 1) {
                g.fillStyle(0xfde68a, 1); g.fillRect(800 - 50, topY + 160, 30, 9);
                g.fillStyle(0xfde68a, 0.4); g.fillCircle(800 - 35, topY + 164, 18);
            }
            if ((r + 22) % 4 === 3) {
                g.fillStyle(0xff7ac4, 1); g.fillRect(800 - 50, topY + 290, 30, 9);
                g.fillStyle(0xff7ac4, 0.4); g.fillCircle(800 - 35, topY + 294, 18);
            }
        }
    }


    drawStars() {
        this.starsBg.clear();
        for (let i = 0; i < 130; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
            const r = Phaser.Math.FloatBetween(0.5, 1.8);
            const a = Phaser.Math.FloatBetween(0.5, 1);
            this.starsBg.fillStyle(0xffffff, a);
            this.starsBg.fillCircle(x, y, r);
        }
        this.starsDrawn = true;
    }

    refreshBand() {
        const idx = bandForHeight(this.height);
        if (idx === this.bandIndex) return;
        this.bandIndex = idx;

        const band = this.level.bands[idx];
        this.skyBg.clear();
        const top = Phaser.Display.Color.IntegerToColor(band.top);
        const bot = Phaser.Display.Color.IntegerToColor(band.bot);
        const stripes = 36;
        const stripeH = Math.ceil(600 / stripes) + 1;
        for (let i = 0; i < stripes; i++) {
            const t = i / (stripes - 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, 1, t);
            this.skyBg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            this.skyBg.fillRect(0, i * (600 / stripes), 800, stripeH);
        }

        if ((band.stars ?? 0) > 0 && !this.starsDrawn) this.drawStars();

        const fade = (target, value) => {
            if (!target) return;
            this.tweens.add({ targets: target, alpha: value, duration: 1500 });
        };

        fade(this.starsBg, band.stars ?? 0);
        // Cave/forest floor at the very start of the climb only.
        fade(this.ground, idx === 0 ? 1 : 0);

        // Cross-fade fixed backdrops + scrolling edges for the current band.
        this.bandBackdrops.forEach((b, i) => fade(b, i === idx ? 1 : 0));
        this.bandEdges.forEach((b, i) => fade(b, i === idx ? 1 : 0));

        this.bandText.setText(band.name);
        this.bandText.setColor(band.textColor);
    }

    buildPlayer() {
        const skin = SKINS[this.skinId] || SKINS.yellow;

        this.player = this.add.container(400, 460);
        // Jetpack first so it sits behind the body.
        const pack = this.add.rectangle(-18, 2, 8, 24, 0x4a4a4a).setStrokeStyle(1, 0x111111);
        const tank = this.add.rectangle(-18, -4, 6, 8, 0xffd166).setStrokeStyle(1, 0x111111);
        this.jetFlame = this.add.triangle(-18, 18, 0, 0, 6, 12, -6, 12, 0xff6b35);
        this.jetFlameInner = this.add.triangle(-18, 18, 0, 2, 3, 8, -3, 8, 0xfff04d);
        this.tweens.add({
            targets: [this.jetFlame, this.jetFlameInner], scaleY: 1.4, alpha: 0.7,
            duration: 100, yoyo: true, repeat: -1
        });

        const body = this.add.rectangle(0, 0, 30, 40, skin.body).setStrokeStyle(2, skin.stroke);
        this.playerEyeL = this.add.circle(-7, -7, 4, skin.eye);
        this.playerEyeR = this.add.circle(7, -7, 4, skin.eye);
        this.playerPupilL = this.add.circle(-7, -7, 2, skin.pupil);
        this.playerPupilR = this.add.circle(7, -7, 2, skin.pupil);
        const mouth = this.add.rectangle(0, 7, 8, 2, skin.mouth);
        this.player.add([pack, tank, this.jetFlame, this.jetFlameInner, body, this.playerEyeL, this.playerEyeR, this.playerPupilL, this.playerPupilR, mouth]);
        this.player.setSize(30, 40);
        this.player.setDepth(10);

        this.physics.world.enable(this.player);
        this.player.body.setAllowGravity(false);
        this.player.body.setCollideWorldBounds(false);
        this.player.body.setVelocityY(-RISE_SPEED);

        // Shield aura (hidden until shield active).
        this.shieldAura = this.add.circle(0, 0, 28, 0x06b6d4, 0.25);
        this.shieldAura.setStrokeStyle(2, 0x06b6d4, 0.9);
        this.shieldAura.setVisible(false);
        this.shieldAura.setDepth(9);

        // Juggernaut aura.
        this.juggernautAura = this.add.circle(0, 0, 32, 0xff5e5e, 0.3);
        this.juggernautAura.setStrokeStyle(3, 0xff9b3b, 0.9);
        this.juggernautAura.setVisible(false);
        this.juggernautAura.setDepth(9);
    }

    buildHUD() {
        const leftPanel = this.add.graphics().setScrollFactor(0).setDepth(50);
        leftPanel.fillStyle(0x000000, 0.45);
        leftPanel.fillRoundedRect(8, 8, 230, 196, 10);
        leftPanel.lineStyle(2, 0xffffff, 0.25);
        leftPanel.strokeRoundedRect(8, 8, 230, 196, 10);

        const rightPanel = this.add.graphics().setScrollFactor(0).setDepth(50);
        rightPanel.fillStyle(0x000000, 0.45);
        rightPanel.fillRoundedRect(548, 8, 244, 170, 10);
        rightPanel.lineStyle(2, 0xffffff, 0.25);
        rightPanel.strokeRoundedRect(548, 8, 244, 170, 10);

        const lbl = (color, size = 20) => ({
            fontSize: `${size}px`, color, fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2
        });

        this.scoreText     = this.add.text(20, 14, 'Score: 0',  lbl('#ffffff', 24)).setScrollFactor(0).setDepth(51);
        this.heightText    = this.add.text(20, 50, 'Height: 0', lbl('#ffffff')).setScrollFactor(0).setDepth(51);
        this.highScoreText = this.add.text(20, 80, `High: ${this.highScore}`, lbl('#ffd166')).setScrollFactor(0).setDepth(51);
        this.bandText      = this.add.text(20, 110, this.level.bands[0].name, lbl(this.level.bands[0].textColor)).setScrollFactor(0).setDepth(51);
        this.difficultyText = this.add.text(20, 140, `Difficulty: ${this.difficulty.name}`,
            lbl(this.difficulty.color, 16)).setScrollFactor(0).setDepth(51);

        this.shieldText       = this.add.text(560, 18, 'Shield: --',     lbl('#06b6d4')).setScrollFactor(0).setDepth(51);
        this.juggernautText   = this.add.text(560, 46, 'Juggernaut: --', lbl('#ff9b3b')).setScrollFactor(0).setDepth(51);
        this.doublePointsText = this.add.text(560, 74, '2x Points: --',  lbl('#ffd166')).setScrollFactor(0).setDepth(51);
        this.speedBoostText   = this.add.text(560, 102, 'Speed: --',     lbl('#60a5fa')).setScrollFactor(0).setDepth(51);
        this.tinyModeText     = this.add.text(560, 130, 'Tiny: --',      lbl('#f472b6')).setScrollFactor(0).setDepth(51);
        this.dashText         = this.add.text(20, 165, 'Dash: READY',    lbl('#a78bfa', 16)).setScrollFactor(0).setDepth(51);

        this.muteHint = this.add.text(792, 188, sfx.isMuted() ? '🔇' : '🔊', {
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
            stroke: '#7c2d4a', strokeThickness: 6
        }).setOrigin(0.5);
        const pHint = this.add.text(400, 330, 'Press P or ESC to resume', {
            fontSize: '22px', color: '#ffd1dc', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        this.pauseOverlay.add([pBg, pTitle, pHint]);
    }

    update() {
        if (this.gameOver || this.isPaused) return;

        const now = this.time.now;

        // --- Horizontal control ---
        let movingX = 0;
        if (this.keys.a.isDown || this.cursors.left.isDown) movingX = -1;
        else if (this.keys.d.isDown || this.cursors.right.isDown) movingX = 1;
        if (movingX !== 0) this.lastMoveDir = movingX;

        const speedMult = this.activeEffects.speedBoost > now ? 1.6 : 1;

        // Dash on W — 10s cooldown, brief X burst in facing direction.
        if (Phaser.Input.Keyboard.JustDown(this.keys.w) && now >= this.dashCooldownUntil) {
            this.dashCooldownUntil = now + 10000;
            this.dashUntil = now + 180;
            this.dashDir = movingX !== 0 ? movingX : this.lastMoveDir;
            sfx.dash();
            this.spawnDashTrail(this.dashDir);
        }

        // Apply dash burst, otherwise normal input-driven velocity.
        if (this.dashUntil > now) {
            this.player.body.setVelocityX(this.dashDir * 560);
        } else {
            this.player.body.setVelocityX(movingX * HORIZONTAL_SPEED * speedMult);
        }

        // Ocean currents push you for the duration of the gust.
        if (this.currentUntil > now) {
            this.player.body.setVelocityX(this.player.body.velocity.x + this.currentDir * 110);
        }

        // --- Tiny mode scale + hitbox ---
        const isTiny = this.activeEffects.tinyMode > now;
        if (isTiny !== this.tinyActive) {
            this.tinyActive = isTiny;
            if (isTiny) {
                this.player.setScale(0.5);
                this.player.body.setSize(16, 22);
                this.shieldAura.setScale(0.5);
                this.juggernautAura.setScale(0.5);
            } else {
                this.player.setScale(1);
                this.player.body.setSize(30, 40);
                this.shieldAura.setScale(1);
                this.juggernautAura.setScale(1);
            }
        }

        // Jetpack stays at constant upward velocity.
        this.player.body.setVelocityY(-RISE_SPEED);

        // Pupils follow movement direction.
        this.playerPupilL.x = -7 + movingX * 1.5;
        this.playerPupilR.x = 7 + movingX * 1.5;

        // Clamp to viewport.
        this.player.x = Phaser.Math.Clamp(this.player.x, 18, 782);

        // Camera follow.
        this.cameras.main.scrollY = this.player.y - 380;

        // Spawn new rows ahead of the player.
        while (this.nextRowY > this.cameras.main.scrollY - 240) {
            this.nextRowY -= this.rowSpacing();
            this.spawnRow(this.nextRowY);
        }

        // Cleanup off-screen platforms.
        this.platforms.getChildren().forEach(p => {
            if (p.y > this.cameras.main.scrollY + this.cameras.main.height + 120) {
                this.destroyPlatform(p);
            }
        });
        this.powerups.getChildren().forEach(p => {
            if (p.glow) { p.glow.x = p.x; p.glow.y = p.y; }
            if (p.labelText) { p.labelText.x = p.x; p.labelText.y = p.y - 22; }
            if (p.y > this.cameras.main.scrollY + this.cameras.main.height + 120) {
                this.cleanupPowerup(p);
            }
        });

        // Height & score.
        const rawHeight = Math.max(0, Math.floor(460 - this.player.y));
        this.height = Math.max(this.height, rawHeight);
        if (this.height > this.lastHeightForScore) {
            const gained = this.height - this.lastHeightForScore;
            this.score += Math.floor(gained * this.doublePointsMultiplier);
            this.lastHeightForScore = this.height;
        }

        // Auras.
        this.shieldAura.x = this.player.x;
        this.shieldAura.y = this.player.y;
        this.shieldAura.setVisible(this.shieldCharges > 0);

        const juggernautActive = this.activeEffects.juggernaut > now;
        this.juggernautAura.x = this.player.x;
        this.juggernautAura.y = this.player.y;
        this.juggernautAura.setVisible(juggernautActive);

        // Effect timers.
        this.doublePointsMultiplier = this.activeEffects.doublePoints > now ? 2 : 1;

        this.refreshBand();
        this.updateHUD();
    }

    updateHUD() {
        const now = this.time.now;
        this.scoreText.setText(`Score: ${this.score}`);
        this.heightText.setText(`Height: ${this.height}`);
        this.highScoreText.setText(`High: ${this.highScore}`);

        const dim = (txt, on) => txt.setAlpha(on ? 1 : 0.5);

        this.shieldText.setText(this.shieldCharges > 0 ? `Shield x ${this.shieldCharges}` : 'Shield: --');
        dim(this.shieldText, this.shieldCharges > 0);

        const jRem = Math.max(0, this.activeEffects.juggernaut - now);
        this.juggernautText.setText(jRem > 0 ? `Juggernaut: ${(jRem / 1000).toFixed(1)}s` : 'Juggernaut: --');
        dim(this.juggernautText, jRem > 0);

        const dRem = Math.max(0, this.activeEffects.doublePoints - now);
        this.doublePointsText.setText(dRem > 0 ? `2x Points: ${(dRem / 1000).toFixed(1)}s` : '2x Points: --');
        dim(this.doublePointsText, dRem > 0);

        const sRem = Math.max(0, this.activeEffects.speedBoost - now);
        this.speedBoostText.setText(sRem > 0 ? `Speed: ${(sRem / 1000).toFixed(1)}s` : 'Speed: --');
        dim(this.speedBoostText, sRem > 0);

        const tRem = Math.max(0, this.activeEffects.tinyMode - now);
        this.tinyModeText.setText(tRem > 0 ? `Tiny: ${(tRem / 1000).toFixed(1)}s` : 'Tiny: --');
        dim(this.tinyModeText, tRem > 0);

        const dashRem = Math.max(0, this.dashCooldownUntil - now);
        if (dashRem === 0) {
            this.dashText.setText('Dash: READY (W)');
            this.dashText.setAlpha(1);
        } else {
            this.dashText.setText(`Dash: ${(dashRem / 1000).toFixed(1)}s`);
            this.dashText.setAlpha(0.6);
        }
    }

    // -- Row spawning ------------------------------------------------------
    spawnRow(y) {
        const projHeight = Math.max(0, 460 - y);
        if (inSafeZone(projHeight)) return;
        const bandIdx = bandForHeight(projHeight);
        const placed = this.spawnObstacleRow(y, bandIdx);

        if (Math.random() < 0.16) {
            const gapX = this.findGapX(placed);
            if (gapX !== null) {
                this.spawnPowerup(gapX, y - 24);
            }
        }
    }

    spawnObstacleRow(y, bandIdx) {
        const variants = this.difficulty.variants;
        const variant = Phaser.Utils.Array.GetRandom(variants);
        const twoBarChance = 0.15 + this.difficulty.twoBarBias + (bandIdx * 0.05);
        const placed = [];

        if (Math.random() > twoBarChance) {
            const { width, x } = this.pickSingleBar(variant);
            this.spawnSegment(x, y, width, bandIdx, variant);
            placed.push({ x, w: width });
        } else {
            const segW = Phaser.Math.Between(80, 130);
            const gapW = Phaser.Math.Between(150, 210);
            const totalW = segW * 2 + gapW;
            const leftEdge = Phaser.Math.Between(20, 800 - totalW - 20);
            const leftCx = leftEdge + segW / 2;
            const rightCx = leftEdge + segW + gapW + segW / 2;
            this.spawnSegment(leftCx, y, segW, bandIdx, variant);
            this.spawnSegment(rightCx, y, segW, bandIdx, variant);
            placed.push({ x: leftCx, w: segW }, { x: rightCx, w: segW });
        }

        return placed;
    }

    // Find an X position that doesn't sit directly above any platform in this row.
    // Returns null if no decent gap exists.
    findGapX(placed) {
        const sorted = [...placed].sort((a, b) => a.x - b.x);
        const gaps = [];
        let prevEnd = 30;
        for (const p of sorted) {
            const left = p.x - p.w / 2 - 10; // small padding so the powerup isn't right at the edge
            if (left - prevEnd > 50) {
                gaps.push({ start: prevEnd, end: left });
            }
            prevEnd = p.x + p.w / 2 + 10;
        }
        if (770 - prevEnd > 50) {
            gaps.push({ start: prevEnd, end: 770 });
        }
        if (gaps.length === 0) return null;
        const g = Phaser.Utils.Array.GetRandom(gaps);
        return Phaser.Math.Between(Math.floor(g.start + 15), Math.floor(g.end - 15));
    }

    pickSingleBar(variant) {
        let width;
        if (variant === 'long')      width = Phaser.Math.Between(230, 320);
        else if (variant === 'short') width = Phaser.Math.Between(60, 100);
        else                          width = Phaser.Math.Between(130, 200);

        const x = Phaser.Math.Between(40 + width / 2, 760 - width / 2);
        return { width, x };
    }

    spawnSegment(x, y, w, bandIdx, variant) {
        const style = this.level.platforms[bandIdx];
        const platform = this.add.rectangle(x, y, w, 18, style.color);
        platform.setStrokeStyle(2, 0x000000, 0.35);
        platform.setDepth(0);
        this.physics.add.existing(platform);
        platform.body.setAllowGravity(false);
        platform.body.setImmovable(true);
        platform.platformColor = style.color;
        platform.variant = variant;

        // Render the band-specific decoration. Hints group into render families:
        //   strip family  (plank / log / stone / concrete / neon / glass) — rect on top
        //   puff family   (cloud / leaves / wave) — soft circles on top
        //   crack family  (rock / reef) — line scribble across the surface
        const stripFamily = ['plank', 'log', 'stone', 'concrete', 'neon', 'glass'];
        const puffFamily = ['cloud', 'leaves', 'wave'];
        const crackFamily = ['rock', 'reef'];

        let dec = null;
        let offsetY = 0;
        if (stripFamily.includes(style.hint)) {
            dec = this.add.rectangle(x, y - 8, Math.max(8, w - 6), 4, style.accent).setDepth(1);
            offsetY = -8;
        } else if (puffFamily.includes(style.hint)) {
            dec = this.add.graphics().setDepth(1);
            dec.fillStyle(style.accent, 0.95);
            dec.fillCircle(-w / 3, -4, 12);
            dec.fillCircle(0, -8, 16);
            dec.fillCircle(w / 3, -4, 12);
            dec.x = x; dec.y = y;
        } else if (crackFamily.includes(style.hint)) {
            dec = this.add.graphics().setDepth(1);
            dec.lineStyle(2, style.accent, 0.8);
            dec.beginPath();
            dec.moveTo(-w * 0.35, 0);
            dec.lineTo(w * 0.35, 2);
            dec.strokePath();
            dec.x = x; dec.y = y;
        }
        if (dec) {
            dec.offsetX = dec.x - x;
            dec.offsetY = dec.y - y;
            platform.decoration = dec;
            void offsetY;
        }

        // Variant-driven motion.
        if (variant === 'hMove') {
            const amp = Phaser.Math.Between(90, 140);
            const sign = Math.random() < 0.5 ? -1 : 1;
            const targetX = Phaser.Math.Clamp(x + sign * amp, 40 + w / 2, 760 - w / 2);
            const duration = Phaser.Math.Between(2000, 2800);
            platform.hTween = this.tweens.add({
                targets: platform, x: targetX,
                duration, yoyo: true, repeat: -1, ease: 'Sine.inOut',
                onUpdate: () => this.syncDecoration(platform)
            });
        } else if (variant === 'vMove') {
            const amp = 45;
            const duration = Phaser.Math.Between(1500, 2200);
            platform.vTween = this.tweens.add({
                targets: platform, y: y - amp,
                duration, yoyo: true, repeat: -1, ease: 'Sine.inOut',
                onUpdate: () => this.syncDecoration(platform)
            });
        }

        this.platforms.add(platform);
        return platform;
    }

    syncDecoration(platform) {
        const dec = platform.decoration;
        if (!dec) return;
        dec.x = platform.x + dec.offsetX;
        dec.y = platform.y + dec.offsetY;
    }

    spawnRainHazard() {
        if (this.gameOver || this.isPaused) return;
        const x = Phaser.Math.Between(50, 750);
        const startY = this.cameras.main.scrollY - 30;
        const haz = this.level.rainHazard;

        const warn = this.add.text(x, 24, '⬇', {
            fontSize: '22px', color: '#ff5e5e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
        this.tweens.add({
            targets: warn, alpha: 0.25, yoyo: true, repeat: 2, duration: 130
        });

        this.time.delayedCall(450, () => {
            this.tweens.killTweensOf(warn);
            warn.destroy();
            if (this.gameOver) return;

            const obj = this.add.text(x, startY, haz.emoji, { fontSize: '34px' }).setOrigin(0.5);
            obj.setDepth(4);
            this.physics.add.existing(obj);
            obj.body.setAllowGravity(false);
            obj.body.setImmovable(true);
            obj.body.setVelocityY(520);
            obj.platformColor = haz.color;
            obj.variant = 'rain';
            this.platforms.add(obj);
            this.tweens.add({
                targets: obj, angle: 360,
                duration: 1200, repeat: -1, ease: 'Linear'
            });
        });
    }

    // Level-specific recurring hazards.
    spawnSideHazard(emoji, speed, warnColor) {
        if (this.gameOver || this.isPaused) return;
        const fromLeft = Math.random() < 0.5;
        const y = this.cameras.main.scrollY + Phaser.Math.Between(120, 480);
        const warnX = fromLeft ? 30 : 770;

        const warn = this.add.text(warnX, y, '⚠', {
            fontSize: '22px', color: warnColor, fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(60);
        this.tweens.add({
            targets: warn, alpha: 0.3, yoyo: true, repeat: 4, duration: 110
        });

        this.time.delayedCall(900, () => {
            this.tweens.killTweensOf(warn);
            warn.destroy();
            if (this.gameOver) return;

            const startX = fromLeft ? -30 : 830;
            const obj = this.add.text(startX, y, emoji, { fontSize: '34px' })
                .setOrigin(0.5).setDepth(4);
            if (!fromLeft) obj.setFlipX(true);
            this.physics.add.existing(obj);
            obj.body.setAllowGravity(false);
            obj.body.setImmovable(true);
            obj.body.setVelocityX(fromLeft ? speed : -speed);
            obj.platformColor = 0xffffff;
            obj.variant = 'side';
            this.platforms.add(obj);
        });
    }

    spawnCurrent() {
        if (this.gameOver || this.isPaused) return;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const duration = 3000;
        this.currentDir = dir;
        this.currentUntil = this.time.now + duration;

        for (let i = 0; i < 8; i++) {
            const ay = 70 + i * 55;
            const startX = dir > 0 ? -40 : 840;
            const endX = dir > 0 ? 840 : -40;
            const arrow = this.add.text(startX, ay, dir > 0 ? '➤' : '◀', {
                fontSize: '20px', color: '#67e8f9', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setScrollFactor(0).setDepth(45).setAlpha(0.7);
            this.tweens.add({
                targets: arrow, x: endX,
                duration: Phaser.Math.Between(1100, 1500),
                onComplete: () => {
                    if (this.currentUntil > this.time.now) {
                        arrow.x = startX;
                        this.tweens.add({
                            targets: arrow, x: endX,
                            duration: Phaser.Math.Between(1100, 1500),
                            onComplete: () => arrow.destroy()
                        });
                    } else {
                        arrow.destroy();
                    }
                }
            });
        }
    }

    destroyPlatform(p) {
        if (!p || !p.active) return;
        this.tweens.killTweensOf(p);
        if (p.decoration) p.decoration.destroy();
        if (p.labelText) p.labelText.destroy();
        p.destroy();
    }

    // -- Powerups ---------------------------------------------------------
    spawnPowerup(x, y) {
        const types = ['shield', 'doublePoints', 'juggernaut', 'speedBoost', 'tinyMode'];
        const powerType = Phaser.Utils.Array.GetRandom(types);
        const colors = {
            shield: 0x06b6d4, doublePoints: 0xfacc15, juggernaut: 0xff5e5e,
            speedBoost: 0x60a5fa, tinyMode: 0xf472b6
        };
        const labels = {
            shield: 'Shield', doublePoints: '2x', juggernaut: 'Juggernaut',
            speedBoost: 'Speed', tinyMode: 'Tiny'
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
        const type = powerup.powerType;
        const now = this.time.now;
        if (type === 'shield') {
            this.shieldCharges += 1;
        } else if (type === 'doublePoints') {
            this.activeEffects.doublePoints = now + 30000;
        } else if (type === 'juggernaut') {
            this.activeEffects.juggernaut = now + 5000;
        } else if (type === 'speedBoost') {
            this.activeEffects.speedBoost = now + 8000;
        } else if (type === 'tinyMode') {
            this.activeEffects.tinyMode = now + 10000;
        }
        sfx.collect();

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

    // -- Hit handling -----------------------------------------------------
    handlePlatformOverlap(_player, platform) {
        if (this.gameOver) return;
        if (this.time.now < this.invulnerableUntil) return;

        // Juggernaut: smash through.
        if (this.activeEffects.juggernaut > this.time.now) {
            this.spawnDebris(platform.x, platform.y, platform.platformColor || 0xffffff);
            sfx.shieldHit();
            this.score += 50;
            this.destroyPlatform(platform);
            return;
        }

        // Shield: consume one charge + brief invulnerability so the same platform doesn't eat more.
        if (this.shieldCharges > 0) {
            this.shieldCharges -= 1;
            this.invulnerableUntil = this.time.now + 900;
            sfx.shieldHit();
            this.cameras.main.flash(180, 100, 200, 255);
            this.tweens.add({
                targets: this.shieldAura, scaleX: 1.7, scaleY: 1.7, alpha: 0,
                duration: 350,
                onComplete: () => {
                    this.shieldAura.setScale(1);
                    this.shieldAura.setAlpha(this.shieldCharges > 0 ? 0.25 : 0);
                }
            });
            return;
        }

        this.endGame();
    }

    spawnDashTrail(dir) {
        const skin = SKINS[this.skinId] || SKINS.yellow;
        for (let i = 0; i < 4; i++) {
            this.time.delayedCall(i * 40, () => {
                if (this.gameOver) return;
                const ghost = this.add.rectangle(
                    this.player.x, this.player.y,
                    30 * (this.tinyActive ? 0.5 : 1),
                    40 * (this.tinyActive ? 0.5 : 1),
                    skin.body, 0.45
                );
                ghost.setDepth(9);
                this.tweens.add({
                    targets: ghost, alpha: 0, scaleX: 0.6,
                    duration: 260, onComplete: () => ghost.destroy()
                });
            });
        }
        void dir;
    }

    spawnDebris(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const piece = this.add.rectangle(x, y, 6, 6, color);
            piece.setDepth(5);
            const dx = (Math.random() - 0.5) * 140;
            const dy = (Math.random() - 0.5) * 120;
            this.tweens.add({
                targets: piece,
                x: x + dx, y: y + dy + 80,
                angle: (Math.random() - 0.5) * 360,
                alpha: 0,
                duration: 500, ease: 'Cubic.in',
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

    endGame() {
        this.gameOver = true;
        this.cameras.main.shake(320, 0.015);
        const flash = this.add.rectangle(400, 300, 800, 600, 0xff3030, 0.55)
            .setScrollFactor(0).setDepth(99);
        this.tweens.add({
            targets: flash, alpha: 0, duration: 500,
            onComplete: () => flash.destroy()
        });
        sfx.death();

        if (this.asteroidEvent) {
            this.asteroidEvent.remove(false);
            this.asteroidEvent = null;
        }
        if (this.levelHazardEvent) {
            this.levelHazardEvent.remove(false);
            this.levelHazardEvent = null;
        }

        this.highScore = Math.max(this.highScore, this.score);
        localStorage.setItem(this.highScoreKey, String(this.highScore));

        this.gameOverText.setText(
            `BLOB DOWN\nScore: ${this.score}\nHeight: ${this.height}\nDifficulty: ${this.difficulty.name}\nHigh Score: ${this.highScore}\nPress SPACE for Menu`
        );
        this.player.body.setVelocity(0, 0);

        this.time.delayedCall(450, () => {
            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('RiseMenuScene');
            });
        });
    }
}
