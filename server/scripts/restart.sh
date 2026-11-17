#!/usr/bin/env bash
# 由本机经 SSH 传入 Ubuntu 执行，服务器只负责替换文件和重启。
set -Eeuo pipefail
APP_DIR="/var/www/my-exp"
UPLOAD_FILE="${1:?缺少上传文件路径}"
HEALTH_URL="${2:-http://127.0.0.1:8080/health}"
SERVICE_NAME="my-exp"
# 锁住替换和重启步骤，避免并发部署互相影响。
exec 9>"$APP_DIR/.deploy.lock"
flock -n 9 || { echo "已有部署正在执行"; exit 1; }
command -v curl >/dev/null
test -s "$UPLOAD_FILE"
trap 'rm -f "$UPLOAD_FILE"' EXIT
chmod 755 "$UPLOAD_FILE"
# 保存旧版并使用重命名替换，避免覆盖正在运行的可执行文件。
if [ -f "$APP_DIR/my-exp" ]; then
  cp -p "$APP_DIR/my-exp" "$APP_DIR/my-exp.bak"
fi
mv -f "$UPLOAD_FILE" "$APP_DIR/my-exp"
# 重启成功后等待 HTTP 就绪，失败时恢复上一版。
healthy=false
if systemctl restart "$SERVICE_NAME"; then
  for attempt in {1..30}; do
    if systemctl is-active --quiet "$SERVICE_NAME" && curl --fail --silent --max-time 2 "$HEALTH_URL" >/dev/null; then
      healthy=true
      break
    fi
    sleep 1
  done
fi
if [ "$healthy" != true ]; then
  echo "新版启动失败，正在恢复上一版"
  journalctl -u "$SERVICE_NAME" -n 50 --no-pager || true
  if [ -f "$APP_DIR/my-exp.bak" ]; then
    cp -p "$APP_DIR/my-exp.bak" "$APP_DIR/my-exp.rollback"
    mv -f "$APP_DIR/my-exp.rollback" "$APP_DIR/my-exp"
    systemctl restart "$SERVICE_NAME"
  fi
  exit 1
fi
echo "部署成功"
systemctl status "$SERVICE_NAME" --no-pager
