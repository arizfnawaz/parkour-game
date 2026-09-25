import Phaser from 'phaser';
import TitleScene from './scenes/titleScene.js';
import StartMenuScene from './scenes/startMenuScene.js';
import GameScene from './scenes/gameScene.js';
import RiseMenuScene from './scenes/riseMenuScene.js';
import RiseScene from './scenes/riseScene.js';
import AttackMenuScene from './scenes/attackMenuScene.js';
import AttackScene from './scenes/attackScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: [TitleScene, StartMenuScene, GameScene, RiseMenuScene, RiseScene, AttackMenuScene, AttackScene],
    render: {
        backgroundColor: '#87CEEB'
    }
};

const game = new Phaser.Game(config);
