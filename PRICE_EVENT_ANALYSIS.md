# 价格事件影响调查报告

## 📋 调查目标
调查原版代码中的随机事件对商品价格的影响机制，特别是"暴涨"和"暴跌"类事件。

---

## 🔍 核心发现

### 1. **事件系统存在但未完全实现**

原版代码（`SelectionDlg.cpp`）中确实有影响价格的事件系统，但**当前Web版本并未实现价格调整功能**。

---

## 📊 原版事件系统详解

### 事件数据结构（SelectionDlg.cpp:112-119）

```cpp
typedef struct MessageType {
    int freq;   // 事件发生频率
    char *msg;  // 事件消息
    int drug;   // 受影响的商品ID
    int plus;   // 价格倍增系数（乘法）
    int minus;  // 价格减少系数（除法）
    int add;    // 赠送商品数量
} Message;
```

### 18个商业事件列表（SelectionDlg.cpp:122-141）

#### 🚀 **价格暴涨事件**（plus > 0）

| 事件描述 | 商品 | 倍数 | 频率 |
|---------|------|------|------|
| 专家提议提高大学生"动手素质"，进口玩具颇受欢迎! | 进口玩具(5) | **×2** | 170 |
| 有人自豪地说：生病不用打针吃药，喝假白酒就可以! | 假白酒(3) | **×3** | 139 |
| 医院的秘密报告："《上海小宝贝》功效甚过伟哥"! | 禁书(4) | **×5** | 100 |
| 文盲说："2000年诺贝尔文学奖？呸！不如盗版VCD港台片。" | 盗版VCD(2) | **×4** | 41 |
| 《北京经济小报》社论："走私汽车大力推进汽车消费!" | 走私汽车(1) | **×3** | 37 |
| 《北京真理报》社论："提倡爱美，落到实处"，伪劣化妆品大受欢迎! | 伪劣化妆品(7) | **×4** | 23 |
| 8858.com电子书店也不敢卖《上海小宝贝》，黑市一册可卖天价! | 禁书(4) | **×8** | 37 |
| 谢不疯在晚会上说："我酷!我使用伪劣化妆品!"，伪劣化妆品供不应求! | 伪劣化妆品(7) | **×7** | 15 |
| 北京有人狂饮山西假酒，可以卖出天价! | 假白酒(3) | **×7** | 40 |
| 北京的大学生们开始找工作，水货手机大受欢迎！! | 水货手机(6) | **×7** | 29 |
| 北京的富人疯狂地购买走私汽车！价格狂升! | 走私汽车(1) | **×8** | 35 |

#### 📉 **价格暴跌事件**（minus > 0）

| 事件描述 | 商品 | 除数 | 频率 |
|---------|------|------|------|
| 市场上充斥着来自福建的走私香烟! | 进口香烟(0) | **÷8** | 17 |
| 北京的孩子们都忙于上网学习，进口玩具没人愿意买。 | 进口玩具(5) | **÷5** | 24 |
| 盗版业十分兴旺，"中国硅谷"——中关村全是卖盗版VCD的村姑! | 盗版VCD(2) | **÷8** | 18 |

#### 🎁 **赠送商品事件**（add > 0）

| 事件描述 | 商品 | 数量 | 频率 |
|---------|------|------|------|
| 厦门的老同学资助俺两部走私汽车！发了！！ | 走私汽车(1) | +2 | 160 |
| 工商局扫荡后，俺在黑暗角落里发现了老乡丢失的进口香烟。 | 进口香烟(0) | +6 | 45 |
| 俺老乡回家前把一些山西假白酒（剧毒）给俺! | 假白酒(3) | +4 | 35 |
| 媒体报道：又有日本出口到中国的产品出事了!...村长得知此消息，托人把他用的水货手机硬卖给您，收您2500元。 | 水货手机(6) | +1 | 140 |

---

## ⚙️ 事件触发机制

### 触发时机（SelectionDlg.cpp:1447-1467）

```cpp
void CSelectionDlg::HandleNormalEvents() {
    // 1. 生成新价格
    if(m_nTimeLeft<=2)   
        makeDrugPrices(0);  // 最后2天显示全部商品
    else
        makeDrugPrices(3);  // 正常情况隐藏3个商品
    
    // 2. 处理现金和债务
    HandleCashAndDebt();
    
    // 3. 🎯 触发商业事件（价格调整）
    DoRandomStuff();
    
    // 4. 显示商品
    DisplayDrugs();
    
    // 5. 触发健康事件
    DoRandomEvent();
    
    // 6. 触发金钱损失事件
    OnSteal();
}
```

**触发条件**：每次换地点时调用 `HandleNormalEvents()`

### 事件执行逻辑（SelectionDlg.cpp:1214-1292）

