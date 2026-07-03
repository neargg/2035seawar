// ==================== 2035 大海战 · V5.0 中心服务器 ====================
// 架构核心：A vs B 平等对战，服务器持 state，客户端只发 action
// 
// 通信协议：
//   C → S:
//     { type: 'create_room' }
//     { type: 'join_room', roomId: 'ABCD' }
//     { type: 'rejoin', roomId, side }
//     { type: 'action', kind: 'play_card' | 'end_turn' | 'attack' | 'advance' | 'op_card' | 'surrender', ... }
//     { type: 'ping', t }
//
//   S → C:
//     { type: 'room_created', roomId }
//     { type: 'game_start', youAre: 'A'|'B', roomId }
//     { type: 'state', state: <full state> }     // 每次 action 后全量广播
//     { type: 'event', event: 'turn_start'|'game_end'|'error', ... }
//     { type: 'error', msg }
//     { type: 'opponent_left' }
//     { type: 'rejoin_ok', side }
//     { type: 'pong', t }

'use strict';

const WebSocket = require('ws');
const crypto = require('crypto');
const { CARDS, PLAYER_DECK, AI_DECK } = require('./cards-data');

const PORT = process.env.PORT || 8081;  // V5 用 8081，避免和 V4 8080 撞
const wss = new WebSocket.Server({ port: PORT, clientTracking: false });

// ==================== 常量 ====================
const HQ_HP = 20;
const HQ_SLOT = 2;                  // HQ 在支援线/前线的位置（0-indexed）
const FRONTLINE_SIZE = 5;           // 前线 5 个槽位
const SUPPORT_SIZE = 5;             // 支援线 5 个槽位
const STARTING_HAND = 5;
const STARTING_K = 2;          // 先手首回合 K（2/2 让 cost 2 单位可部署，更动态；后续回合 +1）
const MAX_K = 12;
const HAND_REPLENISH = 1;           // 每回合开始抽几张（Phase 2 用，MVP 暂不实现）

// ==================== 房间管理 ====================
const rooms = new Map();  // roomId -> Room

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

// ==================== State 工厂 ====================

/**
 * 创建一份全新的 room state。
 * V5.0 核心：A 和 B 是平等的，没有 player/ai 的命名。
 */
