package logger

import (
	"compress/gzip"
	"encoding/json"
	"errors"
	"io"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// 每个测试使用独立目录，避免读写开发日志或真实服务器日志。
func testConfig(t *testing.T) Config {
	t.Helper()
	cfg := DefaultConfig()
	cfg.Dir = t.TempDir()
	cfg.Console = false
	cfg.RotateDaily = false
	cfg.Compress = false
	return cfg
}

func newTestLogger(t *testing.T, cfg Config) *Runtime {
	t.Helper()
	runtime, err := New(cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := runtime.Close(); err != nil {
			t.Error(err)
		}
	})
	return runtime
}

// 异步压缩和清理需要等待完成，只等待可观察的文件状态。
func waitForFiles(t *testing.T, ready func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if ready() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("等待日志文件处理完成超时")
}

// 验证 JSON 格式、日志级别、时区和旧标准库日志的接入。
func TestJSONAndStandardLog(t *testing.T) {
	cfg := testConfig(t)
	runtime := newTestLogger(t, cfg)
	oldDefault, oldWriter, oldFlags, oldPrefix := slog.Default(), log.Writer(), log.Flags(), log.Prefix()
	t.Cleanup(func() {
		slog.SetDefault(oldDefault)
		log.SetOutput(oldWriter)
		log.SetFlags(oldFlags)
		log.SetPrefix(oldPrefix)
	})
	runtime.Install()
	runtime.Debug("不应该输出的调试消息")
	log.Print("标准库日志已接入")
	data, err := os.ReadFile(filepath.Join(cfg.Dir, "app.log"))
	if err != nil {
		t.Fatal(err)
	}
	var entry map[string]any
	if err := json.Unmarshal(data, &entry); err != nil {
		t.Fatalf("日志不是单条 JSON: %v", err)
	}
	if entry["msg"] != "标准库日志已接入" || entry["type"] != "system" || entry["level"] != "INFO" {
		t.Fatalf("标准库日志字段不正确: %v", entry)
	}
	if !strings.HasSuffix(entry["time"].(string), "+08:00") {
		t.Fatalf("未使用上海时间: %v", entry["time"])
	}
}

// 实际跨过 1 MB 上限，确认旧文件保留第一条日志，新文件包含第二条。
func TestRotateBySize(t *testing.T) {
	cfg := testConfig(t)
	cfg.MaxSizeMB = 1
	runtime := newTestLogger(t, cfg)
	payload := strings.Repeat("x", 600*1024)
	runtime.Info("第一条", "payload", payload)
	runtime.Info("第二条", "payload", payload)
	backups, err := filepath.Glob(filepath.Join(cfg.Dir, "app-*.log"))
	if err != nil || len(backups) != 1 {
		t.Fatalf("大小切割没有生成一个备份: %v, %v", backups, err)
	}
	for filename, want := range map[string]string{backups[0]: "第一条", filepath.Join(cfg.Dir, "app.log"): "第二条"} {
		data, err := os.ReadFile(filename)
		if err != nil {
			t.Fatal(err)
		}
		var entry map[string]any
		if err := json.Unmarshal(data, &entry); err != nil || entry["msg"] != want || len(data) > 1024*1024 {
			t.Fatalf("切割后的日志丢失或超过上限: %s, %v", filename, err)
		}
	}
}

// 人工触发和每日任务调用同一个 Rotate，压缩文件必须能够完整解压。
func TestRotateAndCompress(t *testing.T) {
	cfg := testConfig(t)
	cfg.Compress = true
	runtime := newTestLogger(t, cfg)
	runtime.Info("切割前的完整消息")
	if err := runtime.Rotate(); err != nil {
		t.Fatal(err)
	}
	var backups []string
	waitForFiles(t, func() bool {
		backups, _ = filepath.Glob(filepath.Join(cfg.Dir, "app-*.log.gz"))
		plain, _ := filepath.Glob(filepath.Join(cfg.Dir, "app-*.log"))
		return len(backups) == 1 && len(plain) == 0
	})
	f, err := os.Open(backups[0])
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	reader, err := gzip.NewReader(f)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	data, err := io.ReadAll(reader)
	if err != nil || !strings.Contains(string(data), "切割前的完整消息") {
		t.Fatalf("压缩后日志不完整: %v", err)
	}
	runtime.Info("切割后继续写入")
	data, err = os.ReadFile(filepath.Join(cfg.Dir, "app.log"))
	if err != nil || !strings.Contains(string(data), "切割后继续写入") {
		t.Fatalf("新文件不能继续写入: %v", err)
	}
}

