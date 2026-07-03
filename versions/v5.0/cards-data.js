// ==================== 卡牌数据库 · V5.0 ====================
// 从 V4.2.4-archived.html 抽出，独立为 ES module
// 设计原则：所有卡牌数据由服务端持有，客户端只接收 instanceId 后从这份字典里渲染

const CARDS = {
  // ============ 苍龙 阵营 ============
  c_055:    { id:'c_055',    name:'055 驱逐舰',     faction:'苍龙', type:'surface', cost:{deploy:4}, atk:4, hp:5, icon:'🚢', desc:'被动：相邻友军-1伤' },
  c_055b:   { id:'c_055b',   name:'055B 改进型',    faction:'苍龙', type:'surface', cost:{deploy:5}, atk:5, hp:6, icon:'⛴️', desc:'中华神盾·改良版' },
  c_fujian: { id:'c_fujian', name:'福建舰',         faction:'苍龙', type:'surface', cost:{deploy:8}, atk:2, hp:8, icon:'🛳️', desc:'被动：友军+1攻' },
  c_096:    { id:'c_096',    name:'096 核潜艇',     faction:'苍龙', type:'subsurf', cost:{deploy:7}, atk:6, hp:5, icon:'🦈', desc:'深海幽灵：可攻击任意水面单位' },
  c_039b:   { id:'c_039b',   name:'039B 常规潜艇',  faction:'苍龙', type:'subsurf', cost:{deploy:4}, atk:4, hp:3, icon:'🐟', desc:'仅需能源' },
  c_j35:    { id:'c_j35',    name:'歼-35 舰载机',   faction:'苍龙', type:'air',     cost:{deploy:3}, atk:3, hp:2, icon:'✈️', desc:'空中优势' },
  c_uuv:    { id:'c_uuv',    name:'UUV 蜂群',       faction:'苍龙', type:'subsurf', cost:{deploy:3}, atk:2, hp:2, icon:'🐙', desc:'死亡溅射：所在线全敌-1' },
  c_drone:  { id:'c_drone',  name:'攻击-11 无人机', faction:'苍龙', type:'air',     cost:{deploy:2}, atk:2, hp:1, icon:'🛸', desc:'消耗品' },
  c_df21d:  { id:'c_df21d',  name:'东风-21D',       faction:'苍龙', type:'air',     cost:{deploy:6}, atk:8, hp:1, icon:'🚀', desc:'跨线一次性' },
  c_shield: { id:'c_shield', name:'神盾拦截',       faction:'苍龙', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'🛡️', desc:'己方旗舰 +5 HP（可超上限）' },
  c_ewarfare:{id:'c_ewarfare',name:'电子干扰',      faction:'苍龙', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'📡', desc:'敌方飞机本回合 ATK 减半' },
  c_intel:  { id:'c_intel',  name:'情报侦查',       faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔍', desc:'抽 2 张牌' },
  c_repair: { id:'c_repair', name:'紧急维修',       faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔧', desc:'己方所有水面单位 +1 HP' },
  c_bombard:{ id:'c_bombard',name:'战略轰炸',       faction:'苍龙', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'💣', desc:'敌方所有单位 -1 HP' },
  c_mobilize:{id:'c_mobilize',name:'战时动员',      faction:'苍龙', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'📈', desc:'K +3（最多到上限）' },
  c_blockade:{id:'c_blockade',name:'海上封锁',      faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🚧', desc:'选敌方一个单位，下回合不能攻击' },

  // ============ 利维坦 阵营 ============
  l_burke:  { id:'l_burke',  name:'伯克级驱逐舰',   faction:'利维坦', type:'surface', cost:{deploy:4}, atk:4, hp:5, icon:'🚢', desc:'宙斯盾' },
  l_tico:   { id:'l_tico',   name:'提康德罗加',     faction:'利维坦', type:'surface', cost:{deploy:5}, atk:4, hp:6, icon:'⛴️', desc:'巡洋舰' },
  l_ford:   { id:'l_ford',   name:'福特级航母',     faction:'利维坦', type:'surface', cost:{deploy:8}, atk:2, hp:8, icon:'🛳️', desc:'被动：友军+1攻' },
  l_virgin: { id:'l_virgin', name:'弗吉尼亚核潜艇', faction:'利维坦', type:'subsurf', cost:{deploy:5}, atk:5, hp:4, icon:'🦈', desc:'深海幽灵' },
  l_seawolf:{ id:'l_seawolf',name:'海狼级核潜艇',   faction:'利维坦', type:'subsurf', cost:{deploy:4}, atk:4, hp:3, icon:'🐟', desc:'仅需能源' },
  l_f35c:   { id:'l_f35c',   name:'F-35C 舰载机',   faction:'利维坦', type:'air',     cost:{deploy:3}, atk:3, hp:2, icon:'✈️', desc:'隐身：首攻+1' },
  l_mq25:   { id:'l_mq25',   name:'MQ-25 黄貂鱼',   faction:'利维坦', type:'air',     cost:{deploy:2}, atk:2, hp:1, icon:'🛸', desc:'消耗品' },
  l_tomahawk:{id:'l_tomahawk',name:'战斧巡航导弹',  faction:'利维坦', type:'air',     cost:{deploy:5}, atk:6, hp:1, icon:'🚀', desc:'跨线一次性' },
  l_aegis:  { id:'l_aegis',  name:'宙斯盾升级',     faction:'利维坦', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🛡️', desc:'己方所有水面 +1 HP' },
  l_csg:    { id:'l_csg',    name:'航母打击群',     faction:'利维坦', type:'op',      cost:{deploy:6}, atk:0, hp:0, icon:'✈️', desc:'召唤 2 个 F-35C 到支援线' },
  l_repair: { id:'l_repair', name:'损管抢救',       faction:'利维坦', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔧', desc:'己方所有水面 +1 HP' },
  l_bombard:{ id:'l_bombard',name:'B-2 隐身轰炸',   faction:'利维坦', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'💣', desc:'敌方所有单位 -1 HP' },
  l_intel:  { id:'l_intel',  name:'卫星侦察',       faction:'利维坦', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🛰️', desc:'抽 2 张牌' },
};

// 默认牌组（21 张 / 17 张），跟 V4.2 一致
const PLAYER_DECK = ['c_055','c_055','c_055b','c_fujian','c_096','c_039b','c_039b','c_j35','c_j35','c_uuv','c_uuv','c_drone','c_drone','c_df21d','c_shield','c_ewarfare','c_intel','c_repair','c_bombard','c_mobilize','c_blockade'];
const AI_DECK     = ['l_burke','l_burke','l_tico','l_ford','l_virgin','l_seawolf','l_seawolf','l_f35c','l_f35c','l_mq25','l_mq25','l_tomahawk','l_aegis','l_csg','l_repair','l_bombard','l_intel'];

module.exports = { CARDS, PLAYER_DECK, AI_DECK };