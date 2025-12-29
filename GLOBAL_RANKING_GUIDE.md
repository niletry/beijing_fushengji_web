# 🏆 全局排行榜实现方案

## 📋 需求分析

**当前状态**：
- ❌ 排行榜数据存储在浏览器 localStorage
- ❌ 每个用户只能看到自己的游戏记录
- ❌ 无法实现全球玩家排名竞争

**目标**：
- ✅ 全局排行榜，所有玩家共享
- ✅ 实时更新排名
- ✅ 防作弊机制
- ✅ 免费或低成本

---

## 🚀 推荐方案：Cloudflare D1 + Workers

### 方案概述

使用 Cloudflare 的免费服务实现全局排行榜：
- **Cloudflare D1**：免费的 SQLite 数据库（每天 100,000 次读取）
- **Cloudflare Workers**：无服务器 API（每天 100,000 次请求）
- **完全免费**：在免费额度内足够使用

### 架构图

```
┌─────────────┐
│  游戏前端   │
│ (静态页面)  │
└──────┬──────┘
       │ HTTP API
       ↓
┌─────────────┐
│  Worker API │ ← 处理排行榜请求
│  (无服务器)  │
└──────┬──────┘
       │ SQL
       ↓
┌─────────────┐
│  D1 数据库  │ ← 存储排名数据
│  (SQLite)   │
└─────────────┘
```

---

## 📝 实现步骤

### 第1步：创建 D1 数据库

```bash
# 安装 Wrangler CLI（如果还没安装）
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create beijing-fushengji-rankings

# 记录输出的 database_id，后面会用到
```

### 第2步：创建数据库表

创建文件 `schema.sql`：

```sql
-- 排行榜表
CREATE TABLE IF NOT EXISTS rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    total_money INTEGER NOT NULL,
    final_day INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    game_hash TEXT NOT NULL UNIQUE  -- 防止重复提交
);

-- 创建索引以提高查询速度
CREATE INDEX idx_total_money ON rankings(total_money DESC);
CREATE INDEX idx_created_at ON rankings(created_at DESC);
```

执行 SQL：

```bash
wrangler d1 execute beijing-fushengji-rankings --file=./schema.sql
```

### 第3步：创建 Worker API

创建文件 `worker/index.js`：

