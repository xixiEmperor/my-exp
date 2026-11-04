package router

import (
	"zhiye/server/internal/handler"
	"zhiye/server/internal/middlewares"

	"github.com/gin-gonic/gin"
)

func registerArticleRouter(
	parent *gin.RouterGroup,
	handler *handler.ArticlesHandler,
	userService middlewares.UserInfoReader,
) {
	// 需要鉴权的路由组，需要登录且身份为管理员才可调用
	admin := parent.Group(
		"/articles",
		middlewares.MustLogin(),
		middlewares.RequireAdmin(userService),
	)
	admin.POST("/create", handler.CreateArticle)
	admin.POST("/update", handler.UpdateArticle)
	admin.POST("/rename", handler.RenameArticle)
	admin.DELETE("/:id", handler.Delete)

	// 无需管理员或可选登录即可调用
	publicArticles := parent.Group("/articles", middlewares.OptionalAuth(userService))
	// 目录内文章列表单独查询，草稿可见性由文章服务处理。
	publicArticles.GET("/list", handler.GetArticlesByFolderID)
	publicArticles.GET("/content", handler.GetArticleContent)
}
