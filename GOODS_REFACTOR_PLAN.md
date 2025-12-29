# 🎯 商品系统完整重构实施计划

## 📋 总览

基于对原版游戏的深入分析，现制定商品系统的完整重构计划，目标是**100%还原原版机制**。

---

## 🎯 项目目标

### 核心目标
1. ✅ 还原原版8种商品的**准确名称**
2. ✅ 实现原版**价格生成公式**
3. ✅ 实现商品**随机隐藏机制**（每次只显示5种）
4. ✅ 实现**最后2天全部显示**规则
5. ✅ 更新UI以正确显示隐藏商品

### 影响范围
- `web/js/data.js` - 商品数据定义
- `web/js/game-state.js` - 价格生成逻辑
- `web/js/game-controller.js` - UI显示逻辑

---

## 📊 第一阶段：数据准备

### Step 1.1: 更新商品名称和价格数据

**文件**: `web/js/data.js`

**当前问题**:
- ❌ 商品名称有修改（如"盗版VCD" vs "盗版VCD、游戏"）
- ❌ 缺少原版价格基准和波动范围
- ❌ 索引顺序可能不一致

**修改内容**:

```javascript
// ================================
// GOODS DATA (商品数据)
// ================================
// 基于原版 SelectionDlg.cpp:352-360 的准确数据

export const GOODS = [
    { 
        id: 0, 
        name: '进口香烟',                    // ✅ 保持原版
        icon: '🚬', 
        basePrice: 100,                      // 原版基础价格
        priceRange: 350,                     // 原版随机范围
        description: '来自福建的走私香烟'
    },
    { 
        id: 1, 
        name: '走私汽车',                    // ✅ 保持原版
        icon: '🚗', 
        basePrice: 15000, 
        priceRange: 15000,
        description: '厦门走私的名贵汽车'
    },
    { 
        id: 2, 
        name: '盗版VCD和游戏',               // ⚠️ 修改：添加"和游戏"
        icon: '💿', 
        basePrice: 5, 
        priceRange: 50,
        description: '盗版VCD港台片和游戏软件'
    },
    { 
        id: 3, 
        name: '山西假白酒',                  // ⚠️ 修改：更具体
        icon: '🍶', 
        basePrice: 1000, 
        priceRange: 2500,
        description: '假白酒（剧毒！）'
    },
    { 
        id: 4, 
        name: '《上海小宝贝》（禁书）',      // ⚠️ 修改：还原原版格式
        icon: '📕', 
        basePrice: 5000, 
        priceRange: 9000,
        description: '功效甚过伟哥的禁书'
    },
    { 
        id: 5, 
        name: '进口玩具',                    // ✅ 保持原版
        icon: '🧸', 
        basePrice: 250, 
        priceRange: 600,
        description: '提高大学生"动手素质"'
    },
    { 
        id: 6, 
        name: '水货手机',                    // ✅ 保持原版
        icon: '📱', 
        basePrice: 750, 
        priceRange: 750,
        description: '无任何厂商标识的水货手机'
    },
    { 
        id: 7, 
        name: '伪劣化妆品',                  // ✅ 保持原版
        icon: '💄', 
        basePrice: 65, 
        priceRange: 180,
        description: '谢不疯都在用的化妆品'
    }
];

// 商品数量常量
export const GOODS_COUNT = 8;
export const NORMAL_DISPLAY_COUNT = 5; // 正常情况下显示的商品数
export const HIDDEN_COUNT = 3;         // 正常情况下隐藏的商品数
```

**预计时间**: 10分钟  
**优先级**: 🔴 高  
**依赖**: 无

---

## 🔧 第二阶段：核心逻辑实现

### Step 2.1: 实现价格生成逻辑

**文件**: `web/js/game-state.js`

**当前问题**:
- ❌ 价格公式不准确（使用±50%而非原版公式）
- ❌ 没有商品隐藏机制
- ❌ 没有"最后2天"特殊规则

**修改内容**:

