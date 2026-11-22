package router

import (
	"zhiye/server/internal/handler"
	"zhiye/server/internal/middlewares"

	"github.com/gin-gonic/gin"
)

// registerFolderRouter 只注册文件夹资源的查询和创建接口。
func registerFileRouter(
	parent *gin.RouterGroup,
	handler *handler.FileHandler,
	userService middlewares.UserInfoReader,
) {
	// 新建文件夹继续要求登录和管理员身份。
	admin := parent.Group("/demos", middlewares.MustLogin(userService), middlewares.RequireAdmin())
	admin.GET("/varys", handler.GetDemoVary)
	// demo 列表、源码文件路径和版本查询沿用当前管理员权限。
	admin.GET("/names", handler.GetDemoNames)
	admin.GET("/source-paths", handler.GetDemoSourcePaths)
	admin.GET("/version", handler.GetDemoVersion)
}
