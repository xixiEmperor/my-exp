package handler

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sort"
	"strings"
	"testing"
	"zhiye/server/internal/model"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

// 测试替身只模拟 service 的结果，HTTP 测试不需要启动数据库。
type authStub struct {
	err   error
	calls int
}

func (s *authStub) GenerateVerificationCode(context.Context, string) (string, error) {
	return "000123", s.err
}

func (s *authStub) Login(context.Context, string) (*service.LoginResult, error) {
	s.calls++
	if s.err != nil {
		return nil, s.err
	}
	return &service.LoginResult{User: &model.Users{ID: 42, OpenID: "private-openid", Name: "测试 用户+昵称", Role: "user"}, Token: "test-jwt"}, nil
}

func TestVerify(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name, body    string
		err           error
		status, calls int
	}{
		{"成功", `{"code":"000123"}`, nil, 200, 1},
		{"缺少验证码", `{}`, nil, 400, 0},
		{"非数字验证码", `{"code":"abcdef"}`, nil, 400, 0},
		{"长度不正确", `{"code":"123"}`, nil, 400, 0},
		{"验证码过期", `{"code":"123456"}`, fmt.Errorf("包装错误: %w", service.ErrInvalidCode), 400, 1},
		{"服务故障", `{"code":"123456"}`, errors.New("数据库断开"), 500, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			stub := &authStub{err: tc.err}
			r := gin.New()
			r.POST("/verify", NewAuthHandler(stub, "test-token").Verify)
			req := httptest.NewRequest(http.MethodPost, "/verify", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			// 参数不合法时必须在 handler 就停止，不能消费验证码。
			if res.Code != tc.status || stub.calls != tc.calls {
				t.Fatalf("status=%d calls=%d body=%s", res.Code, stub.calls, res.Body.String())
			}
			if strings.Contains(res.Body.String(), "数据库断开") {
				t.Fatal("响应泄露了内部错误")
			}
			cookies := res.Result().Cookies()
			if tc.status != http.StatusOK {
				// 登录失败不能留下任何新 Cookie。
				if len(cookies) != 0 {
					t.Fatal("失败响应写入了 Cookie")
				}
				return
			}
			if len(cookies) != 2 {
				t.Fatalf("Cookie 数量=%d", len(cookies))
			}
			for _, cookie := range cookies {
				if cookie.Path != "/" || cookie.MaxAge != 7200 || cookie.SameSite != http.SameSiteLaxMode {
					t.Fatalf("Cookie 属性不正确: %+v", cookie)
				}
				if cookie.Name == "token" {
					if !cookie.HttpOnly || cookie.Value != "test-jwt" {
						t.Fatal("token Cookie 不正确")
					}
				} else if cookie.Name == "userinfo" {
					if cookie.HttpOnly {
						t.Fatal("前端无法读取 userinfo")
					}
					decoded, err := url.PathUnescape(cookie.Value)
					if err != nil {
						t.Fatal(err)
					}
					var info map[string]string
					if err := json.Unmarshal([]byte(decoded), &info); err != nil {
						t.Fatal(err)
					}
					if len(info) != 3 || info["id"] != "42" || info["name"] != "测试 用户+昵称" || info["role"] != "user" {
						t.Fatalf("用户展示资料不正确: %s", decoded)
					}
				} else {
					t.Fatalf("未知 Cookie: %s", cookie.Name)
				}
			}
		})
	}
}

func TestWechatSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, token := range []string{"test-token", ""} {
		// 即使请求按空令牌算出了正确摘要，服务也必须拒绝。
		parts := []string{token, "123", "456"}
		sort.Strings(parts)
		sum := sha1.Sum([]byte(strings.Join(parts, "")))
		r := gin.New()
		r.GET("/callback", NewAuthHandler(&authStub{}, token).GetWechatCallback)
		res := httptest.NewRecorder()
		r.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/callback?timestamp=123&nonce=456&echostr=hello&signature="+hex.EncodeToString(sum[:]), nil))
		if token == "" && res.Code != http.StatusForbidden {
			t.Fatal("空令牌未被拒绝")
		}
		if token != "" && (res.Code != http.StatusOK || res.Body.String() != "hello") {
			t.Fatal("合法签名没有返回原始 echostr")
		}
	}
}
