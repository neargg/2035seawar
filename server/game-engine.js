// ==================== 2035 大海战 · V5.3 中心服务器 ====================
// 架构：服务器权威 state，A vs B 平等对战，客户端只发 action
// V5.3 新增：6阵营（+雄鹰/灰狼），11种全新机制
//   stealth隐身 / regen再生 / swarm蜂群 / overload过载 / pierce穿透
//   carrierSpawn母舰 / escort护航 / deployEffect部署效应
//   counterBonus反击强化 / hqAtkBonus斩首 / firstHitImmune首击免疫
//   + 新op卡: copycat/embargo/supply/retrofit/EMP/retreat/dronestorm/fortress/wolfpack/minefield/smokescreen/sabotage/noHQAttack

'use strict';

const WebSocket = require('ws');
const crypto = require('crypto');
const { CARDS, FACTIONS, PLAYER_DECK, AI_DECK } = require('./cards-data');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT, clientTracking: false });

// ==================== 常量 ====================
const HQ_HP = 20;
const HQ_SLOT = 2;
const FRONTLINE_SIZE = 5;
const SUPPORT_SIZE = 5;
const STARTING_HAND_FIRST = 4;
const STARTING_HAND_SECOND = 5;
const MAX_K = 12;
const MAX_HAND = 9;

// ==================== 房间管理 ====================
const rooms = new Map();

function genRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  for (let tries = 0; tries < 100; tries++) {
    id = '';
    for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
    if (!rooms.has(id)) return id;
  }
  return id;
}

function nowISO() { return new Date().toISOString().substring(11, 19); }
function opp(side) { return side === 'A' ? 'B' : 'A'; }

// ==================== State 工厂 ====================

function createInitialState(factionA, factionB) {
  const fa = factionA || '苍龙';
  const fb = factionB || '利维坦';
  const fdataA = FACTIONS[fa] || FACTIONS['苍龙'];
  const fdataB = FACTIONS[fb] || FACTIONS['利维坦'];

  const firstPlayer = Math.random() < 0.5 ? 'A' : 'B';
  const makeSide = (fdata) => {
    const deck = shuffle([...fdata.deck]);
    return {
      hand: [],
      deck,
      support: [null, null, null, null, null],
      frontline: Array(FRONTLINE_SIZE).fill(null),
      hq: { hp: fdata.hqHp, maxHp: fdata.hqHp, name: fdata.hqName, shield: 0 },
      _fatigue: 0,
      faction: fdata,
    };
  };

  const state = {
    phase: 'main',
    turn: firstPlayer,
    round: 1,
    firstPlayer,
    k: { A: { cur: 0, max: 0 }, B: { cur: 0, max: 0 } },
    ewarfare: { A: false, B: false },
    blockaded: { A: [], B: [] },
    // V5.2
    noCounter: { A: false, B: false },
    extraAtk:  { A: false, B: false },
    // V5.3 新状态
    frontLocked: { A: false, B: false },    // 禁运：不能部署前线
    empLocked:   { A: false, B: false },    // EMP：所有单位不能攻击
    airLocked:   { A: false, B: false },    // 爱国者：飞行器不能攻击
    smokeScreen: { A: false, B: false },    // 烟幕：己方单位不可被选为目标
    hqDmgReduction: { A: 1, B: 1 },         // 电子堡垒：HQ伤害倍率（0.5=减半）
    noHQAttack:  { A: false, B: false },    // 拦截网：不能攻击敌方HQ
    wolfPackBuff:{ A: false, B: false },    // 狼群：潜艇+2攻
    lastOpCard:  { A: null, B: null },      // 记录最后打出的指令牌（复制用）
    mines:       { A: {}, B: {} },          // 水雷：{ slotIdx: damage }
    godwindUnits:{ A: [], B: [] },          // 神风令：回合末自毁的单位
    A: makeSide(fdataA),
    B: makeSide(fdataB),
    log: [],
    winner: null,
  };

  state.A.support[HQ_SLOT] = makeHQ('A', fdataA);
  state.B.support[HQ_SLOT] = makeHQ('B', fdataB);

  for (let i = 0; i < STARTING_HAND_FIRST; i++) drawTo(state, firstPlayer);
  for (let i = 0; i < STARTING_HAND_SECOND; i++) drawTo(state, opp(firstPlayer));

  startTurn(state, firstPlayer);
  return state;
}

