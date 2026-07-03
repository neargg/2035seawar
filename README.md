# ⚓ 2035 Sea War · 大海战

> 未来海战策略卡牌游戏，参考 KARDS（卡兹）玩法。单文件 HTML，零依赖，开箱即玩。

[![Current Version](https://img.shields.io/badge/version-v6.0-blue)]()
[![Status](https://img.shields.io/badge/status-development-yellow)]()
[![License](https://img.shields.io/badge/license-TBD-lightgrey)]()

## 🌊 项目简介

2035 大海战是一款以未来海战为题材的策略卡牌游戏。本仓是 V4 起的全版本开发归档与协同代码仓。

**核心玩法**：6 大阵营（苍龙/利维坦/北极熊/武士/雄鹰/灰狼）× 135 张卡 × 17 种机制 × 3 种对战模式（人机/双人热座/联机 WebSocket）。

**当前版本**：V6.0 — AI 智能化升级 & 战斗动画系统（[查看 PRD](docs/prd/PRD_v6.0.md)）

## 🎮 在线试玩

- **V6.0（开发版）**：https://nearapp.xyz — 当前最新
- **GitHub Pages 预览**：https://neargg.github.io/2035seawar/src/index-v6.html

## 📂 仓结构

```
2035seawar/
├── README.md              ← 你正在看
├── CHANGELOG.md           ← 版本变更日志
├── CODEBUDDY.md           ← Agent 协作规则（WorkBuddy 维护）
├── .gitignore
├── .github/
│   └── workflows/         ← CI: 自动跑 game logic 测试（元一维护）
├── src/                   ← 当前最新源代码（巴蒂开发）
│   ├── index-v6.html      ← V6.0 客户端（AI+动画）
│   └── index-v5.1.html    ← V5.5 客户端（稳定版）
├── server/                ← 服务端代码（巴蒂维护）
│   ├── game-engine.js
│   ├── cards-data.js
│   └── game-server.js
├── docs/                  ← 项目文档（WorkBuddy + 元一维护）
│   ├── INDEX.md
│   ├── prd/
│   ├── guides/
│   ├── planning/
│   ├── design/
│   └── analysis/
├── versions/              ← 历史版本归档（元一维护）
│   ├── v4.2/
│   ├── v5.0/
│   ├── v5.5/
│   └── v6.0/
├── tests/                 ← 测试（元一维护）
│   ├── ai-engine.test.js
│   └── v6-e2e.test.js
├── deploy/                ← 部署脚本与配置（巴蒂维护）
│   ├── deploy-to-tencent.sh
│   └── nginx-2035sea.conf
└── scripts/               ← 工具脚本
    ├── init.sh
    └── sync-gitee.sh      ← Gitee 镜像同步
```

## 🚀 快速开始

### 本地试玩

```bash
# 启 HTTP server（任意一种）
cd src
python3 -m http.server 8000
# 或 npx http-server -p 8000

# 浏览器打开
open http://localhost:8000/index-v6.html
```

### 部署到腾讯云

```bash
# 编辑 deploy/deploy-to-tencent.sh，填入 SSH 凭据
vim deploy/deploy-to-tencent.sh

# 部署当前版本
./deploy/deploy-to-tencent.sh src/
```

## 🧪 运行测试

```bash
# 需要 Node.js 18+
node tests/ai-engine.test.js
```

测试覆盖：
- ✅ TDZ 初始化检测
- ✅ 6 阵营 × 3 难度 AI 决策质量
- ✅ 卡牌机制完整性
- ✅ 阵营 deck 引用完整性
- ✅ 多回合 E2E 流程

## 🤝 协同

| 角色 | 身份 | 职责 |
|------|------|------|
| 知总 (georgezhao) | 项目负责人 | 需求决策 + 拍板 + 测试 |
| 巴蒂 (WorkBuddy 电脑端) | AI Agent | 客户端开发 + 服务端 + 部署 |
| 元一 (OpenClaw) | AI Agent | CI/CD + 自动化测试 + 文档索引 |
| WorkBuddy (云端) | AI Agent | PRD + Bug 分析 + 测试用例 + 路线图 |

详见 [CODEBUDDY.md](CODEBUDDY.md) 和 [docs/analysis/](docs/analysis/)

## 📜 版本

- **V6.0** (开发中) — AI 评分制 + 战斗动画 + 三档难度
- **V5.5** (存档) — 6 阵营完整 + 联机 + 双人热座
- **V5.0** (MVP) — A vs B 平等对战 + 服务器权威
- **V4.2.4** (存档) — 人机 + 联机基础版

详见 [CHANGELOG.md](CHANGELOG.md)

## 🐛 已知问题

详见 [Issues](https://github.com/neargg/2035seawar/issues) 或 `docs/协作说明.md`

## 📄 License

TBD（待知总拍板）

---

_本仓由元一、巴蒂、WorkBuddy 协同维护，知总拍板。_
