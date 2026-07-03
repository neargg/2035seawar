// ============================================================
// 2035 大海战 V6.0 AI 引擎单元测试
// 用法: node tests/ai-engine.test.js
// 
// 覆盖:
// 1. TDZ 初始化 bug 检测
// 2. 6 阵营 AI 策略完整性
// 3. AIEngine 评分逻辑
// 4. 卡牌机制覆盖
// 5. 阵营 deck 引用完整性
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VERSION = 'v6.0';
const HTML_PATH = path.join(__dirname, '..', 'src', 'index-v6.html');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failures.push({ name, error: e.message });
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${b}, got ${a}`);
}

console.log('='.repeat(60));
console.log(`  2035 大海战 ${VERSION} - AI Engine Tests`);
console.log('='.repeat(60));

// ==================== Test Suite 1: HTML 完整性 ====================
console.log('\n📋 Test 1: HTML 完整性');

const html = fs.readFileSync(HTML_PATH, 'utf8');

test('HTML 文件存在', () => {
  assert(fs.existsSync(HTML_PATH), 'HTML file not found');
});

test('包含 DOCTYPE', () => {
  assert(html.includes('<!DOCTYPE html>'), 'Missing DOCTYPE');
});

test('包含 </html> 闭合', () => {
  assert(html.includes('</html>'), 'Missing closing html');
});

test('包含 <title>', () => {
  assert(html.includes('<title>'), 'Missing title');
});

test('包含 V6.3 标识', () => {
  assert(html.includes('V6.3') || html.includes('v6.3'), 'V6.3 identifier missing');
});

// ==================== Test Suite 2: TDZ Bug 检测 ====================
console.log('\n📋 Test 2: TDZ Bug 检测');

test('V6.0 不应有 TDZ 初始化 bug', () => {
  // 致命 bug: Settings.apply() 访问未声明的 animQueue
  const tdzPattern = /typeof animQueue !== 'undefined' && animQueue\)/;
  if (tdzPattern.test(html)) {
    throw new Error('TDZ bug detected: Settings.apply() accesses animQueue before declaration. Fix: wrap in try/catch or reorder declarations.');
  }
});

// ==================== Test Suite 3: 在 vm 隔离上下文中跑 game logic ====================
console.log('\n📋 Test 3: Game Logic (vm 隔离执行)');

let sandbox, V6;
let vmErrors = [];

try {
  // 提取 <script>
  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const gameScript = scriptMatches[scriptMatches.length - 1][1];
  
  // Patch TDZ（如果存在）
  const patchedScript = gameScript.replace(
    /if \(typeof animQueue !== 'undefined' && animQueue\) animQueue\.enabled = this\.data\.animation;/,
    'try { if (typeof animQueue !== "undefined" && animQueue) animQueue.enabled = this.data.animation; } catch(e) {}'
  );
  
  // Mock DOM
  function el(id) {
    return {
      id, _children: [],
      classList: { _s: new Set(), add(...c){c.forEach(x=>this._s.add(x))}, remove(...c){c.forEach(x=>this._s.delete(x))}, contains(c){return this._s.has(c)}, toggle(c,f){if(f===undefined){this._s.has(c)?this._s.delete(c):this._s.add(c)}else{f?this._s.add(c):this._s.delete(c)}return this._s.has(c)} },
      style: {}, dataset: {}, value: '', checked: false, textContent: '', innerHTML: '', className: '',
      parentNode: null, parentElement: null,
      addEventListener: () => {}, removeEventListener: () => {},
      appendChild(c) { c.parentNode = this; this._children.push(c); return c; },
      removeChild(c) { const i = this._children.indexOf(c); if(i>=0) this._children.splice(i,1); },
      remove() { if(this.parentNode) this.parentNode.removeChild(this); },
      getBoundingClientRect: () => ({left:100, top:100, width:80, height:100, right:180, bottom:200}),
      closest: function() { return this; },
      querySelector: () => null, querySelectorAll: () => [],
      getContext: (t) => t === '2d' ? { clearRect(){}, fillRect(){}, beginPath(){}, arc(){}, fill(){}, moveTo(){}, lineTo(){}, stroke(){}, save(){}, restore(){}, fillStyle:'', strokeStyle:'', globalAlpha:1, fillText(){}, measureText:()=>({width:0}) } : null,
      width: 800, height: 600, onclick: null, onchange: null,
    };
  }
  
  const els = new Map();
  ['log','startOverlay','startDifficulty','settingsOverlay','fxCanvas','endBtn','setAnim','setSound','setSpeedSeg','victoryOverlay','enemySupport','frontline','playerSupport','hand','rulesPanel','roundInfo','roundText','resK','resKMax','hqPName','hqP','hqAName','hqA','enemyLabel','playerLabel','handOwner','handCount','lobbyOverlay','lobbyMain','lobbyFaction','lobbyWaiting','passOverlay','passIcon','passTitle','passSub','factionGrid','factionDesc','joinRoomRow','joinStatus','factionConfirmBtn','displayRoomCode','victoryTitle','victoryText','netDot','roomInput']
    .forEach(id => els.set(id, el(id)));
  
  const doc = { getElementById: id => els.get(id) || null, querySelector: () => el(), querySelectorAll: () => [], createElement: () => el(), addEventListener: () => {}, body: el(), readyState: 'complete', documentElement: el('html') };
  const win = {
    AudioContext: function() { return { createOscillator:()=>({connect(){},frequency:{setValueAtTime(){},linearRampToValueAtTime(){}},start(){},stop(){},type:''}),createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}),createBuffer:()=>({getChannelData:()=>new Float32Array(10)}),createBufferSource:()=>({connect(){},buffer:null,start(){},stop(){}}),createBiquadFilter:()=>({connect(){},type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}),currentTime:0,sampleRate:44100,destination:{} }; },
    localStorage: { _s:{}, getItem(k){return this._s[k]||null;}, setItem(k,v){this._s[k]=v;}, removeItem(k){delete this._s[k];} },
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    location: { reload:()=>{}, hostname:'localhost', protocol:'http:' },
    addEventListener: () => {}
  };
  const csm = { log: () => {}, warn: () => {}, error: (...args) => vmErrors.push(args), info: () => {} };
  
  sandbox = {
    window: win, document: doc, localStorage: win.localStorage, console: csm,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: win.requestAnimationFrame,
    location: win.location, navigator: { userAgent: 'node-test' },
    Math, Date, JSON, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
    Promise, Symbol, Map, Set, WeakMap, WeakSet,
    parseInt, parseFloat, isFinite, isNaN, encodeURIComponent, decodeURIComponent
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  
  // Patch V6 export
  const finalScript = patchedScript.replace(
    /if \(document\.readyState === 'loading'\) \{[\s\S]+?else \{\s+initV6\(\);\s+\}/,
    `$& globalThis.__V6 = { get state() { return state; }, get aiEngine() { return aiEngine; }, AIEngine, FACTION_AI_STRATEGY, FACTIONS, CARDS, FRONTLINE_SIZE, HQ_SLOT, settings, doAttack, playOpCard, canPushFront, makeHQ, newGame, startAI, startGame, endTurn, animator, animQueue, soundManager, showDifficultyMenu };`
  );
  
  vm.runInContext(finalScript, sandbox);
  V6 = sandbox.__V6;
  
  test('Game script 加载无错', () => {
    assert(V6 !== undefined, 'V6 export failed');
  });
  
  test('V6 全局对象完整', () => {
    for (const k of ['AIEngine','FACTION_AI_STRATEGY','FACTIONS','CARDS','settings','animQueue','animator','soundManager']) {
      assert(V6[k] !== undefined, `Missing ${k}`);
    }
  });
  
} catch (e) {
  test('V6 加载', () => {
    throw new Error(`VM load failed: ${e.message}`);
  });
}

// ==================== Test Suite 4: AI 策略完整性 ====================
console.log('\n📋 Test 4: AI 策略完整性');

if (V6) {
  test('6 阵营都有 AI 策略', () => {
    for (const f of ['苍龙','利维坦','北极熊','武士','雄鹰','灰狼']) {
      assert(V6.FACTION_AI_STRATEGY[f], `Missing strategy for ${f}`);
    }
  });
  
  test('每阵营策略有 unitBonus/opBonus/advanceMod/aggression', () => {
    for (const f of Object.keys(V6.FACTION_AI_STRATEGY)) {
      const s = V6.FACTION_AI_STRATEGY[f];
      assert(typeof s.unitBonus === 'function', `${f} missing unitBonus`);
      assert(typeof s.opBonus === 'function', `${f} missing opBonus`);
      assert(typeof s.advanceMod === 'function', `${f} missing advanceMod`);
      assert(typeof s.aggression === 'number', `${f} missing aggression`);
    }
  });
  
  test('aggression 在合理区间 [0, 1]', () => {
    for (const f of Object.keys(V6.FACTION_AI_STRATEGY)) {
      const a = V6.FACTION_AI_STRATEGY[f].aggression;
      assert(a >= 0 && a <= 1, `${f} aggression ${a} out of [0,1]`);
    }
  });
}

// ==================== Test Suite 5: 卡牌完整性 ====================
console.log('\n📋 Test 5: 卡牌完整性');

if (V6) {
  test('卡牌总数 = 135', () => {
    assertEqual(Object.keys(V6.CARDS).length, 135, 'Expected 135 cards');
  });
  
  test('每阵营卡牌 ≥ 20', () => {
    const fc = {};
    for (const c of Object.values(V6.CARDS)) {
      fc[c.faction] = (fc[c.faction] || 0) + 1;
    }
    for (const f of Object.keys(fc)) {
      assert(fc[f] >= 20, `${f} has only ${fc[f]} cards`);
    }
  });
  
  test('每阵营 deck 引用的卡都存在', () => {
    for (const f of Object.keys(V6.FACTIONS)) {
      const def = V6.FACTIONS[f];
      if (!def.deck) continue;
      const missing = def.deck.filter(cid => !V6.CARDS[cid]);
      assert(missing.length === 0, `${f} deck has ${missing.length} missing cards: ${missing.join(',')}`);
    }
  });
  
  test('卡牌机制覆盖 (missile ≥ 10)', () => {
    let missileCount = 0;
    for (const c of Object.values(V6.CARDS)) {
      if (c.missile) missileCount++;
    }
    assert(missileCount >= 10, `Only ${missileCount} missile cards`);
  });
  
  test('卡牌机制覆盖 (carrierSpawn ≥ 4)', () => {
    let count = 0;
    for (const c of Object.values(V6.CARDS)) {
      if (c.carrierSpawn) count++;
    }
    assert(count >= 4, `Only ${count} carrier cards`);
  });
}

// ==================== Test Suite 6: AI 行为 E2E ====================
console.log('\n📋 Test 6: AI 行为 E2E');

if (V6) {
  test('newGame 起局无错', () => {
    try {
      Math.random = () => 0.9;
      sandbox.Math.random = Math.random;
      V6.newGame('ai', { difficulty: 'normal', aiFaction: '利维坦' });
    } catch (e) {
      throw new Error(`newGame failed: ${e.message}`);
    }
  });
  
  test('state 已初始化', () => {
    const s = sandbox.__V6.state;
    assert(s, 'state is null after newGame');
    assert(s.mode === 'ai', 'mode not ai');
    assert(s.aiFaction === '利维坦', 'aiFaction wrong');
    assert(s.playerFaction === '苍龙', 'playerFaction wrong');
  });
  
  test('AI 跑完第一回合不崩', async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const s = sandbox.__V6.state;
          assert(s, 'state null after AI run');
          assert(s.round >= 1, `round should be ≥ 1, got ${s.round}`);
          // 0 errors
          assert(vmErrors.length === 0, `${vmErrors.length} vm errors`);
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 1500);
    });
  });
  
  test('AI 不会让 K 溢出', () => {
    const s = sandbox.__V6.state;
    assert(s.k.ai.cur >= 0, `ai K negative: ${s.k.ai.cur}`);
    assert(s.k.ai.cur <= 12, `ai K > 12: ${s.k.ai.cur}`);
    assert(s.k.player.cur >= 0, `player K negative: ${s.k.player.cur}`);
    assert(s.k.player.cur <= 12, `player K > 12: ${s.k.player.cur}`);
  });
  
  test('AI 不会让 HQ HP 溢出', () => {
    const s = sandbox.__V6.state;
    assert(s.ai.hq.hp >= 0, `ai HQ HP negative: ${s.ai.hq.hp}`);
    assert(s.ai.hq.hp <= s.ai.hq.maxHp, `ai HQ HP > max: ${s.ai.hq.hp}/${s.ai.hq.maxHp}`);
    assert(s.player.hq.hp >= 0, `player HQ HP negative: ${s.player.hq.hp}`);
    assert(s.player.hq.hp <= s.player.hq.maxHp, `player HQ HP > max: ${s.player.hq.hp}/${s.player.hq.maxHp}`);
  });
}

// ==================== Test Suite 7: 动画系统 ====================
console.log('\n📋 Test 7: 动画系统');

if (V6) {
  test('AnimationQueue 实例化', () => {
    assert(V6.animQueue, 'animQueue missing');
    assert(typeof V6.animQueue.add === 'function', 'animQueue.add missing');
    assert(typeof V6.animQueue.clear === 'function', 'animQueue.clear missing');
  });
  
  test('ParticleSystem 准备就绪', () => {
    assert(V6.animator, 'animator missing');
    assert(V6.animator.setParticles !== undefined, 'animator.setParticles missing');
  });
  
  test('CSS 动画 class 全部定义', () => {
    const required = ['anim-deploy', 'anim-advance', 'anim-attack-up', 'anim-attack-down', 
                      'anim-hit-red', 'anim-hit-orange', 'anim-shake', 'anim-destroy',
                      'dmg-floater', 'turn-banner', 'op-flash', 'op-icon'];
    for (const cls of required) {
      const hasCSS = html.match(new RegExp(`\\.${cls}[^,{]*\\{`));
      assert(hasCSS, `CSS class .${cls} not defined`);
    }
  });
}

// ==================== Test Suite 8: 性能 ====================
console.log('\n📋 Test 8: 性能');

test('HTML 行数 < 5000', () => {
  const lines = html.split('\n').length;
  assert(lines < 5000, `HTML too long: ${lines} lines (consider splitting)`);
});

test('HTML 大小 < 500KB', () => {
  const size = html.length;
  assert(size < 500_000, `HTML too large: ${size} bytes`);
});

// ==================== Test Summary ====================
console.log('\n' + '='.repeat(60));
console.log(`  📊 Test Summary`);
console.log('='.repeat(60));
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📈 Total:  ${passed + failed}`);

if (failed > 0) {
  console.log('\n  🔴 Failures:');
  for (const f of failures) {
    console.log(`    - ${f.name}: ${f.error}`);
  }
  console.log('\n  ❌ TEST SUITE FAILED');
  process.exit(1);
} else {
  console.log('\n  🎉 ALL TESTS PASSED');
  process.exit(0);
}
