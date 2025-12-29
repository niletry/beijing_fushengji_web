// ================================
// GAME STATE
// ================================
// VERSION 1.1 - Added inventoryCost tracking

import { GOODS, LOCATIONS, RANDOM_EVENTS } from './data.js';
import { showNotification } from './utils.js';

/**
 * 游戏状态类 - 管理游戏的所有状态数据
 */
export class GameState {
    constructor() {
        this.playerName = '';
        this.cash = 0;
        this.bank = 0;
        this.health = 100;
        this.currentDay = 1;
        this.totalDays = 40;
        this.currentLocation = '';
        this.inventory = {};
        this.inventoryCost = {}; // ⭐ 新增：存储每种商品的加权平均成本
        this.capacity = 100;
        this.rentalLevel = 0;
        this.prices = {};
        this.activeEvents = [];
        this.onEventTriggered = null; // ⭐ 事件回调函数
        
        // Initialize inventory and costs
        GOODS.forEach(good => {
            this.inventory[good.id] = 0;
            this.inventoryCost[good.id] = 0;
        });
    }
    
    /**
     * 获取总资产（现金+存款）
     */
    getTotalMoney() {
        return this.cash + this.bank;
    }
    
    /**
     * 获取已使用的背包容量
     */
    getUsedCapacity() {
        return Object.values(this.inventory).reduce((sum, count) => sum + count, 0);
    }
    
    /**
     * 检查是否还能携带更多商品
     */
    canCarry(amount = 1) {
        return this.getUsedCapacity() + amount <= this.capacity;
    }
    
    /**
     * 为当前地点生成商品价格（完全还原原版算法）
     * 
     * 原版逻辑 (SelectionDlg.cpp:1188-1205):
     * 1. price = basePrice + Random(priceRange)
     * 2. 随机隐藏 leaveout 个商品（价格设为0）
     * 3. 最后2天显示全部商品（leaveout=0）
     */
    generatePrices() {
        const prices = {};
        const daysLeft = this.totalDays - this.currentDay + 1;

        // ⭐ 确定要隐藏的商品数量
        // 原版规则：最后2天显示全部，否则隐藏3个
        const leaveout = daysLeft <= 2 ? 0 : 3;

        // ⭐ 随机选择要隐藏的商品
        const hiddenGoods = new Set();
        while (hiddenGoods.size < leaveout && hiddenGoods.size < GOODS.length) {
            const randomId = Math.floor(Math.random() * GOODS.length);
            hiddenGoods.add(randomId);
        }

        // ⭐ 生成价格（使用原版公式）
        GOODS.forEach(good => {
            if (hiddenGoods.has(good.id)) {
                // 隐藏的商品：价格设为0
                prices[good.id] = 0;
            } else {
                // 显示的商品：basePrice + Random(priceRange)
                const randomValue = Math.floor(Math.random() * good.priceRange);
                prices[good.id] = good.basePrice + randomValue;
            }
        });

        this.prices = prices;
    }
    
    /**
     * 购买商品
     */
    buyGood(goodId, quantity = 1) {
        const price = this.prices[goodId];
        const totalCost = price * quantity;
        
        if (this.cash < totalCost) {
            return { success: false, message: '现金不足!' };
        }
        
        if (!this.canCarry(quantity)) {
            return { success: false, message: '背包容量不足!' };
        }
        
        const oldQuantity = this.inventory[goodId] || 0;
        const oldAvgCost = this.inventoryCost[goodId] || 0;

        // 计算新的加权平均成本
        // (旧数量 * 旧成本 + 新数量 * 现价) / 总数量
        const newTotalQuantity = oldQuantity + quantity;
        const newAvgCost = Math.round((oldQuantity * oldAvgCost + totalCost) / newTotalQuantity);

        this.cash -= totalCost;
        this.inventory[goodId] = newTotalQuantity;
        this.inventoryCost[goodId] = newAvgCost;

        return { success: true, message: `购买成功! 花费 ¥${totalCost}` };
    }
    
    /**
     * 出售商品
     */
    sellGood(goodId, quantity = 1) {
        if (this.inventory[goodId] < quantity) {
            return { success: false, message: '持有数量不足!' };
        }
        
        const price = this.prices[goodId];
        const totalEarnings = price * quantity;
        
        this.cash += totalEarnings;
        this.inventory[goodId] -= quantity;

        // 如果卖完了，清空成本
        if (this.inventory[goodId] === 0) {
            this.inventoryCost[goodId] = 0;
        }

        return { success: true, message: `出售成功! 获得 ¥${totalEarnings}` };
    }
    
    /**
     * 进入下一天
     */
    nextDay() {
        this.currentDay++;
        
        // ⭐ 重新生成商品和价格（原版机制）
        this.generatePrices();

        // Clear old events (events last 1 day)
        this.activeEvents = [];
        
        // Random event chance
        if (Math.random() < 0.4) { // 40% chance of event
            this.triggerRandomEvent();
        }
        
        // Bank interest (1% per day - 原版利率)
        if (this.bank > 0) {
            const interest = Math.floor(this.bank * 0.01);
            this.bank += interest;
            if (interest > 0) {
                showNotification('银行利息', `获得利息 ¥${interest}`, 'success');
            }
        }
        
        // Health regeneration
        if (this.health < 100 && this.health > 0) {
            this.health = Math.min(100, this.health + 2);
        }
    }
    