function makeHQ(side, fdata) {
  return {
    isHQ: true,
    owner: side,
    name: fdata ? fdata.hqName : (side === 'A' ? '055A 旗舰' : '福特级航母'),
    icon: fdata ? fdata.hqIcon : (side === 'A' ? '🚢' : '⛴️'),
    currentHp: fdata ? fdata.hqHp : HQ_HP,
    hp: fdata ? fdata.hqHp : HQ_HP,
    atk: 0,
    type: 'surface',
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeInstance(card, owner) {
  const inst = {
    instanceId: crypto.randomBytes(4).toString('hex'),
    id: card.id,
    name: card.name,
    icon: card.icon,
    type: card.type,
    faction: card.faction,
    atk: card.atk,
    hp: card.hp,
    currentHp: card.hp,
    cost: card.cost,
    desc: card.desc,
    owner,
    exhausted: false,
  };
  // 复制特殊属性
  if (card.stealth) inst.stealth = true;
  if (card.regen) inst.regen = card.regen;
  if (card.swarm) inst.swarm = card.swarm;
  if (card.overload) inst.overload = true;
  if (card.pierce) inst.pierce = true;
  if (card.escort) inst.escort = true;
  if (card.carrierSpawn) inst.carrierSpawn = card.carrierSpawn;
  if (card.counterBonus) inst.counterBonus = card.counterBonus;
  if (card.hqAtkBonus) inst.hqAtkBonus = card.hqAtkBonus;
  if (card.firstHitImmune) inst.firstHitImmune = true;
  if (card.deployEffect) inst.deployEffect = card.deployEffect;
  // V5.4 新机制
  if (card.missile) inst.missile = true;
  if (card.doubleAttack) inst.doubleAttack = true;
  if (card.lifesteal) inst.lifesteal = card.lifesteal;
  if (card.shield) inst._shield = card.shield;
  if (card.frenzy) inst.frenzy = card.frenzy;
  if (card.volley) inst.volley = true;
  return inst;
}

// ==================== 回合流程 ====================

function startTurn(state, who) {
  // K 资源
  if (state.k[who].max < MAX_K) state.k[who].max += 1;
  state.k[who].cur = state.k[who].max;

  // 清除上一回合的状态
  state.ewarfare[who] = false;
  state.blockaded[who] = [];
  if (state.noCounter) state.noCounter[who] = false;
  if (state.extraAtk)  state.extraAtk[who]  = false;
  // V5.3 清除
  state.frontLocked[who] = false;
  state.empLocked[who] = false;
  state.airLocked[who] = false;
  state.smokeScreen[who] = false;
  state.hqDmgReduction[who] = 1;
  state.noHQAttack[who] = false;
  state.wolfPackBuff[who] = false;
  state.godwindUnits[who] = [];

  // V5.4 清除冰冻
  if (state[who]) {
    [...state[who].support, ...state[who].frontline].forEach(u => {
      if (u && u._frozen) u._frozen = false;
    });
  }

  // 抽牌
  const isFirstRound = state.round === 1;
  const isFirstPlayer = state.firstPlayer === who;
  if (!(isFirstRound && isFirstPlayer)) {
    drawTo(state, who);
    state.log.push({ time: Date.now(), msg: `${who} 抽 1 张牌` });
  } else {
    state.log.push({ time: Date.now(), msg: `${who} 先手第一回合不抽牌` });
  }

  const my = state[who];

  // V5.3 通用母舰spawn（替代原来只支持出云号的硬编码）
  if (my && my.support) {
    [...my.support, ...my.frontline].forEach(unit => {
      if (unit && unit.carrierSpawn && !unit.isHQ) {
        const spawnCard = CARDS[unit.carrierSpawn];
        if (!spawnCard) return;
        // 检查是否已达到spawn上限（同类型最多3个）
        const existing = [...my.support, ...my.frontline].filter(u => u && u.id === unit.carrierSpawn).length;
        if (existing >= 3) return;
        // 找空槽位
        for (let i = 0; i < SUPPORT_SIZE; i++) {
          if (i !== HQ_SLOT && !my.support[i]) {
            my.support[i] = makeInstance(spawnCard, who);
            my.support[i].exhausted = true;
            state.log.push({ time: Date.now(), msg: `${spawnCard.icon} ${who} ${unit.name} 召唤 ${spawnCard.name}` });
            break;
          }
        }
      }
    });
  }

  // V5.3 再生
  if (my) {
    [...my.support, ...my.frontline].forEach(unit => {
      if (unit && unit.regen && !unit.isHQ && unit.currentHp < unit.hp) {
        const heal = Math.min(unit.regen, unit.hp - unit.currentHp);
        unit.currentHp += heal;
        state.log.push({ time: Date.now(), msg: `💚 ${unit.name} 再生 +${heal} HP` });
      }
    });
  }

  state.log.push({ time: Date.now(), msg: `━━ 第 ${state.round} 回合 · ${who} 行动 ━━` });
}

function endTurn(state, side) {
  // V5.3 神风令自毁
  if (state.godwindUnits[side] && state.godwindUnits[side].length > 0) {
    state.godwindUnits[side].forEach(instId => {
      const unit = [...state[side].support, ...state[side].frontline].find(u => u && u.instanceId === instId);
      if (unit) {
        removeUnit(state, side, instId);
        state.log.push({ time: Date.now(), msg: `🌀 ${unit.name} 神风令自毁` });
      }
    });
  }

  resetExhausted(state, side);
  resetExhausted(state, opp(side));

  const next = opp(side);
  state.turn = next;
  if (next === state.firstPlayer) state.round += 1;

  startTurn(state, next);
}

function resetExhausted(state, who) {
  state[who].support.forEach(u => {
    if (u && !u.isHQ) {
      u.exhausted = false;
      // 重置过载攻击计数
      if (u._attacksThisTurn) u._attacksThisTurn = 0;
    }
  });
  state[who].frontline.forEach(u => {
    if (u) {
      u.exhausted = false;
      if (u._attacksThisTurn) u._attacksThisTurn = 0;
    }
  });
}

function drawTo(state, who) {
  const s = state[who];
  if (s.hand.length >= MAX_HAND) {
    state.log.push({ time: Date.now(), msg: `${who} 手牌已满（${MAX_HAND}），不抽` });
    return;
  }
  if (s.deck.length === 0) {
    s._fatigue = (s._fatigue || 0) + 1;
    s.hq.hp -= s._fatigue;
    state.log.push({ time: Date.now(), msg: `${who} 牌库抽空！疲劳伤害 ${s._fatigue}` });
    return;
  }
  const cardId = s.deck.shift();
  s.hand.push(cardId);
}

// ==================== 辅助函数 ====================

// 获取友军数量（按类型）
function countFriendlyByType(state, side, type) {
  let count = 0;
  state[side].support.forEach(u => { if (u && !u.isHQ && u.type === type) count++; });
  state[side].frontline.forEach(u => { if (u && u.type === type) count++; });
  return count;
}

// 检查相邻是否有护航单位
function hasAdjacentEscort(state, side, line, idx) {
  const arr = line === 'support' ? state[side].support : state[side].frontline;
  if (idx > 0 && arr[idx - 1] && arr[idx - 1].escort) return true;
  if (idx < arr.length - 1 && arr[idx + 1] && arr[idx + 1].escort) return true;
  return false;
}

// 检查友军是否有指定卡牌的光环
function hasFriendlyAura(state, side, cardId) {
  return [...state[side].support, ...state[side].frontline].some(u => u && u.id === cardId && !u.isHQ);
}

// V5.4 狂暴触发：友军死亡时，友方狂暴单位+攻
function triggerFrenzy(state, side, deadUnitId) {
  [...state[side].support, ...state[side].frontline].forEach(u => {
    if (u && u.frenzy && u.instanceId !== deadUnitId) {
      u.atk += u.frenzy;
      state.log.push({ time: Date.now(), msg: `🔥 ${u.name} 狂暴：友军阵亡 +${u.frenzy}攻` });
    }
  });
}

// 检查相邻是否有指定卡牌
function hasAdjacentUnit(state, side, line, idx, cardId) {
  const arr = line === 'support' ? state[side].support : state[side].frontline;
  if (idx > 0 && arr[idx - 1] && arr[idx - 1].id === cardId) return true;
  if (idx < arr.length - 1 && arr[idx + 1] && arr[idx + 1].id === cardId) return true;
  return false;
}

// ==================== Action 验证 ====================

function validateAction(state, side, action) {
  if (state.phase !== 'main') return { ok: false, err: '游戏已结束' };
  if (state.turn !== side) return { ok: false, err: '不是你的回合' };
  if (!action || !action.kind) return { ok: false, err: 'action 格式错误' };

  switch (action.kind) {
    case 'play_card':   return validatePlayCard(state, side, action);
    case 'attack':      return validateAttack(state, side, action);
    case 'advance':     return validateAdvance(state, side, action);
    case 'op_card':     return validateOpCard(state, side, action);
    case 'end_turn':    return { ok: true };
    case 'surrender':   return { ok: true };
    default:            return { ok: false, err: `未知 action: ${action.kind}` };
  }
}

function validatePlayCard(state, side, { cardIdx, line, slot }) {
  const my = state[side];
  if (typeof cardIdx !== 'number' || cardIdx < 0 || cardIdx >= my.hand.length)
    return { ok: false, err: `手牌索引越界` };
  const cardId = my.hand[cardIdx];
  const card = CARDS[cardId];
  if (!card) return { ok: false, err: `未知卡牌` };
  if (card.type === 'op') return { ok: false, err: '指令牌请用 op_card' };

  // V5.5 规则：只能部署到支援阵线，不能直接部署前线
  if (line !== 'support')
    return { ok: false, err: '单位只能部署到支援阵线，需先部署再推进到前线' };
  if (typeof slot !== 'number' || slot < 0 || slot >= FRONTLINE_SIZE)
    return { ok: false, err: '槽位越界' };
  if (slot === HQ_SLOT) return { ok: false, err: '不能部署到 HQ 位置' };
  if (my.support[slot]) return { ok: false, err: '支援线该位置已有单位' };

  if (state.k[side].cur < card.cost.deploy)
    return { ok: false, err: `K 不足（需 ${card.cost.deploy}，剩 ${state.k[side].cur}）` };

  return { ok: true };
}

function validateAttack(state, side, { fromLine, fromIdx, toLine, toIdx }) {
  const my = state[side];
  const enemy = opp(side);

  // V5.3 EMP 检查
  if (state.empLocked && state.empLocked[side])
    return { ok: false, err: '电磁脉冲：本回合所有单位不能攻击' };

  if (!fromLine || (fromLine !== 'support' && fromLine !== 'front'))
    return { ok: false, err: 'fromLine 参数错误' };
  if (typeof fromIdx !== 'number' || fromIdx < 0 || fromIdx >= FRONTLINE_SIZE)
    return { ok: false, err: 'fromIdx 越界' };

  const attacker = fromLine === 'support' ? my.support[fromIdx] : my.frontline[fromIdx];
  if (!attacker || attacker.isHQ) return { ok: false, err: '无效攻击者' };

  // V5.3 过载检查：允许第二次攻击
  if (attacker.overload && attacker._attacksThisTurn >= 2)
    return { ok: false, err: `${attacker.name} 过载次数已用完` };
  if (attacker.doubleAttack && attacker._attacksThisTurn >= 2)
    return { ok: false, err: `${attacker.name} 双攻次数已用完` };
  if (!attacker.overload && !attacker.doubleAttack && attacker.exhausted)
    return { ok: false, err: `${attacker.name} 本回合已行动` };

  if (attacker.atk === 0) return { ok: false, err: `${attacker.name} 不能攻击` };
  if (state.blockaded[side].includes(attacker.instanceId))
    return { ok: false, err: `${attacker.name} 被封锁` };

  // V5.3 爱国者防空：飞行器不能攻击
  if (state.airLocked && state.airLocked[side] && attacker.type === 'air')
    return { ok: false, err: '爱国者防空：飞行器本回合不能攻击' };

  if (!toLine || (toLine !== 'support' && toLine !== 'front'))
    return { ok: false, err: 'toLine 参数错误' };
  if (typeof toIdx !== 'number' || toIdx < 0 || toIdx >= FRONTLINE_SIZE)
    return { ok: false, err: 'toIdx 越界' };

  const target = toLine === 'support' ? state[enemy].support[toIdx] : state[enemy].frontline[toIdx];
  if (!target) return { ok: false, err: '无效目标' };

  // V5.3 烟幕检查：对方有烟幕时不能选为目标
  if (state.smokeScreen && state.smokeScreen[enemy] && !target.isHQ)
    return { ok: false, err: '烟幕掩护：敌方单位本回合不可被选为目标' };

  // V5.3 隐身检查：隐身单位未攻击前不可被选为目标
  if (target.stealth && !target._firstAtkDone && !target.isHQ)
    return { ok: false, err: `${target.name} 隐身中，不可被选为目标` };

  // V5.3 拦截网检查：不能攻击敌方HQ
  const isTargetHQ = target.isHQ;
  if (isTargetHQ && state.noHQAttack && state.noHQAttack[side])
    return { ok: false, err: '拦截网：本回合不能攻击敌方HQ' };

  return { ok: true };
}

function validateAdvance(state, side, { fromIdx, toIdx }) {
  const my = state[side];
  const enemy = opp(side);

  if (typeof fromIdx !== 'number' || fromIdx < 0 || fromIdx >= SUPPORT_SIZE)
    return { ok: false, err: 'fromIdx 越界' };
  if (typeof toIdx !== 'number' || toIdx < 0 || toIdx >= FRONTLINE_SIZE)
    return { ok: false, err: 'toIdx 越界' };

  const unit = my.support[fromIdx];
  if (!unit || unit.isHQ) return { ok: false, err: '无效单位' };
  // V5.5：所有单位类型都可以推进到前线（水面/潜艇/飞机）
  if (unit.exhausted) return { ok: false, err: '该单位本回合已行动' };
  if (unit._frozen) return { ok: false, err: `${unit.name} 被冰封，本回合不能推进` };

  if (my.frontline[toIdx]) return { ok: false, err: '前线该位置已有单位' };
  if (state[enemy].frontline.filter(Boolean).length > 0)
    return { ok: false, err: '敌方前线有单位，不能推进' };
  if (state.k[side].cur < (unit.cost?.deploy || 0))
    return { ok: false, err: 'K 不足' };

  return { ok: true };
}

function validateOpCard(state, side, { cardIdx }) {
  const my = state[side];
  if (typeof cardIdx !== 'number' || cardIdx < 0 || cardIdx >= my.hand.length)
    return { ok: false, err: '手牌索引越界' };
  const cardId = my.hand[cardIdx];
  const card = CARDS[cardId];
  if (!card) return { ok: false, err: '未知卡牌' };
  if (card.type !== 'op') return { ok: false, err: '非指令牌' };
  if (state.k[side].cur < card.cost.deploy)
    return { ok: false, err: `K 不足（需 ${card.cost.deploy}）` };
  return { ok: true };
}

// ==================== Action 执行 ====================

function executeAction(state, side, action) {
  switch (action.kind) {
    case 'play_card':  doPlayCard(state, side, action); break;
    case 'attack':     doAttack(state, side, action); break;
    case 'advance':    doAdvance(state, side, action); break;
    case 'op_card':    doOpCard(state, side, action); break;
    case 'end_turn':   endTurn(state, side); break;
    case 'surrender':  doSurrender(state, side); break;
  }
  checkVictory(state);
}

function doPlayCard(state, side, { cardIdx, line, slot }) {
  const my = state[side];
  const cardId = my.hand[cardIdx];
  const card = CARDS[cardId];

  my.hand.splice(cardIdx, 1);
  const unit = makeInstance(card, side);
  // V5.5：只能部署到支援阵线
  my.support[slot] = unit;
  state.k[side].cur -= card.cost.deploy;
  state.log.push({ time: Date.now(), msg: `${side} 部署 ${card.icon}${card.name} 到支援线[${slot}]` });

  // V5.5：单位只能部署到支援线，水雷在推进到前线时触发（见 doAdvance）

  // V5.3 部署效应
  if (unit.deployEffect) {
    handleDeployEffect(state, side, unit);
  }

  // V5.4 狂暴：友军部署时触发
  if (unit.frenzy) {
    // 狂暴单位部署时不立即触发，而是在友军死亡时触发
  }
}

// V5.3 部署效应处理器
function handleDeployEffect(state, side, unit) {
  const enemy = opp(side);
  const e = unit.deployEffect;

  switch (e) {
    case 'dmg_hq_2': {
      // 卡尔瓦里级潜艇：部署时对敌方HQ造成2伤害
      let dmg = 2;
      if (state.hqDmgReduction) dmg = Math.ceil(dmg * state.hqDmgReduction[enemy]);
      state[enemy].hq.hp = Math.max(0, state[enemy].hq.hp - dmg);
      if (state[enemy].support[HQ_SLOT] && state[enemy].support[HQ_SLOT].isHQ)
        state[enemy].support[HQ_SLOT].currentHp = state[enemy].hq.hp;
      state.log.push({ time: Date.now(), msg: `💥 ${unit.name} 伏击：敌方HQ -${dmg} HP` });
      break;
    }
    case 'dmg_subs_1': {
      // 岛级护卫舰：对所有潜艇造成1伤害
      let count = 0;
      state[enemy].support.forEach(u => { if (u && u.type === 'subsurf') { u.currentHp -= 1; count++; } });
      state[enemy].frontline.forEach(u => { if (u && u.type === 'subsurf') { u.currentHp -= 1; count++; } });
      // 清理死亡
      const dead = [];
      state[enemy].support.forEach(u => { if (u && !u.isHQ && u.currentHp <= 0) dead.push(u.instanceId); });
      state[enemy].frontline.forEach(u => { if (u && u.currentHp <= 0) dead.push(u.instanceId); });
      dead.forEach(id => removeUnit(state, enemy, id));
      state.log.push({ time: Date.now(), msg: ` depth charge ${unit.name} 声呐脉冲：${count} 艘潜艇 -1 HP` });
      break;
    }
    case 'dmg_front_2': {
      // 武库舰：对敌方所有前线单位造成2伤害
      let count = 0;
      state[enemy].frontline.forEach(u => { if (u) { u.currentHp -= 2; count++; } });
      const dead = [];
      state[enemy].frontline.forEach(u => { if (u && u.currentHp <= 0) dead.push(u.instanceId); });
      dead.forEach(id => removeUnit(state, enemy, id));
      state.log.push({ time: Date.now(), msg: `ship ${unit.name} 部署齐射：敌方前线 ${count} 单位 -2 HP` });
      break;
    }
    case 'kill_air_2': {
      // F-22 猛禽：摧毁所有HP≤2的敌方空中单位
      let count = 0;
      const dead = [];
      state[enemy].support.forEach(u => { if (u && u.type === 'air' && u.currentHp <= 2) { dead.push(u.instanceId); count++; } });
      state[enemy].frontline.forEach(u => { if (u && u.type === 'air' && u.currentHp <= 2) { dead.push(u.instanceId); count++; } });
      dead.forEach(id => removeUnit(state, enemy, id));
      state.log.push({ time: Date.now(), msg: `🦅 ${unit.name} 绝对制空：摧毁 ${count} 架敌方飞行器` });
      break;
    }
    case 'fatigue_air': {
      // 什瓦利克级护卫舰：敌方所有飞机本回合疲劳
      let count = 0;
      state[enemy].support.forEach(u => { if (u && u.type === 'air') { u.exhausted = true; count++; } });
      state[enemy].frontline.forEach(u => { if (u && u.type === 'air') { u.exhausted = true; count++; } });
      state.log.push({ time: Date.now(), msg: `📡 ${unit.name} 电子战：${count} 架敌方飞机疲劳` });
      break;
    }
    case 'dmg_random_2': {
      // KAAN战机：对随机敌方单位造成2伤害
      const targets = [];
      state[enemy].support.forEach((u, i) => { if (u && !u.isHQ) targets.push({ line: 'support', idx: i, unit: u }); });
      state[enemy].frontline.forEach((u, i) => { if (u) targets.push({ line: 'front', idx: i, unit: u }); });
      if (targets.length > 0) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.unit.currentHp -= 2;
        state.log.push({ time: Date.now(), msg: `✈️ ${unit.name} 突袭：${t.unit.name} -2 HP` });
        if (t.unit.currentHp <= 0) {
          removeUnit(state, enemy, t.unit.instanceId);
          state.log.push({ time: Date.now(), msg: `💀 ${t.unit.name} 被摧毁` });
        }
      }
      break;
    }
  }
}

function doAttack(state, side, { fromLine, fromIdx, toLine, toIdx }) {
  const my = state[side];
  const enemy = opp(side);
  const attacker = fromLine === 'support' ? my.support[fromIdx] : my.frontline[fromIdx];
  const target = toLine === 'support' ? state[enemy].support[toIdx] : state[enemy].frontline[toIdx];
  if (!attacker || !target) return;

  let atkVal = attacker.atk;

  // 电子干扰：飞机 ATK 减半
  if (attacker.type === 'air' && state.ewarfare[side]) {
    atkVal = Math.ceil(atkVal / 2);
    state.log.push({ time: Date.now(), msg: `📡 ${attacker.name} 受电子干扰，ATK 减半` });
  }

  // 利维坦 自由女神令
  if (state.extraAtk && state.extraAtk[side]) atkVal += 2;

  // 武士道令（单卡双倍）
  if (attacker._bushidoThisTurn) {
    atkVal *= 2;
    state.log.push({ time: Date.now(), msg: `⚔️ ${attacker.name} 武士道令：攻击翻倍！` });
  }

  // 神风令（单卡+4攻）
  if (attacker._godwindThisTurn) {
    atkVal += 4;
    state.log.push({ time: Date.now(), msg: `🌀 ${attacker.name} 神风令：+4攻！` });
  }

  // V5.3 蜂群：每架友军同类型飞行器+1攻
  if (attacker.swarm) {
    const friendly = countFriendlyByType(state, side, attacker.swarm) - 1; // 减去自己
    if (friendly > 0) {
      atkVal += friendly;
      state.log.push({ time: Date.now(), msg: `🐝 ${attacker.name} 蜂群加成 +${friendly}攻` });
    }
  }

  // V5.3 狼群：潜艇+2攻
  if (attacker.type === 'subsurf' && state.wolfPackBuff && state.wolfPackBuff[side]) {
    atkVal += 2;
  }

  // 歼-15B / F-35C 首攻+1
  if ((attacker.id === 'c_j15b' || attacker.id === 'l_f35c') && !attacker._firstAtkDone) {
    atkVal += 1;
  }

  // V5.3 斩首：攻击HQ时额外伤害
  const isTargetHQ = target.isHQ;
  if (isTargetHQ && attacker.hqAtkBonus) {
    atkVal += attacker.hqAtkBonus;
    state.log.push({ time: Date.now(), msg: `🎯 ${attacker.name} 斩首加成 +${attacker.hqAtkBonus}` });
  }

  // 苏-33 / F-16 格斗：与空中单位战斗时+2攻
  if ((attacker.id === 'r_su33' || attacker.id === 't_raptor2') && target.type === 'air') {
    atkVal += 2;
  }

  // 爱宕级反舰：攻击水面单位+1攻
  if (attacker.id === 'j_atago' && target.type === 'surface') {
    atkVal += 1;
  }

  // 光环效果：福建舰/福特级 → 友军+1攻
  if (hasFriendlyAura(state, side, 'c_fujian') || hasFriendlyAura(state, side, 'l_ford')) {
    atkVal += 1;
  }
  // 库兹涅佐夫号 → 友军飞机+1攻
  if (attacker.type === 'air' && hasFriendlyAura(state, side, 'r_kuznet')) {
    atkVal += 1;
  }

  // V5.4 吸血：攻击时治疗己方HQ
  if (attacker.lifesteal && atkVal > 0) {
    const heal = Math.min(attacker.lifesteal, atkVal);
    state[side].hq.hp = Math.min(state[side].hq.maxHp, state[side].hq.hp + heal);
    if (state[side].support[HQ_SLOT] && state[side].support[HQ_SLOT].isHQ)
      state[side].support[HQ_SLOT].currentHp = state[side].hq.hp;
    state.log.push({ time: Date.now(), msg: `🩸 ${attacker.name} 吸血：HQ +${heal} HP` });
  }

  // 计算目标受到的伤害
  let dmgToTarget = atkVal;

  // V5.3 首击免疫
  if (target.firstHitImmune && !target._firstHitResolved) {
    dmgToTarget = 0;
    target._firstHitResolved = true;
    state.log.push({ time: Date.now(), msg: `👻 ${target.name} 隐身设计，首次被攻击免疫` });
  }

  // 朱姆沃尔特隐身：首次被攻击伤害-2
  if (target.id === 'l_zumwalt' && !target._firstHitResolved && dmgToTarget > 0) {
    dmgToTarget = Math.max(0, dmgToTarget - 2);
    target._firstHitResolved = true;
    state.log.push({ time: Date.now(), msg: `👻 朱姆沃尔特隐身装甲，首伤-2` });
  }

  // 基洛夫铁甲
  if (target.id === 'r_kirov' && dmgToTarget > 0) {
    dmgToTarget = Math.max(1, dmgToTarget - 1);
    state.log.push({ time: Date.now(), msg: `🛡️ 基洛夫铁甲防御，伤害-1` });
  }

  // 主动防御
  if (target._armorThisTurn) {
    dmgToTarget = 0;
    state.log.push({ time: Date.now(), msg: `🛡️ ${target.name} 主动防御，免疫伤害` });
  }

  // V5.3 护航：相邻有护航单位时伤害-1
  if (dmgToTarget > 0 && hasAdjacentEscort(state, enemy, toLine, toIdx)) {
    dmgToTarget = Math.max(0, dmgToTarget - 1);
    state.log.push({ time: Date.now(), msg: `🚁 护航单位减伤 -1` });
  }

  // 055 相邻防空减伤
  if (dmgToTarget > 0 && hasAdjacentUnit(state, enemy, toLine, toIdx, 'c_055')) {
    dmgToTarget = Math.max(0, dmgToTarget - 1);
    state.log.push({ time: Date.now(), msg: `🛡️ 055防空减伤 -1` });
  }

  // V5.4 护盾：吸收固定伤害
  if (dmgToTarget > 0 && target._shield) {
    const absorbed = Math.min(target._shield, dmgToTarget);
    target._shield -= absorbed;
    dmgToTarget -= absorbed;
    state.log.push({ time: Date.now(), msg: `🛡️ ${target.name} 护盾吸收 ${absorbed}` });
  }

  // V5.3 电子堡垒：HQ受伤减半
  if (isTargetHQ && state.hqDmgReduction && state.hqDmgReduction[enemy] < 1) {
    dmgToTarget = Math.ceil(dmgToTarget * state.hqDmgReduction[enemy]);
    state.log.push({ time: Date.now(), msg: `🏰 电子堡垒：HQ伤害减半` });
  }

  target.currentHp -= dmgToTarget;
  if (isTargetHQ) state[enemy].hq.hp = Math.max(0, target.currentHp);
  state.log.push({ time: Date.now(), msg: `⚔ ${attacker.icon}${attacker.name} → ${target.icon}${target.name} (-${dmgToTarget})` });

  // V5.5 无反击判断
  const noCounter = (state.noCounter && state.noCounter[side]) ||
                    (attacker.id === 'j_soryu' && !attacker._firstAtkDone) ||
                    attacker.pierce ||                        // 穿透单位不受到反击
                    (attacker.firstHitImmune && !attacker._firstAtkDone) ||  // 首免标签免反
                    (attacker.stealth && !attacker._firstAtkDone);           // 隐身首击免反

  // V5.5 反击
  if (!noCounter && target.atk > 0 && target.currentHp > 0) {
    let retVal = target.atk;
    if (target.type === 'air' && state.ewarfare[enemy]) retVal = Math.ceil(retVal / 2);

    // V5.5 支援线攻击者受反击-1
    if (fromLine === 'support') {
      retVal = Math.max(0, retVal - 1);
      if (retVal < target.atk) state.log.push({ time: Date.now(), msg: `🛡️ 支援线远程攻击，反击-1` });
    }

    // V5.3 反击强化
    if (target.counterBonus) {
      retVal += target.counterBonus;
      state.log.push({ time: Date.now(), msg: `🐋 ${target.name} 深海堡垒反击 +${target.counterBonus}` });
    }

    attacker.currentHp -= retVal;
    if (attacker.isHQ) state[side].hq.hp = Math.max(0, attacker.currentHp);
    state.log.push({ time: Date.now(), msg: `🔄 ${target.name} 反击 (-${retVal})` });

    // 光荣级被动反伤
    if (target.id === 'r_slava' && target.currentHp > 0) {
      attacker.currentHp -= 1;
      if (attacker.isHQ) state[side].hq.hp = Math.max(0, attacker.currentHp);
      state.log.push({ time: Date.now(), msg: `⚡ 光荣级反伤 1 给攻击者` });
    }
  } else if (noCounter && !attacker.pierce) {
    state.log.push({ time: Date.now(), msg: `🔇 ${attacker.name} 无法被反击` });
  }

  // V5.3 穿透：额外对HQ造成伤害
  if (attacker.pierce && !isTargetHQ) {
    let pierceDmg = atkVal;
    if (state.hqDmgReduction && state.hqDmgReduction[enemy] < 1) {
      pierceDmg = Math.ceil(pierceDmg * state.hqDmgReduction[enemy]);
    }
    state[enemy].hq.hp = Math.max(0, state[enemy].hq.hp - pierceDmg);
    if (state[enemy].support[HQ_SLOT] && state[enemy].support[HQ_SLOT].isHQ)
      state[enemy].support[HQ_SLOT].currentHp = state[enemy].hq.hp;
    state.log.push({ time: Date.now(), msg: `⚡ ${attacker.name} 穿透：敌方HQ -${pierceDmg} HP` });
  }

  // 无畏级反潜加成
  if (target.type === 'subsurf' && target.currentHp <= 0 && attacker.id === 'r_udaloy' && attacker.currentHp > 0) {
    attacker.atk += 2;
    state.log.push({ time: Date.now(), msg: `🔱 无畏级反潜奖励：+2攻（本回合）` });
  }

  // 亚森级雷击封锁
  if (attacker.id === 'r_yasen' && target.currentHp > 0 && !target.isHQ) {
    state.blockaded[enemy].push(target.instanceId);
    state.log.push({ time: Date.now(), msg: `🚧 亚森级雷击封锁：${target.name} 下回合不能攻击` });
  }

  // 标记首次攻击
  attacker._firstAtkDone = true;

  // V5.3 过载处理
  if (attacker.overload) {
    attacker._attacksThisTurn = (attacker._attacksThisTurn || 0) + 1;
    // 过载自伤1
    attacker.currentHp -= 1;
    state.log.push({ time: Date.now(), msg: `⚡ ${attacker.name} 过载自伤 -1 HP` });
    if (attacker.currentHp > 0 && attacker._attacksThisTurn < 2) {
      // 还能再攻击一次，不设exhausted
      state.log.push({ time: Date.now(), msg: `⚡ ${attacker.name} 可再次攻击` });
    }
  }

  // V5.4 双攻处理（类似过载但无自伤）
  if (attacker.doubleAttack) {
    attacker._attacksThisTurn = (attacker._attacksThisTurn || 0) + 1;
    if (attacker.currentHp > 0 && attacker._attacksThisTurn < 2) {
      state.log.push({ time: Date.now(), msg: `⚡ ${attacker.name} 可再次攻击` });
    }
  }

  // V5.4 导弹自毁
  if (attacker.missile && attacker.currentHp > 0) {
    attacker.currentHp = 0;
    state.log.push({ time: Date.now(), msg: `🚀 ${attacker.name} 弹药耗尽，自毁` });
  }

  // V5.4 齐射：对同线其他敌人造成1点溅射
  if (attacker.volley && attacker.currentHp > 0 && !isTargetHQ) {
    const targetLineArr = toLine === 'support' ? state[enemy].support : state[enemy].frontline;
    let splashCount = 0;
    targetLineArr.forEach(u => {
      if (u && u.instanceId !== target.instanceId && !u.isHQ) {
        u.currentHp -= 1;
        splashCount++;
      }
    });
    if (splashCount > 0) {
      state.log.push({ time: Date.now(), msg: `🌊 ${attacker.name} 齐射溅射：${splashCount} 个目标 -1` });
      // 清理齐射击杀
      const splashDead = [];
      state[enemy].support.forEach(u => { if (u && !u.isHQ && u.currentHp <= 0 && u.instanceId !== target.instanceId) splashDead.push(u.instanceId); });
      state[enemy].frontline.forEach(u => { if (u && u.currentHp <= 0 && u.instanceId !== target.instanceId) splashDead.push(u.instanceId); });
      splashDead.forEach(id => {
        triggerFrenzy(state, enemy, id);
        removeUnit(state, enemy, id);
        state.log.push({ time: Date.now(), msg: `💀 齐射击沉` });
      });
    }
  }

  // 清理死亡单位
  if (target.currentHp <= 0) {
    // UUV 蜂群死亡溅射
    if (target.id === 'c_uuv') {
      const targetLine = toLine === 'support' ? state[enemy].support : state[enemy].frontline;
      targetLine.forEach(u => {
        if (u && u !== target && !u.isHQ) {
          u.currentHp -= 1;
          state.log.push({ time: Date.now(), msg: `🐙 UUV 死亡溅射：${u.name} -1` });
        }
      });
      const deadIds = [];
      state[enemy].support.forEach(u => { if (u && !u.isHQ && u.currentHp <= 0) deadIds.push(u.instanceId); });
      state[enemy].frontline.forEach(u => { if (u && u.currentHp <= 0) deadIds.push(u.instanceId); });
      deadIds.forEach(id => removeUnit(state, enemy, id));
    }
    triggerFrenzy(state, enemy, target.instanceId);
    removeUnit(state, enemy, target.instanceId);
    state.log.push({ time: Date.now(), msg: `💀 ${target.icon}${target.name} 被摧毁` });
  }
  if (attacker.currentHp <= 0) {
    triggerFrenzy(state, side, attacker.instanceId);
    removeUnit(state, side, attacker.instanceId);
    state.log.push({ time: Date.now(), msg: `💀 ${attacker.icon}${attacker.name} 被摧毁` });
  }
  // 非过载/双攻单位设exhausted
  if (attacker.currentHp > 0 && !attacker.overload && !attacker.doubleAttack) attacker.exhausted = true;
  if (attacker.currentHp > 0 && (attacker.overload || attacker.doubleAttack) && attacker._attacksThisTurn >= 2) attacker.exhausted = true;
}

function removeUnit(state, who, instanceId) {
  state[who].frontline = state[who].frontline.map(u => (u && u.instanceId === instanceId) ? null : u);
  state[who].support = state[who].support.map(u => (u && u.instanceId === instanceId) ? null : u);
}

function doAdvance(state, side, { fromIdx, toIdx }) {
  const my = state[side];
  const unit = my.support[fromIdx];
  my.support[fromIdx] = null;
  my.frontline[toIdx] = unit;
  state.k[side].cur -= (unit.cost?.deploy || 0);
  unit.exhausted = true;
  state.log.push({ time: Date.now(), msg: `⚓ ${unit.name} 推进到前线[${toIdx}]` });

  // V5.5 水雷检查：推进到前线时触发敌方水雷
  const enemyMines = state.mines[opp(side)];
  if (enemyMines && enemyMines[toIdx]) {
    const mineDmg = enemyMines[toIdx];
    delete enemyMines[toIdx];
    unit.currentHp -= mineDmg;
    state.log.push({ time: Date.now(), msg: `💥 ${unit.name} 触雷！-${mineDmg} HP` });
    if (unit.currentHp <= 0) {
      triggerFrenzy(state, side, unit.instanceId);
      removeUnit(state, side, unit.instanceId);
      state.log.push({ time: Date.now(), msg: `💀 ${unit.name} 被水雷摧毁` });
    }
  }
}

function doOpCard(state, side, { cardIdx, targetLine, targetIdx }) {
  const my = state[side];
  const enemy = opp(side);
  const cardId = my.hand[cardIdx];
  const card = CARDS[cardId];

  state.k[side].cur -= card.cost.deploy;
  my.hand.splice(cardIdx, 1);

  // 记录最后打出的指令牌（复制用）
  state.lastOpCard[side] = cardId;

  switch (cardId) {
    // ====== 通用：抽牌 ======
    case 'c_intel':
    case 'l_intel':
    case 'r_intel':
    case 'j_intel':
    case 'e_intel':
    case 't_intel': {
      drawTo(state, side); drawTo(state, side);
      state.log.push({ time: Date.now(), msg: `🔍 ${side} ${card.name}：抽 2 张牌` });
      break;
    }

    // ====== 苍龙 ======
    case 'c_shield': {
      my.hq.hp += 5;
      my.hq.shield = (my.hq.shield || 0) + 5;
      if (my.support[HQ_SLOT] && my.support[HQ_SLOT].isHQ) my.support[HQ_SLOT].currentHp = my.hq.hp;
      state.log.push({ time: Date.now(), msg: `🛡️ ${side} 神盾拦截：HQ +5 HP（现 ${my.hq.hp}）` });
      break;
    }
    case 'c_ewarfare': {
      state.ewarfare[enemy] = true;
      state.log.push({ time: Date.now(), msg: `📡 ${side} 电子干扰：${enemy} 飞机本回合 ATK 减半` });
      break;
    }
    case 'c_mobilize': {
      const add = Math.min(3, state.k[side].max - state.k[side].cur);
      state.k[side].cur += add;
      state.log.push({ time: Date.now(), msg: `📈 ${side} 战时动员：K +${add}（现 ${state.k[side].cur}/${state.k[side].max}）` });
      break;
    }
    case 'c_repair':
    case 'l_repair':
    case 'l_aegis':
    case 'j_repairs': {
      let count = 0;
      const targets = [...my.support.filter(u => u && !u.isHQ), ...my.frontline.filter(Boolean)];
      targets.forEach(u => { if (u && u.type === 'surface') { u.currentHp = Math.min(u.currentHp + 1, u.hp); count++; } });
      state.log.push({ time: Date.now(), msg: `🔧 ${side} ${card.name}：${count} 个水面单位 +1 HP` });
      break;
    }
    case 'r_repair': {
      let count = 0;
      const targets = [...my.support.filter(u => u && !u.isHQ), ...my.frontline.filter(Boolean)];
      targets.forEach(u => { if (u && u.type === 'surface') { u.currentHp = Math.min(u.currentHp + 2, u.hp); count++; } });
      state.log.push({ time: Date.now(), msg: `🔧 ${side} 战损抢修：${count} 个水面单位 +2 HP` });
      break;
    }

    case 'c_bombard':
    case 'l_bombard': {
      let count = 0;
      state[enemy].support.forEach(u => { if (u && !u.isHQ) { u.currentHp -= 1; count++; } });
      state[enemy].frontline.forEach(u => { if (u) { u.currentHp -= 1; count++; } });
      const dead = [];
      state[enemy].support.forEach(u => { if (u && !u.isHQ && u.currentHp <= 0) dead.push(u.instanceId); });
      state[enemy].frontline.forEach(u => { if (u && u.currentHp <= 0) dead.push(u.instanceId); });
      dead.forEach(id => removeUnit(state, enemy, id));
      state.log.push({ time: Date.now(), msg: `💣 ${side} ${card.name}：${enemy} ${count} 个单位 -1 HP` });
      break;
    }

    case 'c_blockade':
    case 'r_blockade':
    case 'j_blockade': {
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? state[enemy].support[targetIdx] : state[enemy].frontline[targetIdx];
        if (target && !target.isHQ) {
          state.blockaded[enemy].push(target.instanceId);
          state.log.push({ time: Date.now(), msg: `🚧 ${side} ${card.name}：${target.name} 下回合不能攻击` });
        }
      }
      break;
    }

    // V5.3 苍龙新指令
    case 'c_hack': {
      // 网络战：随机弃掉对手1张手牌
      if (state[enemy].hand.length > 0) {
        const rIdx = Math.floor(Math.random() * state[enemy].hand.length);
        const discarded = state[enemy].hand.splice(rIdx, 1)[0];
        const dCard = CARDS[discarded];
        state.log.push({ time: Date.now(), msg: `💻 ${side} 网络战：弃掉 ${enemy} 的 ${dCard ? dCard.name : '一张牌'}` });
      } else {
        state.log.push({ time: Date.now(), msg: `💻 ${side} 网络战：${enemy} 无手牌` });
      }
      break;
    }
    case 'c_intercept': {
      // 拦截网：本回合敌方不能攻击己方HQ
      state.noHQAttack[side] = true;  // side的敌方不能攻击side的HQ -> noHQAttack作用于攻击方
      // 实际上：noHQAttack[attacker] = true 表示attacker不能攻击敌方HQ
      // 所以这里应该设置 noHQAttack[enemy] = true
      state.noHQAttack[side] = false;
      state.noHQAttack[enemy] = true;
      state.log.push({ time: Date.now(), msg: `🕸️ ${side} 拦截网：${enemy} 本回合不能攻击己方HQ` });
      break;
    }

    // ====== 利维坦 ======
    case 'l_csg': {
      const f35 = CARDS.l_f35c;
      let placed = 0;
      for (let i = 0; i < SUPPORT_SIZE && placed < 2; i++) {
        if (i !== HQ_SLOT && !my.support[i]) {
          my.support[i] = makeInstance(f35, side);
          my.support[i].exhausted = true;
          placed++;
        }
      }
      state.log.push({ time: Date.now(), msg: `✈️ ${side} 航母打击群：召唤 ${placed} 架 F-35C` });
      break;
    }
    case 'l_freedom': {
      state.extraAtk[side] = true;
      state.log.push({ time: Date.now(), msg: `🗽 ${side} 自由女神令：己方本回合所有单位 +2攻` });
      break;
    }
    case 'l_seals': {
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? state[enemy].support[targetIdx] : state[enemy].frontline[targetIdx];
        if (target && !target.isHQ && target.currentHp <= 2) {
          removeUnit(state, enemy, target.instanceId);
          state.log.push({ time: Date.now(), msg: `🦭 ${side} 海豹突击队：直接摧毁 ${target.name}（HP≤2）` });
        } else {
          state.log.push({ time: Date.now(), msg: `🦭 ${side} 海豹突击队：目标 HP > 2，无效` });
        }
      }
      break;
    }
    // V5.3 利维坦新指令
    case 'l_patriot': {
      // 爱国者防空：本回合敌方飞行器不能攻击
      state.airLocked[enemy] = true;
      state.log.push({ time: Date.now(), msg: `🇺🇸 ${side} 爱国者防空：${enemy} 飞行器本回合不能攻击` });
      break;
    }

    // ====== 北极熊 ======
    case 'r_bombard': {
      let count = 0;
      state[enemy].support.forEach(u => {
        if (u && !u.isHQ) { u.currentHp -= 1; if (u.type === 'surface') u.currentHp -= 1; count++; }
      });
      state[enemy].frontline.forEach(u => {
        if (u) { u.currentHp -= 1; if (u.type === 'surface') u.currentHp -= 1; count++; }
      });
      const dead = [];
      state[enemy].support.forEach(u => { if (u && !u.isHQ && u.currentHp <= 0) dead.push(u.instanceId); });
      state[enemy].frontline.forEach(u => { if (u && u.currentHp <= 0) dead.push(u.instanceId); });
      dead.forEach(id => removeUnit(state, enemy, id));
      state.log.push({ time: Date.now(), msg: `💣 ${side} 饱和打击：${enemy} ${count} 单位 -1HP，水面额外 -1HP` });
      break;
    }
    case 'r_armor': {
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (target && !target.isHQ) {
          target._armorThisTurn = true;
          state.log.push({ time: Date.now(), msg: `🛡️ ${side} 主动防御：${target.name} 本回合免疫伤害` });
        }
      }
      break;
    }
    case 'r_winter': {
      const cur = state.k[enemy].cur;
      const newMax = Math.max(cur, state.k[enemy].max - 2);
      const diff = state.k[enemy].max - newMax;
      state.k[enemy].max = newMax;
      state.log.push({ time: Date.now(), msg: `❄️ ${side} 寒冬令：${enemy} K 上限 -${diff}（现 ${state.k[enemy].cur}/${state.k[enemy].max}）` });
      break;
    }
    case 'r_nuclear': {
      let count = 0;
      state[enemy].support.forEach(u => { if (u && !u.isHQ) { u.currentHp -= 3; count++; } });
      state[enemy].frontline.forEach(u => { if (u) { u.currentHp -= 3; count++; } });
      const dead = [];
      state[enemy].support.forEach(u => { if (u && !u.isHQ && u.currentHp <= 0) dead.push(u.instanceId); });
      state[enemy].frontline.forEach(u => { if (u && u.currentHp <= 0) dead.push(u.instanceId); });
      dead.forEach(id => removeUnit(state, enemy, id));
      my.hq.hp += 3;
      if (my.support[HQ_SLOT] && my.support[HQ_SLOT].isHQ) my.support[HQ_SLOT].currentHp = my.hq.hp;
      state.log.push({ time: Date.now(), msg: `☢️ ${side} 核威慑：${enemy} ${count} 单位 -3HP，己方 HQ +3HP` });
      break;
    }

    // ====== 武士 ======
    case 'j_bushido': {
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (target && !target.isHQ) {
          target._bushidoThisTurn = true;
          state.log.push({ time: Date.now(), msg: `⚔️ ${side} 武士道令：${target.name} 本回合攻击翻倍` });
        }
      }
      break;
    }
    case 'j_bombard': {
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? state[enemy].support[targetIdx] : state[enemy].frontline[targetIdx];
        if (target) {
          const dmg = Math.min(3, target.currentHp - (target.isHQ ? 1 : 0));
          target.currentHp -= dmg;
          if (target.isHQ) state[enemy].hq.hp = Math.max(0, target.currentHp);
          if (!target.isHQ && target.currentHp <= 0) removeUnit(state, enemy, target.instanceId);
          state.log.push({ time: Date.now(), msg: `🎯 ${side} 精确打击：${target.name} -${dmg} HP` });
        }
      }
      break;
    }
    case 'j_swift': {
      [...my.support, ...my.frontline].forEach(u => {
        if (u && !u.isHQ && u.type === 'air') u.exhausted = false;
      });
      state.log.push({ time: Date.now(), msg: `⚡ ${side} 快速突袭：己方所有飞机解除疲劳` });
      break;
    }
    case 'j_sonar': {
      state.noCounter[side] = true;
      state.log.push({ time: Date.now(), msg: `📡 ${side} 全域声纳：本回合所有攻击无法被反击` });
      break;
    }
    // V5.3 武士新指令
    case 'j_godwind': {
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (target && !target.isHQ) {
          target._godwindThisTurn = true;
          state.godwindUnits[side].push(target.instanceId);
          state.log.push({ time: Date.now(), msg: `🌀 ${side} 神风令：${target.name} +4攻，回合末自毁` });
        }
      }
      break;
    }

    // ====== V5.3 雄鹰（印度）======
    case 'e_nonaligned': {
      // 复制对手最后打出的指令牌
      const lastEnemy = state.lastOpCard[enemy];
      if (lastEnemy && CARDS[lastEnemy] && CARDS[lastEnemy].type === 'op') {
        state.log.push({ time: Date.now(), msg: `🕊️ ${side} 不结盟：复制 ${enemy} 的 ${CARDS[lastEnemy].name}` });
        // 递归执行被复制的牌效果（不再扣费）
        const fakeCardIdx = -1; // 标记
        const copiedCard = CARDS[lastEnemy];
        // 直接执行switch中对应的case
        executeOpEffect(state, side, lastEnemy, targetLine, targetIdx);
      } else {
        state.log.push({ time: Date.now(), msg: `🕊️ ${side} 不结盟：对手没有可复制的指令牌` });
      }
      break;
    }
    case 'e_swarm': {
      // 蜂群战术：≤3费友军+1攻+1HP
      let count = 0;
      [...my.support, ...my.frontline].forEach(u => {
        if (u && !u.isHQ && u.cost && u.cost.deploy <= 3) {
          u.atk += 1;
          u.currentHp = Math.min(u.currentHp + 1, u.hp + 1);
          u.hp += 1;
          count++;
        }
      });
      state.log.push({ time: Date.now(), msg: `🐝 ${side} 蜂群战术：${count} 个低费单位 +1/+1` });
      break;
    }
    case 'e_embargo': {
      // 海上禁运：敌方下回合不能部署前线
      state.frontLocked[enemy] = true;
      state.log.push({ time: Date.now(), msg: `🚫 ${side} 海上禁运：${enemy} 下回合不能部署前线` });
      break;
    }
    case 'e_supply': {
      // 后勤补给：抽牌=空支援槽位数
      const emptySlots = my.support.filter((u, i) => i !== HQ_SLOT && !u).length;
      for (let i = 0; i < emptySlots; i++) drawTo(state, side);
      state.log.push({ time: Date.now(), msg: `📦 ${side} 后勤补给：抽 ${emptySlots} 张牌` });
      break;
    }
    case 'e_retrofit': {
      // 武器升级：永久+1/+1
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (target && !target.isHQ) {
          target.atk += 1;
          target.hp += 1;
          target.currentHp += 1;
          state.log.push({ time: Date.now(), msg: `⬆️ ${side} 武器升级：${target.name} +1/+1` });
        }
      }
      break;
    }
    case 'e_emp': {
      // 电磁脉冲：敌方所有单位下回合不能攻击
      state.empLocked[enemy] = true;
      state.log.push({ time: Date.now(), msg: `💥 ${side} 电磁脉冲：${enemy} 下回合所有单位不能攻击` });
      break;
    }
    case 'e_retreat': {
      // 战术撤退：选一友军返回手牌，退还费用
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (target && !target.isHQ) {
          const refund = target.cost ? target.cost.deploy : 0;
          if (my.hand.length < MAX_HAND) {
            my.hand.push(target.id);
          }
          removeUnit(state, side, target.instanceId);
          state.k[side].cur += refund;
          state.log.push({ time: Date.now(), msg: `↩️ ${side} 战术撤退：${target.name} 返回手牌，退还 ${refund} K` });
        }
      }
      break;
    }

    // ====== V5.3 灰狼（土耳其）======
    case 't_dronestorm': {
      // 无人机风暴：召唤3架TB2
      const tb2 = CARDS.t_tb2;
      let placed = 0;
      for (let i = 0; i < SUPPORT_SIZE && placed < 3; i++) {
        if (i !== HQ_SLOT && !my.support[i]) {
          my.support[i] = makeInstance(tb2, side);
          my.support[i].exhausted = true;
          placed++;
        }
      }
      state.log.push({ time: Date.now(), msg: `🌪️ ${side} 无人机风暴：召唤 ${placed} 架 TB2` });
      break;
    }
    case 't_fortress': {
      // 电子堡垒：HQ受伤减半
      state.hqDmgReduction[side] = 0.5;
      state.log.push({ time: Date.now(), msg: `🏰 ${side} 电子堡垒：HQ本回合受伤减半` });
      break;
    }
    case 't_wolfpack': {
      // 狼群战术：潜艇+2攻
      state.wolfPackBuff[side] = true;
      state.log.push({ time: Date.now(), msg: `🐺 ${side} 狼群战术：己方潜艇本回合 +2攻` });
      break;
    }
    case 't_minefield': {
      // 布雷：在己方前线槽位布雷
      if (typeof targetIdx === 'number') {
        state.mines[side][targetIdx] = 3;  // 3点伤害
        state.log.push({ time: Date.now(), msg: `💣 ${side} 布雷：前线[${targetIdx}] 放置水雷（3伤害）` });
      }
      break;
    }
    case 't_smoke': {
      // 烟幕弹：己方单位不可被选为目标
      state.smokeScreen[side] = true;
      state.log.push({ time: Date.now(), msg: `💨 ${side} 烟幕弹：己方单位本回合不可被攻击` });
      break;
    }
    case 't_sabotage': {
      // 破坏行动：随机弃对手1张手牌
      if (state[enemy].hand.length > 0) {
        const rIdx = Math.floor(Math.random() * state[enemy].hand.length);
        const discarded = state[enemy].hand.splice(rIdx, 1)[0];
        const dCard = CARDS[discarded];
        state.log.push({ time: Date.now(), msg: `🔪 ${side} 破坏行动：弃掉 ${enemy} 的 ${dCard ? dCard.name : '一张牌'}` });
      } else {
        state.log.push({ time: Date.now(), msg: `🔪 ${side} 破坏行动：${enemy} 无手牌` });
      }
      break;
    }

    // ====== V5.4 新指令卡 ======
    case 'c_satellite': {
      // 海洋监视卫星：抽1张牌+弃对手1张手牌
      drawTo(state, side);
      if (state[enemy].hand.length > 0) {
        const rIdx = Math.floor(Math.random() * state[enemy].hand.length);
        const discarded = state[enemy].hand.splice(rIdx, 1)[0];
        const dCard = CARDS[discarded];
        state.log.push({ time: Date.now(), msg: `🛰️ ${side} 卫星侦察：抽1张，弃掉 ${enemy} 的 ${dCard ? dCard.name : '一张牌'}` });
      } else {
        state.log.push({ time: Date.now(), msg: `🛰️ ${side} 卫星侦察：抽1张（${enemy} 无手牌可弃）` });
      }
      break;
    }
    case 'c_torpedo': {
      // 鱼雷突击：对敌方一潜艇造成3伤害
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? state[enemy].support[targetIdx] : state[enemy].frontline[targetIdx];
        if (target && target.type === 'subsurf') {
          target.currentHp -= 3;
          state.log.push({ time: Date.now(), msg: `pedo ${side} 鱼雷突击：${target.name} -3 HP` });
          if (target.currentHp <= 0) {
            triggerFrenzy(state, enemy, target.instanceId);
            removeUnit(state, enemy, target.instanceId);
            state.log.push({ time: Date.now(), msg: `💀 ${target.name} 被击沉` });
          }
        } else {
          state.log.push({ time: Date.now(), msg: `pedo 目标不是潜艇` });
        }
      }
      break;
    }
    case 'l_decompose': {
      // 战术分解：摧毁己方一单位，抽2张牌
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (target && !target.isHQ) {
          triggerFrenzy(state, side, target.instanceId);
          removeUnit(state, side, target.instanceId);
          drawTo(state, side); drawTo(state, side);
          state.log.push({ time: Date.now(), msg: `⚗️ ${side} 战术分解：牺牲 ${target.name}，抽2张牌` });
        }
      }
      break;
    }
    case 'j_kamikaze': {
      // 特攻令：选己方一单位自毁，对敌方HQ造成其攻击力伤害
      if (targetLine && typeof targetIdx === 'number') {
        const target = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (target && !target.isHQ) {
          const dmg = target.atk;
          triggerFrenzy(state, side, target.instanceId);
          removeUnit(state, side, target.instanceId);
          let actualDmg = dmg;
          if (state.hqDmgReduction && state.hqDmgReduction[enemy] < 1) {
            actualDmg = Math.ceil(actualDmg * state.hqDmgReduction[enemy]);
          }
          state[enemy].hq.hp = Math.max(0, state[enemy].hq.hp - actualDmg);
          if (state[enemy].support[HQ_SLOT] && state[enemy].support[HQ_SLOT].isHQ)
            state[enemy].support[HQ_SLOT].currentHp = state[enemy].hq.hp;
          state.log.push({ time: Date.now(), msg: `🌀 ${side} 特攻令：${target.name} 自毁，敌方HQ -${actualDmg} HP` });
        }
      }
      break;
    }
    case 'e_barak8': {
      // 巴拉克-8：己方所有单位获得2点护盾
      let count = 0;
      [...my.support, ...my.frontline].forEach(u => {
        if (u && !u.isHQ) { u._shield = (u._shield || 0) + 2; count++; }
      });
      state.log.push({ time: Date.now(), msg: `🛡️ ${side} 巴拉克-8：${count} 个单位获得2点护盾` });
      break;
    }
    case 'r_arctic': {
      // 北极冰封：敌方所有水面单位下回合不能推进
      // 用 blockaded 来标记，但实际上推进检查不涉及 blockaded
      // 需要用一个新状态 frontLocked 来作用于推进
      // 修改：对敌方水面单位添加 _frozen 标记
      let count = 0;
      [...state[enemy].support, ...state[enemy].frontline].forEach(u => {
        if (u && u.type === 'surface' && !u.isHQ) { u._frozen = true; count++; }
      });
      state.log.push({ time: Date.now(), msg: `🧊 ${side} 北极冰封：${enemy} ${count} 个水面单位下回合不能推进` });
      break;
    }
  }
}

