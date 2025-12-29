# 🎲 商品随机生成机制分析

## 📋 核心发现

原版游戏确实有**商品随机隐藏机制**！每次到新地点或过一天，都会有一些商品不出现。

---

## 🔍 关键代码分析

### 1. 商品价格生成函数 (SelectionDlg.cpp:1188-1205)

```cpp
void CSelectionDlg::makeDrugPrices(int leaveout)
{
    int i, j;

    // 为每个商品设置价格：基础价格 + 随机波动
    m_DrugPrice[0] = 100 + RandomNum(350);    // 进口香烟: 100-450元
    m_DrugPrice[1] = 15000 + RandomNum(15000);// 走私汽车: 15000-30000元
    m_DrugPrice[2] = 5 + RandomNum(50);       // 盗版VCD: 5-55元
    m_DrugPrice[3] = 1000 + RandomNum(2500);  // 假白酒: 1000-3500元
    m_DrugPrice[4] = 5000 + RandomNum(9000);  // 禁书: 5000-14000元
    m_DrugPrice[5] = 250 + RandomNum(600);    // 进口玩具: 250-850元
    m_DrugPrice[6] = 750 + RandomNum(750);    // 水货手机: 750-1500元
    m_DrugPrice[7] = 65 + RandomNum(180);     // 伪劣化妆品: 65-245元

    // ⭐关键：随机隐藏商品！
    for (i = 0; i < leaveout; i++)
    {
        j = RandomNum(8);  // 随机选择一个商品
        m_DrugPrice[j] = 0; // 价格设为0，表示不出现
    }
}
```

### 参数说明

**leaveout**: 要隐藏的商品数量
- 8种商品总数
- 实际出现: `8 - leaveout`
- 哪些商品隐藏：**随机决定**

---

## 🎮 游戏中的调用

### 调用场景1: 游戏初始化 (第528行)

```cpp
// 游戏开始时
makeDrugPrices(3);  // 隐藏3种商品，显示5种
```

**结果**: 初始市场只有**5种商品**

---

### 调用场景2: 每次事件处理 (HandleNormalEvents函数)

```cpp
void CSelectionDlg::HandleNormalEvents()
{
    // 最后2天：所有商品都出现
    if(m_nTimeLeft <= 2)   
        makeDrugPrices(0);  // 隐藏0种 = 全部8种商品
    else
        makeDrugPrices(3);  // 隐藏3种 = 显示5种商品
        
    HandleCashAndDebt();    // 处理现金债务
    DoRandomStuff();        // 商业事件
    DisplayDrugs();         // 显示商品
    DoRandomEvent();        // 健康事件
    OnSteal();             // 钱财损失事件
    
    m_nTimeLeft--;         // 天数-1
}
```

### 调用场景3: 切换地点 (各个OnLoc*函数)

```cpp
void CSelectionDlg::OnLocJianguomen()  // 去建国门
{
    if(m_MyCurrentLoc != 1){
        m_MyCurrentLoc = 1;
        HandleNormalEvents();  // ⭐调用事件处理 -> 重新生成商品
    }
}
```

**触发时机**:
- ✅ 切换到任何地点
- ✅ 过一天（天数减少）
- ✅ 特定游戏事件后

---

## 📊 商品价格范围总结

| 商品ID | 商品名称 | 基础价格 | 随机范围 | 最低价 | 最高价 |
|--------|---------|---------|---------|-------|-------|
| 0 | 进口香烟 | 100 | 350 | 100 | 450 |
| 1 | 走私汽车 | 15,000 | 15,000 | 15,000 | 30,000 |
| 2 | 盗版VCD、游戏 | 5 | 50 | 5 | 55 |
| 3 | 假白酒（剧毒！） | 1,000 | 2,500 | 1,000 | 3,500 |
| 4 | 《上海小宝贝》（禁书） | 5,000 | 9,000 | 5,000 | 14,000 |
| 5 | 进口玩具 | 250 | 600 | 250 | 850 |
| 6 | 水货手机 | 750 | 750 | 750 | 1,500 |
| 7 | 伪劣化妆品 | 65 | 180 | 65 | 245 |

### 价格公式

```
最终价格 = 基础价格 + Random(波动范围)
```

---

## 🎯 核心机制

### 1. 商品隐藏机制

**方法**: 
- 每次调用`makeDrugPrices(3)`
- 随机选3个商品，将价格设为0
- 价格为0的商品不显示在市场

**特点**:
- ✅ **完全随机**：每次隐藏的商品都不同
- ✅ **动态变化**：每换一个地方，商品列表都会变
- ✅ **策略性**：玩家需要记住哪里见过哪种商品

### 2. 特殊规则：最后2天

```cpp
if(m_nTimeLeft <= 2)   
    makeDrugPrices(0);  // 显示全部8种商品！
```

**原因**: 让玩家在游戏结束前能清空库存

---

## 💡 对Web版的意义

### 当前Web版实现

查看 `web/js/game-state.js`:

```javascript
generatePrices() {
    const prices = {};
    GOODS.forEach(good => {
        const variance = good.basePrice * 0.5;
        const minPrice = Math.floor(good.basePrice - variance);
        const maxPrice = Math.floor(good.basePrice + variance);
        prices[good.id] = Math.floor(
            Math.random() * (maxPrice - minPrice + 1) + minPrice
        );
    });
    return prices;
}
```

**问题**: ❌ **所有8种商品都会出现！**

---

## ✅ 需要添加的功能

### 方案1: 完全复刻原版

