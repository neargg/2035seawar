# 📋 CHANGELOG · 2035 大海战

> 记录每个版本的重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased] · V6.0 开发中

### 计划添加
- AI 评分制决策（替代随机 AI）
- 战斗动画系统（12 种 CSS 动画 + Canvas 粒子）
- 三档难度选择（简单/普通/困难）
- 设置面板（动画/音效/AI 速度）

### 已知 Bug
- 🐛 **TDZ 初始化顺序** — `Settings.apply()` 访问未声明的 `animQueue`，浏览器一打开就崩（line 1011）
- ⚠️ AI 第一回合经常 0 deploy（评分过于保守）

---

## [V5.5] · 2026-06-21 · 存档

### 新增
- 6 阵营完整卡牌库（135 张）
- 17 种卡牌机制（missile/carrierSpawn/shield/lifesteal/stealth 等）
- 联机 WebSocket 对战
- 双人热座模式
- 移动端横屏适配

### 限制
- AI 随机选择动作（`Math.random()`）
- 战斗无视觉反馈
- 联机模式有 known issues

---

## [V5.0] · 2026-06-22 · MVP

### 新增
- 重命名 `player/ai` → `A/B`（V4 把联机当特例的 bug 修复）
- 服务器权威架构
- A vs B 平等对战
- 反作弊 + 信息隔离 + 错误拦截

### 部署
- 腾讯云 `111.229.64.124/v5/`
- WebSocket `/v5ws`

---

## [V4.2.4] · 2026-06-21 · 存档（仅推荐人机）

### 修复
- B 端手牌永远 0 张（savedHand 覆盖 bug）
- 加入者 K 值不补、抽牌缺失
- 初始 startTurn 重复执行
- 网络断开无心跳保活（30s 客户端心跳 + 90s 服务端超时）
- nginx 配置冲突
- 5 秒自动重连 + 60 秒判胜

### 已知问题
- 联机模式有 bug，已 archived
- 仅适合玩人与 AI 对战

---

## [V4.x 早期] · 2026-03 ~ 06

- V2.x: 基础对战（部署→推进→攻击→反击）
- V3.x: 阵营系统 + 卡牌机制
- V4.x: 联机模式（已放弃维护）

详细变更见 `git log`。
