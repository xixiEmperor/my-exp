package router

import (
	"zhiye/server/internal/handler"

	"github.com/gin-gonic/gin"
)

func registerAuthRouter(
	parent *gin.RouterGroup,
	handler *handler.AuthHandler,
) {
	// 由于parent是index.go中传进来的api，因此auth的完整路由应为 /api/v1/auth
	auth := parent.Group("/auth")

	// /api/v1/auth/wechat/callback
	auth.POST("/wechat/callback", handler.PostWechatCallback)
	auth.GET("/wechat/callback", handler.GetWechatCallback)
	auth.POST("/verify", handler.Verify)
}