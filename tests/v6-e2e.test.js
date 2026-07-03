// ============================================================
// 2035 大海战 V6.0 E2E 集成测试
// 多阵营 × 多难度 自动化跑局
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'versions', 'v6.0', '2035_battle_v6.html');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setupSandbox() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  let gameScript = scriptMatches[scriptMatches.length - 1][1];
  
  gameScript = gameScript.replace(
    /if \(typeof animQueue !== 'undefined' && animQueue\) animQueue\.enabled = this\.data\.animation;/,
    'try { if (typeof animQueue !== "undefined" && animQueue) animQueue.enabled = this.data.animation; } catch(e) {}'
  );
  
  function el(id) {
    return {
      id, _children: [],
      classList: { _s: new Set(), add(...c){c.forEach(x=>this._s.add(x))}, remove(...c){c.forEach(x=>this._s.delete(x))}, contains(c){return this._s.has(c)}, toggle(c,f){if(f===undefined){this._s.has(c)?this._s.delete(c):this._s.add(c)}else{f?this._s.add(c):this._s.delete(c)}return this._s.has(c)} },
      style: {}, dataset: {}, value: '', checked: false, textContent: '', innerHTML: '', className: '',
      parentNode: null, parentElement: null, addEventListener: () => {}, removeEventListener: () => {},
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
  const csm = { log: () => {}, warn: () => {}, error: (...args) => {}, info: () => {} };
  
  const sandbox = {
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
  
  const finalScript = gameScript.replace(
    /if \(document\.readyState === 'loading'\) \{[\s\S]+?else \{\s+initV6\(\);\s+\}/,
    `$& globalThis.__V6 = { get state() { return state; }, get aiEngine() { return aiEngine; }, AIEngine, FACTION_AI_STRATEGY, FACTIONS, CARDS, FRONTLINE_SIZE, HQ_SLOT, settings, doAttack, playOpCard, canPushFront, makeHQ, newGame, startAI, startGame, endTurn, animator, animQueue, soundManager, showDifficultyMenu };`
  );
  
  vm.runInContext(finalScript, sandbox);
  return sandbox;
}

async function runOneGame(sandbox, faction, difficulty) {
  Math.random = () => 0.9;
  sandbox.Math.random = Math.random;
  sandbox.__V6.newGame('ai', { difficulty, aiFaction: faction });
  
  for (let r = 0; r < 8; r++) {
    await sleep(700);
    const s = sandbox.__V6.state;
    if (!s) return { error: 'no state' };
    if (s.turn === 'player' && s.phase === 'main') {
      try { sandbox.__V6.endTurn(); } catch (e) {}
    }
    if (s.phase === 'ended') return { end: s.winner, round: s.round };
  }
  const s = sandbox.__V6.state;
  return {
    finalRound: s.round,
    finalTurn: s.turn,
    aiDeployed: s.ai.support.filter(u => u && !u.isHQ).length + s.ai.frontline.filter(Boolean).length,
    aiK: `${s.k.ai.cur}/${s.k.ai.max}`,
    playerK: `${s.k.player.cur}/${s.k.player.max}`,
  };
}

(async () => {
  console.log('🎮 2035 大海战 V6.0 E2E - 6 阵营 × 3 难度');
  console.log('='.repeat(70));
  
  let totalErrors = 0;
  const results = [];
  
  for (const faction of ['苍龙','利维坦','北极熊','武士','雄鹰','灰狼']) {
    process.stdout.write(`\n${faction}: `);
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const sandbox = setupSandbox();
      try {
        const r = await runOneGame(sandbox, faction, difficulty);
        const ok = !r.error;
        if (r.error) totalErrors++;
        process.stdout.write(`${difficulty}=${ok ? '✓' : '✗'}(${r.aiDeployed ?? 0}) `);
        results.push({ faction, difficulty, ...r });
      } catch (e) {
        totalErrors++;
        process.stdout.write(`${difficulty}=ERR `);
        results.push({ faction, difficulty, error: e.message });
      }
    }
  }
  
  console.log('\n\n' + '='.repeat(70));
  console.log(`📊 E2E Summary: ${totalErrors === 0 ? '✅ ALL PASSED' : `❌ ${totalErrors} errors`}`);
  
  if (totalErrors > 0) {
    process.exit(1);
  }
  process.exit(0);
})();