// V5.3 辅助：执行被复制的指令牌效果（不扣费、不扣手牌）
function executeOpEffect(state, side, cardId, targetLine, targetIdx) {
  const my = state[side];
  const enemy = opp(side);
  const card = CARDS[cardId];
  if (!card) return;

  switch (cardId) {
    case 'c_intel': case 'l_intel': case 'r_intel': case 'j_intel': case 'e_intel': case 't_intel':
      drawTo(state, side); drawTo(state, side);
      break;
    case 'c_shield':
      my.hq.hp += 5;
      if (my.support[HQ_SLOT] && my.support[HQ_SLOT].isHQ) my.support[HQ_SLOT].currentHp = my.hq.hp;
      break;
    case 'c_bombard': case 'l_bombard':
      state[enemy].support.forEach(u => { if (u && !u.isHQ) u.currentHp -= 1; });
      state[enemy].frontline.forEach(u => { if (u) u.currentHp -= 1; });
      break;
    case 'c_mobilize': {
      const add = Math.min(3, state.k[side].max - state.k[side].cur);
      state.k[side].cur += add;
      break;
    }
    case 'c_repair': case 'l_repair': case 'l_aegis': case 'j_repairs': case 'r_repair':
      [...my.support, ...my.frontline].forEach(u => {
        if (u && !u.isHQ && u.type === 'surface') u.currentHp = Math.min(u.currentHp + (cardId === 'r_repair' ? 2 : 1), u.hp);
      });
      break;
    case 'c_ewarfare':
      state.ewarfare[enemy] = true;
      break;
    case 'l_freedom':
      state.extraAtk[side] = true;
      break;
    case 'l_seals':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? state[enemy].support[targetIdx] : state[enemy].frontline[targetIdx];
        if (t && !t.isHQ && t.currentHp <= 2) removeUnit(state, enemy, t.instanceId);
      }
      break;
    case 'l_csg': {
      const f35 = CARDS.l_f35c;
      let placed = 0;
      for (let i = 0; i < SUPPORT_SIZE && placed < 2; i++) {
        if (i !== HQ_SLOT && !my.support[i]) { my.support[i] = makeInstance(f35, side); my.support[i].exhausted = true; placed++; }
      }
      break;
    }
    case 'l_patriot':
      state.airLocked[enemy] = true;
      break;
    case 'r_nuclear':
      state[enemy].support.forEach(u => { if (u && !u.isHQ) u.currentHp -= 3; });
      state[enemy].frontline.forEach(u => { if (u) u.currentHp -= 3; });
      my.hq.hp += 3;
      break;
    case 'r_winter': {
      const newMax = Math.max(state.k[enemy].cur, state.k[enemy].max - 2);
      state.k[enemy].max = newMax;
      break;
    }
    case 'r_bombard':
      state[enemy].support.forEach(u => { if (u && !u.isHQ) { u.currentHp -= 1; if (u.type === 'surface') u.currentHp -= 1; } });
      state[enemy].frontline.forEach(u => { if (u) { u.currentHp -= 1; if (u.type === 'surface') u.currentHp -= 1; } });
      break;
    case 'r_armor':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (t && !t.isHQ) t._armorThisTurn = true;
      }
      break;
    case 'j_bushido':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (t && !t.isHQ) t._bushidoThisTurn = true;
      }
      break;
    case 'j_bombard':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? state[enemy].support[targetIdx] : state[enemy].frontline[targetIdx];
        if (t) { t.currentHp -= 3; if (!t.isHQ && t.currentHp <= 0) removeUnit(state, enemy, t.instanceId); }
      }
      break;
    case 'j_sonar':
      state.noCounter[side] = true;
      break;
    case 'j_swift':
      [...my.support, ...my.frontline].forEach(u => { if (u && !u.isHQ && u.type === 'air') u.exhausted = false; });
      break;
    case 'j_godwind':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (t && !t.isHQ) { t._godwindThisTurn = true; state.godwindUnits[side].push(t.instanceId); }
      }
      break;
    case 'e_swarm':
      [...my.support, ...my.frontline].forEach(u => {
        if (u && !u.isHQ && u.cost && u.cost.deploy <= 3) { u.atk += 1; u.hp += 1; u.currentHp += 1; }
      });
      break;
    case 'e_embargo':
      state.frontLocked[enemy] = true;
      break;
    case 'e_supply': {
      const empty = my.support.filter((u, i) => i !== HQ_SLOT && !u).length;
      for (let i = 0; i < empty; i++) drawTo(state, side);
      break;
    }
    case 'e_retrofit':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (t && !t.isHQ) { t.atk += 1; t.hp += 1; t.currentHp += 1; }
      }
      break;
    case 'e_emp':
      state.empLocked[enemy] = true;
      break;
    case 'e_retreat':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (t && !t.isHQ) {
          if (my.hand.length < MAX_HAND) my.hand.push(t.id);
          removeUnit(state, side, t.instanceId);
          state.k[side].cur += (t.cost ? t.cost.deploy : 0);
        }
      }
      break;
    case 't_dronestorm': {
      const tb2 = CARDS.t_tb2;
      let placed = 0;
      for (let i = 0; i < SUPPORT_SIZE && placed < 3; i++) {
        if (i !== HQ_SLOT && !my.support[i]) { my.support[i] = makeInstance(tb2, side); my.support[i].exhausted = true; placed++; }
      }
      break;
    }
    case 't_fortress':
      state.hqDmgReduction[side] = 0.5;
      break;
    case 't_wolfpack':
      state.wolfPackBuff[side] = true;
      break;
    case 't_smoke':
      state.smokeScreen[side] = true;
      break;
    case 't_sabotage':
    case 'c_hack':
      if (state[enemy].hand.length > 0) {
        const rIdx = Math.floor(Math.random() * state[enemy].hand.length);
        state[enemy].hand.splice(rIdx, 1);
      }
      break;
    case 't_minefield':
      if (typeof targetIdx === 'number') state.mines[side][targetIdx] = 3;
      break;
    case 'c_intercept':
      state.noHQAttack[enemy] = true;
      break;
    // V5.4 新指令卡复制支持
    case 'c_satellite':
      drawTo(state, side);
      if (state[enemy].hand.length > 0) state[enemy].hand.splice(Math.floor(Math.random() * state[enemy].hand.length), 1);
      break;
    case 'c_torpedo':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? state[enemy].support[targetIdx] : state[enemy].frontline[targetIdx];
        if (t && t.type === 'subsurf') { t.currentHp -= 3; if (t.currentHp <= 0) removeUnit(state, enemy, t.instanceId); }
      }
      break;
    case 'l_decompose':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (t && !t.isHQ) { removeUnit(state, side, t.instanceId); drawTo(state, side); drawTo(state, side); }
      }
      break;
    case 'j_kamikaze':
      if (targetLine && typeof targetIdx === 'number') {
        const t = targetLine === 'support' ? my.support[targetIdx] : my.frontline[targetIdx];
        if (t && !t.isHQ) { state[enemy].hq.hp = Math.max(0, state[enemy].hq.hp - t.atk); removeUnit(state, side, t.instanceId); }
      }
      break;
    case 'e_barak8':
      [...my.support, ...my.frontline].forEach(u => { if (u && !u.isHQ) u._shield = (u._shield || 0) + 2; });
      break;
    case 'r_arctic':
      [...state[enemy].support, ...state[enemy].frontline].forEach(u => { if (u && u.type === 'surface' && !u.isHQ) u._frozen = true; });
      break;
    // 不复制自身（e_nonaligned, c_hack等防递归）
    default:
      state.log.push({ time: Date.now(), msg: `（复制效果暂不支持：${card.name}）` });
      break;
  }
}

