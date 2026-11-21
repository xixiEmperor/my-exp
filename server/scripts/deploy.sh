#!/usr/bin/env bash
# 在本机 Git Bash 或 Linux、macOS 的 Bash 中执行部署。
set -Eeuo pipefail
TARGET="${1:?用法: bash server/scripts/deploy.sh 用户@服务器 [SSH私钥路径]}"
SSH_PORT="${SSH_PORT:-22}"
TARGET_ARCH="${TARGET_ARCH:-amd64}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/health}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# 源码单独放在服务器子目录，不覆盖运行目录中的 .env 和数据。
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
REMOTE_SOURCE_DIR="${REMOTE_SOURCE_DIR:-/var/www/my-exp/source}"
SSH_ARGS=(-p "$SSH_PORT" -o ConnectTimeout=30)
SCP_ARGS=(-P "$SSH_PORT" -o ConnectTimeout=30)
if [ -n "${2:-}" ]; then
  SSH_ARGS+=(-i "$2")
  SCP_ARGS+=(-i "$2")
fi
# 根据服务器架构交叉编译，默认适用于 x86_64 服务器。
case "$TARGET_ARCH" in
  amd64|arm64) ;;
  *) echo "TARGET_ARCH 只能是 amd64 或 arm64"; exit 1 ;;
esac
command -v go >/dev/null
command -v git >/dev/null
command -v ssh >/dev/null
command -v scp >/dev/null
# 编译与服务器源码使用同一提交，部署前先提交并推送当前代码。
DEPLOY_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$(git -C "$REPO_ROOT" symbolic-ref --quiet --short HEAD || true)}"
DEPLOY_REPO_URL="${DEPLOY_REPO_URL:-$(git -C "$REPO_ROOT" config --get remote.origin.url || true)}"
if [ -z "$DEPLOY_BRANCH" ] || [ -z "$DEPLOY_REPO_URL" ]; then
  echo "请配置 DEPLOY_BRANCH 和 DEPLOY_REPO_URL，或在有 origin 的本地分支部署"
  exit 1
fi
git check-ref-format --branch "$DEPLOY_BRANCH" >/dev/null
# 未提交和未跟踪的后端源码不会出现在服务器的 git pull 中。
ensure_clean_sources() {
  if ! git -C "$REPO_ROOT" diff --quiet HEAD -- server demos || \
    [ -n "$(git -C "$REPO_ROOT" ls-files --others --exclude-standard -- server demos)" ]; then
    echo "server 或 demos 中有未提交文件，请提交并推送后再部署"
    exit 1
  fi
}
ensure_clean_sources
BUILD_DIR="$(mktemp -d)"
REMOTE_FILE="/var/www/my-exp/.my-exp-$(basename "$BUILD_DIR").new"
REMOTE_STARTED=false
# 使用独立临时文件，退出时只清理本次部署的文件。
cleanup() {
  rm -rf -- "$BUILD_DIR"
  if [ "$REMOTE_STARTED" = true ]; then
    ssh "${SSH_ARGS[@]}" "$TARGET" "rm -f '$REMOTE_FILE'" || true
  fi
}
trap cleanup EXIT

echo "正在本机编译 linux/$TARGET_ARCH"
cd "$SCRIPT_DIR/.."
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
go mod download
CGO_ENABLED=0 GOOS=linux GOARCH="$TARGET_ARCH" \
  go build -trimpath -ldflags="-s -w" -o "$BUILD_DIR/my-exp" .
# 编译可能补充依赖文件，也可能遇到本机编辑，上传前再次检查。
ensure_clean_sources
# 防止 Windows Git Bash 自动转换服务器上的 Linux 路径。
export MSYS_NO_PATHCONV=1
ssh "${SSH_ARGS[@]}" "$TARGET" 'mkdir -p /var/www/my-exp'
REMOTE_STARTED=true
echo "正在上传 Linux 可执行文件"
scp "${SCP_ARGS[@]}" "$BUILD_DIR/my-exp" "$TARGET:$REMOTE_FILE"
# 重启脚本通过 SSH 标准输入执行，上传的文件只有可执行文件。
printf -v REMOTE_COMMAND 'bash -s -- %q %q %q %q %q %q' \
  "$REMOTE_FILE" "$HEALTH_URL" "$REMOTE_SOURCE_DIR" "$DEPLOY_REPO_URL" "$DEPLOY_BRANCH" "$DEPLOY_COMMIT"
ssh "${SSH_ARGS[@]}" "$TARGET" "$REMOTE_COMMAND" < "$SCRIPT_DIR/restart.sh"