```javascript
// ================================
// CLOUDFLARE WORKER - 排行榜 API
// ================================

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS 处理
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
        
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        try {
            // 路由处理
            if (url.pathname === '/api/rankings' && request.method === 'GET') {
                return await getRankings(env, corsHeaders);
            }
            
            if (url.pathname === '/api/rankings' && request.method === 'POST') {
                return await submitRanking(request, env, corsHeaders);
            }
            
            return new Response('Not Found', { status: 404 });
            
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

// 获取排行榜（前100名）
async function getRankings(env, corsHeaders) {
    const { results } = await env.DB.prepare(`
        SELECT 
            player_name,
            total_money,
            final_day,
            difficulty,
            created_at
        FROM rankings
        ORDER BY total_money DESC
        LIMIT 100
    `).all();
    
    return new Response(JSON.stringify({
        success: true,
        rankings: results
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// 提交新记录
async function submitRanking(request, env, corsHeaders) {
    const data = await request.json();
    
    // 验证数据
    if (!data.playerName || !data.totalMoney || !data.finalDay || !data.difficulty) {
        return new Response(JSON.stringify({
            success: false,
            error: '缺少必要字段'
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // 生成游戏哈希（防止重复提交）
    const gameHash = await generateHash(data);
    
    try {
        // 插入数据
        await env.DB.prepare(`
            INSERT INTO rankings (player_name, total_money, final_day, difficulty, game_hash)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            data.playerName,
            data.totalMoney,
            data.finalDay,
            data.difficulty,
            gameHash
        ).run();
        
        // 获取排名
        const { results } = await env.DB.prepare(`
            SELECT COUNT(*) as rank
            FROM rankings
            WHERE total_money > ?
        `).bind(data.totalMoney).all();
        
        const rank = results[0].rank + 1;
        
        return new Response(JSON.stringify({
            success: true,
            rank: rank,
            message: `恭喜！你排在第 ${rank} 名！`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({
                success: false,
                error: '该游戏记录已提交过'
            }), {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        throw error;
    }
}

// 生成游戏哈希（简单的防作弊）
async function generateHash(data) {
    const str = `${data.playerName}-${data.totalMoney}-${data.finalDay}-${Date.now()}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 第4步：配置 Worker

创建文件 `wrangler.toml`：

```toml
name = "beijing-fushengji-api"
main = "worker/index.js"
compatibility_date = "2024-01-01"

# 绑定 D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "beijing-fushengji-rankings"
database_id = "你的数据库ID"  # 替换为第1步创建的 database_id
```

### 第5步：部署 Worker

```bash
# 部署 Worker
wrangler deploy

# 部署成功后会得到一个 URL，类似：
# https://beijing-fushengji-api.你的账号.workers.dev
```

### 第6步：修改前端代码

修改 `js/game-controller.js` 中的排行榜相关代码：

```javascript
// ================================
// 全局排行榜 API 配置
// ================================
const RANKING_API = 'https://beijing-fushengji-api.你的账号.workers.dev';

// 修改 gameOver() 方法
async gameOver() {
    const totalMoney = this.state.getTotalMoney();
    const record = {
        playerName: this.state.playerName,
        totalMoney: totalMoney,
        finalDay: this.state.currentDay,
        difficulty: this.state.initialMoney === 2000 ? '经典' : 
                   this.state.initialMoney === 1000 ? '困难' : '休闲',
        date: new Date().toISOString()
    };
    
    // 保存到本地（保留原有功能）
    this.saveToRankings(record);
    
    // 🆕 提交到全局排行榜
    try {
        const response = await fetch(`${RANKING_API}/api/rankings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('排行榜', `${result.message}`, 'success');
        }
    } catch (error) {
        console.error('提交排行榜失败:', error);
        // 失败不影响游戏，静默处理
    }
    
    // ... 其他游戏结束逻辑
}

// 修改 showRankings() 方法
async showRankings() {
    this.showScreen('rankingScreen');
    
    const container = document.getElementById('rankingList');
    container.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        // 🆕 从全局排行榜获取数据
        const response = await fetch(`${RANKING_API}/api/rankings`);
        const data = await response.json();
        
        if (data.success && data.rankings.length > 0) {
            container.innerHTML = data.rankings.map((record, index) => `
                <div class="ranking-item ${index < 3 ? 'top-three' : ''}">
                    <div class="rank">${index + 1}</div>
                    <div class="player-info">
                        <div class="player-name">${record.player_name}</div>
                        <div class="player-stats">
                            ${record.difficulty} | 第${record.final_day}天
                        </div>
                    </div>
                    <div class="money">¥${record.total_money.toLocaleString()}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="no-data">暂无排行榜数据</div>';
        }
        
    } catch (error) {
        console.error('获取排行榜失败:', error);
        // 降级到本地排行榜
        const localRankings = this.loadRankings();
        if (localRankings.length > 0) {
            container.innerHTML = '<div class="notice">⚠️ 无法连接全局排行榜，显示本地记录</div>' +
                localRankings.map((record, index) => `
                    <div class="ranking-item">
                        <div class="rank">${index + 1}</div>
                        <div class="player-info">
                            <div class="player-name">${record.playerName}</div>
                        </div>
                        <div class="money">¥${record.totalMoney.toLocaleString()}</div>
                    </div>
                `).join('');
        } else {
            container.innerHTML = '<div class="no-data">暂无排行榜数据</div>';
        }
    }
}
```

---

## 🎨 优化建议

### 1. 添加排行榜切换

在排行榜界面添加"全球榜"和"本地榜"切换：

```html
<div class="ranking-tabs">
    <button class="tab active" data-tab="global">🌍 全球排行</button>
    <button class="tab" data-tab="local">📱 本地记录</button>
</div>
```

### 2. 防作弊增强

在 Worker 中添加更多验证：

```javascript
// 验证分数合理性
if (data.totalMoney > 10000000) {  // 1000万上限
    return new Response(JSON.stringify({
        success: false,
        error: '分数异常'
    }), { status: 400 });
}

// 验证天数
if (data.finalDay < 1 || data.finalDay > 100) {
    return new Response(JSON.stringify({
        success: false,
        error: '天数异常'
    }), { status: 400 });
}
```

### 3. 添加分页

```javascript
// Worker 中添加分页参数
const page = parseInt(url.searchParams.get('page') || '1');
const limit = 50;
const offset = (page - 1) * limit;

const { results } = await env.DB.prepare(`
    SELECT * FROM rankings
    ORDER BY total_money DESC
    LIMIT ? OFFSET ?
`).bind(limit, offset).all();
```

### 4. 添加难度筛选

```javascript
// 按难度查询
const difficulty = url.searchParams.get('difficulty');
let query = 'SELECT * FROM rankings';
if (difficulty) {
    query += ' WHERE difficulty = ?';
}
query += ' ORDER BY total_money DESC LIMIT 100';
```

---

## 💰 成本估算

### Cloudflare 免费额度

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| **D1 数据库** | 每天 100,000 次读取 | 足够中小型游戏 |
| **Workers** | 每天 100,000 次请求 | 足够使用 |
| **存储** | 5GB | 排行榜数据很小 |

**结论**：对于这个游戏，**完全免费**！

---

## 🔒 安全考虑

### 1. 速率限制

在 Worker 中添加：

```javascript
// 使用 Cloudflare KV 存储 IP 请求次数
const ip = request.headers.get('CF-Connecting-IP');
const key = `rate_limit:${ip}`;
const count = await env.KV.get(key) || 0;

if (count > 10) {  // 每分钟最多10次
    return new Response('Too Many Requests', { status: 429 });
}

await env.KV.put(key, count + 1, { expirationTtl: 60 });
```

### 2. 数据验证

- ✅ 验证分数范围
- ✅ 验证天数范围
- ✅ 验证玩家名长度
- ✅ 防止 SQL 注入（使用参数化查询）

---

## 📊 监控和维护

### 查看数据库

```bash
# 查询前10名
wrangler d1 execute beijing-fushengji-rankings --command="SELECT * FROM rankings ORDER BY total_money DESC LIMIT 10"

# 查看总记录数
wrangler d1 execute beijing-fushengji-rankings --command="SELECT COUNT(*) FROM rankings"
```

### 查看 Worker 日志

```bash
wrangler tail
```

---

## 🚀 快速开始

### 最小化实现（5个文件）

```
beijing_fushengji_web/
├── worker/
│   └── index.js          # Worker API 代码
├── wrangler.toml         # Worker 配置
├── schema.sql            # 数据库表结构
└── js/
    └── game-controller.js # 修改排行榜逻辑
```

### 部署命令

```bash
# 1. 创建数据库
wrangler d1 create beijing-fushengji-rankings

# 2. 创建表
wrangler d1 execute beijing-fushengji-rankings --file=./schema.sql

# 3. 部署 Worker
wrangler deploy

# 4. 完成！
```

---

## 🎯 总结

| 特性 | 本地存储 | Cloudflare D1 |
|------|---------|---------------|
| 成本 | 免费 | 免费 |
| 全球排名 | ❌ | ✅ |
| 实时更新 | ❌ | ✅ |
| 跨设备同步 | ❌ | ✅ |
| 实现难度 | 简单 | 中等 |
| 维护成本 | 无 | 低 |

**推荐**：使用 Cloudflare D1 + Workers 实现全局排行榜，完全免费且性能优秀！

---

## 📚 参考资料

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

---

**创建时间**：2025-12-29  
**适用版本**：北京浮生记 Web v1.0+
