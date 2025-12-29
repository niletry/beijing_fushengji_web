# 🎮 北京浮生记 - 模块化重构指南

## 📁 新的文件结构

```
web/
├── index.html          # 主HTML文件
├── style.css          # 样式文件
├── game.js           # 【旧文件】原始单文件(保留作备份)
└── js/               # 【新文件夹】模块化JS文件
    ├── data.js       # 游戏数据和常量
    ├── utils.js      # 工具函数
    ├── game-state.js # GameState类
    ├── game-controller.js # GameController类（待创建）
    └── main.js       # 入口文件
```

## 📦 模块说明

### 1. **data.js** (已完成)
包含所有游戏数据：
- `LOCATIONS` - 游戏地点列表
- `GOODS` - 商品列表
- `RANDOM_EVENTS` - 随机事件列表

### 2. **utils.js** (已完成)
工具函数：
- `showNotification()` - 显示通知消息

### 3. **game-state.js** (已完成)
`GameState` 类 - 游戏状态管理：
- 玩家状态（现金、银行、健康等）
- 交易逻辑（买/卖商品）
- 事件处理
- 地点切换

### 4. **game-controller.js** (需手动完成)
`GameController` 类 - UI控制器：
- 屏幕管理
- UI更新
- 用户交互处理
- 模态框管理

由于此文件较大（约800行），建议手动创建：
1. 复制 `game.js` 第248-1050行的内容
2. 在文件顶部添加导入语句
3. 在文件底部添加导出语句

### 5. **main.js** (已完成)
应用入口：
- 初始化GameController
- 暴露game对象到全局（用于调试）

## 🔧 如何完成重构

### 步骤1：创建 game-controller.js

```bash
cd /Users/sam/code123/beijing_fushengji/web
# 提取 GameController 类部分
sed -n '248,1050p' game.js > js/game-controller-temp.js
```

然后手动编辑 `js/game-controller-temp.js`：

**在文件开头添加：**
```javascript
// ================================
// GAME CONTROLLER
// ================================

import { GameState } from './game-state.js';
import { LOCATIONS, GOODS } from './data.js';
import { showNotification } from './utils.js';
```

**在文件末尾添加：**
```javascript
export { GameController };
```

**重命名文件：**
```bash
mv js/game-controller-temp.js js/game-controller.js
```

### 步骤2：更新 index.html

在 `</body>` 前，将：
```html
<script src="game.js"></script>
```

改为：
```html
<script type="module" src="js/main.js"></script>
```

### 步骤3：测试

1. 刷新浏览器页面
2. 检查控制台是否有错误
3. 测试游戏功能

## ✅ 优势

### 代码组织
- ✅ **职责分离**：数据、逻辑、UI分离
- ✅ **易于维护**：每个文件职责单一，便于修改
- ✅ **便于测试**：模块可独立测试

### 可读性
- ✅ **文件更小**：每个文件200-800行，更易阅读
- ✅ **结构清晰**：文件名直观反映内容
- ✅ **文档完善**：每个模块都有清晰的注释

### 团队协作
- ✅ **减少冲突**：不同人可以修改不同文件
- ✅ **代码复用**：模块可以被其他项目引用
- ✅ **扩展性好**：添加新功能更容易

## 📊 模块大小对比

| 文件 | 行数 | 说明 |
|------|------|------|
| game.js（原） | ~1060行 | 单一大文件 |
| data.js | ~48行 | 游戏数据 |
| utils.js | ~28行 | 工具函数 |
| game-state.js | ~240行 | 状态管理 |
| game-controller.js | ~800行 | UI控制 |
| main.js | ~12行 | 入口文件 |

## 🚀 下一步优化建议

1. **进一步拆分 game-controller.js**：
   - `ui-manager.js` - UI更新逻辑
   - `modal-manager.js` - 模态框管理
   - `trade-ui.js` - 买卖界面
   
2. **添加类型定义**：
   - 使用 JSDoc 或 TypeScript
   
3. **添加单元测试**：
   - 测试GameState的业务逻辑
   
4. **使用构建工具**：
   - Webpack或Vite打包优化

## 💡 使用ES6模块的好处

- ✅ 浏览器原生支持
- ✅ 按需加载
- ✅ 清晰的依赖关系
- ✅ 作用域隔离
- ✅ 树摇优化（tree-shaking）

---

**注意**：目前已创建的模块文件都使用了 ES6 的 `import/export` 语法，确保在支持ES模块的现代浏览器中运行，或使用开发服务器（如当前的Python HTTP服务器）。
