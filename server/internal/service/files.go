package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"zhiye/server/internal/utils"
)

type FileService struct {
	workspaceRoot string
}

func NewFileService() *FileService {
	return &FileService{
		workspaceRoot: "..",
	}
}

// 获取现有 demo
func (s *FileService) GetName(c context.Context) ([]string, error) {
	var names []string

	dirs, err := os.ReadDir("../playground")
	if err != nil {
		return nil, fmt.Errorf("读取目录错误 %s", err.Error())
	}

	for _, dir := range dirs {
		names = append(names, dir.Name())
	}
	return names, nil
}

// 获取目标 demo 的不同变体
func (s *FileService) GetVery(c context.Context, demo_name string) ([]string, error) {
	var names []string
	path := fmt.Sprintf("../playground/%s", demo_name)

	dirs, err := os.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("读取目录错误 %s", err.Error())
	}

	for _, dir := range dirs {
		names = append(names, dir.Name())
	}

	return names, nil
}

// 获取目标 demo 指定变体的源码文件路径，路径相对于变体目录。
func (s *FileService) GetSourcePaths(c context.Context, demo_name, vary_name string) ([]string, error) {
	path, err := s.getVariantPath(demo_name, vary_name)
	if err != nil {
		return nil, err
	}

	// 递归读取整个变体目录，跳过依赖、构建产物及敏感文件，只收集源码文件并统一使用正斜杠返回路径。
	paths := []string{}
	variantPath := path
	err = filepath.WalkDir(path, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if err := c.Err(); err != nil {
			return err
		}
		if path == variantPath {
			return nil
		}

		name := entry.Name()
		if utils.ShouldIgnoreSourceEntry(name) {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.Type()&os.ModeSymlink != 0 {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			if demoIgnoredDirs[name] {
				return filepath.SkipDir
			}
			return nil
		}

		// 去掉变体目录前缀，前端只接收变体内部的文件路径。
		relativePath, err := filepath.Rel(variantPath, path)
		if err != nil {
			return err
		}
		paths = append(paths, filepath.ToSlash(relativePath))
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("读取源码目录错误: %w", err)
	}
	return paths, nil
}

// 获取目标 demo 指定变体在 package.json 中声明的当前版本。
func (s *FileService) GetVersion(c context.Context, demo_name, vary_name string) (string, error) {
	if err := c.Err(); err != nil {
		return "", err
	}
	path, err := s.getVariantPath(demo_name, vary_name)
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(filepath.Join(path, "web", "package.json"))
	if err != nil {
		return "", fmt.Errorf("读取变体版本文件错误: %w", err)
	}

	// 只读取版本字段，不依赖其他包配置。
	var pkg struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return "", fmt.Errorf("解析变体版本文件错误: %w", err)
	}
	if pkg.Version == "" {
		return "", fmt.Errorf("变体版本号为空")
	}
	return pkg.Version, nil
}

// demo 和变体名称必须是单层目录名，避免读取 playground 之外的文件。
func (s *FileService) getVariantPath(demo_name, vary_name string) (string, error) {
	for _, name := range []string{demo_name, vary_name} {
		if !filepath.IsLocal(name) || name == "." || filepath.Base(name) != name {
			return "", fmt.Errorf("demo 或变体名称无效")
		}
	}
	root := s.workspaceRoot
	if root == "" {
		root = ".."
	}
	return filepath.Join(root, "playground", demo_name, vary_name), nil
}