```cpp
void CSelectionDlg::DoRandomStuff(void) {
    for (i = 0; i < GAME_MESSAGE_COUNT; i++) {
        // 随机判断：RandomNum(950) % freq == 0
        if (!(RandomNum(950) % gameMessages[i].freq)) {
            // 如果该商品当前价格为0（未显示），跳过
            if (m_DrugPrice[gameMessages[i].drug] == 0)
                continue;
            
            // 显示事件消息
            CNewsDlg dlg(NULL, gameMessages[i].msg);
            dlg.DoModal();
            
            // 🚀 价格倍增
            if (gameMessages[i].plus > 0)
                m_DrugPrice[gameMessages[i].drug] *= gameMessages[i].plus;
            
            // 📉 价格减少
            if (gameMessages[i].minus > 0)
                m_DrugPrice[gameMessages[i].drug] /= gameMessages[i].minus;
            
            // 🎁 赠送商品
            if (gameMessages[i].add > 0) {
                // ... 添加商品到背包逻辑
            }
        }
    }
}
```

---

## 🎲 触发概率计算

事件触发公式：`RandomNum(950) % freq == 0`

**触发概率** ≈ `freq / 950`

### 示例概率表

| 频率值 | 触发概率 | 说明 |
|--------|---------|------|
| 170 | ~17.9% | 进口玩具×2 |
| 139 | ~14.6% | 假白酒×3 |
| 100 | ~10.5% | 禁书×5 |
| 41 | ~4.3% | 盗版VCD×4 |
| 17 | ~1.8% | 香烟÷8（最低） |

---

## 🆚 Web版本对比

### 当前实现（web/js/data.js:103-116）

```javascript
export const RANDOM_EVENTS = [
    { type: 'good', msg: '你在路边捡到了一个钱包!', moneyChange: 200, frequency: 5 },
    { type: 'bad', msg: '大街上两个流氓打了你!', healthChange: -10, frequency: 7 },
    // ... 其他金钱/健康事件
    
    // ⚠️ 以下事件定义了但未实现价格调整功能
    { type: 'market', msg: '新闻：电子产品需求暴增!', goodsType: 'computer', priceMultiplier: 2.0, frequency: 3 },
    { type: 'market', msg: '新闻：酒类市场价格暴跌!', goodsType: 'erguotou', priceMultiplier: 0.5, frequency: 3 },
    { type: 'market', msg: '新闻：自行车成为抢手货!', goodsType: 'bike', priceMultiplier: 1.8, frequency: 4 },
    { type: 'market', msg: '传言：有人靠倒卖大哥大发财了!', goodsType: 'mobile', priceMultiplier: 1.5, frequency: 4 }
];
```

### 问题分析

1. **❌ 商品ID不匹配**：
   - Web版使用 `goodsType: 'computer'`，但实际商品中没有这个ID
   - 原版使用数字ID（0-7）对应8种商品

2. **❌ 价格调整未实现**：
   - `game-state.js:220-223` 中只是将事件加入 `activeEvents` 数组
   - 没有实际修改 `this.prices` 的代码
   - `priceMultiplier` 参数被定义但从未使用

```javascript
// game-state.js:220-223
if (event.type === 'market') {
    this.activeEvents.push(event);
    showNotification('市场动态!', event.msg, 'info');
    // ⚠️ 缺少价格调整逻辑！
}
```

3. **❌ 事件触发时机不同**：
   - 原版：每次换地点触发
   - Web版：每天开始时40%概率触发（`game-state.js:159`）

---

## ✅ 结论

### 原版机制

✅ **有完整的价格事件系统**：
- 11个暴涨事件（2-8倍）
- 3个暴跌事件（÷5到÷8）
- 4个赠送商品事件
- 每次换地点时触发检测

### Web版现状

❌ **价格事件系统未实现**：
- 事件数据结构已定义
- 但价格调整逻辑缺失
- 商品ID映射错误
- 触发机制不完整

---

## 💡 建议

如需在Web版中实现原版的价格事件系统，需要：

1. **修正商品映射**：将 `goodsType` 改为实际的商品ID（0-7）
2. **实现价格调整**：在 `applyEvent()` 中添加价格乘除逻辑
3. **添加完整事件**：参考原版18个事件，补充缺失的事件
4. **调整触发时机**：考虑在换地点时也触发事件
5. **添加商品赠送**：实现 `add` 类型的事件

---

## 📚 相关文件

- **原版C++代码**：`SelectionDlg.cpp` (行122-141, 1214-1292)
- **Web版数据**：`web/js/data.js` (行103-116)
- **Web版状态**：`web/js/game-state.js` (行179-224)
- **本报告**：`web/PRICE_EVENT_ANALYSIS.md`
