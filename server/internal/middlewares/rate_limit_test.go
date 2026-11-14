package middlewares

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/ulule/limiter/v3"
	limitredis "github.com/ulule/limiter/v3/drivers/store/redis"
)

// 验证次数限制，并确认客户端伪造的转发 IP 不能绕过它。
func TestLoginRateLimit(t *testing.T) {
	store, _ := newTestLimitStore(t)
	r := gin.New()
	r.SetTrustedProxies(nil)
	r.POST("/verify", RateLimit(store, RateLimitOptions{Scope: "auth:verify", Rate: limiter.Rate{Period: time.Minute, Limit: 20}}), func(c *gin.Context) { c.Status(http.StatusOK) })
	for i := 1; i <= 21; i++ {
		req := httptest.NewRequest(http.MethodPost, "/verify", nil)
		req.RemoteAddr = "192.0.2.1:1234"
		req.Header.Set("X-Forwarded-For", "192.0.2.99")
		response := httptest.NewRecorder()
		r.ServeHTTP(response, req)
		want := http.StatusOK
		if i == 21 {
			want = http.StatusTooManyRequests
		}
		if response.Code != want {
			t.Fatalf("请求 %d 状态 = %d，期望 %d", i, response.Code, want)
		}
	}
	// 不同 IP 使用独立窗口。
	req := httptest.NewRequest(http.MethodPost, "/verify", nil)
	req.RemoteAddr = "192.0.2.2:1234"
	response := httptest.NewRecorder()
	r.ServeHTTP(response, req)
	if response.Code != http.StatusOK {
		t.Fatal("不同 IP 不应被同一个窗口限流")
	}
}

// 不同限流器使用同一个 Redis 时共享额度，各业务范围保持独立。
func TestRateLimitSharedStoreAndExpiry(t *testing.T) {
	store, server := newTestLimitStore(t)
	// 另建连接和存储，模拟第二个 Go 实例。
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { client.Close() })
	secondStore, err := limitredis.NewStore(client)
	if err != nil {
		t.Fatal(err)
	}
	options := RateLimitOptions{
		Scope: "login", Rate: limiter.Rate{Period: time.Minute, Limit: 2},
		// 自定义识别方式可以按已验证的用户等业务身份限制请求。
		Key: func(c *gin.Context) string { return "test-user" },
	}
	first := gin.New()
	second := gin.New()
	handler := func(c *gin.Context) { c.Status(http.StatusOK) }
	first.GET("/test", RateLimit(store, options), handler)
	second.GET("/test", RateLimit(secondStore, options), handler)
	options.Scope = "upload"
	second.GET("/upload", RateLimit(secondStore, options), handler)
	request := func(r *gin.Engine, path string) *httptest.ResponseRecorder {
		response := httptest.NewRecorder()
		r.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		return response
	}
	if request(first, "/test").Code != http.StatusOK || request(second, "/test").Code != http.StatusOK {
		t.Fatal("额度内请求不应被拒绝")
	}
	blocked := request(first, "/test")
	if blocked.Code != http.StatusTooManyRequests || blocked.Header().Get("Retry-After") == "" || blocked.Header().Get("X-RateLimit-Remaining") != "0" {
		t.Fatalf("跨实例额度没有正确限制: %d, %v", blocked.Code, blocked.Header())
	}
	if request(second, "/upload").Code != http.StatusOK {
		t.Fatal("不同业务范围不应互相占用额度")
	}
	server.FastForward(time.Minute)
	if request(second, "/test").Code != http.StatusOK {
		t.Fatal("窗口过期后额度未恢复")
	}
}

// 存储故障替身只覆盖本次使用的 Get 方法。
type unavailableLimitStore struct{ limiter.Store }

func (unavailableLimitStore) Get(context.Context, string, limiter.Rate) (limiter.Context, error) {
	return limiter.Context{}, errors.New("Redis 不可用")
}

// 限流检查失败时不执行后续业务，也不能伪装成额度超限。
func TestRateLimitStoreFailure(t *testing.T) {
	r := gin.New()
	called := false
	r.GET("/test", RateLimit(unavailableLimitStore{}, RateLimitOptions{
		Scope: "test", Rate: limiter.Rate{Period: time.Minute, Limit: 2},
	}), func(c *gin.Context) { called = true })
	response := httptest.NewRecorder()
	r.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/test", nil))
	if response.Code != http.StatusServiceUnavailable || called {
		t.Fatalf("存储故障未阻止业务: %d, %v", response.Code, called)
	}
}

// 使用 Redis 脚本实现的存储，测试与生产走相同的计数路径。
func newTestLimitStore(t *testing.T) (limiter.Store, *miniredis.Miniredis) {
	t.Helper()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { client.Close() })
	store, err := limitredis.NewStore(client)
	if err != nil {
		t.Fatal(err)
	}
	return store, server
}
