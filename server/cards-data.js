// ==================== 卡牌数据库 · V5.3 ====================
// V5.3 新增：雄鹰（印度）+ 灰狼（土耳其）两大阵营
//         + 4旧阵营各加新机制卡（隐身/再生/蜂群/过载/穿透/布雷/EMP等）
// 设计原则：每张新卡都有独特机制，绝非换皮

const CARDS = {

  // ============================================================
  // 苍龙 阵营（中国）·  19 张（原16 + 新增3张全新机制）
  // 风格：厚装甲 + 大范围指令 + 核潜艇远程威慑
  // ============================================================
  c_055:     { id:'c_055',     name:'055 驱逐舰',     faction:'苍龙', type:'surface', cost:{deploy:4}, atk:4, hp:5, icon:'🚢', desc:'被动：相邻友军-1伤' },
  c_055b:    { id:'c_055b',    name:'055B 改进型',    faction:'苍龙', type:'surface', cost:{deploy:5}, atk:5, hp:6, icon:'⛴️', desc:'中华神盾·改良版' },
  c_fujian:  { id:'c_fujian',  name:'福建舰',         faction:'苍龙', type:'surface', cost:{deploy:8}, atk:2, hp:8, icon:'🛳️', desc:'被动：友军+1攻' },
  c_054a:    { id:'c_054a',    name:'054A 护卫舰',    faction:'苍龙', type:'surface', cost:{deploy:3}, atk:3, hp:3, icon:'⚓', desc:'性价比高的轻型护航舰' },
  c_096:     { id:'c_096',     name:'096 核潜艇',     faction:'苍龙', type:'subsurf', cost:{deploy:7}, atk:6, hp:5, icon:'🦈', desc:'深海幽灵：高攻核潜艇' },
  c_039b:    { id:'c_039b',    name:'039B 常规潜艇',  faction:'苍龙', type:'subsurf', cost:{deploy:4}, atk:4, hp:3, icon:'🐟', desc:'仅需能源' },
  c_j35:     { id:'c_j35',     name:'歼-35 舰载机',   faction:'苍龙', type:'air',     cost:{deploy:3}, atk:3, hp:2, icon:'✈️', desc:'空中优势' },
  c_j15b:    { id:'c_j15b',    name:'歼-15B',         faction:'苍龙', type:'air',     cost:{deploy:4}, atk:4, hp:2, icon:'🛩️', desc:'首攻+1攻' },
  c_uuv:     { id:'c_uuv',     name:'UUV 蜂群',       faction:'苍龙', type:'subsurf', cost:{deploy:3}, atk:2, hp:2, icon:'🐙', desc:'死亡溅射：所在线全敌-1' },
  c_drone:   { id:'c_drone',   name:'攻击-11 无人机', faction:'苍龙', type:'air',     cost:{deploy:2}, atk:2, hp:1, icon:'🛸', desc:'消耗品' },
  c_df21d:   { id:'c_df21d',   name:'东风-21D',       faction:'苍龙', type:'air',     cost:{deploy:6}, atk:8, hp:1, icon:'🚀', desc:'跨线一次性，攻击后自毁', missile:true },
  c_shield:  { id:'c_shield',  name:'神盾拦截',       faction:'苍龙', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'🛡️', desc:'己方旗舰 +5 HP（可超上限）' },
  c_ewarfare:{ id:'c_ewarfare',name:'电子干扰',       faction:'苍龙', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'📡', desc:'敌方飞机本回合 ATK 减半' },
  c_intel:   { id:'c_intel',   name:'情报侦查',       faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔍', desc:'抽 2 张牌' },
  c_repair:  { id:'c_repair',  name:'紧急维修',       faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔧', desc:'己方所有水面单位 +1 HP' },
  c_bombard: { id:'c_bombard', name:'战略轰炸',       faction:'苍龙', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'💣', desc:'敌方所有单位 -1 HP' },
  c_mobilize:{ id:'c_mobilize',name:'战时动员',       faction:'苍龙', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'📈', desc:'K +3（最多到上限）' },
  c_blockade:{ id:'c_blockade',name:'海上封锁',       faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🚧', desc:'选敌方一个单位，下回合不能攻击' },
  // --- V5.3 新增 ---
  c_076:     { id:'c_076',     name:'076 两栖攻击舰', faction:'苍龙', type:'surface', cost:{deploy:6}, atk:2, hp:6, icon:'🛳️', desc:'母舰：每回合开始生成1架攻击-11', carrierSpawn:'c_drone' },
  c_hack:    { id:'c_hack',    name:'网络战',         faction:'苍龙', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'💻', desc:' sabotag：随机弃掉对手1张手牌' },
  c_intercept:{id:'c_intercept',name:'拦截网',        faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🕸️', desc:'本回合敌方不能攻击己方HQ' },

  // ============================================================
  // 利维坦 阵营（美国）· 20 张（原17 + 新增3张全新机制）
  // 风格：航母召唤流 + 高机动空中单位 + 巡航导弹
  // ============================================================
  l_burke:   { id:'l_burke',   name:'伯克级驱逐舰',   faction:'利维坦', type:'surface', cost:{deploy:4}, atk:4, hp:5, icon:'🚢', desc:'宙斯盾' },
  l_tico:    { id:'l_tico',    name:'提康德罗加',     faction:'利维坦', type:'surface', cost:{deploy:5}, atk:4, hp:6, icon:'⛴️', desc:'巡洋舰' },
  l_ford:    { id:'l_ford',    name:'福特级航母',     faction:'利维坦', type:'surface', cost:{deploy:8}, atk:2, hp:8, icon:'🛳️', desc:'被动：友军+1攻' },
  l_zumwalt: { id:'l_zumwalt', name:'朱姆沃尔特',    faction:'利维坦', type:'surface', cost:{deploy:6}, atk:6, hp:4, icon:'⚓', desc:'隐身：首次被攻击伤害-2' },
  l_virgin:  { id:'l_virgin',  name:'弗吉尼亚核潜艇', faction:'利维坦', type:'subsurf', cost:{deploy:5}, atk:5, hp:4, icon:'🦈', desc:'深海幽灵' },
  l_seawolf: { id:'l_seawolf', name:'海狼级核潜艇',   faction:'利维坦', type:'subsurf', cost:{deploy:4}, atk:4, hp:3, icon:'🐟', desc:'仅需能源' },
  l_f35c:    { id:'l_f35c',    name:'F-35C 舰载机',   faction:'利维坦', type:'air',     cost:{deploy:3}, atk:3, hp:2, icon:'✈️', desc:'隐身：首攻+1' },
  l_fa18:    { id:'l_fa18',    name:'F/A-18E 超级大黄蜂', faction:'利维坦', type:'air', cost:{deploy:3}, atk:3, hp:3, icon:'🛩️', desc:'双攻：每回合可攻击两次', doubleAttack:true },
  l_mq25:    { id:'l_mq25',    name:'MQ-25 黄貂鱼',   faction:'利维坦', type:'air',     cost:{deploy:2}, atk:2, hp:1, icon:'🛸', desc:'消耗品' },
  l_tomahawk:{ id:'l_tomahawk',name:'战斧巡航导弹',   faction:'利维坦', type:'air',     cost:{deploy:5}, atk:6, hp:1, icon:'🚀', desc:'跨线一次性，攻击后自毁', missile:true },
  l_aegis:   { id:'l_aegis',   name:'宙斯盾升级',     faction:'利维坦', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🛡️', desc:'己方所有水面 +1 HP' },
  l_csg:     { id:'l_csg',     name:'航母打击群',     faction:'利维坦', type:'op',      cost:{deploy:6}, atk:0, hp:0, icon:'✈️', desc:'召唤 2 个 F-35C 到支援线' },
  l_repair:  { id:'l_repair',  name:'损管抢救',       faction:'利维坦', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔧', desc:'己方所有水面 +1 HP' },
  l_bombard: { id:'l_bombard', name:'B-2 隐身轰炸',   faction:'利维坦', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'💣', desc:'敌方所有单位 -1 HP' },
  l_intel:   { id:'l_intel',   name:'卫星侦察',       faction:'利维坦', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🛰️', desc:'抽 2 张牌' },
  l_freedom: { id:'l_freedom', name:'自由女神令',     faction:'利维坦', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'🗽', desc:'我方所有单位本回合+2攻' },
  l_seals:   { id:'l_seals',   name:'海豹突击队',     faction:'利维坦', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'🦭', desc:'选敌方一单位：直接摧毁（仅限 HP≤2）' },
  // --- V5.3 新增 ---
  l_arsenal: { id:'l_arsenal', name:'武库舰',         faction:'利维坦', type:'surface', cost:{deploy:6}, atk:3, hp:7, icon:'⛴️', desc:'部署效应：对敌方所有前线单位造成2伤害', deployEffect:'dmg_front_2' },
  l_raptor:  { id:'l_raptor',  name:'F-22 猛禽',      faction:'利维坦', type:'air',     cost:{deploy:5}, atk:6, hp:2, icon:'🦅', desc:'部署效应：摧毁所有HP≤2的敌方空中单位', deployEffect:'kill_air_2' },
  l_patriot: { id:'l_patriot', name:'爱国者防空',     faction:'利维坦', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'🇺🇸', desc:'本回合敌方所有飞行器不能攻击' },

  // ============================================================
  // 北极熊 阵营（俄罗斯）· 19 张（原17 + 新增2张全新机制）
  // 风格：高血量防守 + 超声速导弹 + 核威慑
  // ============================================================
  r_slava:   { id:'r_slava',   name:'光荣级巡洋舰',   faction:'北极熊', type:'surface', cost:{deploy:5}, atk:4, hp:7, icon:'🚢', desc:'被动：每次受攻击后，对攻击者反伤1' },
  r_udaloy:  { id:'r_udaloy',  name:'无畏级驱逐舰',   faction:'北极熊', type:'surface', cost:{deploy:4}, atk:3, hp:5, icon:'⚓', desc:'反潜专家：击毁潜艇时+2攻（本回合）' },
  r_kirov:   { id:'r_kirov',   name:'基洛夫级战巡',   faction:'北极熊', type:'surface', cost:{deploy:7}, atk:5, hp:9, icon:'⛴️', desc:'铁甲：受到攻击时伤害-1（最少1）' },
  r_kuznet:  { id:'r_kuznet',  name:'库兹涅佐夫号',   faction:'北极熊', type:'surface', cost:{deploy:8}, atk:2, hp:7, icon:'🛳️', desc:'被动：友军飞机+1攻' },
  r_yasen:   { id:'r_yasen',   name:'亚森级核潜艇',   faction:'北极熊', type:'subsurf', cost:{deploy:6}, atk:5, hp:5, icon:'🦈', desc:'雷击封锁：攻击目标下回合不能行动' },
  r_kilo:    { id:'r_kilo',    name:'基洛级潜艇',     faction:'北极熊', type:'subsurf', cost:{deploy:3}, atk:3, hp:3, icon:'🐟', desc:'寂静杀手' },
  r_su33:    { id:'r_su33',    name:'苏-33 舰载机',   faction:'北极熊', type:'air',     cost:{deploy:3}, atk:3, hp:3, icon:'✈️', desc:'格斗王：与空中单位战斗时+2攻' },
  r_mig29k:  { id:'r_mig29k',  name:'米格-29K',       faction:'北极熊', type:'air',     cost:{deploy:2}, atk:3, hp:1, icon:'🛩️', desc:'快速拦截' },
  r_kinzhal: { id:'r_kinzhal', name:'匕首超声速导弹', faction:'北极熊', type:'air',     cost:{deploy:6}, atk:9, hp:1, icon:'⚡', desc:'超声速：不可被拦截，攻击后自毁', missile:true },
  r_zircon:  { id:'r_zircon',  name:'锆石反舰导弹',   faction:'北极熊', type:'air',     cost:{deploy:5}, atk:7, hp:1, icon:'🚀', desc:'跨线一次性，攻击后自毁', missile:true },
  r_armor:   { id:'r_armor',   name:'主动防御系统',   faction:'北极熊', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🛡️', desc:'选己方一单位：本回合免疫所有伤害' },
  r_repair:  { id:'r_repair',  name:'战损抢修',       faction:'北极熊', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔧', desc:'己方所有水面单位 +2 HP' },
  r_bombard: { id:'r_bombard', name:'饱和打击',       faction:'北极熊', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'💣', desc:'敌方所有单位 -1 HP，水面单位额外-1' },
  r_intel:   { id:'r_intel',   name:'GRU 情报',       faction:'北极熊', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔍', desc:'抽 2 张牌' },
  r_winter:  { id:'r_winter',  name:'寒冬令',         faction:'北极熊', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'❄️', desc:'敌方本回合 K 上限-2（不低于当前值）' },
  r_nuclear: { id:'r_nuclear', name:'核威慑',         faction:'北极熊', type:'op',      cost:{deploy:7}, atk:0, hp:0, icon:'☢️', desc:'敌方所有单位 -3 HP，己方 HQ +3 HP' },
  r_blockade:{ id:'r_blockade',name:'封海令',         faction:'北极熊', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🚧', desc:'选敌方一单位，下回合不能攻击' },
  // --- V5.3 新增 ---
  r_typhoon: { id:'r_typhoon', name:'台风级核潜艇',   faction:'北极熊', type:'subsurf', cost:{deploy:8}, atk:7, hp:8, icon:'🐋', desc:'深海堡垒：反击伤害+2', counterBonus:2 },
  r_pakda:   { id:'r_pakda',   name:'PA-DA 战略轰炸机',faction:'北极熊',type:'air',     cost:{deploy:6}, atk:5, hp:3, icon:'🛩️', desc:'战略斩首：攻击HQ时额外+3伤害', hqAtkBonus:3 },

  // ============================================================
  // 武士 阵营（日本）· 18 张（原16 + 新增2张全新机制）
  // 风格：机动快攻 + 精准点杀 + 轻量集群
  // ============================================================
  j_kongo:   { id:'j_kongo',   name:'金刚级驱逐舰',   faction:'武士', type:'surface', cost:{deploy:4}, atk:4, hp:4, icon:'🚢', desc:'宙斯盾改：友军飞机被攻击时拦截-1伤' },
  j_atago:   { id:'j_atago',   name:'爱宕级驱逐舰',   faction:'武士', type:'surface', cost:{deploy:5}, atk:5, hp:5, icon:'⛴️', desc:'反舰专家：攻击水面单位时+1攻' },
  j_izumo:   { id:'j_izumo',   name:'出云级直升机母舰',faction:'武士',type:'surface', cost:{deploy:7}, atk:1, hp:7, icon:'🛳️', desc:'被动：每回合开始召唤1架SH-60', carrierSpawn:'j_sh60' },
  j_soryu:   { id:'j_soryu',   name:'苍龙级潜艇',     faction:'武士', type:'subsurf', cost:{deploy:5}, atk:5, hp:4, icon:'🦈', desc:'隐蔽追踪：首次攻击无法被反击' },
  j_oyashio: { id:'j_oyashio', name:'亲潮级潜艇',     faction:'武士', type:'subsurf', cost:{deploy:3}, atk:3, hp:3, icon:'🐟', desc:'仅需能源' },
  j_f35b:    { id:'j_f35b',    name:'F-35B 短距起降', faction:'武士', type:'air',     cost:{deploy:3}, atk:3, hp:2, icon:'✈️', desc:'STOVL隐身战机' },
  j_sh60:    { id:'j_sh60',    name:'SH-60 反潜直升机',faction:'武士',type:'air',     cost:{deploy:2}, atk:2, hp:1, icon:'🚁', desc:'轻型反潜直升机' },
  j_asroc:   { id:'j_asroc',   name:'ASROC 反潜导弹', faction:'武士', type:'air',     cost:{deploy:4}, atk:5, hp:1, icon:'🎯', desc:'一次性导弹，攻击后自毁', missile:true },
  j_xasm:    { id:'j_xasm',    name:'ASM-3 反舰导弹', faction:'武士', type:'air',     cost:{deploy:5}, atk:6, hp:1, icon:'🚀', desc:'一次性导弹，攻击后自毁', missile:true },
  j_bushido: { id:'j_bushido', name:'武士道令',       faction:'武士', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'⚔️', desc:'选己方一单位：本回合攻击翻倍' },
  j_repairs: { id:'j_repairs', name:'应急抢修',       faction:'武士', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔧', desc:'己方所有水面单位 +1 HP' },
  j_intel:   { id:'j_intel',   name:'电子情报',       faction:'武士', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔍', desc:'抽 2 张牌' },
  j_bombard: { id:'j_bombard', name:'精确打击',       faction:'武士', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'💣', desc:'对敌方任意一个单位造成3伤害' },
  j_swift:   { id:'j_swift',   name:'快速突袭',       faction:'武士', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'⚡', desc:'己方所有飞机本回合可再行动一次' },
  j_blockade:{ id:'j_blockade',name:'海上伏击',       faction:'武士', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🚧', desc:'选敌方一单位，下回合不能攻击' },
  j_sonar:   { id:'j_sonar',   name:'全域声纳',       faction:'武士', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'📡', desc:'己方本回合所有攻击无法被反击' },
  // --- V5.3 新增 ---
  j_mogami:  { id:'j_mogami',  name:'最上级护卫舰',   faction:'武士', type:'surface', cost:{deploy:4}, atk:3, hp:5, icon:'⚓', desc:'隐身设计：首次被攻击免疫', firstHitImmune:true },
  j_godwind: { id:'j_godwind', name:'神风令',         faction:'武士', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🌀', desc:'选一友军：本回合+4攻但回合末自毁' },

  // ============================================================
  // ★雄鹰 阵营（印度）· 15 张 · V5.3 全新阵营 ★
  // 风格：航母蜂群 + 不对称作战 + 后勤压制
  // 核心新机制：隐身潜艇/穿透导弹/蜂群飞机/母舰spawn/复制指令/EMP/禁运
  // ============================================================
  e_vikrant: { id:'e_vikrant', name:'维克兰特号航母', faction:'雄鹰', type:'surface', cost:{deploy:7}, atk:2, hp:7, icon:'🛳️', desc:'母舰：每回合开始生成1架LCA战机', carrierSpawn:'e_lca' },
  e_chakra:  { id:'e_chakra',  name:'查克拉号核潜艇', faction:'雄鹰', type:'subsurf', cost:{deploy:6}, atk:5, hp:4, icon:'🦈', desc:'隐身：未攻击前不可被选为目标', stealth:true },
  e_kamov31: { id:'e_kamov31', name:'Ka-31 预警直升机',faction:'雄鹰',type:'air',     cost:{deploy:3}, atk:1, hp:3, icon:'🚁', desc:'护航：相邻友军受到伤害-1', escort:true },
  e_delhi:   { id:'e_delhi',   name:'德里级驱逐舰',   faction:'雄鹰', type:'surface', cost:{deploy:4}, atk:3, hp:5, icon:'🚢', desc:'再生：每回合开始恢复1HP', regen:1 },
  e_brahmos: { id:'e_brahmos', name:'布拉莫斯导弹',   faction:'雄鹰', type:'air',     cost:{deploy:5}, atk:7, hp:1, icon:'⚡', desc:'穿透：无视前线单位直击敌方HQ，攻击后自毁', pierce:true, missile:true },
  e_lca:     { id:'e_lca',     name:'LCA 光辉战机',   faction:'雄鹰', type:'air',     cost:{deploy:2}, atk:2, hp:1, icon:'✈️', desc:'蜂群：每架友军飞机+1攻', swarm:'air' },
  e_shivalik:{ id:'e_shivalik',name:'什瓦利克级护卫舰',faction:'雄鹰',type:'surface', cost:{deploy:5}, atk:4, hp:6, icon:'⚓', desc:'部署效应：敌方所有飞机本回合疲劳', deployEffect:'fatigue_air' },
  e_kalvari: { id:'e_kalvari', name:'卡尔瓦里级潜艇', faction:'雄鹰', type:'subsurf', cost:{deploy:4}, atk:4, hp:3, icon:'🐟', desc:'伏击：部署时对敌方HQ造成2伤害', deployEffect:'dmg_hq_2' },
  e_nonaligned:{id:'e_nonaligned',name:'不结盟策略',  faction:'雄鹰', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'🕊️', desc:'复制对手最后打出的指令牌效果' },
  e_swarm:   { id:'e_swarm',   name:'蜂群战术',       faction:'雄鹰', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🐝', desc:'本回合所有≤3费友军单位+1攻+1HP' },
  e_embargo: { id:'e_embargo', name:'海上禁运',       faction:'雄鹰', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'🚫', desc:'敌方下回合不能部署到前线' },
  e_supply:  { id:'e_supply',  name:'后勤补给',       faction:'雄鹰', type:'op',      cost:{deploy:2}, atk:0, hp:0, icon:'📦', desc:'抽牌数量=空的支援线槽位数' },
  e_retrofit:{ id:'e_retrofit',name:'武器升级',       faction:'雄鹰', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'⬆️', desc:'选一友军单位永久+1攻+1HP' },
  e_emp:     { id:'e_emp',     name:'电磁脉冲',       faction:'雄鹰', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'💥', desc:'敌方所有单位下回合不能攻击' },
  e_retreat: { id:'e_retreat', name:'战术撤退',       faction:'雄鹰', type:'op',      cost:{deploy:2}, atk:0, hp:0, icon:'↩️', desc:'选一友军单位返回手牌，退还其费用' },

  // ============================================================
  // ★灰狼 阵营（土耳其）· 15 张 · V5.3 全新阵营 ★
  // 风格：无人机海 + 区域拒止 + 狼群猎杀
  // 核心新机制：过载攻击/蜂群无人机/布雷/烟幕/sabotage/海岸炮
  // ============================================================
  t_tb2:     { id:'t_tb2',     name:'Bayraktar TB2',  faction:'灰狼', type:'air',     cost:{deploy:2}, atk:2, hp:2, icon:'🛸', desc:'蜂群：每架友军飞行器+1攻', swarm:'air' },
  t_ada:     { id:'t_ada',     name:'岛级护卫舰',     faction:'灰狼', type:'surface', cost:{deploy:4}, atk:3, hp:5, icon:'🚢', desc:'部署效应：对所有潜艇造成1伤害', deployEffect:'dmg_subs_1' },
  t_milgem:  { id:'t_milgem',  name:'MILGEM 护卫舰',  faction:'灰狼', type:'surface', cost:{deploy:5}, atk:4, hp:6, icon:'⚓', desc:'再生：每回合恢复1HP', regen:1 },
  t_akinci:  { id:'t_akinci',  name:'Akinci 重型无人机',faction:'灰狼',type:'air',    cost:{deploy:4}, atk:4, hp:3, icon:'🛩️', desc:'过载：每回合可攻击2次，每次自伤1', overload:true },
  t_type214: { id:'t_type214', name:'214型AIP潜艇',   faction:'灰狼', type:'subsurf', cost:{deploy:5}, atk:5, hp:4, icon:'🦈', desc:'隐身：未攻击前不可被选为目标', stealth:true },
  t_atmaca:  { id:'t_atmaca',  name:'ATMACA 反舰导弹',faction:'灰狼', type:'air',     cost:{deploy:4}, atk:6, hp:1, icon:'🚀', desc:'斩首：直接攻击敌方HQ，攻击后自毁', pierce:true, missile:true },
  t_anadolu: { id:'t_anadolu', name:'TCG 阿纳多卢号', faction:'灰狼', type:'surface', cost:{deploy:7}, atk:1, hp:7, icon:'🛳️', desc:'母舰：每回合开始生成1架TB2', carrierSpawn:'t_tb2' },
  t_kaan:    { id:'t_kaan',    name:'KAAN 战斗机',    faction:'灰狼', type:'air',     cost:{deploy:5}, atk:5, hp:2, icon:'✈️', desc:'部署效应：对随机敌方单位造成2伤害', deployEffect:'dmg_random_2' },
  t_dronestorm:{id:'t_dronestorm',name:'无人机风暴',  faction:'灰狼', type:'op',      cost:{deploy:5}, atk:0, hp:0, icon:'🌪️', desc:'召唤3架Bayraktar TB2到支援线' },
  t_fortress:{ id:'t_fortress',name:'电子堡垒',       faction:'灰狼', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'🏰', desc:'己方HQ本回合受到伤害减半' },
  t_wolfpack:{ id:'t_wolfpack',name:'狼群战术',       faction:'灰狼', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🐺', desc:'己方所有潜艇本回合+2攻' },
  t_minefield:{id:'t_minefield',name:'布雷',          faction:'灰狼', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'💣', desc:'选一前线槽位布雷，敌方部署时受3伤害' },
  t_smoke:   { id:'t_smoke',   name:'烟幕弹',         faction:'灰狼', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'💨', desc:'己方所有单位本回合不可被选为攻击目标' },
  t_sabotage:{ id:'t_sabotage',name:'破坏行动',       faction:'灰狼', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🔪', desc:'随机弃掉对手1张手牌' },
  t_raptor2: { id:'t_raptor2', name:'F-16 战隼',      faction:'灰狼', type:'air',     cost:{deploy:4}, atk:4, hp:2, icon:'🦅', desc:'格斗：与空中单位战斗时+2攻' },

  // ============================================================
  // V5.4 扩容卡牌 · 5种全新机制（吸血/护盾/狂暴/齐射/双攻）
  // ============================================================

  // --- 苍龙 V5.4 新增 5张 ---
  c_052d:    { id:'c_052d',    name:'052D 驱逐舰',    faction:'苍龙', type:'surface', cost:{deploy:3}, atk:3, hp:4, icon:'🚢', desc:'吸血：攻击时己方HQ恢复1点', lifesteal:1 },
  c_yj18:    { id:'c_yj18',    name:'鹰击-18',        faction:'苍龙', type:'air',     cost:{deploy:5}, atk:7, hp:1, icon:'🚀', desc:'超声速反舰导弹，攻击后自毁', missile:true },
  c_nanchang:{ id:'c_nanchang',name:'南昌舰',         faction:'苍龙', type:'surface', cost:{deploy:6}, atk:4, hp:7, icon:'⛴️', desc:'护盾：吸收3点伤害', shield:3 },
  c_satellite:{id:'c_satellite',name:'海洋监视卫星',  faction:'苍龙', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🛰️', desc:'抽1张牌+弃掉对手1张手牌' },
  c_torpedo: { id:'c_torpedo', name:'鱼雷突击',       faction:'苍龙', type:'op',      cost:{deploy:2}, atk:0, hp:0, icon:'pedo', desc:'选敌方一潜艇造成3伤害' },

  // --- 利维坦 V5.4 新增 4张 ---
  l_ddg51:   { id:'l_ddg51',   name:'伯克 Flight III',faction:'利维坦', type:'surface', cost:{deploy:5}, atk:5, hp:5, icon:'🚢', desc:'护盾：吸收2点伤害', shield:2 },
  l_lrasm:   { id:'l_lrasm',   name:'LRASM 远程导弹', faction:'利维坦', type:'air',     cost:{deploy:6}, atk:8, hp:1, icon:'🚀', desc:'隐身远程导弹，攻击后自毁', missile:true },
  l_stennis: { id:'l_stennis', name:'斯坦尼斯号',     faction:'利维坦', type:'surface', cost:{deploy:7}, atk:2, hp:7, icon:'🛳️', desc:'母舰：每回合生成1架MQ-25', carrierSpawn:'l_mq25', frenzy:1 },
  l_decompose:{id:'l_decompose',name:'战术分解',      faction:'利维坦', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'⚗️', desc:'摧毁己方一单位，抽2张牌' },

  // --- 北极熊 V5.4 新增 4张 ---
  r_oscar:   { id:'r_oscar',   name:'奥斯卡级核潜艇', faction:'北极熊', type:'subsurf', cost:{deploy:7}, atk:6, hp:7, icon:'🐋', desc:'狂暴：友军阵亡时+1攻', frenzy:1 },
  r_granit:  { id:'r_granit',  name:'花岗岩导弹',     faction:'北极熊', type:'air',     cost:{deploy:5}, atk:7, hp:1, icon:'🚀', desc:'重型反舰导弹，攻击后自毁', missile:true },
  r_buran:   { id:'r_buran',   name:'暴风级鱼雷艇',   faction:'北极熊', type:'surface', cost:{deploy:2}, atk:3, hp:2, icon:'🚤', desc:'齐射：攻击时对同线其他敌人造成1溅射', volley:true },
  r_arctic:  { id:'r_arctic',  name:'北极冰封',       faction:'北极熊', type:'op',      cost:{deploy:4}, atk:0, hp:0, icon:'🧊', desc:'敌方所有水面单位下回合不能推进' },

  // --- 武士 V5.4 新增 4张 ---
  j_soryu2:  { id:'j_soryu2',  name:'苍龙改',         faction:'武士', type:'subsurf', cost:{deploy:6}, atk:5, hp:5, icon:'🦈', desc:'齐射：攻击时对同线其他敌人造成1溅射', volley:true },
  j_type12:  { id:'j_type12',  name:'12式地舰导弹',   faction:'武士', type:'air',     cost:{deploy:4}, atk:5, hp:1, icon:'🚀', desc:'精确制导导弹，攻击后自毁', missile:true },
  j_hatsuse: { id:'j_hatsuse', name:'初霜级驱逐舰',   faction:'武士', type:'surface', cost:{deploy:4}, atk:3, hp:4, icon:'🚢', desc:'吸血：攻击时己方HQ恢复1点', lifesteal:1 },
  j_kamikaze:{ id:'j_kamikaze',name:'特攻令',         faction:'武士', type:'op',      cost:{deploy:2}, atk:0, hp:0, icon:'🌀', desc:'选己方一单位自毁，对敌方HQ造成其攻击力伤害' },

  // --- 雄鹰 V5.4 新增 4张 ---
  e_kolkata: { id:'e_kolkata', name:'加尔各答级',     faction:'雄鹰', type:'surface', cost:{deploy:5}, atk:4, hp:5, icon:'🚢', desc:'吸血+护盾：攻击恢复1HP，吸收1伤害', lifesteal:1, shield:1 },
  e_barak8:  { id:'e_barak8',  name:'巴拉克-8',       faction:'雄鹰', type:'op',      cost:{deploy:3}, atk:0, hp:0, icon:'🛡️', desc:'己方所有单位获得2点护盾' },
  e_nirbhay: { id:'e_nirbhay', name:'无畏巡航导弹',   faction:'雄鹰', type:'air',     cost:{deploy:5}, atk:6, hp:1, icon:'🚀', desc:'亚声速巡航导弹，攻击后自毁', missile:true },
  e_akhil:   { id:'e_akhil',   name:'阿基里级护卫舰', faction:'雄鹰', type:'surface', cost:{deploy:4}, atk:3, hp:4, icon:'⚓', desc:'狂暴：友军阵亡时+1攻', frenzy:1 },

  // --- 灰狼 V5.4 新增 4张 ---
  t_istar:   { id:'t_istar',   name:'ISR 侦察舰',     faction:'灰狼', type:'surface', cost:{deploy:4}, atk:2, hp:5, icon:'🔭', desc:'狂暴：友军阵亡时+1攻', frenzy:1 },
  t_som:     { id:'t_som',     name:'SOM 巡航导弹',   faction:'灰狼', type:'air',     cost:{deploy:5}, atk:6, hp:1, icon:'🚀', desc:'国产巡航导弹，攻击后自毁', missile:true },
  t_atmaca2: { id:'t_atmaca2', name:'ATMACA-II',      faction:'灰狼', type:'air',     cost:{deploy:6}, atk:8, hp:1, icon:'💥', desc:'穿透+导弹：直击HQ，攻击后自毁', pierce:true, missile:true },
  t_gokbay:  { id:'t_gokbay',  name:'GÖKBEY 直升机',  faction:'灰狼', type:'air',     cost:{deploy:3}, atk:2, hp:3, icon:'🚁', desc:'护航+吸血：相邻减伤1，攻击恢复1HP', escort:true, lifesteal:1 },
};

// ==================== 牌组定义 ====================

// 苍龙（中国）标准牌组 · 29 张
const DECK_CANGLONG = [
  'c_055','c_055','c_055b','c_fujian','c_076','c_nanchang',
  'c_054a','c_054a','c_052d',
  'c_096','c_039b','c_039b',
  'c_j35','c_j35','c_j15b',
  'c_uuv','c_uuv','c_drone','c_drone','c_df21d','c_yj18',
  'c_shield','c_ewarfare','c_intel','c_repair','c_bombard','c_mobilize','c_blockade',
  'c_hack','c_intercept','c_satellite','c_torpedo'
];

// 利维坦（美国）标准牌组 · 27 张
const DECK_LEVIATHAN = [
  'l_burke','l_burke','l_tico','l_ford','l_arsenal','l_ddg51','l_stennis',
  'l_zumwalt','l_virgin','l_seawolf','l_seawolf',
  'l_f35c','l_f35c','l_fa18','l_mq25','l_mq25','l_tomahawk','l_lrasm','l_raptor',
  'l_aegis','l_csg','l_repair','l_bombard','l_intel','l_seals','l_patriot','l_decompose'
];

// 北极熊（俄罗斯）标准牌组 · 27 张
const DECK_POLARBEAR = [
  'r_slava','r_slava','r_udaloy','r_kirov','r_kuznet','r_typhoon','r_oscar',
  'r_yasen','r_kilo','r_kilo','r_buran',
  'r_su33','r_su33','r_mig29k','r_mig29k','r_kinzhal','r_zircon','r_pakda','r_granit',
  'r_armor','r_repair','r_bombard','r_intel','r_winter','r_nuclear','r_blockade','r_arctic'
];

// 武士（日本）标准牌组 · 26 张
const DECK_BUSHIDO = [
  'j_kongo','j_kongo','j_atago','j_izumo','j_mogami','j_hatsuse',
  'j_soryu','j_soryu2','j_oyashio','j_oyashio',
  'j_f35b','j_f35b','j_sh60','j_sh60','j_asroc','j_xasm','j_type12',
  'j_bushido','j_repairs','j_intel','j_bombard','j_swift','j_blockade','j_sonar','j_godwind','j_kamikaze'
];

// 雄鹰（印度）标准牌组 · 26 张
const DECK_EAGLE = [
  'e_vikrant','e_vikrant','e_delhi','e_delhi','e_shivalik','e_kolkata','e_akhil',
  'e_chakra','e_kalvari','e_kalvari',
  'e_kamov31','e_kamov31','e_lca','e_lca','e_lca','e_brahmos','e_nirbhay',
  'e_nonaligned','e_swarm','e_embargo','e_supply','e_retrofit','e_emp','e_retreat','e_intel','e_barak8'
];

// 灰狼（土耳其）标准牌组 · 26 张
const DECK_GREYWOLF = [
  't_anadolu','t_milgem','t_milgem','t_ada','t_ada','t_istar',
  't_type214','t_type214',
  't_tb2','t_tb2','t_tb2','t_akinci','t_akinci','t_kaan','t_atmaca','t_atmaca2','t_raptor2','t_gokbay','t_som',
  't_dronestorm','t_fortress','t_wolfpack','t_minefield','t_smoke','t_sabotage','t_intel'
];

// 雄鹰也需要一个 intel 卡 —— 复用通用抽牌
const EAGLE_INTEL = { id:'e_intel', name:'RAW 情报', faction:'雄鹰', type:'op', cost:{deploy:3}, atk:0, hp:0, icon:'🔍', desc:'抽 2 张牌' };
CARDS.e_intel = EAGLE_INTEL;

// 灰狼也需要一个 intel 卡
const GREYWOLF_INTEL = { id:'t_intel', name:'MIT 情报', faction:'灰狼', type:'op', cost:{deploy:3}, atk:0, hp:0, icon:'🔍', desc:'抽 2 张牌' };
CARDS.t_intel = GREYWOLF_INTEL;

// ==================== 阵营元数据 ====================
const FACTIONS = {
  '苍龙':  { hqName:'055A 旗舰',    hqIcon:'🚢', hqHp:20, deck: DECK_CANGLONG,  desc:'厚装甲·核威慑·母舰spawn' },
  '利维坦':{ hqName:'福特级航母',   hqIcon:'⛴️', hqHp:20, deck: DECK_LEVIATHAN, desc:'航母召唤·部署效应·制空权' },
  '北极熊':{ hqName:'库兹涅佐夫号', hqIcon:'⛴️', hqHp:22, deck: DECK_POLARBEAR, desc:'铁甲防守·超声速·反击强化' },
  '武士':  { hqName:'出云号',       hqIcon:'🛳️', hqHp:18, deck: DECK_BUSHIDO,   desc:'快攻机动·精准点杀·隐身' },
  '雄鹰':  { hqName:'维克兰特号',   hqIcon:'🛳️', hqHp:19, deck: DECK_EAGLE,     desc:'航母蜂群·隐身潜艇·穿透导弹·EMP' },
  '灰狼':  { hqName:'阿纳多卢号',   hqIcon:'🚢', hqHp:19, deck: DECK_GREYWOLF,  desc:'无人机海·过载攻击·布雷·烟幕' },
};

// 兼容旧版引用
const PLAYER_DECK = DECK_CANGLONG;
const AI_DECK     = DECK_LEVIATHAN;

module.exports = { CARDS, FACTIONS, PLAYER_DECK, AI_DECK, DECK_CANGLONG, DECK_LEVIATHAN, DECK_POLARBEAR, DECK_BUSHIDO, DECK_EAGLE, DECK_GREYWOLF };
