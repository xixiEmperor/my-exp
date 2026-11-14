package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/model"
	"zhiye/server/internal/service"
)

// 登录服务替身仅返回测试资料，避免接口测试依赖外部数据库。
type loginStub struct{ calls int }

func (s *loginStub) GenerateVerificationCode(context.Context, string) (*dto.VerifyBody, error) {
	return nil, nil
}

func (s *loginStub) Login(context.Context, string, string) (*service.LoginResult, error) {
	s.calls++
	return &service.LoginResult{Token: "test-token", User: &model.Users{ID: 1, Name: "测试用户", Role: "user", OpenID: "private-openid"}}, nil
}

// 反向代理通过 HTTP 转发时仍写入 Secure Cookie，并只返回公开用户字段。
func TestVerifyReturnsUserAndSecureCookie(t *testing.T) {
	s := &loginStub{}
	h := NewAuthHandler(s, "callback", true)
	r := gin.New()
	r.POST("/verify", h.Verify)
	req := httptest.NewRequest(http.MethodPost, "/verify", strings.NewReader(`{"loginId":"23456789","code":"123456"}`))
	req.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	r.ServeHTTP(response, req)
	if response.Code != http.StatusOK || s.calls != 1 {
		t.Fatalf("登录失败: %d, %s", response.Code, response.Body.String())
	}
	var body struct {
		Data dto.UserInfo `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil || body.Data.Name != "测试用户" || body.Data.ID != "1" {
		t.Fatalf("用户资料未返回: %+v, %v", body, err)
	}
	if strings.Contains(response.Body.String(), "private-openid") || strings.Contains(response.Body.String(), "test-token") {
		t.Fatal("响应泄露了内部身份资料")
	}
	cookies := response.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "token" || !cookies[0].HttpOnly || !cookies[0].Secure || cookies[0].Domain != "" || cookies[0].SameSite != http.SameSiteLaxMode {
		t.Fatalf("身份 Cookie 配置错误: %+v", cookies)
	}
}

// 非法登录标识在进入业务层前拒绝，不能变成任意 Redis 键查询。
func TestVerifyRejectsInvalidLoginID(t *testing.T) {
	s := &loginStub{}
	r := gin.New()
	r.POST("/verify", NewAuthHandler(s, "callback", false).Verify)
	for _, id := range []string{"", "2345678", "234567890", "!!!!!!!!", "abcdefgh"} {
		req := httptest.NewRequest(http.MethodPost, "/verify", strings.NewReader(`{"loginId":"`+id+`","code":"123456"}`))
		req.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		r.ServeHTTP(response, req)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("非法标识 %s 未拒绝", id)
		}
	}
	if s.calls != 0 {
		t.Fatal("非法标识进入了登录服务")
	}
}
