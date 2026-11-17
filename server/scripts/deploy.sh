#!/usr/bin/env bash
# 此脚本通过 GitHub Actions 的 SSH 会话在 Linux 服务器执行。
set -Eeuo pipefail

REPO_DIR="/var/www/my-exp"
APP_DIR="$REPO_DIR/server"
SERVICE_NAME="my-exp"
REPOSITORY_URL="${1:?请传入仓库地址}"
export PATH="/usr/local/go/bin:$PATH"
# 国内镜像优先，保留服务器已经配置的下载地址。
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
export CGO_ENABLED=0

# 锁覆盖拉取、编译和重启，手动执行时也不会与自动部署冲突。
mkdir -p "$(dirname "$REPO_DIR")"
exec 9>"$(dirname "$REPO_DIR")/.my-exp-deploy.lock"
flock -n 9 || { echo "已有部署正在执行"; exit 1; }
command -v go >/dev/null
command -v curl >/dev/null

# 后端目录同时保存源码、产物和运行配置，配置文件由服务器管理。
if [ ! -d "$REPO_DIR" ]; then
  git clone --single-branch --branch master "$REPOSITORY_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"
test "$(git branch --show-current)" = master
# 不覆盖服务器上的源码修改，也不允许产生合并提交。
test -z "$(git status --porcelain)" || { echo "源码目录存在本地改动，请先处理"; exit 1; }
git pull --ff-only origin master
git log -1 --format='正在部署 %h %s'

# 先编译临时文件，失败时正在运行的进程和可执行文件保持可用。
trap 'rm -f "$APP_DIR/my-exp.new"' EXIT
cd "$REPO_DIR/server"
go mod download
go build -trimpath -ldflags="-s -w" -o "$APP_DIR/my-exp.new" .
test -s "$APP_DIR/my-exp.new"
chmod 755 "$APP_DIR/my-exp.new"

# 保存上一版，使用重命名替换文件，避免覆盖正在运行的可执行文件。
if [ -f "$APP_DIR/my-exp" ]; then
  cp -p "$APP_DIR/my-exp" "$APP_DIR/my-exp.bak"
fi
mv -f "$APP_DIR/my-exp.new" "$APP_DIR/my-exp"

# 重启之后等待 HTTP 就绪；自定义端口时设置服务器的 HEALTH_URL。
health_url="${HEALTH_URL:-http://127.0.0.1:8080/health}"
healthy=false
if systemctl restart "$SERVICE_NAME"; then
  for attempt in {1..30}; do
    if systemctl is-active --quiet "$SERVICE_NAME" && curl --fail --silent --max-time 2 "$health_url" >/dev/null; then
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
