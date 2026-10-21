package router

import (
	"zhiye/server/internal/handler"

	"github.com/gin-gonic/gin"
)

func registerArticleRouter(
	parent *gin.RouterGroup,
	handler *handler.ArticlesHandler,
) {
	// 由于parent是index.go中传进来的api，因此auth的完整路由应为 /api/v1/auth
	folder := parent.Group("/folder")

	// /api/v1/auth/wechat/callback
	folder.GET("/children", handler.GetFolderNodes)
}