```javascript
/**
 * 生成商品价格（完全还原原版算法）
 * 
 * 原版逻辑：
 * 1. price = basePrice + Random(priceRange)
 * 2. 随机隐藏 leaveout 个商品（价格设为0）
 * 3. 最后2天显示全部商品（leaveout=0）
 * 
 * @returns {Object} 商品价格映射 {goodId: price}
 */
generatePrices() {
    const prices = {};
    
    // ⭐ 确定要隐藏的商品数量
    // 原版规则：最后2天显示全部，否则隐藏3个
    const leaveout = this.daysLeft <= 2 ? 0 : HIDDEN_COUNT;
    
    // ⭐ 随机选择要隐藏的商品
    const hiddenGoods = new Set();
    while (hiddenGoods.size < leaveout && hiddenGoods.size < GOODS_COUNT) {
        const randomId = Math.floor(Math.random() * GOODS_COUNT);
        hiddenGoods.add(randomId);
    }
    
    // ⭐ 生成价格（使用原版公式）
    GOODS.forEach(good => {
        if (hiddenGoods.has(good.id)) {
            // 隐藏的商品：价格设为0
            prices[good.id] = 0;
        } else {
            // 显示的商品：basePrice + Random(priceRange)
            prices[good.id] = good.basePrice + 
                Math.floor(Math.random() * good.priceRange);
        }
    });
    
    return prices;
}
```

**关键点**:
1. 使用原版公式：`basePrice + Random(priceRange)`
2. 随机隐藏商品通过`Set`避免重复
3. 价格为0表示商品不出现

**预计时间**: 15分钟  
**优先级**: 🔴 高  
**依赖**: Step 1.1

---

### Step 2.2: 更新相关调用

**文件**: `web/js/game-state.js`

**需要确保以下场景都调用`generatePrices()`**:

```javascript
// 场景1: 游戏初始化
constructor() {
    // ...初始化代码
    this.prices = this.generatePrices(); // ✅ 已有
}

// 场景2: 换地点
changeLocation(locationId) {
    this.currentLocation = locationId;
    this.prices = this.generatePrices(); // ⭐ 重新生成
    return {
        success: true,
        message: `来到了${LOCATIONS[locationId].name}`
    };
}

// 场景3: 过一天
nextDay() {
    this.day++;
    this.daysLeft--;
    
    // 银行利息
    this.bank = Math.floor(this.bank * 1.01);
    
    // ⭐ 重新生成商品和价格
    this.prices = this.generatePrices();
    
    // 健康恢复
    this.health = Math.min(100, this.health + 5);
    
    return {
        success: true,
        day: this.day,
        daysLeft: this.daysLeft
    };
}
```

**预计时间**: 10分钟  
**优先级**: 🔴 高  
**依赖**: Step 2.1

---

## 🎨 第三阶段：UI层更新

### Step 3.1: 市场显示过滤

**文件**: `web/js/game-controller.js`

**当前问题**:
- ❌ 显示所有8种商品，无论价格是否为0

**修改内容**:

```javascript
/**
 * 更新市场商品列表
 */
updateMarket() {
    const marketList = document.getElementById('marketGoods');
    if (!marketList) return;
    
    marketList.innerHTML = '';
    
    // ⭐ 只显示价格>0的商品（过滤隐藏商品）
    const availableGoods = GOODS.filter(good => 
        this.state.prices[good.id] > 0
    );
    
    // 如果没有商品，显示提示
    if (availableGoods.length === 0) {
        marketList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--color-text-dim);">
                📭 今日此地无货
            </div>
        `;
        return;
    }
    
    // 显示可用商品
    availableGoods.forEach(good => {
        const price = this.state.prices[good.id];
        const owned = this.state.inventory[good.id] || 0;
        
        const goodElement = document.createElement('div');
        goodElement.className = 'market-item';
        goodElement.innerHTML = `
            <div class="good-info">
                <span class="good-icon">${good.icon}</span>
                <span class="good-name">${good.name}</span>
            </div>
            <div class="good-price">¥${price}</div>
            <div class="good-actions">
                <button onclick="game.buyGood(${good.id})" class="action-btn buy-btn">
                    买入
                </button>
                ${owned > 0 ? `
                    <button onclick="game.sellGood(${good.id})" class="action-btn sell-btn">
                        卖出(${owned})
                    </button>
                ` : ''}
            </div>
        `;
        
        marketList.appendChild(goodElement);
    });
}
```

**关键变化**:
1. 添加 `filter(good => this.state.prices[good.id] > 0)` 过滤
2. 处理无货情况
3. 只渲染可见商品

**预计时间**: 15分钟  
**优先级**: 🔴 高  
**依赖**: Step 2.1

---

### Step 3.2: 添加商品可用性提示

**文件**: `web/js/game-controller.js`

**增强用户体验**:

```javascript
/**
 * 显示游戏界面时的额外信息
 */
