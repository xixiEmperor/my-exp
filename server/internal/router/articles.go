package router

import (
	"zhiye/server/internal/handler"
	"zhiye/server/internal/middlewares"

	"github.com/gin-gonic/gin"
)

func registerArticleRouter(
	parent *gin.RouterGroup,
	handler *handler.ArticlesHandler,
) {
	folder := parent.Group("/folder", middlewares.OptionalAuth())
	folder.GET("/children", handler.GetFolderNodes)

	admin := parent.Group("/articles", middlewares.VerifyToken())
	admin.POST("/create")

	publicArticles := parent.Group("/articles", middlewares.OptionalAuth())
	publicArticles.GET("/content", handler.GetArticles)
}