function createInitialState({ factionA = 'c_dragon', factionB = 'leviathan', firstPlayer = 'A' } = {}) {
  const makeSide = (faction, deckList) => {
    const deck = shuffle([...deckList]);
    const hand = deck.splice(0, STARTING_HAND);
    return {
      faction,
      hand,                 // 手中的卡 id 列表
      deck,                 // 牌库
      support: [null, null, null, null, null],   // 支援线 5 槽（slot 2 是 HQ）
      frontline: [null, null, null, null, null], // 前线 5 槽
      hq: { hp: HQ_HP, maxHp: HQ_HP, name: '旗舰', shield: 0 },
      selectedCardIdx: null,
      selectedAdvance: null,
      ewarfare: false,      // 电子干扰标记（本回合飞机攻击减半）
      blockaded: [],        // 被封锁的单位 instanceId 列表
    };
  };

  return {
    phase: 'main',          // 'main' | 'ended'
    turn: firstPlayer,      // 'A' | 'B'
    round: 1,
    firstPlayer,
    k: {
      [firstPlayer]: { cur: STARTING_K, max: STARTING_K },
      [firstPlayer === 'A' ? 'B' : 'A']: { cur: 0, max: 0 },
    },
    A: makeSide(factionA, PLAYER_DECK),
    B: makeSide(factionB, AI_DECK),
    actionLog: [],          // 所有 action 序列（录像用）
    log: [],                // 显示给玩家的消息
    winner: null,
    _startTurnDone: { A: false, B: false },  // 防止同端重复执行 startTurn
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==================== Action 验证 ====================

/**
 * 验证 action 合法性。返回 { ok: true } 或 { ok: false, err: '...' }
 */
function validateAction(state, side, action) {
  if (state.phase !== 'main') return { ok: false, err: '游戏已结束' };
  if (state.turn !== side) return { ok: false, err: '不是你的回合' };
  if (!action || !action.kind) return { ok: false, err: 'action 格式错误' };

  switch (action.kind) {
    case 'play_card':   return validatePlayCard(state, side, action);
    case 'end_turn':    return { ok: true };
    case 'attack':      return { ok: false, err: 'attack 暂未实现（Phase 2）' };
    case 'advance':     return { ok: false, err: 'advance 暂未实现（Phase 2）' };
    case 'op_card':     return { ok: false, err: 'op_card 暂未实现（Phase 2）' };
    case 'surrender':   return { ok: true };
    default:            return { ok: false, err: `未知 action kind: ${action.kind}` };
  }
}

function validatePlayCard(state, side, { cardIdx, slot }) {
  const my = state[side];

  // 1. cardIdx 合法
  if (typeof cardIdx !== 'number' || cardIdx < 0 || cardIdx >= my.hand.length) {
    return { ok: false, err: `手牌索引越界 (cardIdx=${cardIdx})` };
  }
  const cardId = my.hand[cardIdx];
  const card = CARDS[cardId];
  if (!card) return { ok: false, err: `未知卡牌 ${cardId}` };

  // 2. slot 合法（支援线 0-4）
  if (typeof slot !== 'number' || slot < 0 || slot >= SUPPORT_SIZE) {
    return { ok: false, err: `支援线槽位越界 (slot=${slot})` };
  }
  if (slot === HQ_SLOT) return { ok: false, err: '不能直接部署到 HQ 槽位' };

  // 3. 支援线槽位必须为空
  if (my.support[slot] !== null) {
    return { ok: false, err: `支援线槽位 ${slot} 已被占用` };
  }

  // 4. 前线对应位置不能有敌方单位（否则不能部署支援线单位）
  if (my.frontline[slot] !== null) {
    return { ok: false, err: `前线槽位 ${slot} 已被我方单位占据，无法部署支援线` };
  }
  const opp = side === 'A' ? 'B' : 'A';
  if (state[opp].frontline[slot] !== null) {
    return { ok: false, err: `前线槽位 ${slot} 被敌方占据，支援线无法部署` };
  }

  // 5. K 值够不够
  const cost = card.cost.deploy;
  if (state.k[side].cur < cost) {
    return { ok: false, err: `K 值不足（需 ${cost}，当前 ${state.k[side].cur}）` };
  }

  // 6. op 卡不允许直接部署到支援线（必须有特殊处理）
  if (card.type === 'op') {
    return { ok: false, err: '指令牌(op)暂时需要 op_card action（MVP 未实现）' };
  }

  return { ok: true };
}

// ==================== Action 执行 ====================

/**
 * 执行 action，直接修改 state。
 * 注意：调用前必须先 validateAction 验证通过。
 */
function executeAction(state, side, action) {
  switch (action.kind) {
    case 'play_card':
      doPlayCard(state, side, action);
      break;
    case 'end_turn':
      doEndTurn(state, side);
      break;
    case 'surrender':
      doSurrender(state, side);
      break;
    // 其他 action Phase 2 再实现
  }

  // 记录到 action log
  state.actionLog.push({
    time: Date.now(),
    player: side,
    kind: action.kind,
    data: action,
  });

  // 检查胜负
  checkVictory(state);
}

function doPlayCard(state, side, { cardIdx, slot }) {
  const my = state[side];
  const cardId = my.hand[cardIdx];
  const card = CARDS[cardId];

  // 从手牌移到支援线
  my.hand.splice(cardIdx, 1);
  const instance = makeInstance(card, side);
  my.support[slot] = instance;

  // 扣 K
  state.k[side].cur -= card.cost.deploy;

  // 日志
  state.log.push({
    time: Date.now(),
    msg: `${side} 部署了 ${card.icon}${card.name} 到支援线槽位 ${slot}`,
  });
}

function doEndTurn(state, side) {
  const next = side === 'A' ? 'B' : 'A';
  state.log.push({ time: Date.now(), msg: `${side} 结束回合` });

  // 切换回合方
  state.turn = next;

  // 下一回合的 startTurn 逻辑
  startTurn(state, next);
}

function doSurrender(state, side) {
  state.phase = 'ended';
  state.winner = side === 'A' ? 'B' : 'A';
  state.log.push({ time: Date.now(), msg: `${side} 投降！${state.winner} 获胜` });
}

function startTurn(state, who) {
  // K 资源：每回合 K+1（先手首回合从 1 开始），上限 12
  state.k[who].max = Math.min(state.k[who].max + 1, MAX_K);
  state.k[who].cur = state.k[who].max;

  // 抽牌（Phase 2 MVP 暂时不实现，先手首回合不抽）
  // TODO Phase 2: draw to 5

  // 清除电子干扰标记
  state[who].ewarfare = false;

  state.log.push({ time: Date.now(), msg: `${who} 回合开始` });
  state._startTurnDone[who] = true;
}

function checkVictory(state) {
  if (state.phase === 'ended') return;
  // 简化版：HQ HP <= 0 判负
  if (state.A.hq.hp <= 0) {
    state.phase = 'ended';
    state.winner = 'B';
    state.log.push({ time: Date.now(), msg: '🏆 A 的 HQ 被击沉，B 获胜！' });
  } else if (state.B.hq.hp <= 0) {
    state.phase = 'ended';
    state.winner = 'A';
    state.log.push({ time: Date.now(), msg: '🏆 B 的 HQ 被击沉，A 获胜！' });
  }
}

function makeInstance(card, owner) {
  return {
    instanceId: crypto.randomBytes(4).toString('hex'),  // 8 字符唯一 ID
    cardId: card.id,
    name: card.name,
    icon: card.icon,
    type: card.type,
    faction: card.faction,
    atk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    shield: 0,
    owner,
    desc: card.desc,
    summonTurn: Date.now(),
  };
}

// ==================== 状态广播（关键）====================

/**
 * 把房间 state 序列化后广播给房间内的所有客户端。
 * 注意：手牌信息需要隐藏对手的手牌和牌库内容（V5.0 反作弊关键）。
 */
function broadcastState(room, state) {
  const payload = JSON.stringify({ type: 'state', state: sanitizeState(state, null) });
  // 广播给 A 和 B（每个客户端的"自己"视角）
  for (const side of ['A', 'B']) {
    const client = room.clients[side];
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: 'state', state: sanitizeState(state, side) }));
    }
  }
  // 观战者（如果存在）
  room.spectators.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

