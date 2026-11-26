package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestResolveWorkspaceRootFrom(t *testing.T) {
	t.Run("服务器部署目录结构优先命中source", func(t *testing.T) {
		appDir := t.TempDir()
		sourceDir := filepath.Join(appDir, "source")
		writeTestFile(t, filepath.Join(sourceDir, "server", "go.mod"), []byte("module zhiye/server\n"))
		if err := os.MkdirAll(filepath.Join(sourceDir, demoRootDir), 0o755); err != nil {
			t.Fatal(err)
		}

		got := resolveWorkspaceRootFrom(appDir, appDir)
		if got != sourceDir {
			t.Fatalf("resolveWorkspaceRootFrom() = %q, want %q", got, sourceDir)
		}
	})

	t.Run("服务器尚未创建playground时按server/go.mod定位source", func(t *testing.T) {
		appDir := t.TempDir()
		sourceDir := filepath.Join(appDir, "source")
		writeTestFile(t, filepath.Join(sourceDir, "server", "go.mod"), []byte("module zhiye/server\n"))

		got := resolveWorkspaceRootFrom(appDir, appDir)
		if got != sourceDir {
			t.Fatalf("resolveWorkspaceRootFrom() = %q, want %q", got, sourceDir)
		}
	})

	t.Run("本地server目录运行air或go run命中上级目录", func(t *testing.T) {
		repoDir := t.TempDir()
		serverDir := filepath.Join(repoDir, "server")
		tmpDir := filepath.Join(serverDir, "tmp")
		writeTestFile(t, filepath.Join(serverDir, "go.mod"), []byte("module zhiye/server\n"))
		if err := os.MkdirAll(filepath.Join(repoDir, demoRootDir), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.MkdirAll(tmpDir, 0o755); err != nil {
			t.Fatal(err)
		}

		got := resolveWorkspaceRootFrom(serverDir, tmpDir)
		if got != repoDir {
			t.Fatalf("resolveWorkspaceRootFrom() = %q, want %q", got, repoDir)
		}
	})

	t.Run("跨目录启动可执行文件时按二进制位置回退", func(t *testing.T) {
		otherCwd := t.TempDir()
		appDir := t.TempDir()
		sourceDir := filepath.Join(appDir, "source")
		writeTestFile(t, filepath.Join(sourceDir, "server", "go.mod"), []byte("module zhiye/server\n"))

		got := resolveWorkspaceRootFrom(otherCwd, appDir)
		if got != sourceDir {
			t.Fatalf("resolveWorkspaceRootFrom() = %q, want %q", got, sourceDir)
		}
	})
}

func TestFileServiceUsesConfiguredDemoSourceRoot(t *testing.T) {
	demoRoot := t.TempDir()
	variantDir := filepath.Join(demoRoot, "virtual-list", "fixed-height")
	writeTestFile(t, filepath.Join(variantDir, "web", "package.json"), []byte(`{"version":"1.2.3"}`))

	svc := NewFileService(demoRoot)

	demos, err := svc.GetName(context.Background())
	if err != nil || len(demos) != 1 || demos[0] != "virtual-list" {
		t.Fatalf("GetName() = %v, %v", demos, err)
	}

	variants, err := svc.GetVery(context.Background(), "virtual-list")
	if err != nil || len(variants) != 1 || variants[0] != "fixed-height" {
		t.Fatalf("GetVery() = %v, %v", variants, err)
	}

	version, err := svc.GetVersion(context.Background(), "virtual-list", "fixed-height")
	if err != nil || version != "1.2.3" {
		t.Fatalf("GetVersion() = %q, %v", version, err)
	}
}
