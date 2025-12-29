// ================================
// GAME TIPS DATA
// ================================  
// 原汁原味的游戏提示，来自原版Tips.txt

/**
 * 游戏提示数据 - 策略建议和小贴士
 * 每条tip包含：提示内容、类别、作者
 */
export const GAME_TIPS = [
    { tip: "人生短暂，赚钱永恒。", category: "财富论坛", author: "新资本家" },
    { tip: "一切向钱看，才能向前看。", category: "市场经济论坛", author: "改革先驱者" },
    { tip: "盗版VCD和游戏软件很便宜，创业不妨从倒卖它们开始.", category: "发财之道", author: "中关村人" },
    { tip: "伪劣化妆品经常给您惊喜。", category: "发财之道", author: "一个富婆" },
    { tip: "人们啊！不要总是把目光放在便宜的货物上，要及时买卖贵物品，承担风险的同时赚大钱。", category: "财神语录", author: "" },
    { tip: "进多种货物，发展多种经营，可以避免风险。", category: "《MBA速成》", author: "John Smith" },
    { tip: "您欠村长的钱，利息是10%.所以要赶快还掉，免得有债务危机。", category: "村务公开", author: "高家庄新闻" },
    { tip: "把握好给村长还钱的时机：还钱太早，您自己资金周转困难，还钱太晚，高利息让人受不了。", category: "善意的提示", author: "" },
    { tip: "山西假白酒价格在1500元时可以买进了。", category: "发财之道", author: "一个老酒鬼" },
    { tip: "进口玩具价格在400元以下，可以大肆进货.", category: "经验之谈", author: "先富起来的人" },
    { tip: "走私汽车能够赚大钱，但是有时风险太大。", category: "促进北京汽车消费", author: "胡说者" },
    { tip: "谨慎！禁书《上海小宝贝》有时可以赚大钱（5000元左右买进），但是对青少年成长不利。", category: "保护青少年", author: "卫秽" },
    { tip: "进口香烟的平均价格好象是200元，很赚钱喔。", category: "吸烟有害", author: "烟草害人局" },
    { tip: "水货手机低于1200元时是发财好机会。", category: "发展北京通信产业", author: "吴鸡传" },
    { tip: "有时汽车能够让您赚500%的利润。", category: "发财者言", author: "" },
    { tip: "银行的利息是很低的：只有1%。但是还是要经常存钱，以免发生意外。", category: "给市民的建议", author: "银行" },
    { tip: "原始积累很必要，但是也很残酷。", category: "《资本新论》", author: "马克丝" },
    { tip: "胆子要大一点，脸皮要厚一点。", category: "《赚钱黑厚学》", author: "一个骗子" },
    { tip: "游戏必须是免费的、共享的、开放源代码的！", category: "我们的理念", author: "Guoly Computing公司总裁" },
    { tip: "您可以给我们发电子邮件，讨论任何问题。地址在\"关于本游戏\"中。", category: "为您服务", author: "Guoly Computing公司总裁" }
];

/**
 * 获取随机提示
 */
export function getRandomTip() {
    return GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
}
