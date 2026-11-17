package middlewares

import (
	"crypto/rand"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/logger"

	"github.com/gin-gonic/gin"
)

// RequestLog 在恢复中间件外层运行，正常响应和 panic 都记录最终状态。
func RequestLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		begin := time.Now()
		// 自己生成标识，避免客户端伪造重复标识或注入任意日志内容。
		requestID := rand.Text()
		log := slog.Default().With("request_id", requestID)
		c.Request = c.Request.WithContext(logger.WithContext(c.Request.Context(), log))
		c.Header("X-Request-ID", requestID)
		c.Next()

		// 只记录匹配到的路由模板，不记录请求正文、查询参数或任意未匹配路径。
		route := c.FullPath()
		if route == "" {
			route = "[unmatched]"
		}
		status := c.Writer.Status()
		// 请求日志是访问日志：失败原因已经由 handler 或 Recovery 记 ERROR，
		// 这里只对 429 提升到 WARN，避免同一故障重复产生 ERROR 记录。
		level := slog.LevelInfo
		if status == http.StatusTooManyRequests {
			level = slog.LevelWarn
		}
		log.Log(c.Request.Context(), level, "请求处理完成",
			"type", "request", "method", c.Request.Method, "route", route,
			"status", status, "duration_ms", float64(time.Since(begin).Microseconds())/1000,
		)
	}
}

// Recovery 不输出 Gin 默认恢复日志里的请求头，避免 Cookie 和令牌泄露。
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				// panic 值可能包含业务数据，只记录类型和不带变量值的调用栈。
				logger.FromContext(c.Request.Context()).Error("请求处理发生异常",
					"type", "business", "panic_type", fmt.Sprintf("%T", recovered), "stack", string(debug.Stack()),
				)
				if c.Writer.Written() {
					// 已发送的响应不能改写成 JSON，停止后续处理并保留实际状态。
					c.Abort()
					return
				}
				c.AbortWithStatusJSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "服务暂时不可用"))
			}
		}()
		c.Next()
	}
}
