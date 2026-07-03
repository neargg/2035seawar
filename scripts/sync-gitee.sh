#!/bin/bash
# ============================================================
# 同步 GitHub → Gitee
# ============================================================
set -e

REPO_NAME="2035seawar"
GITEE_USER="nearzhao"

echo "🔄 Syncing GitHub → Gitee..."

# 检查 gitee remote
if ! git remote get-url gitee &> /dev/null; then
  echo "❌ gitee remote not configured. Run:"
  echo "   git remote add gitee https://gitee.com/${GITEE_USER}/${REPO_NAME}.git"
  exit 1
fi

# 推送到 gitee
git push gitee main --force-with-lease

echo "✅ Synced to Gitee"
echo "   Gitee URL: https://gitee.com/${GITEE_USER}/${REPO_NAME}"
