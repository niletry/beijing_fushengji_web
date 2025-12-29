// ================================
// GAME CONTROLLER
// ================================

import { GameState } from './game-state.js';
import { LOCATIONS, GOODS } from './data.js';
import { showNotification } from './utils.js';
import { getRandomTip } from './tips-data.js';

/**
 * 游戏控制器类 - 管理UI和用户交互
 */
class GameController {
    constructor() {
        this.state = null;
        this.currentScreen = 'startScreen';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showScreen('startScreen');
        this.loadRankings();
    }

    setupEventListeners() {
        // Start screen
        document.getElementById('newGameBtn').addEventListener('click', () => this.showSetup());
        document.getElementById('loadGameBtn').addEventListener('click', () => this.loadGame());
        document.getElementById('rankingBtn').addEventListener('click', () => this.showRankings());
        document.getElementById('aboutBtn').addEventListener('click', () => this.showAbout());

        // Setup screen
        document.getElementById('setupBackBtn').addEventListener('click', () => this.showScreen('startScreen'));
        document.getElementById('startGameBtn').addEventListener('click', () => this.startNewGame());

        // Ranking screen
        document.getElementById('rankingBackBtn').addEventListener('click', () => this.showScreen('startScreen'));

        // About screen
        document.getElementById('aboutBackBtn').addEventListener('click', () => this.showScreen('startScreen'));

        // Game screen
        document.getElementById('bankBtn').addEventListener('click', () => this.showBank());
        document.getElementById('hospitalBtn').addEventListener('click', () => this.showHospital());
        document.getElementById('rentalBtn').addEventListener('click', () => this.showRental());
        document.getElementById('internetBtn').addEventListener('click', () => this.showInternet());
        document.getElementById('newsBtn').addEventListener('click', () => this.showNews());
        document.getElementById('diaryBtn').addEventListener('click', () => this.showDiary());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveGame());
        document.getElementById('quitBtn').addEventListener('click', () => this.quitGame());

