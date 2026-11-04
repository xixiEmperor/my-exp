package router

import (
	"zhiye/server/internal/handler"
	"zhiye/server/internal/middlewares"

	"github.com/gin-gonic/gin"
)

// registerFolderRouter 只注册文件夹资源的查询和创建接口。
func registerFolderRouter(parent *gin.RouterGroup, handler *handler.FoldersHandler, userService middlewares.UserInfoReader) {
	publicFolders := parent.Group("/folder", middlewares.OptionalAuth(userService))
	publicFolders.GET("/children", handler.GetFolderChildren)

	// 新建文件夹继续要求登录和管理员身份。
	admin := parent.Group("/folder", middlewares.MustLogin(), middlewares.RequireAdmin(userService))
	admin.POST("/create", handler.CreateFolder)
	admin.POST("/rename", handler.RenameFolder)
	admin.DELETE("/:id", handler.Delete)
}
