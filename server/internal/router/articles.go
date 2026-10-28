package router

import (
	"zhiye/server/internal/handler"
	"zhiye/server/internal/middlewares"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

func registerArticleRouter(
	parent *gin.RouterGroup,
	handler *handler.ArticlesHandler,
	userService *service.UsersService,
) {
	folder := parent.Group("/folder", middlewares.OptionalAuth())
	folder.GET("/children", handler.GetFolderNodes)

	admin := parent.Group("/articles", middlewares.MustLogin(), middlewares.RequireAdmin(userService))
	admin.POST("/create", handler.CreateArticleOrFolder)

	publicArticles := parent.Group("/articles", middlewares.OptionalAuth())
	publicArticles.GET("/content", handler.GetArticles)
}
