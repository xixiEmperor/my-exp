package router

import (
	"zhiye/server/internal/handler"
	"zhiye/server/internal/middlewares"

	"github.com/gin-gonic/gin"
)

// registerDemoResourceRouter 注册 demo 表的查询、添加、编辑与删除接口。
func registerDemoResourceRouter(
	parent *gin.RouterGroup,
	demoResourceHandler *handler.DemoResourceHandler,
	userService middlewares.UserInfoReader,
) {
	admin := parent.Group("/demos/resources", middlewares.MustLogin(userService), middlewares.RequireAdmin())
	admin.GET("", demoResourceHandler.GetDemoResources)
	admin.GET("/:id", demoResourceHandler.GetDemoResourceByID)
	admin.POST("", demoResourceHandler.CreateDemoResource)
	admin.PUT("/:id", demoResourceHandler.UpdateDemoResource)
	admin.DELETE("/:id", demoResourceHandler.DeleteDemoResource)
}
