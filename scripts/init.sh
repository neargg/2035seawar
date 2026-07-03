#!/bin/bash
# ============================================================
# 2035seawar 首次初始化脚本
# 在 2035seawar 仓根目录运行此脚本
# ============================================================
set -e

REPO_NAME="2035seawar"
GITHUB_USER="neargg"
GITEE_USER="nearzhao"

echo "🚀 Initializing 2035seawar repository..."
echo ""

# 1. 检查当前目录
if [ ! -f "README.md" ] || [ ! -d ".github" ]; then
  echo "❌ 请在 $REPO_NAME 仓根目录运行此脚本"
  exit 1
fi

# 2. git init
if [ ! -d ".git" ]; then
  echo "📁 Initializing git..."
  git init
  git branch -M main
fi

# 3. 配置用户
git config user.name "georgezhao" 2>/dev/null || true
git config user.email "nearzhao@qq.com" 2>/dev/null || true

# 4. 首次 commit
echo "📝 Creating first commit..."
git add .
git commit -m "🎮 Initial commit: 2035 Sea War v6.0

- V6.0: AI 评分制 + 战斗动画（开发中，已知 TDZ bug）
- V5.5: 6 阵营完整版（存档）
- V5.0: A vs B 平等对战 MVP
- V4.2.4: 联机基础版（已 archived）
- README + CI workflow + 测试套件"

# 5. 提示添加 remote
echo ""
echo "✅ First commit created!"
echo ""
echo "📡 下一步：添加 GitHub remote 并 push"
echo ""
echo "GitHub (HTTPS):"
echo "  git remote add origin https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
echo "  git push -u origin main"
echo ""
echo "GitHub (SSH - 推荐国内):"
echo "  git remote add origin git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
echo "  git push -u origin main"
echo ""
echo "Gitee 镜像（可选）:"
echo "  git remote add gitee https://gitee.com/${GITEE_USER}/${REPO_NAME}.git"
echo "  git push -u gitee main"
echo ""
echo "🎉 Done!"
