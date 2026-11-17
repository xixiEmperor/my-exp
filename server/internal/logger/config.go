package logger

import (
	"fmt"
	"strings"
	"time"
	_ "time/tzdata" // 内嵌时区数据，服务器没有安装时区文件时也能按上海时间切割。
)

// Config 集中描述输出和备份策略，同一个日志文件只能由一个进程管理。
type Config struct {
	Dir         string
	Format      string
	Level       string
	MaxSizeMB   int
	MaxAgeDays  int
	MaxBackups  int
	Compress    bool
	RotateDaily bool
	Console     bool
	Timezone    string
	// SlowQueryMS 是 GORM 慢查询的判定阈值，和文件切割参数一样在启动时读取。
	SlowQueryMS int
}

// DefaultConfig 在本地也写文件，生产环境可以关闭控制台输出。
func DefaultConfig() Config {
	return Config{
		Dir: "logs", Format: "json", Level: "INFO",
		MaxSizeMB: 100, MaxAgeDays: 14, MaxBackups: 100,
		Compress: true, RotateDaily: true, Console: true, Timezone: "Asia/Shanghai",
		SlowQueryMS: 500,
	}
}

// Validate 拒绝无效配置，避免启动后才发现切割或清理没有生效。
func (c Config) Validate() error {
	if strings.TrimSpace(c.Dir) == "" {
		return fmt.Errorf("LOG_DIR 不能为空")
	}
	if c.Format != "json" && c.Format != "text" {
		return fmt.Errorf("LOG_FORMAT 必须为 json 或 text")
	}

	switch strings.ToUpper(c.Level) {
	case "DEBUG", "INFO", "WARN", "ERROR":
	default:
		return fmt.Errorf("LOG_LEVEL 必须为 DEBUG、INFO、WARN 或 ERROR")
	}

	for _, item := range []struct {
		name  string
		value int
	}{
		{"LOG_MAX_SIZE_MB", c.MaxSizeMB},
		{"LOG_MAX_AGE_DAYS", c.MaxAgeDays},
		{"LOG_MAX_BACKUPS", c.MaxBackups},
		{"LOG_SLOW_QUERY_MS", c.SlowQueryMS},
	} {
		if item.value <= 0 {
			return fmt.Errorf("%s 必须为正整数", item.name)
		}
	}

	// 防止极大的配置在转换为字节数或时长时溢出，造成错误切割或误清理。
	if uint64(c.MaxSizeMB) > uint64(1<<63-1)/(1024*1024) {
		return fmt.Errorf("LOG_MAX_SIZE_MB 超出支持范围")
	}
	if uint64(c.MaxAgeDays) > uint64(1<<63-1)/uint64(24*time.Hour) {
		return fmt.Errorf("LOG_MAX_AGE_DAYS 超出支持范围")
	}
	if uint64(c.SlowQueryMS) > uint64(1<<63-1)/uint64(time.Millisecond) {
		return fmt.Errorf("LOG_SLOW_QUERY_MS 超出支持范围")
	}
	if _, err := time.LoadLocation(c.Timezone); err != nil {
		return fmt.Errorf("LOG_TIMEZONE 不是有效时区: %w", err)
	}
	return nil
}
