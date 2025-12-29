// ================================
// CLOUDFLARE WORKER - 排行榜 API
// ================================
// 为《北京浮生记》提供全局排行榜服务

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS 处理
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
        
        // 处理 OPTIONS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        try {
            // 路由处理
            if (url.pathname === '/api/rankings' && request.method === 'GET') {
                return await getRankings(request, env, corsHeaders);
            }
            
            if (url.pathname === '/api/rankings' && request.method === 'POST') {
                return await submitRanking(request, env, corsHeaders);
            }
            
            if (url.pathname === '/api/stats' && request.method === 'GET') {
                return await getStats(env, corsHeaders);
            }
            
            // 健康检查
            if (url.pathname === '/health') {
                return new Response(JSON.stringify({ status: 'ok' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response('Not Found', { 
                status: 404,
                headers: corsHeaders
            });
            
        } catch (error) {
            console.error('API Error:', error);
            return new Response(JSON.stringify({ 
                success: false,
                error: error.message 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

/**
 * 获取排行榜
 * 支持分页和难度筛选
 */
async function getRankings(request, env, corsHeaders) {
    const url = new URL(request.url);
    
    // 获取查询参数
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const difficulty = url.searchParams.get('difficulty'); // '经典', '困难', '休闲'
    
    // 参数验证
    if (page < 1 || limit < 1 || limit > 100) {
        return new Response(JSON.stringify({
            success: false,
            error: '无效的分页参数'
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    const offset = (page - 1) * limit;
    
    // 构建查询
    let query = `
        SELECT 
            player_name,
            total_money,
            final_day,
            difficulty,
            created_at
        FROM rankings
    `;
    
    const params = [];
    
    if (difficulty) {
        query += ' WHERE difficulty = ?';
        params.push(difficulty);
    }
    
    query += ' ORDER BY total_money DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // 执行查询
    const stmt = env.DB.prepare(query);
    const { results } = await stmt.bind(...params).all();
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM rankings';
    if (difficulty) {
        countQuery += ' WHERE difficulty = ?';
    }
    const countStmt = env.DB.prepare(countQuery);
    const countResult = difficulty 
        ? await countStmt.bind(difficulty).first()
        : await countStmt.first();
    
    return new Response(JSON.stringify({
        success: true,
        rankings: results,
        pagination: {
            page: page,
            limit: limit,
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / limit)
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * 提交新的排行榜记录
 */
async function submitRanking(request, env, corsHeaders) {
    const data = await request.json();
    
    // 数据验证
    const validation = validateRankingData(data);
    if (!validation.valid) {
        return new Response(JSON.stringify({
            success: false,
            error: validation.error
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // 速率限制（简单实现）
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await hashString(ip);
    
    // 生成游戏哈希（防止重复提交）
    const gameHash = await generateGameHash(data, ipHash);
    
    try {
        // 插入数据
        await env.DB.prepare(`
            INSERT INTO rankings (
                player_name, 
                total_money, 
                final_day, 
                difficulty, 
                game_hash,
                user_agent,
                ip_hash
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            data.playerName.substring(0, 20), // 限制名字长度
            data.totalMoney,
            data.finalDay,
            data.difficulty,
            gameHash,
            request.headers.get('User-Agent') || 'unknown',
            ipHash
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
            message: `恭喜！你在全球排行榜中排第 ${rank} 名！`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({
                success: false,
                error: '该游戏记录已提交过，无法重复提交'
            }), {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        throw error;
    }
}

/**
 * 获取统计信息
 */
async function getStats(env, corsHeaders) {
    const stats = await env.DB.prepare(`
        SELECT 
            COUNT(*) as total_games,
            MAX(total_money) as highest_score,
            AVG(total_money) as average_score,
            COUNT(DISTINCT player_name) as unique_players
        FROM rankings
    `).first();
    
    const difficultyStats = await env.DB.prepare(`
        SELECT 
            difficulty,
            COUNT(*) as count,
            MAX(total_money) as highest,
            AVG(total_money) as average
        FROM rankings
        GROUP BY difficulty
    `).all();
    
    return new Response(JSON.stringify({
        success: true,
        stats: {
            ...stats,
            byDifficulty: difficultyStats.results
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * 验证排行榜数据
 */
function validateRankingData(data) {
    if (!data.playerName || typeof data.playerName !== 'string') {
        return { valid: false, error: '玩家名字无效' };
    }
    
    if (!data.totalMoney || typeof data.totalMoney !== 'number') {
        return { valid: false, error: '总金额无效' };
    }
    
    if (!data.finalDay || typeof data.finalDay !== 'number') {
        return { valid: false, error: '游戏天数无效' };
    }
    
    if (!data.difficulty || !['经典', '困难', '休闲'].includes(data.difficulty)) {
        return { valid: false, error: '难度设置无效' };
    }
    
    // 合理性检查
    if (data.totalMoney < 0 || data.totalMoney > 100000000) {
        return { valid: false, error: '金额超出合理范围' };
    }
    
    if (data.finalDay < 1 || data.finalDay > 200) {
        return { valid: false, error: '天数超出合理范围' };
    }
    
    if (data.playerName.length > 20) {
        return { valid: false, error: '玩家名字过长' };
    }
    
    return { valid: true };
}

/**
 * 生成游戏哈希（防止重复提交）
 */
async function generateGameHash(data, ipHash) {
    const str = `${data.playerName}-${data.totalMoney}-${data.finalDay}-${data.difficulty}-${ipHash}-${Date.now()}`;
    return await hashString(str);
}

/**
 * 字符串哈希函数
 */
async function hashString(str) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
