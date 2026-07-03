# 项目协作规则 — 一人开发 + AI Agent 军团

## 团队构成

| 角色 | 类型 | 负责人 |
|------|------|--------|
| 🎯 产品经理 | AI Agent（WorkBuddy） | — |
| 🎮 游戏策划 | AI Agent（Game Designer） | — |
| 💻 前端开发 | 真人（你）+ AI Agent（Frontend Dev） | 你 |
| 🧪 测试 | 真人（儿子）+ AI Agent（QA Engineer） | 儿子 |
| 🎨 UI 设计 | AI Agent（UI Designer） | — |
| 🚀 发布运维 | AI Agent（Release Ops） | — |
| 🤖 通用助手 | AI Agent（元一机器人 / OpenClaw） | — |

## 协作流程

### 从创意到上线（6 阶段）

```
[你] 提想法
    ↓
[WorkBuddy] 整理需求 → [Game Designer] 出玩法方案
    ↓
[WorkBuddy] 汇总 PRD → 你审核确认
    ↓
[UI Designer] 出设计规范 → [Game Designer] 补充美术方向
    ↓
[Frontend Dev] 写代码 + [元一机器人] 辅助生成
    ↓
[你] Code Review → 合并到 main
    ↓
[QA Engineer] 自动测试 + [儿子] 手工测试
    ↓
[Release Ops] 部署 + 备份
    ↓
[WorkBuddy] 复盘总结
```

## GitHub 协作规范

### Issue 标签
| 标签 | 用途 |
|------|------|
| `bug` | Bug 报告 |
| `feature` | 新功能需求 |
| `design` | 设计相关 |
| `testing` | 测试任务 |
| `good first issue` | 适合儿子练手的任务 |
| `P0` / `P1` / `P2` / `P3` | 优先级 |

### 分支策略
```
main          ← 生产分支，自动部署到 GitHub Pages
  └─ dev      ← 开发分支
       └─ feat/xxx   ← 功能分支
       └─ fix/xxx    ← 修复分支
```

### PR 规范
- PR 标题遵循 commit 规范：`feat:` / `fix:` / `refactor:` / `perf:`
- 必须关联 Issue（`Closes #xx`）
- 必须通过 QA 自动测试才能合并

## 文件管理

### GitHub 仓库
- 代码、文档、测试用例、设计规范全部在 GitHub
- `docs/` 目录存放 PRD、设计文档、测试用例

### 坚果云
- 仅用于备份发布包和大型资源文件
- 路径：`/坚果云/游戏项目名/`
  - `releases/` — 各版本发布包
  - `assets/` — 原始素材（PSD、音效等）
  - `docs/` — 对外文档

## 技术路线

### 当前阶段（HTML5 小游戏）
- 纯 HTML + CSS + JS
- Canvas 2D 渲染
- GitHub Pages 部署

### 下一阶段（手机端应用）
- PWA 包装（可添加到主屏幕）
- 或 React Native / Flutter

### 未来阶段（微信小程序）
- 小程序原生框架
- Canvas 2D API
- 微信云开发（可选）

## 儿子参与指南
- 标记 `good first issue` 的任务适合儿子
- 任务类型：HTML/CSS 调整、测试执行、文案修改、数值调参
- 逐步从测试 → 简单开发 → 独立功能
