#!/usr/bin/env bash
# 在本机 Git Bash 或 Linux、macOS 的 Bash 中执行部署。
set -Eeuo pipefail
TARGET="${1:?用法: bash server/scripts/deploy.sh 用户@服务器 [SSH私钥路径]}"
SSH_PORT="${SSH_PORT:-22}"
TARGET_ARCH="${TARGET_ARCH:-amd64}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/health}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
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
command -v ssh >/dev/null
command -v scp >/dev/null
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
# 防止 Windows Git Bash 自动转换服务器上的 Linux 路径。
export MSYS_NO_PATHCONV=1
ssh "${SSH_ARGS[@]}" "$TARGET" 'mkdir -p /var/www/my-exp'
REMOTE_STARTED=true
echo "正在上传 Linux 可执行文件"
scp "${SCP_ARGS[@]}" "$BUILD_DIR/my-exp" "$TARGET:$REMOTE_FILE"
# 重启脚本通过 SSH 标准输入执行，上传的文件只有可执行文件。
printf -v REMOTE_COMMAND 'bash -s -- %q %q' "$REMOTE_FILE" "$HEALTH_URL"
ssh "${SSH_ARGS[@]}" "$TARGET" "$REMOTE_COMMAND" < "$SCRIPT_DIR/restart.sh"
