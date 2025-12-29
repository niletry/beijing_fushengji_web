# 📊 名誉值系统分析报告

## 🔍 功能发现

原版游戏确实有**名誉值（Fame）系统**！

---

## 📋 基本信息

### 变量定义

**变量名**: `m_MyFame`  
**初始值**: 100  
**范围**: 0-100  
**UI组件**: `m_FameDisplay` (静态文本显示)

**源代码** (SelectionDlg.cpp:334):
```cpp
m_MyFame=100;    // init fame points
```

---

## 🎮 名誉值的作用

### 1. 受影响的商品

只有**2种商品**会降低名誉值：

#### 商品1: 《上海小宝贝》（禁书）

**代码** (SelectionDlg.cpp:884-906):
```cpp
if(drug_name=="《上海小宝贝》（禁书）")
{
    fame = "买卖" + drug_name + "," + "污染社会,俺的名声变坏了啊!";
    
    // 第一次出售时显示警告
    if(bad_fame1==0){
        CRijiDlg dlg(NULL,fame);
        dlg.DoModal();
        bad_fame1=1;
    }
    
    m_MyFame -= 7;     // ⭐ 每次交易减少7点
    
    if(m_MyFame < 60){
        m_FameDisplay.SetBackColor(BLACK);
        m_FameDisplay.SetColor(BLACK, RGB(240,0,0)); // 红色警告
    }
    
    if(m_MyFame < 0) m_MyFame = 0;  // 最低为0
}
```

**触发**: 每次**出售**禁书时  
**影响**: 名誉 -7  
**警告**: "买卖《上海小宝贝》（禁书），污染社会,俺的名声变坏了啊!"

---

#### 商品2: 假白酒（剧毒！）

**代码** (SelectionDlg.cpp:911-931):
```cpp
else if(drug_name=="假白酒（剧毒！）")
{
    fame = "买卖" + drug_name + "," + "危害社会，俺的名声下降了.";
    
    // 第一次出售时显示警告
    if(bad_fame2==0){
        CRijiDlg dlg(NULL,fame);
        dlg.DoModal();
        bad_fame2=1;
    }
    
    m_MyFame -= 10;    // ⭐ 每次交易减少10点
    
    if(m_MyFame < 60){
        m_FameDisplay.SetBackColor(BLACK);
        m_FameDisplay.SetColor(BLACK, RGB(240,0,0)); // 红色警告
    }
    
    if(m_MyFame < 0) m_MyFame = 0;
}
```

**触发**: 每次**出售**假白酒时  
**影响**: 名誉 -10  
**警告**: "买卖假白酒（剧毒！），危害社会，俺的名声下降了."

---

### 2. UI显示规则

#### 正常状态 (名誉 ≥ 60)

```cpp
// 显示正常颜色
正常显示
```

#### 警告状态 (名誉 < 60)

```cpp
if(m_MyFame < 60){
    m_FameDisplay.SetBackColor(BLACK);      // 黑色背景
    m_FameDisplay.SetColor(BLACK, RGB(240,0,0)); // 红色文字
}
```

**视觉效果**: 
- 背景变黑
- 文字变红 (RGB 240,0,0)
- 警告玩家名誉过低

---

### 3. 对排行榜的影响

**代码** (SelectionDlg.cpp:1897-1912):
```cpp
// 计算最终得分
int m_nScore = MyCash + MyBank - MyDebt;

if(m_nScore > 0)
{
    // 获取排名
    int i = playerdlg.GetMyOrder(m_nScore);
    
    if(i != -1)  // 进入前10名
    {
        // ⭐ 保存时包含名誉值
        playerdlg.InsertScore(
            topdlg.m_strName, 
            m_nScore,        // 得分
            m_nMyHealth,     // 健康
            m_MyFame         // ⭐ 名誉值
        );
    }
}
```

**用途**: 名誉值会显示在排行榜中

**排行榜数据**:
- 玩家名称
- 最终得分 (现金+存款-债务)
- 健康值
- **名誉值** ⭐

---

## 📊 名誉值计算示例

### 场景1: 只卖禁书

```
初始名誉: 100
出售禁书1次: 100 - 7 = 93
出售禁书2次: 93 - 7 = 86
出售禁书3次: 86 - 7 = 79
出售禁书4次: 79 - 7 = 72
出售禁书5次: 72 - 7 = 65
出售禁书6次: 65 - 7 = 58 ⚠️ 低于60，红色警告！
出售禁书7次: 58 - 7 = 51
...
出售禁书14次: 2 - 7 = 0 (最低)
```

**结论**: 最多可以出售14次禁书后名誉清零

---

### 场景2: 只卖假白酒

```
初始名誉: 100
出售假白酒1次: 100 - 10 = 90
出售假白酒2次: 90 - 10 = 80
出售假白酒3次: 80 - 10 = 70
出售假白酒4次: 70 - 10 = 60
出售假白酒5次: 60 - 10 = 50 ⚠️ 低于60，红色警告！
出售假白酒6次: 50 - 10 = 40
...
出售假白酒10次: 10 - 10 = 0 (最低)
```

**结论**: 最多可以出售10次假白酒后名誉清零

---

### 场景3: 混合出售

```
初始名誉: 100
卖1次禁书: 100 - 7 = 93
卖1次假白酒: 93 - 10 = 83
卖2次禁书: 83 - 14 = 69
卖2次假白酒: 69 - 20 = 49 ⚠️ 红色警告
```

