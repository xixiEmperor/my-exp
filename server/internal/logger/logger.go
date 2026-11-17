package logger

import (
	"context"
	"fmt"
	"io"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"gopkg.in/natefinch/lumberjack.v2"
)

// Runtime 持有日志文件和切割任务，停机时先停止任务再关闭文件。
type Runtime struct {
	*slog.Logger
	file      *managedFile
	cancel    context.CancelFunc
	done      chan struct{}
	closeOnce sync.Once
	closeErr  error
}

// New 立即检查文件能否打开，启动失败不能悄悄退化成只输出控制台。
func New(cfg Config) (*Runtime, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(cfg.Dir, 0700); err != nil {
		return nil, fmt.Errorf("创建日志目录: %w", err)
	}
	filename := filepath.Join(cfg.Dir, "app.log")
	// 先以受限权限创建文件，已有文件的权限仍由部署环境管理。
	f, err := os.OpenFile(filename, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return nil, fmt.Errorf("打开日志文件: %w", err)
	}
	if err := f.Close(); err != nil {
		return nil, fmt.Errorf("关闭日志文件检查句柄: %w", err)
	}
	file := &lumberjack.Logger{
		Filename: filename, MaxSize: cfg.MaxSizeMB, MaxAge: cfg.MaxAgeDays,
		MaxBackups: cfg.MaxBackups, Compress: cfg.Compress,
		// 备份名固定使用 UTC；日志时间和每日切割使用配置的时区。
		LocalTime: false,
	}
	// Lumberjack 默认延迟打开；空写入提前验证，同时触发历史备份清理。
	if _, err := file.Write(nil); err != nil {
		_ = file.Close()
		return nil, fmt.Errorf("初始化日志文件: %w", err)
	}
	managed := &managedFile{file: file}
	var output io.Writer = fallbackWriter{managed}
	if cfg.Console {
		output = io.MultiWriter(output, os.Stdout)
	}
	location, _ := time.LoadLocation(cfg.Timezone)
	var level slog.Level
	_ = level.UnmarshalText([]byte(cfg.Level))
	options := &slog.HandlerOptions{
		Level: level,
		ReplaceAttr: func(groups []string, attr slog.Attr) slog.Attr {
			// 统一显示配置时区的时间，备份文件名另用 UTC 避免夏令时重名。
			if len(groups) == 0 && attr.Key == slog.TimeKey {
				return slog.Time(slog.TimeKey, attr.Value.Time().In(location))
			}
			return attr
		},
	}
	var handler slog.Handler = slog.NewJSONHandler(output, options)
	if cfg.Format == "text" {
		handler = slog.NewTextHandler(output, options)
	}
	ctx, cancel := context.WithCancel(context.Background())
	runtime := &Runtime{
		Logger: slog.New(handler).With("service", "zhiye-api"),
		file:   managed, cancel: cancel, done: make(chan struct{}),
	}
	if cfg.RotateDaily {
		go runtime.rotateDaily(ctx, location)
	} else {
		close(runtime.done)
	}
	return runtime, nil
}

// Install 接管默认 slog 和标准库 log，第三方的旧日志也进入同一个文件。
func (r *Runtime) Install() {
	slog.SetDefault(r.Logger)
	log.SetFlags(0)
	log.SetOutput(slog.NewLogLogger(r.Logger.With("type", "system").Handler(), slog.LevelInfo).Writer())
}

// Rotate 切割当前文件，并让 Lumberjack 异步压缩和清理备份。
func (r *Runtime) Rotate() error { return r.file.Rotate() }

// Close 可以重复调用，关闭后不再允许业务继续写日志。
func (r *Runtime) Close() error {
	r.closeOnce.Do(func() {
		r.cancel()
		<-r.done
		r.closeErr = r.file.Close()
	})
	return r.closeErr
}

// nextMidnight 使用日历日期计算零点，跨夏令时也不会固定等待 24 小时。
func nextMidnight(now time.Time, location *time.Location) time.Time {
	local := now.In(location)
	return time.Date(local.Year(), local.Month(), local.Day()+1, 0, 0, 0, 0, location)
}

func (r *Runtime) rotateDaily(ctx context.Context, location *time.Location) {
	defer close(r.done)
	for {
		now := time.Now()
		timer := time.NewTimer(nextMidnight(now, location).Sub(now))
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			// 无请求时也切割，避免备份过期却一直没有触发清理。
			if err := r.Rotate(); err != nil {
				r.Error("每日日志切割失败", "type", "system", "error", err)
			}
		}
	}
}

// fallbackWriter 在磁盘写入失败时输出原因和原日志，避免运行故障完全不可见。
type fallbackWriter struct{ writer io.Writer }

func (w fallbackWriter) Write(p []byte) (int, error) {
	n, err := w.writer.Write(p)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "写入日志文件失败: %v\n", err)
		_, _ = os.Stderr.Write(p)
	}
	return n, err
}
