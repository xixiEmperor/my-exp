package utils

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var (
	// demoIgnoredFileExts 默认忽略的可执行文件、日志、构建缓存及密钥文件后缀。
	demoIgnoredFileExts = map[string]bool{
		".exe":         true,
		".log":         true,
		".tsbuildinfo": true,
		".pem":         true,
		".key":         true,
	}

	// demoArtifactMimeTypes 构建产物常见扩展名对应的 Content-Type 映射。
	demoArtifactMimeTypes = map[string]string{
		".html":  "text/html; charset=utf-8",
		".js":    "text/javascript; charset=utf-8",
		".css":   "text/css; charset=utf-8",
		".json":  "application/json; charset=utf-8",
		".svg":   "image/svg+xml",
		".png":   "image/png",
		".jpg":   "image/jpeg",
		".jpeg":  "image/jpeg",
		".webp":  "image/webp",
		".gif":   "image/gif",
		".ico":   "image/x-icon",
		".woff":  "font/woff",
		".woff2": "font/woff2",
		".wasm":  "application/wasm",
		".txt":   "text/plain; charset=utf-8",
		".map":   "application/json; charset=utf-8",
	}
)

// CheckDemoDir 校验指定路径是否存在且是一个普通文件夹。
// 使用 os.Lstat 而不是 os.Stat，是因为 Lstat 不会自动跟随符号链接，从而能识别并拦截软链接（rejectSymlink 为 true 时）。
func CheckDemoDir(path, label string, rejectSymlink bool) error {
	// os.Lstat 读取路径本身的文件元信息（FileInfo），即使目标是软链接也不会跳转过去。
	info, err := os.Lstat(path)
	if err != nil {
		// errors.Is(err, os.ErrNotExist) 是 Go 推荐的判断“文件或目录不存在”的写法。
		if errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("缺少%s", label)
		}
		return fmt.Errorf("检查%s失败: %w", label, err)
	}
	// info.Mode() 返回文件权限和类型位，用按位与 & os.ModeSymlink 判断是否为软链接。
	if rejectSymlink && info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("%s不允许符号链接", label)
	}
	// info.IsDir() 判断该路径是否为文件夹（而不是普通文件）。
	if !info.IsDir() {
		return fmt.Errorf("%s不是目录", label)
	}
	return nil
}

// ShouldIgnoreSourceEntry 判断文件或目录名是否属于默认忽略的敏感配置（如 .env）或运行产物（如 .log/.exe）。
// 注意 .env.example 等环境变量示例文件会被保留，方便读者参考。
func ShouldIgnoreSourceEntry(name string) bool {
	if name == ".git" || name == ".env" {
		return true
	}
	if strings.HasPrefix(name, ".env.") && !strings.HasSuffix(name, ".example") {
		return true
	}
	return demoIgnoredFileExts[strings.ToLower(filepath.Ext(name))]
}

// NormalizeDemoExcludes 逐条清理排除规则：统一转为 "/" 分隔、去掉末尾斜杠，并禁止 "."、".." 等越界路径。
func NormalizeDemoExcludes(rawExcludes []string) ([]string, error) {
	excludes := make([]string, 0, len(rawExcludes))
	for _, raw := range rawExcludes {
		normalized := strings.TrimRight(strings.ReplaceAll(raw, "\\", "/"), "/")
		if normalized == "" || strings.ContainsAny(normalized, ":*?") {
			return nil, fmt.Errorf("排除规则非法: %s", raw)
		}
		for _, part := range strings.Split(normalized, "/") {
			if part == "" || part == "." || part == ".." {
				return nil, fmt.Errorf("排除规则必须为相对路径: %s", raw)
			}
		}
		excludes = append(excludes, normalized)
	}
	return excludes, nil
}

// DemoArtifactContentType 根据构建产物文件路径的扩展名返回对应的 Content-Type，未知类型回退为 application/octet-stream。
func DemoArtifactContentType(path string) string {
	if ct := demoArtifactMimeTypes[strings.ToLower(filepath.Ext(path))]; ct != "" {
		return ct
	}
	return "application/octet-stream"
}
