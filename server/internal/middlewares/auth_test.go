package middlewares

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/model"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

// 模拟用户查询，验证有效令牌不会因为查询失败而变成游客。
type testUserInfoReader struct {
	user *model.Users
	err  error
}

func (r testUserInfoReader) GetRole(context.Context, uint64) (string, error) {
	return "user", r.err
}

func (r testUserInfoReader) FindUserByID(context.Context, uint64) (*model.Users, error) {
	return r.user, r.err
}

// 同时验证正常用户、查询失败和空用户三条身份传递路径。
func TestOptionalAuthUserLookup(t *testing.T) {
	t.Setenv("JWT_SECRET", "article-auth-test-secret")
	token, err := service.NewAuthService(nil, nil).GenerateToken(1)
	if err != nil {
		t.Fatal(err)
	}
	for _, tt := range []struct {
		name       string
		reader     testUserInfoReader
		wantStatus int
	}{
		{"非管理员登录", testUserInfoReader{user: &model.Users{ID: 1, Role: "user"}}, http.StatusOK},
		{"查询失败", testUserInfoReader{err: errors.New("数据库查询失败")}, http.StatusInternalServerError},
		{"空用户", testUserInfoReader{}, http.StatusUnauthorized},
	} {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			called := false
			router.GET("/articles/content", OptionalAuth(tt.reader), func(c *gin.Context) {
				called = true
				// 下游必须能拿到非管理员身份，才能返回完整正文并移除分隔符。
				user, ok := c.Request.Context().Value(cons.CtxUserInfo).(*model.Users)
				if !ok || user == nil || user.Role != "user" {
					t.Fatal("登录身份未传递到正文请求")
				}
				c.Status(http.StatusOK)
			})
			req := httptest.NewRequest(http.MethodGet, "/articles/content", nil)
			req.AddCookie(&http.Cookie{Name: TokenCookieName, Value: token})
			response := httptest.NewRecorder()
			router.ServeHTTP(response, req)
			if response.Code != tt.wantStatus {
				t.Fatalf("状态码 = %d, want %d", response.Code, tt.wantStatus)
			}
			if called != (tt.wantStatus == http.StatusOK) {
				t.Fatal("查询失败时不应继续获取游客预览")
			}
		})
	}
}
