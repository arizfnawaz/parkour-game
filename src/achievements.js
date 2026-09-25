export const ACHIEVEMENTS = {
    firstJump:   { name: 'First Steps',     desc: 'Take your first jump' },
    firstDash:   { name: 'Burst!',          desc: 'Use the dash' },
    firstFlip:   { name: 'Style Points',    desc: 'Pull off a double-jump flip' },
    height500:   { name: 'Climber',         desc: 'Reach height 500' },
    height2000:  { name: 'High Climber',    desc: 'Reach height 2000' },
    height5000:  { name: 'Mountaineer',     desc: 'Reach height 5000' },
    combo10:     { name: 'On A Roll',       desc: 'Reach a 10x combo' },
    combo25:     { name: 'Combo King',      desc: 'Reach a 25x combo' },
    powerups5:   { name: 'Powerup Hunter',  desc: 'Collect 5 powerups in a run' },
    survivor60:  { name: 'Survivor',        desc: 'Survive 60 seconds' },
    bounce10:    { name: 'Boing Boing',     desc: 'Auto-bounce on 10 green platforms' },
    score1000:   { name: 'Scorer',          desc: 'Score 1000 points' },
    score5000:   { name: 'High Scorer',     desc: 'Score 5000 points' },
    shieldSave:  { name: 'Saved By Bell',   desc: 'Survive a hit thanks to a shield' },
    deaths10:    { name: 'Persistence',     desc: 'Die 10 times' }
};

class AchievementManager {
    constructor() {
        try {
            this.unlocked = JSON.parse(localStorage.getItem('parkourAchievements') || '{}');
        } catch (_) {
            this.unlocked = {};
        }
        this.deaths = Number(localStorage.getItem('parkourDeaths') || 0);
    }

    isUnlocked(id) { return !!this.unlocked[id]; }

    /** Returns the achievement def if newly unlocked, otherwise null. */
    unlock(id) {
        if (this.unlocked[id] || !ACHIEVEMENTS[id]) return null;
        this.unlocked[id] = true;
        localStorage.setItem('parkourAchievements', JSON.stringify(this.unlocked));
        return { id, ...ACHIEVEMENTS[id] };
    }

    incrementDeaths() {
        this.deaths += 1;
        localStorage.setItem('parkourDeaths', String(this.deaths));
        if (this.deaths >= 10) return this.unlock('deaths10');
        return null;
    }

    unlockedCount() { return Object.keys(this.unlocked).length; }
    totalCount() { return Object.keys(ACHIEVEMENTS).length; }
}

export const achievements = new AchievementManager();

export const SKINS = {
    yellow: { name: 'Sunny',  body: 0xffeb3b, stroke: 0xc9a700, eye: 0xffffff, pupil: 0x1f2937, mouth: 0x1f2937 },
    red:    { name: 'Ember',  body: 0xff5e5e, stroke: 0x8b1010, eye: 0xffffff, pupil: 0x1f2937, mouth: 0x1f2937 },
    blue:   { name: 'Cobalt', body: 0x4fa3ff, stroke: 0x144a85, eye: 0xffffff, pupil: 0x1f2937, mouth: 0x1f2937 },
    green:  { name: 'Mint',   body: 0x4ddb84, stroke: 0x176f3a, eye: 0xffffff, pupil: 0x1f2937, mouth: 0x1f2937 },
    pink:   { name: 'Bubble', body: 0xff7ac4, stroke: 0x9c2670, eye: 0xffffff, pupil: 0x1f2937, mouth: 0x1f2937 },
    dark:   { name: 'Shadow', body: 0x2c2c2c, stroke: 0x000000, eye: 0xfff04d, pupil: 0x000000, mouth: 0xfff04d }
};

export function loadSkin() {
    const id = localStorage.getItem('parkourSkin') || 'yellow';
    return SKINS[id] ? id : 'yellow';
}

export function saveSkin(id) {
    if (SKINS[id]) localStorage.setItem('parkourSkin', id);
}
