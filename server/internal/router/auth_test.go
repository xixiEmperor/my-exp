package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/ulule/limiter/v3/drivers/store/memory"
	"gorm.io/gorm"
	"zhiye/server/internal/handler"
	"zhiye/server/internal/model"
	"zhiye/server/internal/service"
)

// 当前用户测试从数据库读取替身取得最新角色，不信任客户端资料。
type currentUserStub struct{ missing bool }

func (s currentUserStub) GetRole(context.Context, uint64) (string, error) { return "admin", nil }
func (s currentUserStub) FindUserByID(context.Context, uint64) (*model.Users, error) {
	if s.missing {
		return nil, gorm.ErrRecordNotFound
	}
	return &model.Users{ID: 1, Name: "当前用户", Role: "admin", OpenID: "private-openid"}, nil
}

// 验证有效、缺失、伪造、过期令牌和已删除用户的恢复行为。
func TestCurrentUser(t *testing.T) {
	t.Setenv("JWT_SECRET", "current-user-test-secret")
	token, err := service.NewAuthService(nil, nil).GenerateToken(1)
	if err != nil {
		t.Fatal(err)
	}
	// 使用真实签名的过期令牌，确保过期与伪造两条路径都被拒绝。
	expired, err := jwt.NewWithClaims(jwt.SigningMethodHS256, service.Claims{
		UserID:           1,
		RegisteredClaims: jwt.RegisteredClaims{Issuer: "my-exp", ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute))},
	}).SignedString([]byte("current-user-test-secret"))
	if err != nil {
		t.Fatal(err)
	}
	for _, tt := range []struct {
		name, token string
		missing     bool
		status      int
	}{
		{"有效身份", token, false, http.StatusOK},
		{"没有身份", "", false, http.StatusUnauthorized},
		{"伪造身份", "forged-token", false, http.StatusUnauthorized},
		{"身份过期", expired, false, http.StatusUnauthorized},
		{"用户已删除", token, true, http.StatusUnauthorized},
	} {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			registerAuthRouter(r.Group("/api/v1"), handler.NewAuthHandler(nil, "callback", true), currentUserStub{missing: tt.missing}, memory.NewStore())
			req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
			if tt.token != "" {
				req.AddCookie(&http.Cookie{Name: "token", Value: tt.token})
			}
			response := httptest.NewRecorder()
			r.ServeHTTP(response, req)
			if response.Code != tt.status {
				t.Fatalf("状态 = %d，期望 %d", response.Code, tt.status)
			}
			if tt.status == http.StatusOK && (!strings.Contains(response.Body.String(), "当前用户") || strings.Contains(response.Body.String(), "private-openid") || response.Header().Get("Cache-Control") != "no-store") {
				t.Fatalf("资料或缓存配置错误: %s", response.Body.String())
			}
		})
	}
}
