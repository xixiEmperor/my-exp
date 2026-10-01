package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// 骨架阶段使用 Gin 默认的请求日志和异常恢复能力。
	router := gin.Default()

	// 健康检查仅表示 HTTP 服务可响应，不依赖数据库或微信配置。
	router.GET("/api/v1/health", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "zhiye-api",
		})
	})

	// 本地默认使用 8080 端口，需要调整时通过 PORT 环境变量指定。
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 开发服务只监听本机，启动失败时输出原因并结束进程。
	address := "127.0.0.1:" + port
	log.Printf("知页后端启动：http://%s", address)
	if err := router.Run(address); err != nil {
		log.Fatalf("后端启动失败：%v", err)
	}
}
