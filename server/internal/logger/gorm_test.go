package logger

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// 数据库日志只保留慢查询，并携带请求标识，不构建或输出含敏感参数的 SQL。
func TestGORMTrace(t *testing.T) {
	var output bytes.Buffer
	ctx := WithContext(context.Background(), slog.New(slog.NewJSONHandler(&output, nil)).With("request_id", "database-request"))
	log := NewGORM(500 * time.Millisecond)
	sql := func() (string, int64) {
		t.Fatal("数据库日志不应调用生成完整 SQL 的函数")
		return "SELECT private-password", 1
	}
	log.Trace(ctx, time.Now(), sql, nil)
	log.Trace(ctx, time.Now(), sql, gorm.ErrRecordNotFound)
	log.Trace(ctx, time.Now(), sql, errors.New("private-password"))
	if output.Len() != 0 {
		t.Fatalf("普通查询和失败的查询不应记录数据库日志: %s", output.String())
	}
	log.Trace(ctx, time.Now().Add(-time.Second), sql, nil)
	if text := output.String(); !strings.Contains(text, "database-request") || !strings.Contains(text, "数据库慢查询") || strings.Contains(text, "private-password") {
		t.Fatalf("数据库日志字段或敏感数据处理错误: %s", text)
	}
	output.Reset()
	log.LogMode(gormlogger.Silent).Trace(ctx, time.Now().Add(-time.Second), sql, nil)
	if output.Len() != 0 {
		t.Fatal("静默模式仍输出日志")
	}
	log.Trace(ctx, time.Now().Add(-time.Second), sql, nil)
	if output.Len() == 0 {
		t.Fatal("单次查询日志模式影响了原日志实例")
	}
}