showGameScreen() {
    // ...existing code...
    
    // ⭐ 显示市场商品数量提示
    const availableCount = GOODS.filter(g => 
        this.state.prices[g.id] > 0
    ).length;
    
    const marketTitle = document.querySelector('.market-title');
    if (marketTitle) {
        marketTitle.textContent = `🏪 黑市 (${availableCount}/${GOODS_COUNT}种商品)`;
    }
}
```

**预计时间**: 5分钟  
**优先级**: 🟡 中  
**依赖**: Step 3.1

---

### Step 3.3: 更新购买/出售逻辑检查

**文件**: `web/js/game-controller.js`

**安全检查**:

```javascript
buyGood(goodId) {
    const good = GOODS.find(g => g.id === goodId);
    const price = this.state.prices[goodId];
    
    // ⭐ 检查商品是否可用
    if (price === 0) {
        showNotification('商品不可用', '此地今日无此货!', 'error');
        return;
    }
    
    // ...existing buy logic...
}

sellGood(goodId) {
    const good = GOODS.find(g => g.id === goodId);
    const price = this.state.prices[goodId];
    
    // ⭐ 检查商品是否可出售
    if (price === 0) {
        showNotification('无法出售', '此地今日不收此货!', 'error');
        return;
    }
    
    // ...existing sell logic...
}
```

**预计时间**: 10分钟  
**优先级**: 🟡 中  
**依赖**: Step 3.1

---

## 🧪 第四阶段：测试验证

### Step 4.1: 功能测试

**测试用例**:

```javascript
// 测试1: 商品数量
✓ 正常情况下应显示5种商品
✓ 最后2天应显示8种商品
✓ 刷新后商品列表会变化

// 测试2: 价格范围
✓ 进口香烟: 100-450
✓ 走私汽车: 15000-30000
✓ 盗版VCD: 5-55
✓ 假白酒: 1000-3500
✓ 禁书: 5000-14000
✓ 进口玩具: 250-850
✓ 水货手机: 750-1500
✓ 伪劣化妆品: 65-245

// 测试3: 隐藏机制
✓ 隐藏的商品不可见
✓ 隐藏的商品不可购买
✓ 持有的隐藏商品可以出售（如果当地有货）

// 测试4: 地点切换
✓ 切换地点后商品列表重新生成
✓ 价格重新随机
✓ 隐藏商品重新随机

// 测试5: 天数推进
✓ 过一天后商品重新生成
✓ 倒数第2天显示全部8种
✓ 最后1天也显示全部8种
```

**测试方法**:

```javascript
// 开发者控制台测试
console.log('可用商品:', GOODS.filter(g => game.state.prices[g.id] > 0).length);
console.log('价格列表:', game.state.prices);
console.log('剩余天数:', game.state.daysLeft);

// 手动触发
game.state.nextDay();
game.updateGameUI();
```

**预计时间**: 30分钟  
**优先级**: 🔴 高  
**依赖**: Step 3.3

---

### Step 4.2: UI测试

**检查项**:

- [ ] 商品列表正确显示5种（或8种）
- [ ] 商品名称准确（包括特殊字符）
- [ ] 价格显示正确
- [ ] 购买按钮工作正常
- [ ] 出售按钮只在持有时显示
- [ ] 隐藏商品不显示
- [ ] 无货时显示提示
- [ ] 地点切换流畅
- [ ] 天数切换正常

**预计时间**: 20分钟  
**优先级**: 🟡 中  
**依赖**: Step 4.1

---

## 📝 第五阶段：文档更新

### Step 5.1: 更新PRODUCTS_COLLECTION.md

**添加实施结果**:

```markdown
## ✅ 实施完成

### 已实施的修改

1. **商品名称**: ✅ 已还原原版准确名称
2. **价格公式**: ✅ 已使用原版公式
3. **隐藏机制**: ✅ 已实现随机隐藏
4. **UI显示**: ✅ 已正确过滤

### 最终商品列表
[列出实际使用的8种商品]
```

**预计时间**: 10分钟  
**优先级**: 🟢 低  
**依赖**: Step 4.2

---

### Step 5.2: 更新PROJECT_STATUS.md

**更新项目状态**:

```markdown
## ✅ 已完成功能

