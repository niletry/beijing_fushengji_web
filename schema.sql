-- ================================
-- 排行榜数据库表结构
-- ================================

-- 排行榜表
CREATE TABLE IF NOT EXISTS rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    total_money INTEGER NOT NULL,
    final_day INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    game_hash TEXT NOT NULL UNIQUE,  -- 防止重复提交
    user_agent TEXT,                 -- 记录设备信息（可选）
    ip_hash TEXT                     -- IP哈希（隐私保护）
);

-- 创建索引以提高查询速度
CREATE INDEX idx_total_money ON rankings(total_money DESC);
CREATE INDEX idx_created_at ON rankings(created_at DESC);
CREATE INDEX idx_difficulty ON rankings(difficulty);

-- 查询示例：
-- SELECT * FROM rankings ORDER BY total_money DESC LIMIT 100;
-- SELECT COUNT(*) FROM rankings;
-- SELECT * FROM rankings WHERE difficulty = '经典' ORDER BY total_money DESC LIMIT 50;
