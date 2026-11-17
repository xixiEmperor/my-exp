package logger

import (
	"context"
	"time"

	gormlogger "gorm.io/gorm/logger"
)

// GORMLogger 只记录慢查询元信息，不记录 SQL 或查询参数。
type GORMLogger struct {
	level     gormlogger.LogLevel
	threshold time.Duration
}

// NewGORM 把数据库日志接入默认日志实例，并指定慢查询的判断时长。
func NewGORM(threshold time.Duration) *GORMLogger {
	return &GORMLogger{level: gormlogger.Warn, threshold: threshold}
}

// LogMode 返回独立副本，单次查询的日志设置不会影响其他并发请求。
func (l *GORMLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	copy := *l
	copy.level = level
	return &copy
}

// GORM 的格式化消息可能包含 SQL 和参数，只保留事件类型。
func (l *GORMLogger) Info(ctx context.Context, _ string, _ ...interface{}) {
	if l.level >= gormlogger.Info {
		FromContext(ctx).Debug("数据库诊断事件", "type", "database")
	}
}

func (l *GORMLogger) Warn(ctx context.Context, _ string, _ ...interface{}) {
	if l.level >= gormlogger.Warn {
		FromContext(ctx).Warn("数据库警告事件", "type", "database")
	}
}

func (l *GORMLogger) Error(ctx context.Context, _ string, _ ...interface{}) {
	if l.level >= gormlogger.Error {
		FromContext(ctx).Error("数据库错误事件", "type", "database")
	}
}

// Trace 只保留慢查询；查询失败由请求边界的业务日志记录具体原因，避免同一故障重复落盘。
func (l *GORMLogger) Trace(ctx context.Context, begin time.Time, _ func() (string, int64), _ error) {
	if l.level == gormlogger.Silent {
		return
	}
	elapsed := time.Since(begin)
	if elapsed >= l.threshold && l.level >= gormlogger.Warn {
		FromContext(ctx).With("type", "database", "duration_ms", float64(elapsed.Microseconds())/1000).Warn("数据库慢查询")
	}
}