```javascript
generatePrices() {
    const prices = {};
    
    // 原版价格范围
    const basePrices = [
        { base: 100, range: 350 },   // 0: 进口香烟
        { base: 15000, range: 15000 },// 1: 走私汽车
        { base: 5, range: 50 },      // 2: 盗版VCD
        { base: 1000, range: 2500 }, // 3: 假白酒
        { base: 5000, range: 9000 }, // 4: 禁书
        { base: 250, range: 600 },   // 5: 进口玩具
        { base: 750, range: 750 },   // 6: 水货手机
        { base: 65, range: 180 }     // 7: 伪劣化妆品
    ];
    
    // 生成价格
    GOODS.forEach((good, index) => {
        const { base, range } = basePrices[index];
        prices[good.id] = base + Math.floor(Math.random() * range);
    });
    
    // ⭐关键：随机隐藏3种商品（最后2天除外）
    const leaveout = this.daysLeft <= 2 ? 0 : 3;
    
    for (let i = 0; i < leaveout; i++) {
        const randomId = Math.floor(Math.random() * 8);
        prices[randomId] = 0;  // 价格为0表示不出现
    }
    
    return prices;
}
```

### 方案2: 改进版（更灵活）

```javascript
generatePrices(leaveout = 3) {
    const prices = {};
    const hiddenGoods = new Set();
    
    // 随机选择要隐藏的商品
    while (hiddenGoods.size < leaveout && hiddenGoods.size < GOODS.length) {
        const randomId = Math.floor(Math.random() * GOODS.length);
        hiddenGoods.add(randomId);
    }
    
    // 生成价格
    GOODS.forEach(good => {
        if (hiddenGoods.has(good.id)) {
            prices[good.id] = 0;  // 隐藏
        } else {
            // 使用原版价格范围
            const variance = good.basePrice * good.priceVariance || 0.5;
            prices[good.id] = Math.floor(
                good.basePrice + Math.random() * (good.basePrice * variance)
            );
        }
    });
    
    return prices;
}
```

### UI显示建议

```javascript
// 在市场UI中，价格为0的商品要隐藏
updateMarket() {
    const marketList = document.getElementById('marketGoods');
    marketList.innerHTML = '';
    
    GOODS.forEach(good => {
        const price = this.state.prices[good.id];
        
        // ⭐只显示价格>0的商品
        if (price > 0) {
            // 显示商品...
        }
    });
}
```

---

## 📝 实现建议

### 修改点1: data.js - 添加原版价格数据

```javascript
export const GOODS = [
    { 
        id: 0, 
        name: '进口香烟', 
        icon: '🚬', 
        basePrice: 100,      // 原版基础价格
        priceRange: 350       // 原版随机范围
    },
    { 
        id: 1, 
        name: '走私汽车', 
        icon: '🚗', 
        basePrice: 15000, 
        priceRange: 15000 
    },
    // ... 其他商品
];
```

### 修改点2: game-state.js - 修改价格生成

```javascript
generatePrices() {
    const prices = {};
    const leaveout = this.daysLeft <= 2 ? 0 : 3;  // 最后2天显示全部
    const hiddenGoods = new Set();
    
    // 随机隐藏商品
    while (hiddenGoods.size < leaveout) {
        hiddenGoods.add(Math.floor(Math.random() * GOODS.length));
    }
    
    // 生成价格（使用原版公式）
    GOODS.forEach(good => {
        if (hiddenGoods.has(good.id)) {
            prices[good.id] = 0;  // 隐藏
        } else {
            prices[good.id] = good.basePrice + 
                Math.floor(Math.random() * good.priceRange);
        }
    });
    
    return prices;
}
```

### 修改点3: game-controller.js - UI过滤

```javascript
updateMarket() {
    const marketItems = GOODS.filter(good => 
        this.state.prices[good.id] > 0  // ⭐只显示价格>0的
    );
    
    // 渲染marketItems...
}
```

---

## 🎮 游戏体验影响

### Before (现在)
- ❌ 每次都显示全部8种商品
- ❌ 缺少原版的策略性
- ❌ 过于简单

### After (修复后)
- ✅ 每次只显示5种随机商品
- ✅ 需要记忆和规划
- ✅ 增加游戏难度和趣味性
- ✅ 完全还原原版体验

---

## 🔑 关键要点

1. **leaveout=3**: 固定隐藏3种商品（显示5种）
2. **随机选择**: 每次隐藏的商品都不同
3. **最后2天**: 显示全部8种商品
4. **价格为0**: 表示商品不出现
5. **每次变化**: 切换地点或过一天都重新生成

---

## 📊 对比分析

| 特性 | 原版C++ | 当前Web版 | 应该修改为 |
|------|---------|-----------|-----------|
| 商品总数 | 8种 | 8种 | ✅ 8种 |
| 显示数量 | 5种(随机) | 8种(全部) | ⚠️ 5种(随机) |
| 价格公式 | base+random(range) | base±50% | ⚠️ base+random(range) |
| 最后2天 | 显示全部 | 显示全部 | ✅ 显示全部 |
| 隐藏机制 | 价格=0 | 无 | ❌ 需添加 |

---

## 💡 额外发现

### 价格波动不均衡

原版中，不同商品的价格波动幅度差异很大：

- **盗版VCD**: 5-55 (波动1000%)
- **走私汽车**: 15000-30000 (波动100%)
- **伪劣化妆品**: 65-245 (波动277%)

这使得某些商品投机性更强！

---

**分析完成时间**: 2025-12-26  
**关键函数**: `makeDrugPrices(int leaveout)`  
**核心机制**: 随机隐藏商品  
**建议优先级**: 🔴 **高** - 影响游戏核心体验
