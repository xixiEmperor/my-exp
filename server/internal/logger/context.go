package logger

import (
	"context"
	"log/slog"
)

// contextKey 使用私有类型，避免和业务上下文键冲突。
type contextKey struct{}

// WithContext 把带 request_id 的日志实例传给 service 和 repository。
func WithContext(ctx context.Context, log *slog.Logger) context.Context {
	return context.WithValue(ctx, contextKey{}, log)
}

// FromContext 在后台任务或未挂载请求中间件时使用默认日志实例。
func FromContext(ctx context.Context) *slog.Logger {
	if log, ok := ctx.Value(contextKey{}).(*slog.Logger); ok && log != nil {
		return log
	}
	return slog.Default()
}
