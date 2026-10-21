package router

import (
	"net/http"

	"zhiye/server/internal/handler"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouterGroup(
	authHandler *handler.AuthHandler,
	articleHandler *handler.ArticlesHandler,
	corsCfg cors.Config,
) *gin.Engine {
	// 创建 gin 的路由引擎
	r := gin.Default()

	// 中间件必须在注册路由之前挂载，否则已注册的路由不会带上这些 handler。
	r.Use(cors.New(corsCfg))

	// 健康检查仅表示 HTTP 服务可响应，不依赖数据库或微信配置。
	r.GET("/health", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "zhiye-api",
		})
	})

	// 第一次分组，表示api路由组下的所有router前缀都是 /api/v1
	api := r.Group("/api/v1")

	// 装配各部分路由
	registerAuthRouter(api, authHandler)
	registerArticleRouter(api, articleHandler)

	return r
}
