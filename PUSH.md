# 🚀 PUSH 步骤清单

> 适用于把 2035seawar 仓样板推送到 GitHub (neargg) + Gitee (nearzhao) 的完整步骤。

## 前提

- ✅ GitHub 仓 `neargg/2035seawar` 已创建（私有）
- ⏳ Gitee 仓 `nearzhao/2035seawar` 待建
- ✅ 本地仓样板在 `~/.openclaw/workspace/projects/2035seawar-staging/`
- ✅ Node.js 18+（用于跑测试）
- ⏳ GitHub Personal Access Token（选 token 路径时需要）

---

## 方案 A：给我 token（推荐，最快）

### A.1 创建 GitHub Token

1. 打开 https://github.com/settings/tokens/new
2. 勾选权限：**repo** (full)
3. 过期：30 天（push 完可删）
4. 生成后复制 token（形如 `ghp_xxxxxxxx`）

### A.2 在 chat 里给我 token

直接贴给我。我会：
1. 配 `gh` CLI auth
2. 跑测试
3. git init + commit + push
4. 配 Gitee 镜像
5. 给你最终 URL

---

## 方案 B：你自己 push（更安全）

### B.1 把仓样板拷到你想放的位置

```bash
# 推荐：放坚果云（跟 V4/V5/V6 文件夹同级）
cp -R ~/.openclaw/workspace/projects/2035seawar-staging \
      "/Users/zxz file/我的坚果云/AI zxz/2035seawar"
cd "/Users/zxz file/我的坚果云/AI zxz/2035seawar"
```

### B.2 跑测试

```bash
node tests/ai-engine.test.js
# 应该看到 25 通过、1 失败（TDZ bug 已知）
```

### B.3 git init + 首次 commit

```bash
# 用我们的脚本（自动写 commit message）
bash scripts/init.sh
```

或手动：
```bash
git init
git branch -M main
git config user.name "georgezhao"
git config user.email "nearzhao@qq.com"
git add .
git commit -m "🎮 Initial commit: 2035 Sea War v6.0"
```

### B.4 添加 GitHub remote + push

HTTPS（国内推荐配 dev-sidecar）：
```bash
git remote add origin https://github.com/neargg/2035seawar.git
git push -u origin main
```

SSH（速度稳定）：
```bash
git remote add origin git@github.com:neargg/2035seawar.git
git push -u origin main
```

### B.5 创建 Gitee 仓 + 镜像

1. 在 https://gitee.com/nearzhao/repos/new 建 `2035seawar`（私有）
2. 添加 Gitee remote：
```bash
git remote add gitee https://gitee.com/nearzhao/2035seawar.git
git push -u gitee main
```

### B.6 启用 GitHub Pages

1. 进 https://github.com/neargg/2035seawar/settings/pages
2. Source: `Deploy from a branch` → `main` → `/ (root)`
3. 等待 2-3 分钟
4. 预览地址：https://neargg.github.io/2035seawar/versions/v6.0/2035_battle_v6.html

### B.7 验证 CI

1. 进 https://github.com/neargg/2035seawar/actions
2. 第一次 push 应该触发 CI workflow
3. 会显示：❌ 1 个测试失败（TDZ bug），✅ 25 个通过
4. 这是**预期行为** — CI 提示 V6.0 有 bug 需要修

---

## 🎯 推荐路径

1. **方案 A**（给我 token）— 5 分钟搞定，我全程陪跑
2. **方案 B 自己 push** — 15-20 分钟，控制权在你手里

## ❓ FAQ

**Q: 仓要不要公开？**
A: 推荐先私有，以后想公开随时改。

**Q: 仓里要不要包括 V4/V5 历史？**
A: 推荐保留（576KB 不大），方便回溯和文档化。

**Q: Pages 要不要开？**
A: V6.0 还在开发，开 Pages 让人能预览最新版本。TDZ bug 修后再开。

**Q: 国内访问 GitHub 慢怎么办？**
A: 装 dev-sidecar（阿里开源 GUI 工具），一键加速。

**Q: token 给 AI 安全吗？**
A: 短期 token（30 天）+ repo 权限（不勾 admin）= 安全。push 完立即 revoke。

---

需要我做什么？选 A 还是 B？
