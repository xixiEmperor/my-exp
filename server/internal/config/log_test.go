package config

import (
	"testing"

	"zhiye/server/internal/logger"
)

// 日志配置测试隔离机器环境，避免读取开发者自己的日志策略。
func clearLogEnv(t *testing.T) {
	t.Helper()
	for _, name := range []string{
		"LOG_DIR", "LOG_FORMAT", "LOG_LEVEL", "LOG_TIMEZONE", "LOG_MAX_SIZE_MB",
		"LOG_MAX_AGE_DAYS", "LOG_MAX_BACKUPS", "LOG_SLOW_QUERY_MS", "LOG_COMPRESS", "LOG_ROTATE_DAILY", "LOG_CONSOLE",
	} {
		t.Setenv(name, "")
	}
}

func TestLogConfigDefaultsAndOverrides(t *testing.T) {
	clearLogEnv(t)
	cfg, err := loadLogConfig()
	if err != nil || cfg != logger.DefaultConfig() {
		t.Fatalf("默认日志配置不正确: %+v, %v", cfg, err)
	}
	t.Setenv("LOG_DIR", "server-logs")
	t.Setenv("LOG_FORMAT", "TEXT")
	t.Setenv("LOG_LEVEL", "warn")
	t.Setenv("LOG_MAX_SIZE_MB", "10")
	t.Setenv("LOG_MAX_AGE_DAYS", "7")
	t.Setenv("LOG_MAX_BACKUPS", "20")
	t.Setenv("LOG_SLOW_QUERY_MS", "800")
	t.Setenv("LOG_COMPRESS", "false")
	t.Setenv("LOG_ROTATE_DAILY", "false")
	t.Setenv("LOG_CONSOLE", "false")
	t.Setenv("LOG_TIMEZONE", "UTC")
	cfg, err = loadLogConfig()
	if err != nil || cfg.Dir != "server-logs" || cfg.Format != "text" || cfg.Level != "WARN" || cfg.MaxSizeMB != 10 || cfg.MaxAgeDays != 7 || cfg.MaxBackups != 20 || cfg.SlowQueryMS != 800 || cfg.Compress || cfg.RotateDaily || cfg.Console || cfg.Timezone != "UTC" {
		t.Fatalf("环境变量没有生效: %+v, %v", cfg, err)
	}
}

// 错误配置必须在启动阶段被拒绝，尤其不能把零误当成禁用清理。
// 解析和校验分属 parser 与 logger.Config.Validate，这里按启动时的真实顺序组合。
func TestRejectInvalidLogConfig(t *testing.T) {
	for _, tt := range []struct{ name, value string }{
		{"LOG_DIR", "   "}, {"LOG_FORMAT", "xml"}, {"LOG_LEVEL", "invalid"},
		{"LOG_TIMEZONE", "Invalid/Zone"}, {"LOG_MAX_SIZE_MB", "0"},
		{"LOG_LEVEL", "INFO+2"}, {"LOG_MAX_AGE_DAYS", "106752"},
		{"LOG_MAX_SIZE_MB", "abc"}, {"LOG_MAX_AGE_DAYS", "-1"},
		{"LOG_MAX_BACKUPS", "0"}, {"LOG_SLOW_QUERY_MS", "0"},
		{"LOG_SLOW_QUERY_MS", "abc"}, {"LOG_COMPRESS", "invalid"},
		{"LOG_ROTATE_DAILY", "invalid"}, {"LOG_CONSOLE", "invalid"},
	} {
		t.Run(tt.name+tt.value, func(t *testing.T) {
			clearLogEnv(t)
			t.Setenv(tt.name, tt.value)
			cfg, err := loadLogConfig()
			if err == nil {
				err = cfg.Validate()
			}
			if err == nil {
				t.Fatalf("非法配置 %s=%s 没有阻止启动", tt.name, tt.value)
			}
		})
	}
}
