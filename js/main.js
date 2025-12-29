// ================================
// MAIN ENTRY POINT
// ================================

import { GameController } from './game-controller.js';

/**
 * 初始化游戏
 */
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameController();
    window.game = game; // For debugging
});
