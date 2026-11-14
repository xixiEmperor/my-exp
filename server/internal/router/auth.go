package router

import (
	"time"

	"zhiye/server/internal/handler"
	"zhiye/server/internal/middlewares"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
)

func registerAuthRouter(
	parent *gin.RouterGroup,
	handler *handler.AuthHandler,
	users middlewares.UserInfoReader,
	limitStore limiter.Store,
) {
	// 由于parent是index.go中传进来的api，因此auth的完整路由应为 /api/v1/auth
	auth := parent.Group("/auth")

	// /api/v1/auth/wechat/callback
	auth.POST("/wechat/callback", handler.PostWechatCallback)
	auth.GET("/wechat/callback", handler.GetWechatCallback)
	// 保留原来的接口地址，验证码验证成功后完成登录并写入 Cookie。
	auth.POST("/verify", middlewares.RateLimit(limitStore, middlewares.RateLimitOptions{
		Scope: "auth:verify",
		Rate: limiter.Rate{
			Period: time.Minute,
			Limit:  20,
		},
	}), handler.Verify)
	auth.POST("/logout", handler.Logout)
	// 当前用户始终从服务端读取，前端不再依赖跨子域不可读的 Cookie。
	auth.GET("/me", middlewares.MustLogin(users), handler.CurrentUser)
}
