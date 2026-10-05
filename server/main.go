package main

import (
	"log"
	"os"
	"zhiye/server/internal/database"
	"zhiye/server/internal/handler"
	"zhiye/server/internal/router"
	"zhiye/server/internal/service"
)

func main() {
	// 1. 连接到 mysql 服务

	// 2. 连接到 redis 服务器
	rdb := database.NewRedisClient()

	// 1. 创建各部分 repo
	// userRepo := repository.NewUsersRepo()

	// 2. 创建各部分 service
	authService := service.NewAuthService(rdb)

	// 3. 创建各部分 handler
	authHandler := handler.NewAuthHandler(authService)

	// 4. 创建装配后的路由
	router := router.NewRouterGroup(authHandler)

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
