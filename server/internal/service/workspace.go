package service

import (
	"os"
	"path/filepath"
	"strings"
)

// ResolveWorkspaceRoot 按“服务器部署结构优先、本地开发结构兜底”的顺序探测项目仓库根目录。
// 服务器部署（deploy.sh / restart.sh）运行目录为 /var/www/my-exp，源码仓库位于 ./source；
// 本地开发（air 或 go run .）通常在 server 目录下运行，源码仓库位于上级目录 ..。
func ResolveWorkspaceRoot() string {
	cwd, _ := os.Getwd()
	var exeDir string
	if exePath, err := os.Executable(); err == nil {
		exeDir = filepath.Dir(exePath)
	}
	return resolveWorkspaceRootFrom(cwd, exeDir)
}

// resolveWorkspaceRootFrom 根据当前工作目录和可执行文件所在目录依次探测仓库根目录。
func resolveWorkspaceRootFrom(cwd, exeDir string) string {
	var candidates []string
	seen := make(map[string]bool)
	addCandidate := func(path string) {
		if strings.TrimSpace(path) == "" {
			return
		}
		cleaned := filepath.Clean(path)
		if !seen[cleaned] {
			seen[cleaned] = true
			candidates = append(candidates, cleaned)
		}
	}

	// 1. 优先按进程工作目录（CWD）探测：先匹配服务器部署的 ./source，再兼容本地 server/ 的 .. 和仓库根目录 .。
	if cwd != "" {
		addCandidate(filepath.Join(cwd, "source"))
		addCandidate(filepath.Join(cwd, ".."))
		addCandidate(cwd)
	}

	// 2. 再按可执行文件位置探测：兼容未切换工作目录直接运行二进制（/var/www/my-exp/my-exp、server/*.exe、server/tmp/*.exe）。
	if exeDir != "" {
		addCandidate(filepath.Join(exeDir, "source"))
		addCandidate(filepath.Join(exeDir, ".."))
		addCandidate(filepath.Join(exeDir, "..", ".."))
	}

	// 第一轮优先命中已存在 demo 根目录（playground）的路径。
	for _, dir := range candidates {
		if isExistingDir(filepath.Join(dir, demoRootDir)) {
			return dir
		}
	}

	// 第二轮兜底命中包含 server/go.mod 的仓库根目录（restart.sh 已校验该文件存在，即使尚未创建 playground 也能正确定位）。
	for _, dir := range candidates {
		if isExistingFile(filepath.Join(dir, "server", "go.mod")) {
			return dir
		}
	}

	return ".."
}

func isExistingDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func isExistingFile(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
