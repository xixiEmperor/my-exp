package middlewares

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"zhiye/server/internal/logger"

	"github.com/gin-gonic/gin"
)

// 捕获结构化日志，测试结束后恢复全局日志，不创建任何实际日志文件。
func captureLogs(t *testing.T) *bytes.Buffer {
	t.Helper()
	var output bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() { slog.SetDefault(previous) })
	return &output
}

func decodeEntries(t *testing.T, output *bytes.Buffer) []map[string]any {
	t.Helper()
	var entries []map[string]any
	for _, line := range strings.Split(strings.TrimSpace(output.String()), "\n") {
		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			t.Fatalf("日志不是合法 JSON: %v", err)
		}
		entries = append(entries, entry)
	}
	return entries
}

// 请求日志和业务错误共享标识，不接受客户端注入的标识或敏感请求数据。
func TestRequestLogAndBusinessError(t *testing.T) {
	output := captureLogs(t)
	router := gin.New()
	router.Use(RequestLog(), Recovery())
	router.POST("/articles/:id", func(c *gin.Context) {
		logger.FromContext(c.Request.Context()).Error("保存失败", "type", "business", "error", errors.New("数据库不可用"))
		c.Status(http.StatusInternalServerError)
	})
	request := httptest.NewRequest(http.MethodPost, "/articles/private-id?token=private-query", strings.NewReader("private-body"))
	request.Header.Set("Authorization", "Bearer private-token")
	request.Header.Set("Cookie", "token=private-cookie")
	request.Header.Set("X-Request-ID", "private-client-id")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	requestID := response.Header().Get("X-Request-ID")
	if requestID == "" || requestID == "private-client-id" {
		t.Fatal("未生成独立的请求标识")
	}
	entries := decodeEntries(t, output)
	if len(entries) != 2 {
		t.Fatalf("期望一条业务错误和一条请求日志，实际 %d 条", len(entries))
	}
	for _, entry := range entries {
		if entry["request_id"] != requestID {
			t.Fatalf("日志请求标识与响应不一致: %v", entry)
		}
	}
	entry := entries[1]
	if entry["type"] != "request" || entry["route"] != "/articles/:id" || entry["status"] != float64(500) || entry["level"] != "INFO" || entry["duration_ms"] == nil {
		t.Fatalf("请求日志字段不正确: %v", entry)
	}
	if strings.Contains(output.String(), "private-") {
		t.Fatalf("敏感请求数据进入日志: %s", output.String())
	}
}

// 异常恢复只输出调用栈和类型，不把 panic 值或请求头写入日志。
func TestRecoveryLog(t *testing.T) {
	output := captureLogs(t)
	router := gin.New()
	router.Use(RequestLog(), Recovery())
	router.GET("/panic", func(c *gin.Context) { panic("private-panic-value") })
	request := httptest.NewRequest(http.MethodGet, "/panic", nil)
	request.Header.Set("Cookie", "token=private-cookie")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusInternalServerError || strings.Contains(response.Body.String(), "private-") {
		t.Fatalf("异常响应不正确: %d, %s", response.Code, response.Body.String())
	}
	entries := decodeEntries(t, output)
	if len(entries) != 2 || entries[0]["stack"] == nil || entries[0]["panic_type"] != "string" || entries[1]["status"] != float64(500) {
		t.Fatalf("异常恢复没有记录堆栈或最终响应: %v", entries)
	}
	if strings.Contains(output.String(), "private-") {
		t.Fatalf("异常恢复泄露了敏感数据: %s", output.String())
	}
}

// 请求日志是访问日志：预期状态保持 INFO，只有超限使用 WARN，未匹配的原始路径不写入日志。
func TestRequestStatusLevels(t *testing.T) {
	for _, tt := range []struct {
		status int
		level  string
	}{
		{http.StatusUnauthorized, "INFO"}, {http.StatusTooManyRequests, "WARN"},
		{http.StatusInternalServerError, "INFO"},
	} {
		t.Run(tt.level, func(t *testing.T) {
			output := captureLogs(t)
			router := gin.New()
			router.Use(RequestLog(), Recovery())
			router.GET("/status", func(c *gin.Context) { c.Status(tt.status) })
			router.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/status", nil))
			if entries := decodeEntries(t, output); len(entries) != 1 || entries[0]["level"] != tt.level {
				t.Fatalf("响应状态的日志级别不正确: %v", entries)
			}
		})
	}
	output := captureLogs(t)
	router := gin.New()
	router.Use(RequestLog(), Recovery())
	router.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/private-path", nil))
	if entries := decodeEntries(t, output); entries[0]["route"] != "[unmatched]" || strings.Contains(output.String(), "private-path") {
		t.Fatalf("未匹配路径进入日志: %v", entries)
	}
}
