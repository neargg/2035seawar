// ==================== 2035 大海战 V4.1 联机对战服务器 ====================
'use strict';
const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT, clientTracking: false });

const rooms = new Map(); // roomId -> { player: ws, ai: ws, createdAt, lastActive }

// 生成 4 位房间号（数字+大写字母，去掉易混淆字符）
function genRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  let tries = 0;
  do {
    id = '';
    for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
    tries++;
  } while (rooms.has(id) && tries < 100);
  return id;
}

// 向房间内"另一方"发送消息（排除 senderWs）
function sendToOther(room, senderWs, msg) {
  const other = (room.player === senderWs) ? room.ai : room.player;
  if (other && other.readyState === WebSocket.OPEN) {
    other.send(JSON.stringify(msg));
  }
}

// 向房间内所有人发送消息
function broadcast(room, msg) {
  const raw = JSON.stringify(msg);
  [room.player, room.ai].forEach(ws => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  });
}

wss.on('connection', (ws, req) => {
  let myRoomId = null;
  let mySide = null;
  const ip = req.socket.remoteAddress;

  // 服务端心跳：每 30 秒 ping 一次，超过 90 秒无 pong 则断开
  let heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping(); // ws 库自动处理 pong
    }
  }, 30000);

  ws.on('pong', () => {
    // 客户端回应 pong，连接正常
  });

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }

    switch (msg.type) {

      case 'ping':
        // 客户端心跳，回应 pong
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong', t: msg.t }));
        }
        return; // ping/pong 不刷日志

      case 'create_room': {
        myRoomId = genRoomId();
        mySide = 'player';
        rooms.set(myRoomId, { player: ws, ai: null, createdAt: Date.now(), lastActive: Date.now() });
        ws.send(JSON.stringify({ type: 'room_created', roomId: myRoomId }));
        console.log(`[${new Date().toLocaleTimeString()}] Room ${myRoomId} created by ${ip}`);
        break;
      }

      case 'join_room': {
        const roomId = (msg.roomId || '').toUpperCase().trim();
        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间不存在，请检查房间号' }));
          return;
        }
        if (room.ai) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间已满，请等待或新建房间' }));
          return;
        }
        myRoomId = roomId;
        mySide = 'ai';
        room.ai = ws;
        room.lastActive = Date.now();
        console.log(`[${new Date().toLocaleTimeString()}] Room ${myRoomId} joined by ${ip}`);
        // 通知双方游戏开始
        room.player.send(JSON.stringify({ type: 'game_start', youAre: 'player', roomId: myRoomId }));
        ws.send(JSON.stringify({ type: 'game_start', youAre: 'ai', roomId: myRoomId }));
        break;
      }

      case 'rejoin': {
        // 断线重连：用房间号和阵营重新进入
        const { roomId, side } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', msg: '房间已过期，请新建房间' }));
          return;
        }
        myRoomId = roomId;
        mySide = side;
        // 替换对应阵营的 ws 连接
        if (side === 'player') room.player = ws;
        else room.ai = ws;
        room.lastActive = Date.now();
        console.log(`[${new Date().toLocaleTimeString()}] Room ${roomId} ${side} reconnected`);
        ws.send(JSON.stringify({ type: 'rejoin_ok', roomId, side }));
        // ⭐ 重连后立刻发送最新 state（避免重连后 state 丢失导致卡死）
        if (room.lastState) {
          ws.send(JSON.stringify({ type: 'state', state: room.lastState }));
          console.log(`  → rejoin sent lastState: turn=${room.lastState?.turn} round=${room.lastState?.round}`);
        } else {
          console.log(`  → rejoin: no cached state, waiting for client to send`);
        }
        break;
      }

      case 'state': {
        // 中继游戏状态给对手
        if (myRoomId) {
          const room = rooms.get(myRoomId);
          if (room) {
            room.lastActive = Date.now();
            room.lastState = msg.state;  // 缓存最新 state（用于重连恢复）
            const other = (mySide === 'player') ? room.ai : room.player;
            if (other && other.readyState === WebSocket.OPEN) {
              other.send(JSON.stringify({ type: 'state', state: msg.state }));
              console.log(`[${new Date().toLocaleTimeString()}] state ${myRoomId} ${mySide}->${mySide==='player'?'ai':'player'}: turn=${msg.state?.turn} round=${msg.state?.round} k.ai=${msg.state?.k?.ai?.cur}/${msg.state?.k?.ai?.max} k.player=${msg.state?.k?.player?.cur}/${msg.state?.k?.player?.max} _done=${msg.state?._startTurnDone}`);
            } else {
              console.log(`[${new Date().toLocaleTimeString()}] state ${myRoomId} ${mySide} NOT RELAYED: other.readyState=${other?.readyState} (cached for rejoin)`);
            }
          }
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    if (!myRoomId) return;
    const room = rooms.get(myRoomId);
    if (!room) return;
    console.log(`[${new Date().toLocaleTimeString()}] Room ${myRoomId} player ${mySide} disconnected`);
    // 通知对手对方离开（不立即删除房间，给重连机会）
    const other = (mySide === 'player') ? room.ai : room.player;
    if (other && other.readyState === WebSocket.OPEN) {
      other.send(JSON.stringify({ type: 'opponent_left' }));
    }
    // 3 分钟后才清理房间（给足够时间重连）
    setTimeout(() => {
      if (rooms.get(myRoomId)) {
        rooms.delete(myRoomId);
        console.log(`[Cleanup] Room ${myRoomId} removed after disconnect timeout`);
      }
    }, 180_000);
  });

  ws.on('error', () => {
    clearInterval(heartbeat);
  });
});

// 每 5 分钟清理超时房间（1 小时无活动）
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  rooms.forEach((room, id) => {
    if (now - room.lastActive > 3_600_000) {
      rooms.delete(id);
      cleaned++;
    }
  });
  if (cleaned > 0) console.log(`[Cleanup] Removed ${cleaned} expired room(s)`);
}, 300_000);

console.log(`🎮 2035 大海战 V4.2 game server running on port ${PORT}`);
console.log(`📡 Rooms: active=${rooms.size}`);