/**
 * 为某个 side 过滤 state：
 * - 看不到对手的手牌和牌库内容（保留数量信息）
 * - 看不到对手的 selectedCardIdx 等私有 UI 状态
 */
function sanitizeState(state, viewerSide) {
  const copy = JSON.parse(JSON.stringify(state));
  if (viewerSide === 'A' || viewerSide === 'B') {
    const other = viewerSide === 'A' ? 'B' : 'A';
    // 隐藏对手手牌内容（只保留数量）
    if (Array.isArray(copy[other].hand)) {
      copy[other].hand = copy[other].hand.map(() => '__hidden__');
    }
    // 隐藏对手牌库内容（只保留数量）
    if (Array.isArray(copy[other].deck)) {
      copy[other].deck = { count: copy[other].deck.length };
    }
    // 隐藏对手私有 UI 状态
    copy[other].selectedCardIdx = null;
    copy[other].selectedAdvance = null;
  }
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
    if (this.clients[side]) {
      this.clients[side] = null;
    }
    this.lastActive = Date.now();
  }

  isFull() { return this.clients.A && this.clients.B; }
  isEmpty() { return !this.clients.A && !this.clients.B; }

  broadcastState() {
    if (!this.state) return;
    const baseMsg = JSON.stringify({ type: 'state', state: sanitizeState(this.state, null) });
    for (const side of ['A', 'B']) {
      const client = this.clients[side];
      if (client && client.ws.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({ type: 'state', state: sanitizeState(this.state, side) });
        client.ws.send(payload);
      }
    }
    this.spectators.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(baseMsg);
    });
  }
}

