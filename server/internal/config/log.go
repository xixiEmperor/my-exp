package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"zhiye/server/internal/logger"
)

// loadLogConfig 延续系统环境变量优先的规则，空值使用开发默认配置。
// 这里只负责解析和归一化，统一由 logger.New 调用 Validate 校验。
func loadLogConfig() (logger.Config, error) {
	cfg := logger.DefaultConfig()
	for _, item := range []struct {
		name   string
		target *string
	}{
		{"LOG_DIR", &cfg.Dir},
		{"LOG_FORMAT", &cfg.Format},
		{"LOG_LEVEL", &cfg.Level},
		{"LOG_TIMEZONE", &cfg.Timezone},
	} {
		if value := os.Getenv(item.name); value != "" {
			*item.target = strings.TrimSpace(value)
		}
	}
	cfg.Format = strings.ToLower(cfg.Format)
	cfg.Level = strings.ToUpper(cfg.Level)
	for _, item := range []struct {
		name   string
		target *int
	}{
		{"LOG_MAX_SIZE_MB", &cfg.MaxSizeMB},
		{"LOG_MAX_AGE_DAYS", &cfg.MaxAgeDays},
		{"LOG_MAX_BACKUPS", &cfg.MaxBackups},
		{"LOG_SLOW_QUERY_MS", &cfg.SlowQueryMS},
	} {
		if value := os.Getenv(item.name); value != "" {
			number, err := strconv.Atoi(strings.TrimSpace(value))
			if err != nil {
				return logger.Config{}, fmt.Errorf("%s 必须为正整数", item.name)
			}
			*item.target = number
		}
	}
	for _, item := range []struct {
		name   string
		target *bool
	}{
		{"LOG_COMPRESS", &cfg.Compress},
		{"LOG_ROTATE_DAILY", &cfg.RotateDaily},
		{"LOG_CONSOLE", &cfg.Console},
	} {
		if value := os.Getenv(item.name); value != "" {
			flag, err := strconv.ParseBool(strings.TrimSpace(value))
			if err != nil {
				return logger.Config{}, fmt.Errorf("%s 必须为 true 或 false", item.name)
			}
			*item.target = flag
		}
	}
	return cfg, nil
}
