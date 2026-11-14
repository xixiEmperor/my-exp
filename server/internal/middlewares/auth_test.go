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
	"gorm.io/gorm"
)

// 模拟用户查询，验证有效令牌不会因为查询失败而变成游客。
type testUserInfoReader struct {
	user *model.Users
	err  error
}

// 记录用户查询次数，确保管理员鉴权不会重复查库。
type countingUserReader struct {
	user  *model.Users
	err   error
	calls int
}

func (r *countingUserReader) FindUserByID(context.Context, uint64) (*model.Users, error) {
	r.calls++
	return r.user, r.err
}

// 必须登录始终传递完整用户，管理员角色判断复用本次查询结果。
func TestMustLoginAndAdmin(t *testing.T) {
	t.Setenv("JWT_SECRET", "must-login-test-secret")
	token, err := service.NewAuthService(nil, nil).GenerateToken(1)
	if err != nil {
		t.Fatal(err)
	}
	for _, tt := range []struct {
		name    string
		token   string
		user    *model.Users
		err     error
		admin   bool
		status  int
		queries int
	}{
		{"普通用户", token, &model.Users{ID: 1, Name: "测试用户", Role: "user"}, nil, false, http.StatusOK, 1},
		{"管理员", token, &model.Users{ID: 1, Role: "admin"}, nil, true, http.StatusOK, 1},
		{"普通用户无管理权限", token, &model.Users{ID: 1, Role: "user"}, nil, true, http.StatusForbidden, 1},
		{"用户已删除", token, nil, gorm.ErrRecordNotFound, false, http.StatusUnauthorized, 1},
		{"空用户", token, nil, nil, false, http.StatusUnauthorized, 1},
		{"数据库故障", token, nil, errors.New("数据库故障"), false, http.StatusInternalServerError, 1},
		{"没有令牌", "", nil, nil, false, http.StatusUnauthorized, 0},
		{"伪造令牌", "invalid", nil, nil, false, http.StatusUnauthorized, 0},
	} {
		t.Run(tt.name, func(t *testing.T) {
			reader := &countingUserReader{user: tt.user, err: tt.err}
			r := gin.New()
			chain := []gin.HandlerFunc{MustLogin(reader)}
			if tt.admin {
				chain = append(chain, RequireAdmin())
			}
			called := false
			chain = append(chain, func(c *gin.Context) {
				called = true
				if c.Request.Context().Value(cons.CtxUserInfo) != tt.user {
					t.Fatal("完整用户资料未写入上下文")
				}
				c.Status(http.StatusOK)
			})
			r.GET("/test", chain...)
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.token != "" {
				req.AddCookie(&http.Cookie{Name: TokenCookieName, Value: tt.token})
			}
			response := httptest.NewRecorder()
			r.ServeHTTP(response, req)
			if response.Code != tt.status || reader.calls != tt.queries || called != (tt.status == http.StatusOK) {
				t.Fatalf("状态=%d，查询次数=%d，handler执行=%v", response.Code, reader.calls, called)
			}
		})
	}
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
