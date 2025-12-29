// ================================
// GAME DATA & CONSTANTS
// ================================

/**
 * 游戏中的所有地点
 */
export const LOCATIONS = [
    { id: 'tianqiao', name: '天桥', icon: '🌉' },
    { id: 'dongdan', name: '东单', icon: '🏬' },
    { id: 'xizhimen', name: '西直门', icon: '🚇' },
    { id: 'wangfujing', name: '王府井', icon: '🏰' },
    { id: 'zhongguancun', name: '中关村', icon: '💻' },
    { id: 'cbd', name: '国贸CBD', icon: '🏢' },
    { id: 'houhai', name: '后海', icon: '🌊' },
    { id: 'sanlitun', name: '三里屯', icon: '🍸' }
];

/**
 * 游戏中的所有商品
 * 基于原版 SelectionDlg.cpp:352-360 和价格公式 (1191-1198)
 * 价格公式: finalPrice = basePrice + Random(priceRange)
 */
export const GOODS = [
    {
        id: 0,
        name: '进口香烟',
        icon: '🚬',
        basePrice: 100,         // 原版基础价格
        priceRange: 350,        // 随机范围: 100-450元
        description: '来自福建的走私香烟'
    },
    {
        id: 1,
        name: '走私汽车',
        icon: '🚗',
        basePrice: 15000,
        priceRange: 15000,      // 15000-30000元
        description: '厦门走私的名贵汽车'
    },
    {
        id: 2,
        name: '盗版VCD和游戏',
        icon: '💿',
        basePrice: 5,
        priceRange: 50,         // 5-55元
        description: '盗版VCD港台片和游戏软件'
    },
    {
        id: 3,
        name: '山西假白酒',
        icon: '🍶',
        basePrice: 1000,
        priceRange: 2500,       // 1000-3500元
        description: '假白酒（剧毒！）',
        affectsFame: true,      // 影响名誉值
        fameChange: -10         // 每次出售 -10
    },
    {
        id: 4,
        name: '《上海小宝贝》（禁书）',
        icon: '📕',
        basePrice: 5000,
        priceRange: 9000,       // 5000-14000元
        description: '功效甚过伟哥的禁书',
        affectsFame: true,      // 影响名誉值
        fameChange: -7          // 每次出售 -7
    },
    {
        id: 5,
        name: '进口玩具',
        icon: '🧸',
        basePrice: 250,
        priceRange: 600,        // 250-850元
        description: '提高大学生"动手素质"'
    },
    {
        id: 6,
        name: '水货手机',
        icon: '📱',
        basePrice: 750,
        priceRange: 750,        // 750-1500元
        description: '无任何厂商标识的水货手机'
    },
    {
        id: 7,
        name: '伪劣化妆品',
        icon: '💄',
        basePrice: 65,
        priceRange: 180,        // 65-245元
        description: '谢不疯都在用的化妆品'
    }
];

// 商品常量
export const GOODS_COUNT = 8;
export const NORMAL_DISPLAY_COUNT = 5;  // 正常情况下显示的商品数
export const HIDDEN_COUNT = 3;          // 正常情况下隐藏的商品数

/**
 * 随机事件列表
 * 包含金钱事件、健康事件和市场价格事件
 */
export const RANDOM_EVENTS = [
    // 好事 - 金钱
    { type: 'good', msg: '你在路边捡到了一个钱包!', moneyChange: 200, frequency: 5 },
    { type: 'good', msg: '有人请你吃大餐，省了一笔钱!', moneyChange: 50, frequency: 8 },
    { type: 'good', msg: '你帮助老太太过马路，她给了你红包!', moneyChange: 100, frequency: 6 },

    // 坏事 - 健康/金钱
    { type: 'bad', msg: '大街上两个流氓打了你!', healthChange: -10, frequency: 7 },
    { type: 'bad', msg: '被骗子骗走了一些钱...', moneyChange: -150, frequency: 6 },
    { type: 'bad', msg: '你被街头混混敲诈了!', moneyChange: -200, frequency: 5 },
    { type: 'bad', msg: '北京沙尘暴，健康受损!', healthChange: -5, frequency: 8 },
    { type: 'bad', msg: '城管来查证件，交了罚款...', moneyChange: -100, frequency: 7 },

    // 市场事件 - 价格暴涨（参考原版）
    { type: 'market', msg: '专家提议提高大学生"动手素质"，进口玩具颇受欢迎!', goodId: 5, priceMultiplier: 2.0, frequency: 170 },
    { type: 'market', msg: '有人自豪地说：生病不用打针吃药，喝假白酒就可以!', goodId: 3, priceMultiplier: 3.0, frequency: 139 },
    { type: 'market', msg: '医院的秘密报告："《上海小宝贝》功效甚过伟哥"!', goodId: 4, priceMultiplier: 5.0, frequency: 100 },
    { type: 'market', msg: '《北京经济小报》社论："走私汽车大力推进汽车消费!"', goodId: 1, priceMultiplier: 3.0, frequency: 37 },
    { type: 'market', msg: '《北京真理报》社论："提倡爱美，落到实处"，伪劣化妆品大受欢迎!', goodId: 7, priceMultiplier: 4.0, frequency: 23 },
    { type: 'market', msg: '北京有人狂饮山西假酒，可以卖出天价!', goodId: 3, priceMultiplier: 7.0, frequency: 40 },
    { type: 'market', msg: '北京的大学生们开始找工作，水货手机大受欢迎!', goodId: 6, priceMultiplier: 7.0, frequency: 29 },
    { type: 'market', msg: '北京的富人疯狂地购买走私汽车！价格狂升!', goodId: 1, priceMultiplier: 8.0, frequency: 35 },

    // 市场事件 - 价格暴跌
    { type: 'market', msg: '市场上充斥着来自福建的走私香烟!', goodId: 0, priceMultiplier: 0.125, frequency: 17 }, // ÷8
    { type: 'market', msg: '北京的孩子们都忙于上网学习，进口玩具没人愿意买。', goodId: 5, priceMultiplier: 0.2, frequency: 24 }, // ÷5
    { type: 'market', msg: '盗版业十分兴旺，"中国硅谷"——中关村全是卖盗版VCD的村姑!', goodId: 2, priceMultiplier: 0.125, frequency: 18 } // ÷8
];

