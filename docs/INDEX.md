# 📚 项目文档索引

> V6.0 项目所有正式文档的入口。详细历史变更见 [CHANGELOG.md](../CHANGELOG.md)。

## 当前版本（V6.0）

| 文档 | 说明 | 状态 |
|------|------|------|
| [PRD_v6.0.md](PRD_v6.0.md) | V6.0 产品需求文档（AI 智能化 + 战斗动画）| ✅ 完整 |
| [优化规划.md](优化规划.md) | V5.5 → V6.0 规划（6 方向 22 需求）| ✅ 完整 |
| [协作说明.md](协作说明.md) | 知总+巴蒂+元一 三方协作协议 | ✅ 完整 |

## 历史版本

- **V5.5** (2026-06-21) — 6 阵营完整版（联机有 known issues）
- **V5.0** (2026-06-22) — A vs B 平等对战 MVP
- **V4.2.4** (2026-06-21) — 联机基础版（已 archived）

## 元一 Review 报告（2026-07-03）

- 🐛 **致命**: TDZ 初始化顺序 bug — `Settings.apply()` 访问未声明的 `animQueue`（V6.0 line 1011）
- ⚠️ **严重**: AI 评分过于保守 — 6 阵营 × 3 难度 18 局测试，K=1~4 时经常 0 deploy
- ✅ **通过**: 17 项 PRD 功能全部实现、135 张卡 0 缺失、6 阵营 AI 策略完整

详见 `versions/v6.0/REVIEW.md`（如需要可生成）

## CI 流水线

- 每次 push 自动跑 game logic 测试
- 检测 TDZ bug 是否回归
- 验证 HTML 结构完整性

见 `.github/workflows/ci.yml`

## 部署

- **生产**: 腾讯云 `111.229.64.124`（V4/V5/V6 三个版本并存）
- **预览**: GitHub Pages `neargg.github.io/2035seawar/`
- **脚本**: `deploy/deploy-to-tencent.sh`

## 镜像同步

- **主仓**: GitHub `neargg/2035seawar` (私有)
- **镜像**: Gitee `nearzhao/2035seawar` (私有)
- **同步脚本**: `scripts/sync-gitee.sh`
