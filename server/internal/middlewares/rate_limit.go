package middlewares

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
)

// RateLimitOptions 描述路由额度与识别方式，同一 Scope 共享同一组计数。
type RateLimitOptions struct {
	Scope string
	Rate  limiter.Rate
	// 未指定时按可信代理配置解析的客户端 IP 限流。
	Key func(*gin.Context) string
}

// RateLimit 使用统一存储实现通用请求限流，业务路由只配置额度和作用范围。
func RateLimit(store limiter.Store, options RateLimitOptions) gin.HandlerFunc {
	instance := limiter.New(store, options.Rate)
	key := options.Key
	if key == nil {
		key = func(c *gin.Context) string { return c.ClientIP() }
	}
	return func(c *gin.Context) {
		// 为各业务加独立前缀，避免登录与上传等不同路由互相占用额度。
		result, err := instance.Get(c.Request.Context(), options.Scope+":"+key(c))
		if err != nil {
			// 存储故障不能静默取消限流，具体原因留在服务端日志中。
			log.Printf("请求限流失败 %s: %v", options.Scope, err)
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, dto.Fail(cons.InternalError, "服务暂时不可用"))
			return
		}
		c.Header("X-RateLimit-Limit", strconv.FormatInt(result.Limit, 10))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(result.Remaining, 10))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(result.Reset, 10))
		if result.Reached {
			// 使用窗口实际剩余时间，超限后提示客户端何时可以重试。
			retryAfter := max(int64(1), result.Reset-time.Now().Unix())
			c.Header("Retry-After", strconv.FormatInt(retryAfter, 10))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, dto.Fail(cons.RateLimit, "请求过于频繁，请稍后再试"))
			return
		}
		c.Next()
	}
}
