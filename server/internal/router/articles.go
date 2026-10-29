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
	folder := parent.Group("/folder", middlewares.OptionalAuth(userService))
	folder.GET("/children", handler.GetFolderNodes)

	admin := parent.Group("/articles", middlewares.MustLogin(), middlewares.RequireAdmin(userService))
	admin.POST("/create", handler.CreateArticleOrFolder)

	publicArticles := parent.Group("/articles", middlewares.OptionalAuth(userService))
	publicArticles.GET("/content", handler.GetArticles)
}