### 商品系统 ✅ (新增)
- [x] 8种原版商品
- [x] 原版价格公式
- [x] 随机隐藏机制（5/8显示）
- [x] 最后2天全部显示
- [x] UI正确过滤
```

**预计时间**: 5分钟  
**优先级**: 🟢 低  
**依赖**: Step 5.1

---

## 📊 实施时间表

### 总时间预估: **2小时**

| 阶段 | 步骤 | 时间 | 优先级 | 状态 |
|------|------|------|--------|------|
| **阶段1** | 数据准备 | 10分钟 | 🔴 高 | ⏳ 待开始 |
| **阶段2** | 价格生成逻辑 | 15分钟 | 🔴 高 | ⏳ 待开始 |
| **阶段2** | 更新调用 | 10分钟 | 🔴 高 | ⏳ 待开始 |
| **阶段3** | 市场显示过滤 | 15分钟 | 🔴 高 | ⏳ 待开始 |
| **阶段3** | 可用性提示 | 5分钟 | 🟡 中 | ⏳ 待开始 |
| **阶段3** | 安全检查 | 10分钟 | 🟡 中 | ⏳ 待开始 |
| **阶段4** | 功能测试 | 30分钟 | 🔴 高 | ⏳ 待开始 |
| **阶段4** | UI测试 | 20分钟 | 🟡 中 | ⏳ 待开始 |
| **阶段5** | 文档更新 | 15分钟 | 🟢 低 | ⏳ 待开始 |

---

## 🎯 实施优先级

### 必须完成（核心功能）
1. ✅ Step 1.1: 更新商品数据
2. ✅ Step 2.1: 实现价格生成逻辑
3. ✅ Step 2.2: 更新相关调用
4. ✅ Step 3.1: 市场显示过滤
5. ✅ Step 4.1: 功能测试

### 建议完成（体验优化）
6. ✅ Step 3.2: 可用性提示
7. ✅ Step 3.3: 安全检查
8. ✅ Step 4.2: UI测试

### 可选完成（文档）
9. ⭕ Step 5.1: 更新文档
10. ⭕ Step 5.2: 更新状态

---

## 🚨 注意事项

### 潜在风险

1. **存档兼容性**
   - 风险: 旧存档可能包含旧的商品名称
   - 方案: 添加版本检测和数据迁移

2. **UI布局**
   - 风险: 长商品名可能导致布局问题
   - 方案: 使用CSS text-overflow处理

3. **价格边界**
   - 风险: 价格可能为0或负数
   - 方案: 添加Math.max(1, price)保护

### 回退方案

如果实施后出现问题：

```bash
# 恢复到当前版本
git checkout web/js/data.js
git checkout web/js/game-state.js
git checkout web/js/game-controller.js
```

---

## ✅ 完成标准

### 功能标准
- [ ] 正常情况显示5种商品
- [ ] 最后2天显示8种商品
- [ ] 商品随机性工作正常
- [ ] 价格符合原版范围
- [ ] UI正确显示/隐藏商品

### 质量标准
- [ ] 无控制台错误
- [ ] 购买/出售流程正常
- [ ] 地点切换流畅
- [ ] 天数推进正常
- [ ] 用户体验良好

### 测试标准
- [ ] 所有测试用例通过
- [ ] 手动测试验证
- [ ] 边界情况处理
- [ ] 性能无明显下降

---

## 📚 参考资料

### 源代码分析
- `PRODUCTS_COLLECTION.md` - 商品数据收集
- `RANDOM_GOODS_MECHANISM.md` - 随机机制分析
- `SelectionDlg.cpp:352-360` - 商品定义
- `SelectionDlg.cpp:1188-1205` - 价格生成函数

### 实施文件
- `web/js/data.js` - 数据文件
- `web/js/game-state.js` - 状态管理
- `web/js/game-controller.js` - UI控制

---

## 🎊 预期效果

### 游戏体验提升

**Before** (现在):
- 😐 总是显示全部8种商品
- 😐 价格公式不准确
- 😐 缺少策略性

**After** (实施后):
- 🎉 每次只显示5种随机商品
- 🎉 价格完全符合原版
- 🎉 需要记忆和规划
- 🎉 最后2天的紧张感
- 🎉 100%原汁原味！

### 代码质量提升
- ✅ 更符合原版设计
- ✅ 代码更模块化
- ✅ 易于测试和维护
- ✅ 文档完善

---

**计划制定时间**: 2025-12-26 17:24  
**预计实施时间**: 2小时  
**实施难度**: ⭐⭐⭐ (中等)  
**价值评估**: ⭐⭐⭐⭐⭐ (极高 - 核心游戏体验)