        // Modal
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        // ⭐ 禁用点击遮罩层关闭功能 - 只能通过按钮关闭
        // document.getElementById('modalOverlay').addEventListener('click', (e) => {
        //     if (e.target === document.getElementById('modalOverlay')) {
        //         this.closeModal();
        //     }
        // });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    showSetup() {
        this.showScreen('setupScreen');
    }

    startNewGame() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            showNotification('错误', '请输入你的名字!', 'error');
            return;
        }

        const initialMoney = parseInt(document.querySelector('input[name="initialMoney"]:checked').value);

        // ⭐ 根据难度自动设置天数
        let gameDays = 40; // 默认40天（经典模式和困难模式）
        if (initialMoney === 3000) {
            gameDays = 60; // 休闲模式60天
        }

        this.state = new GameState();
        this.state.playerName = playerName;
        this.state.cash = initialMoney;
        this.state.totalDays = gameDays;
        this.state.currentLocation = LOCATIONS[0].id;

        // 🛡️ 确保成本追踪对象已初始化
        this.state.inventoryCost = {};
        GOODS.forEach(good => {
            this.state.inventoryCost[good.id] = 0;
        });

        // ⭐ 设置事件回调 - 使用模态对话框显示事件
        this.state.onEventTriggered = (title, message, type, icon) => {
            this.showEventModal(title, message, type, icon);
        };

        this.state.generatePrices();

        this.showScreen('gameScreen');
        this.updateGameUI();

        showNotification('游戏开始!', `欢迎来到北京，${playerName}! 努力赚钱吧!`, 'success');
    }

    updateGameUI() {
        // Update status bar
        document.getElementById('playerNameDisplay').textContent = this.state.playerName;
        document.getElementById('cashDisplay').textContent = '¥' + this.state.cash.toLocaleString();
        document.getElementById('bankDisplay').textContent = '¥' + this.state.bank.toLocaleString();
        document.getElementById('healthDisplay').textContent = this.state.health;
        document.getElementById('dayDisplay').textContent = `${this.state.currentDay}/${this.state.totalDays}`;

        const currentLocationName = LOCATIONS.find(l => l.id === this.state.currentLocation)?.name || '--';
        document.getElementById('locationDisplay').textContent = currentLocationName;

        // Update capacity
        const usedCapacity = this.state.getUsedCapacity();
        const capacityPercent = (usedCapacity / this.state.capacity) * 100;
        document.getElementById('capacityBar').style.width = capacityPercent + '%';

        const capBadge = document.getElementById('inventoryCountBadge');
        if (capBadge) {
            capBadge.textContent = `${usedCapacity}/${this.state.capacity}`;
            capBadge.className = `badge ${capacityPercent > 90 ? 'warning' : 'info'}`;
        }

        // Update locations
        this.updateLocations();

        // Update market
        this.updateMarket();

        // Update warehouse
        this.updateWarehouse();

        // 🛡️ 鲁棒性：确保存档或未初始化的状态也有 inventoryCost
        if (this.state && !this.state.inventoryCost) {
            this.state.inventoryCost = {};
            GOODS.forEach(good => {
                this.state.inventoryCost[good.id] = 0;
            });
        }

        // Check game over
        if (this.state.isGameOver()) {
            this.gameOver();
        }
    }

    updateLocations() {
        const container = document.getElementById('locationsList');
        container.innerHTML = '';

        LOCATIONS.forEach(location => {
            const btn = document.createElement('button');
            btn.className = 'location-btn';
            if (location.id === this.state.currentLocation) {
                btn.classList.add('active');
            }
            btn.innerHTML = `${location.icon} ${location.name}`;
            btn.addEventListener('click', () => this.travelTo(location.id));
            container.appendChild(btn);
        });
    }

    updateMarket() {
        const container = document.getElementById('marketItems');
        container.innerHTML = '';

        // ⭐ 只显示：当前地点有货的商品
        const availableGoods = GOODS.filter(good => this.state.prices[good.id] > 0);

        if (availableGoods.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--color-text-dim);">
                    📭 今日此地无货
                </div>
            `;
            return;
        }

        availableGoods.forEach(good => {
            const item = document.createElement('div');
            item.className = 'market-item';

            const price = this.state.prices[good.id];
            const owned = this.state.inventory[good.id] || 0;

            item.innerHTML = `
                <div class="item-name">
                    ${good.icon} ${good.name}
                    ${owned > 0 ? `<span class="item-subtext">持有: ${owned}</span>` : ''}
                </div>
                <div class="item-price text-right">¥${price}</div>
                <div class="item-actions text-center">
                    <button class="item-btn buy-btn" data-good="${good.id}">买入</button>
                </div>
            `;

            container.appendChild(item);
        });

        // Scoped listeners
        container.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const goodId = parseInt(e.currentTarget.dataset.good);
                this.buyGood(goodId);
            });
        });
    }

    updateWarehouse() {
        const container = document.getElementById('warehouseItems');
        if (!container) return;
        container.innerHTML = '';

        // ⭐ 只显示：玩家持有的商品
        const ownedGoods = GOODS.filter(good => (this.state.inventory[good.id] || 0) > 0);

        if (ownedGoods.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--color-text-dim);">
                    🎒 背包空空如也
                </div>
            `;
            return;
        }

        ownedGoods.forEach(good => {
            const item = document.createElement('div');
            item.className = 'warehouse-item';

            const count = this.state.inventory[good.id];
            const avgCost = this.state.inventoryCost[good.id] || 0;
            const currentPrice = this.state.prices[good.id] || 0;
            const isAvailable = currentPrice > 0;

            const profitPerUnit = isAvailable ? (currentPrice - avgCost) : 0;
            const totalProfit = profitPerUnit * count;
            const profitClass = totalProfit > 0 ? 'text-success' : totalProfit < 0 ? 'text-error' : '';
            const profitSign = totalProfit > 0 ? '+' : '';

            item.innerHTML = `
                <div class="item-name">
                    ${good.icon} ${good.name}
                </div>
                <div class="text-right">
                    <span style="font-weight:700;">${count}</span>
                    <span class="item-subtext">成本: ¥${avgCost}</span>
                </div>
                <div class="text-right">
                    <span class="item-price">${isAvailable ? '¥' + currentPrice : '无货'}</span>
                    <span class="profit-tag ${profitClass}">${isAvailable ? profitSign + totalProfit : '--'}</span>
                </div>
                <div class="item-actions text-center">
                    <button class="item-btn sell-btn"
                            data-good="${good.id}" 
                            ${!isAvailable ? 'disabled title="此地无货，无法卖出"' : ''}>
                        卖出
                    </button>
                </div>
            `;

            container.appendChild(item);
        });

        // Scoped listeners
        container.querySelectorAll('.sell-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const goodId = parseInt(e.currentTarget.dataset.good);
                this.sellGood(goodId);
            });
        });
    }

    travelTo(locationId) {
        const result = this.state.changeLocation(locationId);

        if (result.success) {
            showNotification('旅行', result.message, 'success');
            this.state.nextDay();
            this.updateGameUI();
        } else {
            showNotification('无法旅行', result.message, 'error');
        }
    }

    buyGood(goodId) {
        const good = GOODS.find(g => g.id === goodId);
        const price = this.state.prices[goodId];

        // ⭐ 检查商品是否可用（价格为0表示隐藏）
        if (price === 0 || !price) {
            showNotification('商品不可用', '此地今日无此货!', 'error');
            return;
        }

        // Calculate max quantity based on:
        // 1. Available cash
        const maxByMoney = Math.floor(this.state.cash / price);
        // 2. Available capacity
        const usedCapacity = this.state.getUsedCapacity();
        const maxByCapacity = this.state.capacity - usedCapacity;
        // 3. Take the minimum (and at least 1)
        const maxQuantity = Math.max(1, Math.min(maxByMoney, maxByCapacity));

        if (maxQuantity < 1) {
            showNotification('无法购买', '现金不足或背包已满!', 'error');
            return;
        }

        this.showModal('购买商品', `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--color-text-secondary);">${good.icon} ${good.name}</span>
                    <span style="color: var(--color-accent); font-weight: 700;">¥${price}/个</span>
                </div>
                <div style="padding: 0.75rem; background: var(--color-bg-surface); border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div style="font-size: 0.875rem; color: var(--color-text-dim);">
                        💰 可用现金: ¥${this.state.cash.toLocaleString()}<br>
                        🎒 剩余容量: ${maxByCapacity}<br>
                        📊 最多可买: ${maxQuantity}个
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <label style="color: var(--color-primary); font-weight: 600;">购买数量</label>
                    <span id="buyQuantityDisplay" style="color: var(--color-accent); font-weight: 700; font-size: 1.25rem;">1</span>
                </div>
                <input type="range" id="buyQuantitySlider" min="1" max="${maxQuantity}" value="1" 
                    style="width: 100%; height: 8px; background: var(--color-bg-surface); 
                    border-radius: 5px; outline: none; cursor: pointer;
                    -webkit-appearance: none;">
                <style>
                    #buyQuantitySlider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 20px;
                        height: 20px;
                        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 0 10px var(--color-primary-glow);
                    }
                    #buyQuantitySlider::-moz-range-thumb {
                        width: 20px;
                        height: 20px;
                        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
                        border-radius: 50%;
                        cursor: pointer;
                        border: none;
                        box-shadow: 0 0 10px var(--color-primary-glow);
                    }
                </style>
            </div>
            
            <div style="padding: 1rem; background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1)); 
                border: 2px solid var(--color-border-bright); border-radius: 0.5rem; text-align: center;">
                <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">总价</div>
                <div id="buyTotalPrice" style="font-size: 2rem; font-weight: 700; color: var(--color-accent); 
                    font-family: var(--font-display);">¥${price}</div>
            </div>
        `, [
            {
                text: '取消',
                className: 'menu-btn',
                onClick: () => this.closeModal()
            },
            {
                text: '确认购买',
                className: 'menu-btn primary',
                onClick: () => {
                    const quantity = parseInt(document.getElementById('buyQuantitySlider').value) || 1;
                    const result = this.state.buyGood(goodId, quantity);

                    if (result.success) {
                        showNotification('购买成功', result.message, 'success');
                        this.updateGameUI();
                    } else {
                        showNotification('购买失败', result.message, 'error');
                    }

                    this.closeModal();
                }
            }
        ]);

        // Add slider event listener after modal is shown
        setTimeout(() => {
            const slider = document.getElementById('buyQuantitySlider');
            const display = document.getElementById('buyQuantityDisplay');
            const totalPrice = document.getElementById('buyTotalPrice');

            slider.addEventListener('input', (e) => {
                const quantity = parseInt(e.target.value);
                display.textContent = quantity;
                totalPrice.textContent = '¥' + (price * quantity).toLocaleString();
            });
        }, 100);
    }

    sellGood(goodId) {
        const owned = this.state.inventory[goodId];
        if (owned === 0) {
            showNotification('无法出售', '你没有这个商品!', 'error');
            return;
        }

        const good = GOODS.find(g => g.id === goodId);
        const price = this.state.prices[goodId];
        if (price === 0) {
            showNotification('无法出售', '此地无该商品的市场，无法卖出!', 'error');
            return;
        }

        this.showModal('出售商品', `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--color-text-secondary);">${good.icon} ${good.name}</span>
                    <span style="color: var(--color-accent); font-weight: 700;">¥${price}/个</span>
                </div>
                <div style="padding: 0.75rem; background: var(--color-bg-surface); border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div style="font-size: 0.875rem; color: var(--color-text-dim);">
                        🎒 持有数量: ${owned}个<br>
                        💰 最大收益: ¥${(owned * price).toLocaleString()}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <label style="color: var(--color-primary); font-weight: 600;">出售数量</label>
                    <span id="sellQuantityDisplay" style="color: var(--color-accent); font-weight: 700; font-size: 1.25rem;">1</span>
                </div>
                <input type="range" id="sellQuantitySlider" min="1" max="${owned}" value="1" 
                    style="width: 100%; height: 8px; background: var(--color-bg-surface); 
                    border-radius: 5px; outline: none; cursor: pointer;
                    -webkit-appearance: none;">
                <style>
                    #sellQuantitySlider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 20px;
                        height: 20px;
                        background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 0 10px var(--color-secondary-glow);
                    }
                    #sellQuantitySlider::-moz-range-thumb {
                        width: 20px;
                        height: 20px;
                        background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
                        border-radius: 50%;
                        cursor: pointer;
                        border: none;
                        box-shadow: 0 0 10px var(--color-secondary-glow);
                    }
                </style>
            </div>
            
            <div style="padding: 1rem; background: linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(255, 255, 0, 0.1)); 
                border: 2px solid var(--color-secondary); border-radius: 0.5rem; text-align: center;">
                <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">可获得</div>
                <div id="sellTotalPrice" style="font-size: 2rem; font-weight: 700; color: var(--color-success); 
                    font-family: var(--font-display);">¥${price}</div>
            </div>
        `, [
            {
                text: '取消',
                className: 'menu-btn',
                onClick: () => this.closeModal()
            },
            {
                text: '确认出售',
                className: 'menu-btn primary',
                onClick: () => {
                    const quantity = parseInt(document.getElementById('sellQuantitySlider').value) || 1;
                    const result = this.state.sellGood(goodId, quantity);

                    if (result.success) {
                        showNotification('出售成功', result.message, 'success');
                        this.updateGameUI();
                    } else {
                        showNotification('出售失败', result.message, 'error');
                    }

                    this.closeModal();
                }
            }
        ]);

        // Add slider event listener after modal is shown
        setTimeout(() => {
            const slider = document.getElementById('sellQuantitySlider');
            const display = document.getElementById('sellQuantityDisplay');
            const totalPrice = document.getElementById('sellTotalPrice');

            slider.addEventListener('input', (e) => {
                const quantity = parseInt(e.target.value);
                display.textContent = quantity;
                totalPrice.textContent = '¥' + (price * quantity).toLocaleString();
            });
        }, 100);
    }

    showBank() {
        this.showModal('🏦 银行服务', `
            <div style="margin-bottom: 1.5rem;">
                <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">
                    当前存款: <span style="color: var(--color-accent); font-weight: 700;">¥${this.state.bank.toLocaleString()}</span><br>
                    当前现金: <span style="color: var(--color-primary); font-weight: 700;">¥${this.state.cash.toLocaleString()}</span><br>
                    <small>每天获得0.5%利息</small>
                </p>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">存款金额:</label>
                    <input type="number" id="depositAmount" min="0" max="${this.state.cash}" value="0" 
                        style="width: 100%; padding: 0.5rem; background: var(--color-bg-surface); 
                        border: 2px solid var(--color-border); border-radius: 0.5rem; 
                        color: var(--color-text-primary); font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">取款金额:</label>
                    <input type="number" id="withdrawAmount" min="0" max="${this.state.bank}" value="0" 
                        style="width: 100%; padding: 0.5rem; background: var(--color-bg-surface); 
                        border: 2px solid var(--color-border); border-radius: 0.5rem; 
                        color: var(--color-text-primary); font-size: 1rem;">
                </div>
            </div>
        `, [
            {
                text: '存款',
                className: 'menu-btn',
                onClick: () => {
                    const amount = parseInt(document.getElementById('depositAmount').value) || 0;
                    if (amount > 0 && amount <= this.state.cash) {
                        this.state.cash -= amount;
                        this.state.bank += amount;
                        showNotification('存款成功', `存入 ¥${amount}`, 'success');
                        this.updateGameUI();
                        this.closeModal();
                    } else {
                        showNotification('存款失败', '金额无效或现金不足', 'error');
                    }
                }
            },
            {
                text: '取款',
                className: 'menu-btn',
                onClick: () => {
                    const amount = parseInt(document.getElementById('withdrawAmount').value) || 0;
                    if (amount > 0 && amount <= this.state.bank) {
                        this.state.bank -= amount;
                        this.state.cash += amount;
                        showNotification('取款成功', `取出 ¥${amount}`, 'success');
                        this.updateGameUI();
                        this.closeModal();
                    } else {
                        showNotification('取款失败', '金额无效或存款不足', 'error');
                    }
                }
            },
            {
                text: '关闭',
                className: 'menu-btn',
                onClick: () => this.closeModal()
            }
        ]);
    }

    showHospital() {
        const cost = Math.floor((100 - this.state.health) * 10);

        this.showModal('🏥 医院', `
            <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">
                当前健康: <span style="color: ${this.state.health > 50 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 700;">${this.state.health}</span><br>
                治疗费用: <span style="color: var(--color-accent); font-weight: 700;">¥${cost}</span>
            </p>
            <p style="color: var(--color-text-dim); font-size: 0.875rem;">
                治疗后健康将恢复至100
            </p>
        `, [
            {
                text: '取消',
                className: 'menu-btn',
                onClick: () => this.closeModal()
            },
            {
                text: '接受治疗',
                className: 'menu-btn primary',
                onClick: () => {
                    if (this.state.health >= 100) {
                        showNotification('不需要治疗', '你的健康状况良好!', 'info');
                    } else if (this.state.cash < cost) {
                        showNotification('治疗失败', '现金不足以支付医疗费!', 'error');
                    } else {
                        this.state.cash -= cost;
                        this.state.health = 100;
                        showNotification('治疗成功', '健康已恢复至100!', 'success');
                        this.updateGameUI();
                    }
                    this.closeModal();
                }
            }
        ]);
    }

    showRental() {
        const rentalCosts = [500, 1000, 2000, 5000];
        const capacityIncrease = [20, 50, 100, 200];

        let content = '<div style="color: var(--color-text-secondary);">';
        content += `<p style="margin-bottom: 1rem;">当前背包容量: <span style="color: var(--color-primary); font-weight: 700;">${this.state.capacity}</span></p>`;
        content += '<p style="margin-bottom: 1rem;">租更大的房子可以增加背包容量:</p>';
        content += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';

        for (let i = this.state.rentalLevel; i < rentalCosts.length; i++) {
            content += `
                <div style="padding: 0.75rem; background: var(--color-bg-surface); border: 2px solid var(--color-border); border-radius: 0.5rem;">
                    级别 ${i + 1}: +${capacityIncrease[i]} 容量 - ¥${rentalCosts[i]}
                </div>
            `;
        }

        content += '</div></div>';

        this.showModal('🏠 租房', content, [
            {
                text: '取消',
                className: 'menu-btn',
                onClick: () => this.closeModal()
            },
            {
                text: '升级',
                className: 'menu-btn primary',
                onClick: () => {
                    if (this.state.rentalLevel >= rentalCosts.length) {
                        showNotification('已达上限', '你已经租了最大的房子!', 'info');
                    } else {
                        const cost = rentalCosts[this.state.rentalLevel];
                        if (this.state.cash < cost) {
                            showNotification('租房失败', '现金不足!', 'error');
                        } else {
                            this.state.cash -= cost;
                            this.state.capacity += capacityIncrease[this.state.rentalLevel];
                            this.state.rentalLevel++;
                            showNotification('租房成功', `背包容量增加至 ${this.state.capacity}!`, 'success');
                            this.updateGameUI();
                        }
                    }
                    this.closeModal();
                }
            }
        ]);
    }

    showInternet() {
        const cost = 50;
        const tip = getRandomTip();

        this.showModal('💻 网吧', `
            <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">
                上网费用: <span style="color: var(--color-accent); font-weight: 700;">¥${cost}</span>
            </p>
            <p style="color: var(--color-text-dim); font-size: 0.875rem;">
                在网吧可以查看市场行情和游戏攻略
            </p>
            
            <div style="margin-top: 1.5rem; padding: 1rem; background: linear-gradient(135deg, rgba(0,255,255,0.1), rgba(255,0,255,0.1)); 
                border: 2px solid var(--color-border-bright); border-radius: 0.5rem;">
                <h4 style="color: var(--color-primary); margin-bottom: 0.75rem; text-shadow: 0 0 10px var(--color-primary-glow);">
                    💡 今日贴士
                </h4>
                <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                    <p style="color: var(--color-text-primary); font-size: 0.95rem; line-height: 1.6; margin: 0;">
                        ${tip.tip}
                    </p>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--color-text-dim);">
                    <span>📚 ${tip.category}</span>
                    <span>✍️ ${tip.author}</span>
                </div>
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: var(--color-bg-surface); border-radius: 0.5rem;">
                <h4 style="color: var(--color-primary); margin-bottom: 0.5rem;">基本攻略:</h4>
                <ul style="list-style: none; padding: 0; font-size: 0.875rem; color: var(--color-text-secondary);">
                    <li>• 不同地点商品价格不同，寻找价差!</li>
                    <li>• 及时存款可获得利息</li>
                    <li>• 注意健康值，太低会游戏结束</li>
                    <li>• 租更大的房子增加背包容量</li>
                    <li>• 市场事件会影响商品价格</li>
                </ul>
            </div>
        `, [
            {
                text: '下一条贴士',
                className: 'menu-btn',
                onClick: () => {
                    this.closeModal();
                    setTimeout(() => this.showInternet(), 100);
                }
            },
            {
                text: '关闭',
                className: 'menu-btn primary',
                onClick: () => this.closeModal()
            }
        ]);
    }

    showNews() {
        let newsContent = '<div style="color: var(--color-text-secondary); font-size: 0.875rem;">';
        newsContent += `<p style="margin-bottom: 1rem;"><strong>今日: 第 ${this.state.currentDay} 天</strong></p>`;

        if (this.state.activeEvents.length > 0) {
            newsContent += '<h4 style="color: var(--color-primary); margin-bottom: 0.5rem;">📰 市场动态:</h4>';
            this.state.activeEvents.forEach(event => {
                newsContent += `<p style="margin-bottom: 0.5rem;">• ${event.msg}</p>`;
            });
        } else {
            newsContent += '<p>今天没有特别的市场消息...</p>';
        }

        newsContent += '</div>';

        this.showModal('📰 新闻', newsContent, [
            {
                text: '关闭',
                className: 'menu-btn primary',
                onClick: () => this.closeModal()
            }
        ]);
    }

    showDiary() {
        const totalMoney = this.state.getTotalMoney();
        const daysLeft = this.state.totalDays - this.state.currentDay + 1;

        this.showModal('📔 日记', `
            <div style="color: var(--color-text-secondary); line-height: 1.8;">
                <p style="margin-bottom: 1rem;">
                    <strong style="color: var(--color-primary);">我的北京浮生记</strong>
                </p>
                <p>已经在北京打拼了 ${this.state.currentDay} 天...</p>
                <p>总资产: ¥${totalMoney.toLocaleString()}</p>
                <p>健康状况: ${this.state.health > 70 ? '良好' : this.state.health > 40 ? '一般' : '糟糕'}</p>
                <p>还剩 ${daysLeft} 天...</p>
                <p style="margin-top: 1rem; font-style: italic; color: var(--color-text-dim);">
                    ${totalMoney > 50000 ? '看来我快要发达了!' : totalMoney > 10000 ? '继续努力，成功就在前方!' : '赚钱真不容易啊...'}
                </p>
            </div>
        `, [
            {
                text: '关闭',
                className: 'menu-btn primary',
                onClick: () => this.closeModal()
            }
        ]);
    }

    saveGame() {
        try {
            localStorage.setItem('beijingFushengjiSave', JSON.stringify(this.state));
            showNotification('保存成功', '游戏已保存!', 'success');
        } catch (e) {
            showNotification('保存失败', '无法保存游戏', 'error');
        }
    }

    loadGame() {
        try {
            const saveData = localStorage.getItem('beijingFushengjiSave');
            if (!saveData) {
                showNotification('读取失败', '没有找到存档', 'error');
                return;
            }

            this.state = Object.assign(new GameState(), JSON.parse(saveData));

            // ⭐ 设置事件回调 - 使用模态对话框显示事件
            this.state.onEventTriggered = (title, message, type, icon) => {
                this.showEventModal(title, message, type, icon);
            };

            this.showScreen('gameScreen');
            this.updateGameUI();
            showNotification('读取成功', '游戏已读取!', 'success');
        } catch (e) {
            showNotification('读取失败', '存档文件损坏', 'error');
        }
    }

    quitGame() {
        this.showModal('确认退出', `
            <p style="color: var(--color-text-secondary);">确定要退出游戏吗?</p>
            <p style="color: var(--color-text-dim); font-size: 0.875rem; margin-top: 0.5rem;">
                (记得先保存游戏!)
            </p>
        `, [
            {
                text: '取消',
                className: 'menu-btn',
                onClick: () => this.closeModal()
            },
            {
                text: '确认退出',
                className: 'menu-btn danger',
                onClick: () => {
                    this.closeModal();
                    this.showScreen('startScreen');
                    this.state = null;
                }
            }
        ]);
    }

    gameOver() {
        const totalMoney = this.state.getTotalMoney();
        const reason = this.state.getGameOverReason();

        // Save to rankings
        this.saveToRankings({
            name: this.state.playerName,
            money: totalMoney,
            days: this.state.currentDay,
            date: new Date().toLocaleDateString('zh-CN')
        });

        this.showModal('游戏结束!', `
            <div style="text-align: center;">
                <h3 style="color: var(--color-primary); margin-bottom: 1rem;">${reason}</h3>
                <div style="margin: 2rem 0;">
                    <p style="color: var(--color-text-secondary); margin-bottom: 0.5rem;">最终资产</p>
                    <p style="font-size: 2.5rem; font-weight: 700; color: var(--color-accent); font-family: var(--font-display);">
                        ¥${totalMoney.toLocaleString()}
                    </p>
                </div>
                <p style="color: var(--color-text-secondary);">
                    ${totalMoney > 100000 ? '🏆 商业巨子!' : totalMoney > 50000 ? '💰 成功人士!' : totalMoney > 20000 ? '📈 小有成就!' : '💪 继续努力!'}
                </p>
            </div>
        `, [
            {
                text: '返回主菜单',
                className: 'menu-btn primary',
                onClick: () => {
                    this.closeModal();
                    this.showScreen('startScreen');
                    this.state = null;
                }
            }
        ]);
    }

    showRankings() {
        this.showScreen('rankingScreen');
        this.loadRankings();
    }

    saveToRankings(record) {
        try {
            let rankings = JSON.parse(localStorage.getItem('beijingFushengjiRankings') || '[]');
            rankings.push(record);
            rankings.sort((a, b) => b.money - a.money);
            rankings = rankings.slice(0, 20); // Keep top 20
            localStorage.setItem('beijingFushengjiRankings', JSON.stringify(rankings));
        } catch (e) {
            console.error('Failed to save ranking', e);
        }
    }

    loadRankings() {
        try {
            const rankings = JSON.parse(localStorage.getItem('beijingFushengjiRankings') || '[]');
            const container = document.getElementById('rankingList');

            if (rankings.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--color-text-dim); padding: 2rem;">还没有排行记录</p>';
                return;
            }

            container.innerHTML = rankings.map((record, index) => `
                <div class="ranking-item">
                    <div class="ranking-number">${index + 1}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${record.name}</div>
                        <div class="ranking-details">${record.days}天 | ${record.date}</div>
                    </div>
                    <div class="ranking-money">¥${record.money.toLocaleString()}</div>
                </div>
            `).join('');
        } catch (e) {
            console.error('Failed to load rankings', e);
        }
    }

    showAbout() {
        this.showScreen('aboutScreen');
    }

    /**
     * 显示随机事件模态对话框
     */
    showEventModal(title, message, type, icon) {
        const typeColors = {
            success: 'var(--color-success)',
            warning: 'var(--color-warning)',
            error: 'var(--color-danger)',
            info: 'var(--color-primary)'
        };

        const color = typeColors[type] || typeColors.info;

        const bodyHTML = `
            <div style="text-align: center; padding: 1rem 0;">
                <div style="font-size: 5rem; margin-bottom: 1rem; animation: pulse 1s ease-in-out;">
                    ${icon}
                </div>
                <div style="font-size: 1.125rem; color: var(--color-text-primary); line-height: 1.8; white-space: pre-line; text-align: left; max-width: 400px; margin: 0 auto;">
                    ${message.trim()}
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            </style>
        `;

        this.showModal(title, bodyHTML, [
            {
                text: '知道了',
                className: 'menu-btn primary',
                onClick: () => {
                    this.closeModal();
                    this.updateGameUI(); // 更新UI以反映事件影响
                }
            }
        ]);
    }

    showModal(title, bodyHTML, buttons = []) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;

        const footer = document.getElementById('modalFooter');
        footer.innerHTML = '';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = btn.className || 'menu-btn';
            button.textContent = btn.text;
            button.addEventListener('click', btn.onClick);
            footer.appendChild(button);
        });

        document.getElementById('modalOverlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }
}

// ================================



// Export the GameController class
export { GameController };
