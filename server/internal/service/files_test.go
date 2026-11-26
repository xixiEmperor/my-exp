package service

import (
	"context"
	"path/filepath"
	"reflect"
	"sort"
	"testing"
)

func TestFileServiceGetSourcePathsExcludesBuildAndDependencyDirs(t *testing.T) {
	root := t.TempDir()
	variantDir := filepath.Join(root, "playground", "virtual-list", "fixed-height")

	// 应返回的源码与配置文件
	writeTestFile(t, filepath.Join(variantDir, "web", "src", "App.tsx"), []byte("export default function App() {}"))
	writeTestFile(t, filepath.Join(variantDir, "web", "package.json"), []byte(`{"name":"demo","version":"1.0.0"}`))
	writeTestFile(t, filepath.Join(variantDir, "web", ".env.example"), []byte("VITE_API=http://localhost:8080"))
	writeTestFile(t, filepath.Join(variantDir, "README.md"), []byte("# Demo"))

	// 不应返回的构建产物、依赖目录与敏感/运行产物文件
	writeTestFile(t, filepath.Join(variantDir, "web", "dist", "index.html"), []byte("<html></html>"))
	writeTestFile(t, filepath.Join(variantDir, "web", "dist", "assets", "index.js"), []byte("console.log(1)"))
	writeTestFile(t, filepath.Join(variantDir, "web", "node_modules", "react", "index.js"), []byte("module.exports={}"))
	writeTestFile(t, filepath.Join(variantDir, "node_modules", "pkg", "index.js"), []byte("module.exports={}"))
	writeTestFile(t, filepath.Join(variantDir, "dist", "bundle.js"), []byte("bundle"))
	writeTestFile(t, filepath.Join(variantDir, "web", ".git", "HEAD"), []byte("ref: refs/heads/main"))
	writeTestFile(t, filepath.Join(variantDir, "web", ".vite", "deps", "react.js"), []byte("vite"))
	writeTestFile(t, filepath.Join(variantDir, "web", ".env"), []byte("SECRET=123"))
	writeTestFile(t, filepath.Join(variantDir, "web", ".env.local"), []byte("SECRET=456"))
	writeTestFile(t, filepath.Join(variantDir, "web", "debug.log"), []byte("log"))

	svc := &FileService{workspaceRoot: root}
	got, err := svc.GetSourcePaths(context.Background(), "virtual-list", "fixed-height")
	if err != nil {
		t.Fatalf("GetSourcePaths 返回错误: %v", err)
	}

	sort.Strings(got)
	want := []string{
		"README.md",
		"web/.env.example",
		"web/package.json",
		"web/src/App.tsx",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("GetSourcePaths() = %v, want %v", got, want)
	}
}

func TestFileServiceGetSourcePathsRejectsInvalidNames(t *testing.T) {
	svc := &FileService{workspaceRoot: t.TempDir()}

	for _, tc := range []struct {
		demo string
		vary string
	}{
		{"../secret", "fixed-height"},
		{"virtual-list", "../secret"},
		{".", "fixed-height"},
		{"virtual-list", "a/b"},
	} {
		if _, err := svc.GetSourcePaths(context.Background(), tc.demo, tc.vary); err == nil {
			t.Fatalf("期望非法参数 (%q, %q) 返回错误", tc.demo, tc.vary)
		}
	}
}