    /**
     * 触发随机事件
     */
    triggerRandomEvent() {
        // Weighted random selection
        const totalFrequency = RANDOM_EVENTS.reduce((sum, e) => sum + e.frequency, 0);
        let random = Math.random() * totalFrequency;
        
        for (const event of RANDOM_EVENTS) {
            random -= event.frequency;
            if (random <= 0) {
                this.applyEvent(event);
                break;
            }
        }
    }
    
    /**
     * 应用事件效果
     */
    applyEvent(event) {
        let eventTitle = '';
        let eventIcon = '';
        let eventType = 'info';

        if (event.moneyChange) {
            const change = event.moneyChange;
            if (change > 0) {
                this.cash += change;
                eventTitle = '💰 好运来了!';
                eventIcon = '🎉';
                eventType = 'success';
            } else {
                const actualLoss = Math.min(Math.abs(change), this.cash);
                this.cash -= actualLoss;
                eventTitle = '⚠️ 倒霉!';
                eventIcon = '😱';
                eventType = 'warning';
            }

            // 使用模态对话框显示金钱相关事件
            if (this.onEventTriggered) {
                this.onEventTriggered(eventTitle, event.msg, eventType, eventIcon);
            }
        }
        
        if (event.healthChange) {
            this.health = Math.max(0, Math.min(100, this.health + event.healthChange));
            if (event.healthChange < 0) {
                eventTitle = '🤕 受伤了!';
                eventIcon = '💔';
                eventType = 'error';
            } else {
                eventTitle = '💊 健康+';
                eventIcon = '❤️';
                eventType = 'success';
            }

            // 使用模态对话框显示健康相关事件
            if (this.onEventTriggered) {
                this.onEventTriggered(eventTitle, event.msg, eventType, eventIcon);
            }
        }
        
        if (event.type === 'market' && event.goodId !== undefined && event.priceMultiplier) {
            // ⭐ 实现价格调整功能（参考原版机制）
            const goodId = event.goodId;
            const currentPrice = this.prices[goodId];

            // 只有当商品当前有价格（不为0）时才调整
            if (currentPrice && currentPrice > 0) {
                // 应用价格倍数
                const newPrice = Math.floor(currentPrice * event.priceMultiplier);
                this.prices[goodId] = newPrice;

                // 将事件加入活跃事件列表（持续1天）
                this.activeEvents.push({
                    ...event,
                    affectedGoodId: goodId,
                    oldPrice: currentPrice,
                    newPrice: newPrice
                });

                // ⭐ 使用模态对话框显示市场事件
                const good = GOODS.find(g => g.id === goodId);
                const priceChange = event.priceMultiplier > 1 ? '暴涨' : '暴跌';
                const emoji = event.priceMultiplier > 1 ? '📈' : '📉';
                const eventTitle = `${emoji} 市场动态 - ${priceChange}!`;
                const eventIcon = emoji;

                // 构建详细消息
                // 计算价格变化
                const priceDiff = newPrice - currentPrice;
                const percentChange = ((event.priceMultiplier - 1) * 100).toFixed(0);
                const changeSign = priceDiff > 0 ? '+' : '';

                const detailedMessage = `${event.msg}

━━━━━━━━━━━━━━━━━━━━

${good.icon} ${good.name}

原价: ¥${currentPrice.toLocaleString()}
现价: ¥${newPrice.toLocaleString()}

变化: ${changeSign}¥${Math.abs(priceDiff).toLocaleString()} (${changeSign}${percentChange}%)
倍数: ×${event.priceMultiplier}`;

                // 使用模态对话框显示
                if (this.onEventTriggered) {
                    this.onEventTriggered(eventTitle, detailedMessage, 'info', eventIcon);
                }
            }
        }
    }
    
    /**
     * 更换地点
     */
    changeLocation(newLocation) {
        if (this.currentLocation === newLocation) {
            return { success: false, message: '已经在这个位置了!' };
        }
        
        // Travel cost
        const travelCost = 10;
        if (this.cash < travelCost) {
            return { success: false, message: '旅费不足! 需要 ¥' + travelCost };
        }
        
        this.cash -= travelCost;
        this.currentLocation = newLocation;

        // ⭐ 重新生成商品和价格（原版机制）
        this.generatePrices();
        
        return { success: true, message: `已到达${LOCATIONS.find(l => l.id === newLocation).name}` };
    }
    
    /**
     * 检查游戏是否结束
     */
    isGameOver() {
        return this.currentDay > this.totalDays || this.health <= 0;
    }
    
    /**
     * 获取游戏结束原因
     */
    getGameOverReason() {
        if (this.health <= 0) {
            return '健康值归零，游戏结束!';
        }
        if (this.currentDay > this.totalDays) {
            return '时间到!';
        }
        return '';
    }
}
