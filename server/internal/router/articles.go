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
	folder := parent.Group("/folder")
	folder.GET("/children", handler.GetFolderNodes)

	publicArticles := parent.Group("/articles", middlewares.OptionalAuth())
	publicArticles.GET("/content", handler.GetArticles)
}