// ==================== WebSocket 处理 ====================

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  let myRoomId = null;
  let mySide = null;

  // 服务端心跳
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
        rooms.set(myRoomId, room);
        ws.send(JSON.stringify({ type: 'room_created', roomId: myRoomId }));
        console.log(`[${nowISO()}] Room ${myRoomId} created by ${ip} (side=A)`);
        break;
      }

      case 'join_room': {
        const roomId = (msg.roomId || '').toUpperCase().trim();
        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间不存在' }));
          return;
        }
        if (room.clients.B) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间已满' }));
          return;
        }
        myRoomId = roomId;
        mySide = 'B';
        room.addClient('B', ws);

        // 双方都到齐，初始化 state 并通知 game_start
        room.state = createInitialState({});
        console.log(`[${nowISO()}] Room ${roomId} joined by ${ip} (side=B), game starting`);

        room.clients.A.ws.send(JSON.stringify({ type: 'game_start', youAre: 'A', roomId }));
        ws.send(JSON.stringify({ type: 'game_start', youAre: 'B', roomId }));

        // 广播初始 state
        // firstPlayer 的 K 已经在 createInitialState 里设了 STARTING_K=1
        // 第一个回合就让他用 K=1 开始（先手小优势）
        // B 的 K=0/0，等 A endTurn → startTurn(B) 时补到 1/1
        room.broadcastState();
        break;
      }

      case 'rejoin': {
        const { roomId, side } = msg;
        const room = rooms.get(roomId);
        if (!room || !room.state) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间已过期或无游戏进行中' }));
          return;
        }
        myRoomId = roomId;
        mySide = side;
        room.addClient(side, ws);
        room.lastActive = Date.now();
        console.log(`[${nowISO()}] Room ${roomId} ${side} reconnected`);
        ws.send(JSON.stringify({ type: 'rejoin_ok', side, roomId }));
        // 发送最新 state
        const sanitized = sanitizeState(room.state, side);
        ws.send(JSON.stringify({ type: 'state', state: sanitized }));
        break;
      }

      case 'action': {
        if (!myRoomId || !mySide) {
          ws.send(JSON.stringify({ type: 'error', msg: '未加入房间' }));
          return;
        }
        const room = rooms.get(myRoomId);
        if (!room || !room.state) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间不存在' }));
          return;
        }
        room.lastActive = Date.now();

        // 1. 验证
        const v = validateAction(room.state, mySide, msg);
        if (!v.ok) {
          ws.send(JSON.stringify({ type: 'error', msg: `action 非法: ${v.err}` }));
          console.log(`[${nowISO()}] Room ${myRoomId} ${mySide} action REJECTED: ${v.err}`);
          return;
        }

        // 2. 执行
        executeAction(room.state, mySide, msg);

        // 3. 广播新 state
        room.broadcastState();
        console.log(`[${nowISO()}] Room ${myRoomId} ${mySide} action: ${msg.kind} | turn=${room.state.turn} round=${room.state.round} k.A=${room.state.k.A.cur}/${room.state.k.A.max} k.B=${room.state.k.B.cur}/${room.state.k.B.max} phase=${room.state.phase}`);
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

    // 通知对手
    const other = mySide === 'A' ? 'B' : 'A';
    const otherClient = room.clients[other];
    if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
      otherClient.ws.send(JSON.stringify({ type: 'opponent_left' }));
    }

    // 5 分钟无人重连，清理房间
    setTimeout(() => {
      if (rooms.get(myRoomId) && rooms.get(myRoomId).isEmpty()) {
        rooms.delete(myRoomId);
        console.log(`[${nowISO()}] Room ${myRoomId} cleaned up (empty)`);
      } else if (rooms.get(myRoomId)) {
        // 一方还在但另一方没回来 → 删除房间（不让单人卡住）
        rooms.delete(myRoomId);
        console.log(`[${nowISO()}] Room ${myRoomId} cleaned up (one side gone, no rejoin)`);
      }
    }, 300_000);
  });

  ws.on('error', () => {
    clearInterval(heartbeat);
  });
});

// 每 10 分钟清理超时房间（无活动 1 小时）
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

console.log(`🎮 2035 大海战 V5.0 game-engine running on port ${PORT}`);
console.log(`📡 Architecture: server-authoritative state, A vs B equal opponents`);
console.log(`📚 Cards loaded: ${Object.keys(CARDS).length}`);
console.log(`   • 苍龙: ${PLAYER_DECK.length} 张 / 利维坦: ${AI_DECK.length} 张`);