function doSurrender(state, side) {
  state.phase = 'ended';
  state.winner = opp(side);
  state.log.push({ time: Date.now(), msg: `${side} 投降！${state.winner} 获胜` });
}

function checkVictory(state) {
  if (state.phase === 'ended') return;
  if (state.A.hq.hp <= 0) {
    state.phase = 'ended';
    state.winner = 'B';
    state.log.push({ time: Date.now(), msg: `🏆 A 的 HQ 被击沉，B 获胜！` });
  } else if (state.B.hq.hp <= 0) {
    state.phase = 'ended';
    state.winner = 'A';
    state.log.push({ time: Date.now(), msg: `🏆 B 的 HQ 被击沉，A 获胜！` });
  }
}

// ==================== 状态广播 ====================

function sanitizeState(state, viewerSide) {
  const copy = JSON.parse(JSON.stringify(state));
  if (viewerSide === 'A' || viewerSide === 'B') {
    const other = opp(viewerSide);
    if (Array.isArray(copy[other].hand)) {
      copy[other].hand = copy[other].hand.map(() => '__hidden__');
    }
    if (Array.isArray(copy[other].deck)) {
      copy[other].deck = { count: copy[other].deck.length };
    }
  }
  delete copy._internal;
  return copy;
}

// ==================== 房间类 ====================

