#!/bin/bash
# ============================================================
# 部署 2035 Sea War 到腾讯云
# 用法: ./deploy-to-tencent.sh [version]
#   version: v4.2 / v5.0 / v5.5 / v6.0 (默认 v6.0)
# ============================================================
set -e

VERSION="${1:-v6.0}"
SERVER="root@111.229.64.124"
REMOTE_BASE="/var/www/2035sea"
LOCAL_HTML="$(dirname "$0")/../versions/${VERSION}/2035_battle_${VERSION//./_}.html"

if [ ! -f "$LOCAL_HTML" ]; then
  # 尝试找实际文件
  LOCAL_HTML=$(find "$(dirname "$0")/../versions/${VERSION}" -name "*.html" | head -1)
fi

if [ -z "$LOCAL_HTML" ] || [ ! -f "$LOCAL_HTML" ]; then
  echo "❌ 找不到 ${VERSION} 的 HTML 文件"
  echo "   预期路径: $(dirname "$0")/../versions/${VERSION}/"
  exit 1
fi

echo "🚀 Deploying ${VERSION} to Tencent Cloud"
echo "   Source: ${LOCAL_HTML}"
echo "   Target: ${SERVER}:${REMOTE_BASE}/${VERSION}/"
echo ""

# 1. 上传文件
echo "📤 Uploading..."
scp "${LOCAL_HTML}" "${SERVER}:${REMOTE_BASE}/${VERSION}/2035_battle.html"

# 2. 重启服务（如需要）
echo "🔄 Restarting services..."
ssh "${SERVER}" "cd ${REMOTE_BASE} && [ -f restart.sh ] && bash restart.sh || echo 'No restart.sh, skip'"

# 3. 健康检查
echo "🏥 Health check..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://111.229.64.124/${VERSION}/2035_battle.html" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Deployment successful: HTTP $HTTP_CODE"
  echo "   URL: http://111.229.64.124/${VERSION}/"
else
  echo "⚠️  Health check returned HTTP $HTTP_CODE"
  echo "   Check server logs: ssh ${SERVER} 'tail -50 /var/log/2035sea-${VERSION}.log'"
  exit 1
fi

echo ""
echo "🎉 ${VERSION} deployed!"
