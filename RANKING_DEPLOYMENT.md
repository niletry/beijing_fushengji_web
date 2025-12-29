# 🚀 全局排行榜部署步骤

## 前置要求

- ✅ 已有 Cloudflare 账号
- ✅ 已安装 Node.js (v16+)

---

## 第1步：安装 Wrangler CLI

```bash
npm install -g wrangler
```

---

## 第2步：登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，让你授权 Wrangler 访问你的 Cloudflare 账号。

---

## 第3步：创建 D1 数据库

```bash
wrangler d1 create beijing-fushengji-rankings
```

**重要**：记录输出的 `database_id`，例如：

```
✅ Successfully created DB 'beijing-fushengji-rankings'

[[d1_databases]]
binding = "DB"
database_name = "beijing-fushengji-rankings"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ⬅️ 复制这个 ID
```

---

## 第4步：更新配置文件

编辑 `wrangler.toml`，将 `YOUR_DATABASE_ID_HERE` 替换为上一步的 `database_id`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "beijing-fushengji-rankings"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ⬅️ 粘贴你的 ID
```

---

## 第5步：创建数据库表

```bash
wrangler d1 execute beijing-fushengji-rankings --file=./schema.sql
```

验证表是否创建成功：

```bash
wrangler d1 execute beijing-fushengji-rankings --command="SELECT name FROM sqlite_master WHERE type='table'"
```

应该看到 `rankings` 表。

---

## 第6步：部署 Worker

```bash
wrangler deploy
```

部署成功后，你会得到一个 URL，类似：

```
✨ Uploaded beijing-fushengji-api
✨ Published beijing-fushengji-api
  https://beijing-fushengji-api.你的账号.workers.dev
```

**复制这个 URL**，后面会用到！

---

## 第7步：测试 API

### 测试健康检查

```bash
curl https://beijing-fushengji-api.你的账号.workers.dev/health
```

应该返回：`{"status":"ok"}`

### 测试获取排行榜

```bash
curl https://beijing-fushengji-api.你的账号.workers.dev/api/rankings
```

应该返回：`{"success":true,"rankings":[],...}`

### 测试提交记录

```bash
curl -X POST https://beijing-fushengji-api.你的账号.workers.dev/api/rankings \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "测试玩家",
    "totalMoney": 50000,
    "finalDay": 40,
    "difficulty": "经典"
  }'
```

应该返回：`{"success":true,"rank":1,...}`

---

## 第8步：更新前端代码

编辑 `js/game-controller.js`，在文件顶部添加：

```javascript
// 全局排行榜 API 配置
const RANKING_API = 'https://beijing-fushengji-api.你的账号.workers.dev';  // ⬅️ 替换为你的 Worker URL
```

然后按照 `GLOBAL_RANKING_GUIDE.md` 中的说明修改 `gameOver()` 和 `showRankings()` 方法。

---

## 第9步：提交代码并部署

```bash
git add .
git commit -m "feat: 添加全局排行榜功能"
git push
```

Cloudflare Pages 会自动重新部署你的网站。

---

## ✅ 完成！

现在你的游戏已经有全局排行榜了！

### 验证清单

- [ ] Worker API 部署成功
- [ ] 数据库表创建成功
- [ ] API 健康检查通过
- [ ] 可以提交排行榜记录
- [ ] 可以查询排行榜数据
- [ ] 前端代码已更新
- [ ] 网站重新部署

---

## 🔧 常用命令

### 查看数据库数据

```bash
# 查看前10名
wrangler d1 execute beijing-fushengji-rankings \
  --command="SELECT * FROM rankings ORDER BY total_money DESC LIMIT 10"

# 查看总记录数
wrangler d1 execute beijing-fushengji-rankings \
  --command="SELECT COUNT(*) as total FROM rankings"

# 按难度统计
wrangler d1 execute beijing-fushengji-rankings \
  --command="SELECT difficulty, COUNT(*) as count FROM rankings GROUP BY difficulty"
```

### 查看 Worker 日志

```bash
wrangler tail
```

### 更新 Worker

修改 `worker/index.js` 后：

```bash
wrangler deploy
```

### 删除数据库（慎用！）

```bash
wrangler d1 delete beijing-fushengji-rankings
```

---

## 🐛 故障排除

### 问题1：部署失败

**错误**：`Error: No such binding: DB`

**解决**：检查 `wrangler.toml` 中的 `database_id` 是否正确。

### 问题2：CORS 错误

**错误**：浏览器控制台显示 CORS 错误

**解决**：Worker 代码中已包含 CORS 头，确保使用的是最新代码。

### 问题3：数据库查询失败

**错误**：`Error: no such table: rankings`

**解决**：重新执行 `schema.sql`：

```bash
wrangler d1 execute beijing-fushengji-rankings --file=./schema.sql
```

---

## 📊 监控和维护

### 查看 Worker 使用情况

访问：https://dash.cloudflare.com/ → Workers & Pages → beijing-fushengji-api

可以看到：
- 请求次数
- 错误率
- CPU 时间
- 数据库查询次数

### 设置告警

在 Cloudflare Dashboard 中可以设置告警，当请求失败率过高时通知你。

---

## 💰 成本

在免费额度内：
- ✅ Worker: 每天 100,000 次请求
- ✅ D1: 每天 100,000 次读取
- ✅ 完全免费！

超出免费额度后：
- Workers: $0.50 / 百万请求
- D1: $0.001 / 千次读取

对于中小型游戏，免费额度完全够用。

---

**部署时间**：约 10 分钟  
**难度**：⭐⭐⭐ (中等)  
**维护成本**：⭐ (很低)