class Room {
  constructor(id) {
    this.id = id;
    this.clients = { A: null, B: null };
    this.spectators = [];
    this.state = null;
    this.createdAt = Date.now();
    this.lastActive = Date.now();
  }

  addClient(side, ws) {
    this.clients[side] = { ws, joinedAt: Date.now() };
    this.lastActive = Date.now();
  }

  removeClient(side) {
    this.clients[side] = null;
    this.lastActive = Date.now();
  }

  isFull() { return this.clients.A && this.clients.B; }
  isEmpty() { return !this.clients.A && !this.clients.B; }

  broadcastState() {
    if (!this.state) return;
    for (const side of ['A', 'B']) {
      const client = this.clients[side];
      if (client && client.ws.readyState === WebSocket.OPEN) {
        try {
          const payload = JSON.stringify({ type: 'state', state: sanitizeState(this.state, side) });
          client.ws.send(payload);
        } catch (e) {
          console.log(`[${nowISO()}] Room ${this.roomId} broadcastState write error for ${side}: ${e.message}`);
        }
      }
    }
  }
}

// ==================== WebSocket 处理 ====================

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  let myRoomId = null;
  let mySide = null;

  // 启用 TCP keepalive 防止 NAT/代理超时断开
  if (ws._socket) {
    ws._socket.setKeepAlive(true, 30_000);
    ws._socket.setNoDelay(true);
  }

  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30000);
  ws.on('pong', () => {});

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }

    switch (msg.type) {
      case 'ping':
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong', t: msg.t }));
        }
        return;

      case 'create_room': {
        myRoomId = genRoomId();
        mySide = 'A';
        const room = new Room(myRoomId);
        room.addClient('A', ws);
        room.factionA = msg.faction && FACTIONS[msg.faction] ? msg.faction : '苍龙';
        rooms.set(myRoomId, room);
        ws.send(JSON.stringify({ type: 'room_created', roomId: myRoomId }));
        console.log(`[${nowISO()}] Room ${myRoomId} created by ${ip} (A) faction=${room.factionA}`);
        break;
      }

      case 'join_room': {
        const roomId = (msg.roomId || '').toUpperCase().trim();
        const room = rooms.get(roomId);
        if (!room) { ws.send(JSON.stringify({ type: 'error', msg: '房间不存在' })); return; }
        if (room.clients.B) { ws.send(JSON.stringify({ type: 'error', msg: '房间已满' })); return; }
        myRoomId = roomId;
        mySide = 'B';
        room.factionB = msg.faction && FACTIONS[msg.faction] ? msg.faction : '利维坦';
        room.addClient('B', ws);

        room.state = createInitialState(room.factionA, room.factionB);
        console.log(`[${nowISO()}] Room ${roomId} joined by ${ip} (B) faction=${room.factionB}, game starting`);

        room.clients.A.ws.send(JSON.stringify({ type: 'game_start', youAre: 'A', roomId, factionA: room.factionA, factionB: room.factionB }));
        ws.send(JSON.stringify({ type: 'game_start', youAre: 'B', roomId, factionA: room.factionA, factionB: room.factionB }));

        room.broadcastState();
        break;
      }

      case 'rejoin': {
        const { roomId, side } = msg;
        const room = rooms.get(roomId);
        if (!room || !room.state) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间已过期' }));
          return;
        }
        myRoomId = roomId;
        mySide = side;
        room.addClient(side, ws);
        room.lastActive = Date.now();
        console.log(`[${nowISO()}] Room ${roomId} ${side} reconnected`);
        ws.send(JSON.stringify({ type: 'rejoin_ok', side, roomId }));
        ws.send(JSON.stringify({ type: 'state', state: sanitizeState(room.state, side) }));
        break;
      }

      case 'action': {
        if (!myRoomId || !mySide) { ws.send(JSON.stringify({ type: 'error', msg: '未加入房间' })); return; }
        const room = rooms.get(myRoomId);
        if (!room || !room.state) { ws.send(JSON.stringify({ type: 'error', msg: '房间不存在' })); return; }
        room.lastActive = Date.now();

        const v = validateAction(room.state, mySide, msg);
        if (!v.ok) {
          ws.send(JSON.stringify({ type: 'error', msg: v.err }));
          console.log(`[${nowISO()}] Room ${myRoomId} ${mySide} REJECTED: ${v.err}`);
          return;
        }

        executeAction(room.state, mySide, msg);
        room.broadcastState();
        console.log(`[${nowISO()}] Room ${myRoomId} ${mySide} ${msg.kind} | turn=${room.state.turn} round=${room.state.round} phase=${room.state.phase}`);
        break;
      }
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    if (!myRoomId || !mySide) return;
    const room = rooms.get(myRoomId);
    if (!room) return;
    console.log(`[${nowISO()}] Room ${myRoomId} ${mySide} disconnected`);
    room.removeClient(mySide);

    const other = opp(mySide);
    const otherClient = room.clients[other];
    if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
      otherClient.ws.send(JSON.stringify({ type: 'opponent_left' }));
    }

    setTimeout(() => {
      if (rooms.get(myRoomId)) {
        rooms.delete(myRoomId);
        console.log(`[${nowISO()}] Room ${myRoomId} cleaned up`);
      }
    }, 300_000);
  });

  ws.on('error', () => { clearInterval(heartbeat); });
});

// 定期清理超时房间
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  rooms.forEach((room, id) => {
    if (now - room.lastActive > 3_600_000) {
      rooms.delete(id);
      cleaned++;
    }
  });
  if (cleaned > 0) console.log(`[${nowISO()}] Cleanup: removed ${cleaned} expired room(s)`);
}, 600_000);

console.log(`🎮 2035 大海战 V5.5 game-engine running on port ${PORT}`);
console.log(`📡 Architecture: server-authoritative, 6 factions, 17 mechanics, deploy→support only`);
const totalCards = Object.keys(CARDS).length;
const factionNames = Object.keys(FACTIONS);
console.log(`📚 Cards: ${totalCards} | Factions: ${factionNames.join(' / ')}`);
factionNames.forEach(f => console.log(`   ${f}: ${FACTIONS[f].deck.length} cards, HQ HP=${FACTIONS[f].hqHp}`));
