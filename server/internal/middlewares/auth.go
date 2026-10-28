package middlewares

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"zhiye/server/internal/apperr"
	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

const (
	// 登录成功后写入的 HttpOnly Cookie 名称，和 handler 里保持一致
	TokenCookieName = "token"
)

type RoleReader interface {
	GetRole(ctx context.Context, id uint64) (string, error)
}

// extractToken 按优先级取出令牌。
// 先看 Authorization 头，兼容第三方或者调试时直接带 Bearer 的调用；
// 头里没带的话再读 HttpOnly Cookie，浏览器会自动附带，前端拿不到明文也没关系。
// 第二个返回值表示请求里是否显式带了 Authorization 头，用来区分游客和格式错误。
func extractToken(c *gin.Context) (string, bool) {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	if header != "" {
		token, found := strings.CutPrefix(header, "Bearer ")
		if !found {
			return "", true
		}
		return strings.TrimSpace(token), true
	}

	cookie, err := c.Cookie(TokenCookieName)
	if err != nil {
		return "", false
	}

	return strings.TrimSpace(cookie), false
}

func MustLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, _ := extractToken(c)
		if token == "" {
			c.AbortWithStatusJSON(
				http.StatusUnauthorized,
				dto.Fail(cons.WithoutToken, "缺少身份信息"),
			)
			return
		}

		info, err := service.VerifyToken(token)
		if err != nil {
			abortWithAuthError(c, err)
			return
		}

		ctx := context.WithValue(
			c.Request.Context(),
			cons.CtxUserID,
			info.UserID,
		)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// OptionalAuth 可选登录：
//   - 没带 token：视为游客，放行
//   - 带了有效 token：写入 user_id 后放行
//   - 带了无效或过期的 token：返回 401，让前端能感知并刷新/重新登录
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, hasHeader := extractToken(c)

		// 带了 Authorization 头但格式不对（没有 Bearer 前缀或 token 为空）：按无效凭证处理
		if hasHeader && token == "" {
			abortWithAuthError(c, apperr.ErrTokenInvalid)
			return
		}

		// 头和 Cookie 都没有令牌：游客
		if token == "" {
			c.Next()
			return
		}

		info, err := service.VerifyToken(token)
		if err != nil {
			abortWithAuthError(c, err)
			return
		}

		ctx := context.WithValue(
			c.Request.Context(),
			cons.CtxUserID,
			info.UserID,
		)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// 鉴权中间件
func RequireAdmin(s RoleReader) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 鉴权中间件只配合必须登录中间件一起使用，能走到这里，说明一定有userId
		userId, _ := c.Request.Context().Value(cons.CtxUserID).(uint64)

		// 拿到用户身份
		role, err := s.GetRole(c, userId)
		if err != nil {
			c.AbortWithStatusJSON(
				http.StatusInternalServerError,
				dto.Fail(cons.WithoutToken, "后台服务错误"),
			)
			return
		}

		// 如果用户身份不是admin，直接拒绝请求
		if role != "admin" {
			c.AbortWithStatusJSON(
				http.StatusForbidden,
				dto.Fail(cons.WithoutToken, "无权限"),
			)
			return
		}

		c.Next()
	}
}

// abortWithAuthError 把 service 返回的错误映射成响应，
// OptionalAuth 和 VerifyToken 共用，保证两处响应格式一致。
func abortWithAuthError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, apperr.ErrTokenExpired):
		c.AbortWithStatusJSON(
			http.StatusUnauthorized,
			dto.Fail(cons.TokenExpires, "身份信息已过期，请重新登录"),
		)
	case errors.Is(err, apperr.ErrTokenInvalid):
		c.AbortWithStatusJSON(
			http.StatusUnauthorized,
			dto.Fail(cons.WrongToken, "身份信息校验失败"),
		)
	default:
		log.Printf("verify token failed: %v", err)
		c.AbortWithStatusJSON(
			http.StatusInternalServerError,
			dto.Fail(cons.InternalError, "服务暂不可用"),
		)
	}
}