// 清理只匹配本程序的备份，过期备份和数量超限备份都应被移除。
func TestCleanupWithoutRequests(t *testing.T) {
	cfg := testConfig(t)
	cfg.MaxBackups = 2
	now := time.Now().UTC()
	var names []string
	for _, age := range []time.Duration{20 * 24 * time.Hour, 3 * time.Hour, 2 * time.Hour, time.Hour} {
		name := filepath.Join(cfg.Dir, "app-"+now.Add(-age).Format("2006-01-02T15-04-05.000")+".log")
		if err := os.WriteFile(name, []byte("历史日志"), 0600); err != nil {
			t.Fatal(err)
		}
		names = append(names, name)
	}
	unrelated := filepath.Join(cfg.Dir, "other.log")
	if err := os.WriteFile(unrelated, []byte("其他程序的日志"), 0600); err != nil {
		t.Fatal(err)
	}
	runtime := newTestLogger(t, cfg)
	waitForFiles(t, func() bool {
		backups, _ := filepath.Glob(filepath.Join(cfg.Dir, "app-*.log"))
		return len(backups) == 2
	})
	for _, name := range names[:2] {
		if _, err := os.Stat(name); !os.IsNotExist(err) {
			t.Fatalf("旧备份没有清理: %s, %v", name, err)
		}
	}
	// 无请求也可以切割空文件，并清理超过数量上限的下一份备份。
	if err := runtime.Rotate(); err != nil {
		t.Fatal(err)
	}
	waitForFiles(t, func() bool {
		_, err := os.Stat(names[2])
		return os.IsNotExist(err)
	})
	if _, err := os.Stat(unrelated); err != nil {
		t.Fatalf("错误删除了其他程序的文件: %v", err)
	}
}

// 备份数量足够时，保留时间仍然独立生效。
func TestCleanupByAge(t *testing.T) {
	cfg := testConfig(t)
	old := filepath.Join(cfg.Dir, "app-"+time.Now().UTC().Add(-15*24*time.Hour).Format("2006-01-02T15-04-05.000")+".log.gz")
	if err := os.WriteFile(old, []byte("过期备份"), 0600); err != nil {
		t.Fatal(err)
	}
	newTestLogger(t, cfg)
	waitForFiles(t, func() bool { _, err := os.Stat(old); return os.IsNotExist(err) })
}

// 验证上海零点和夏令时切换，不依赖测试实际运行时刻。
func TestNextMidnight(t *testing.T) {
	for _, tt := range []struct {
		zone, now, want string
	}{
		{"Asia/Shanghai", "2026-11-14T15:59:00Z", "2026-11-15T00:00:00+08:00"},
		{"America/New_York", "2026-03-08T00:00:00-05:00", "2026-03-09T00:00:00-04:00"},
		{"America/New_York", "2026-11-01T00:00:00-04:00", "2026-11-02T00:00:00-05:00"},
	} {
		location, err := time.LoadLocation(tt.zone)
		if err != nil {
			t.Fatal(err)
		}
		now, err := time.Parse(time.RFC3339, tt.now)
		if err != nil {
			t.Fatal(err)
		}
		if got := nextMidnight(now, location).Format(time.RFC3339); got != tt.want {
			t.Fatalf("%s 的下一次零点 = %s，期望 %s", tt.zone, got, tt.want)
		}
	}
}

// 路径冲突必须阻止启动，不能只在控制台提示后继续运行。
func TestRejectUnwritablePath(t *testing.T) {
	cfg := testConfig(t)
	if err := os.Mkdir(filepath.Join(cfg.Dir, "app.log"), 0700); err != nil {
		t.Fatal(err)
	}
	if runtime, err := New(cfg); err == nil {
		_ = runtime.Close()
		t.Fatal("日志文件路径是目录却仍然初始化成功")
	}
}

// 配置校验由 logger.New 统一负责，直接构造非法配置也不能启动。
func TestRejectInvalidConfig(t *testing.T) {
	cfg := testConfig(t)
	cfg.SlowQueryMS = 0
	if runtime, err := New(cfg); err == nil {
		_ = runtime.Close()
		t.Fatal("非法的慢查询阈值却仍然初始化成功")
	}
}

// 关闭需要取消每日任务，并允许多个调用方安全重复关闭。
func TestCloseStopsDailyTask(t *testing.T) {
	cfg := testConfig(t)
	cfg.RotateDaily = true
	runtime := newTestLogger(t, cfg)
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			if err := runtime.Close(); err != nil {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	select {
	case <-runtime.done:
	default:
		t.Fatal("关闭后每日切割任务仍然运行")
	}
	// Lumberjack 自身允许关闭后重新打开，这一层必须明确拒绝迟到的调用。
	if _, err := runtime.file.Write([]byte("迟到日志")); !errors.Is(err, os.ErrClosed) {
		t.Fatalf("关闭后的日志写入没有拒绝: %v", err)
	}
	if err := runtime.Rotate(); !errors.Is(err, os.ErrClosed) {
		t.Fatalf("关闭后的切割没有拒绝: %v", err)
	}
}
