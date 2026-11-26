#!/usr/bin/env bash
# 由本机经 SSH 传入 Ubuntu 执行，服务器只负责替换文件和重启。
set -Eeuo pipefail
APP_DIR="/var/www/my-exp"
UPLOAD_FILE="${1:?缺少上传文件路径}"
HEALTH_URL="${2:-http://127.0.0.1:8080/health}"
# 后三个值由本机部署脚本传入，用于拉取并核对编译时的源码。
SOURCE_DIR="${3:-$APP_DIR/source}"
REPO_URL="${4:?缺少源码仓库地址}"
REPO_BRANCH="${5:?缺少源码分支}"
EXPECTED_COMMIT="${6:?缺少编译源码提交}"
SERVICE_NAME="my-exp"
PREVIOUS_SOURCE_COMMIT=""
SOURCE_SYNCED=false
DEPLOY_SUCCEEDED=false
# 锁住替换和重启步骤，避免并发部署互相影响。
exec 9>"$APP_DIR/.deploy.lock"
flock -n 9 || { echo "已有部署正在执行"; exit 1; }
command -v curl >/dev/null
command -v git >/dev/null
test -s "$UPLOAD_FILE"
# 源码也属于本次发布，失败时恢复原提交，保留本地文件保护。
restore_source() {
  if [ "$SOURCE_SYNCED" = true ] && [ -n "$PREVIOUS_SOURCE_COMMIT" ]; then
    git -C "$SOURCE_DIR" reset --keep "$PREVIOUS_SOURCE_COMMIT"
    SOURCE_SYNCED=false
  fi
}
cleanup() {
  rm -f "$UPLOAD_FILE"
  if [ "$DEPLOY_SUCCEEDED" != true ]; then
    restore_source || echo "源码恢复失败，请检查 $SOURCE_DIR" >&2
  fi
}
trap cleanup EXIT
# 已有源码目录只接受干净的同名分支，不丢弃服务器本地修改。
if [ -e "$SOURCE_DIR" ]; then
  if [ ! -e "$SOURCE_DIR/.git" ]; then
    echo "源码目录已存在但不是 Git 仓库：$SOURCE_DIR"
    exit 1
  fi
  if [ -n "$(git -C "$SOURCE_DIR" status --porcelain)" ]; then
    echo "服务器源码目录有未提交文件，请先处理后再部署"
    exit 1
  fi
  if [ "$(git -C "$SOURCE_DIR" symbolic-ref --quiet --short HEAD || true)" != "$REPO_BRANCH" ]; then
    echo "服务器源码分支与部署分支不一致，请先检查源码目录"
    exit 1
  fi
  PREVIOUS_SOURCE_COMMIT="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
  SOURCE_SYNCED=true
  echo "正在拉取服务器源码"
  GIT_TERMINAL_PROMPT=0 git -C "$SOURCE_DIR" pull --ff-only origin "$REPO_BRANCH"
else
  # 首次部署先克隆，服务器需提前配置读取仓库的凭证。
  echo "正在克隆服务器源码"
  GIT_TERMINAL_PROMPT=0 git clone --quiet --branch "$REPO_BRANCH" --single-branch -- "$REPO_URL" "$SOURCE_DIR"
fi
if [ "$(git -C "$SOURCE_DIR" rev-parse HEAD)" != "$EXPECTED_COMMIT" ]; then
  echo "服务器源码与本机编译提交不一致，请确认代码已推送且分支没有继续更新"
  exit 1
fi
test -f "$SOURCE_DIR/server/go.mod"
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
  # 先恢复源码，再重启旧程序，让目录扫描与旧程序保持同次发布。
  restore_source || echo "源码恢复失败，请检查 $SOURCE_DIR" >&2
  if [ -f "$APP_DIR/my-exp.bak" ]; then
    cp -p "$APP_DIR/my-exp.bak" "$APP_DIR/my-exp.rollback"
    mv -f "$APP_DIR/my-exp.rollback" "$APP_DIR/my-exp"
    systemctl restart "$SERVICE_NAME"
  fi
  exit 1
fi
DEPLOY_SUCCEEDED=true
echo "部署成功"
systemctl status "$SERVICE_NAME" --no-pager