---

## 🎯 游戏机制分析

### 设计意图

1. **道德惩罚**: 出售有害商品会降低名誉
2. **视觉反馈**: 名誉低于60时红色警告
3. **记录保存**: 名誉值显示在排行榜中
4. **无实质影响**: 名誉值**不影响游戏进行**

### 名誉值的限制

**重要发现**: 名誉值**只影响显示，不影响游戏性**

- ✅ 会显示在UI上
- ✅ 会保存到排行榜
- ✅ 低于60会红色警告
- ❌ **不影响购买能力**
- ❌ **不影响出售能力**
- ❌ **不影响价格**
- ❌ **不影响游戏结局**

**结论**: 名誉值是一个**装饰性系统**，主要用于：
1. 增加游戏的道德维度
2. 展示玩家行为的后果
3. 排行榜的额外信息

---

## 📋 影响名誉的商品总结

| 商品 | 触发条件 | 名誉影响 | 警告消息 | 最多交易次数 |
|------|---------|---------|----------|-------------|
| **《上海小宝贝》（禁书）** | 每次出售 | -7 | "污染社会,俺的名声变坏了啊!" | 14次后清零 |
| **假白酒（剧毒！）** | 每次出售 | -10 | "危害社会，俺的名声下降了." | 10次后清零 |
| 其他6种商品 | - | 无影响 | - | - |

**注意**: 
- ⭐ 只在**出售**时触发（购买不影响）
- ⭐ 第一次出售会显示警告对话框
- ⭐ 后续出售静默扣除名誉

---

## 💡 对Web版的影响

### 当前Web版状态

查看 `web/js/game-state.js`:

**当前没有实现名誉值系统！**

### 是否需要实现？

#### 方案A: 完整实现（推荐）✅

**理由**:
1. ✅ 原汁原味复刻
2. ✅ 增加道德维度
3. ✅ 代码量不大（约30行）
4. ✅ 增强游戏深度

**实现复杂度**: ⭐⭐ (简单)

---

#### 方案B: 暂不实现

**理由**:
1. 不影响核心玩法
2. 可以后期添加

---

## 🔧 Web版实现方案

### Step 1: 添加名誉值到GameState

```javascript
// game-state.js
class GameState {
    constructor() {
        // ...existing code...
        this.fame = 100;  // ⭐ 新增：名誉值
    }
    
    sellGood(goodId, quantity) {
        // ...existing sell logic...
        
        // ⭐ 新增：检查名誉影响
        const good = GOODS.find(g => g.id === goodId);
        
        if (good.name === '《上海小宝贝》（禁书）') {
            this.fame = Math.max(0, this.fame - 7 * quantity);
            return {
                ...result,
                fameChange: -7 * quantity,
                fameWarning: this.fame < 60,
                message: result.message + 
                    `\n⚠️ 名誉 -${7 * quantity} (污染社会)`
            };
        }
        
        if (good.name.includes('假白酒')) {
            this.fame = Math.max(0, this.fame - 10 * quantity);
            return {
                ...result,
                fameChange: -10 * quantity,
                fameWarning: this.fame < 60,
                message: result.message + 
                    `\n⚠️ 名誉 -${10 * quantity} (危害社会)`
            };
        }
        
        return result;
    }
}
```

---

### Step 2: UI显示

```javascript
// game-controller.js
updateGameUI() {
    // ...existing code...
    
    // ⭐ 显示名誉值
    const fameElement = document.getElementById('fameDisplay');
    if (fameElement) {
        fameElement.textContent = this.state.fame;
        
        // 名誉低于60时红色警告
        if (this.state.fame < 60) {
            fameElement.style.color = '#f00';
            fameElement.style.fontWeight = 'bold';
        } else {
            fameElement.style.color = 'var(--color-text-primary)';
            fameElement.style.fontWeight = 'normal';
        }
    }
}
```

---

### Step 3: HTML添加显示

```html
<!-- index.html -->
<div class="status-item">
    <span class="status-label">名誉</span>
    <span id="fameDisplay" class="status-value">100</span>
</div>
```

---

## 📊 实施建议

### 优先级评估

| 维度 | 评分 | 说明 |
|------|------|------|
| **重要性** | 🟡 中 | 不影响核心玩法 |
| **复杂度** | 🟢 低 | 实现简单 |
| **原汁原味** | 🔴 高 | 原版有此功能 |
| **用户体验** | 🟡 中 | 增加道德维度 |

### 建议

**✅ 建议实现**

理由：
1. 实现成本低（约1小时）
2. 增加游戏深度
3. 100%还原原版
4. 不影响现有功能

**实施时机**:
- 可以在商品系统重构后立即实现
- 或作为独立的增强功能

---

## 📝 总结

### 关键发现

1. ✅ **名誉值系统存在**
2. ✅ 初始值100，范围0-100
3. ✅ 只有2种商品影响名誉：
   - 禁书: -7/次
   - 假白酒: -10/次
4. ✅ 低于60时红色警告
5. ✅ 显示在排行榜
6. ❌ **不影响游戏玩法**（纯展示）

### Web版状态

- ❌ **当前未实现**
- ✅ **建议实施**
- ⭐ **优先级：中**（在核心功能之后）

---

**分析完成时间**: 2025-12-26 17:36  
**分析人**: Claude with Sam  
**功能重要性**: 🟡 中等（装饰性，但增加原汁原味）  
**实施建议**: ✅ **在商品系统重构后实施**
