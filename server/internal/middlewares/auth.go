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
	CtxUserID = "user_id"
)

func VerifyToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, found := strings.CutPrefix(
			c.GetHeader("Authorization"),
			"Bearer ",
		)
		if !found || token == "" {
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

		c.Set(CtxUserID, info.UserID)

		c.Next()
	}
}

// OptionalAuth 可选登录：
//   - 没带 token：视为游客，放行
//   - 带了有效 token：写入 user_id 后放行
//   - 带了无效或过期的 token：返回 401，让前端能感知并刷新/重新登录
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")

		// 没带 Authorization：游客
		if strings.TrimSpace(header) == "" {
			c.Next()
			return
		}

		// 带了但格式不对（没有 Bearer 前缀或 token 为空）：按无效凭证处理
		token, found := strings.CutPrefix(header, "Bearer ")
		if !found || strings.TrimSpace(token) == "" {
			abortWithAuthError(c, apperr.ErrTokenInvalid)
			return
		}

		info, err := service.VerifyToken(token)
		if err != nil {
			abortWithAuthError(c, err)
			return
		}

		ctx := context.WithValue(
			c.Request.Context(),
			CtxUserID,
			info.UserID,
		)
		c.Request = c.Request.WithContext(ctx)

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
