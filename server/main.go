package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"zhiye/server/internal/config"
	"zhiye/server/internal/database"
	"zhiye/server/internal/handler"
	"zhiye/server/internal/repository"
	"zhiye/server/internal/router"
	"zhiye/server/internal/service"

	"github.com/cloudflare/cloudflare-go/v7/option"
	"github.com/gin-contrib/cors"
	"github.com/ulule/limiter/v3"
	limitredis "github.com/ulule/limiter/v3/drivers/store/redis"
)

func main() {
	// 只有程序入口决定退出；run 返回前会执行关闭连接的 defer。
	if err := run(); err != nil {
		log.Fatalf("后端启动失败：%v", err)
	}
}

func run() error {
	// 配置只加载一次，缺少必要配置时立即报告问题。
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// 1. 连接到 mysql 服务
	sqlDB, err := database.NewMySQLClient(cfg.MySQLDSN)
	if err != nil {
		return err
	}
	// GORM 封装了连接池，关闭时需要取得底层的 sql.DB。
	pool, err := sqlDB.DB()
	if err != nil {
		return fmt.Errorf("获取 MySQL 连接池: %w", err)
	}
	defer pool.Close()

	// 2. 连接到 redis 服务器
	rdb := database.NewRedisClient(cfg.RedisAddr, cfg.RedisPassword)
	defer rdb.Close()
	// NewClient 并不保证已经连通，用有限等待的 Ping 尽早发现错误。
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("连接 Redis: %w", err)
	}

	// 复用已有 Redis 连接，计数由库通过原子脚本维护并在多实例间共享。
	limitStore, err := limitredis.NewStoreWithOptions(rdb, limiter.StoreOptions{
		Prefix: "my-exp:rate-limit",
	})
	if err != nil {
		return fmt.Errorf("初始化请求限流存储: %w", err)
	}

	// 1. 创建各部分 repo
	userRepo := repository.NewUsersRepo(sqlDB)
	codeRepo := repository.NewVerificationCodes(rdb)
	articlesRepo := repository.NewArticlesRepo(sqlDB)
	foldersRepo := repository.NewFoldersRepo(sqlDB)

	// 2. 创建各部分 service
	// 图片服务按需启用：三项 R2 配置齐全时才创建，部分配置会由构造函数报错。
	var imageService *service.ImageService
	if cfg.R2AccountID != "" || cfg.R2APIToken != "" || cfg.R2BucketName != "" {
		imageService, err = service.NewImageService(service.ImageConfig{
			AccountID:  cfg.R2AccountID,
			APIToken:   cfg.R2APIToken,
			BucketName: cfg.R2BucketName,
		}, option.WithHTTPClient(&http.Client{Timeout: 30 * time.Second}))
		if err != nil {
			return err
		}
	}
	userService := service.NewUsersService(userRepo, cfg.AdminOpenID)
	authService := service.NewAuthService(codeRepo, userService)
	articleService := service.NewArticlesService(articlesRepo, imageService)
	folderService := service.NewFoldersService(foldersRepo)

	// 3. 创建各部分 handler
	authHandler := handler.NewAuthHandler(authService, cfg.WechatCallbackToken, cfg.CookieSecure)
	articleHandler := handler.NewArticlesHandler(articleService)
	folderHandler := handler.NewFoldersHandler(folderService)

	// 4. 创建装配后的路由，跨域配置随路由一起传入，保证中间件先于路由挂载。
	// 前端 dev server 监听在 127.0.0.1，和 localhost 属于不同的源，两个都要放行。
	engine := router.NewRouterGroup(authHandler, articleHandler, folderHandler, cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"https://my-exp.pages.dev",
			"https://blog.swifthire.top",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}, userService, limitStore)

	// 直接连接 Go 的代理限定为本机，避免伪造转发 IP 绕过登录限流。
	if err := engine.SetTrustedProxies([]string{"127.0.0.1", "::1"}); err != nil {
		return err
	}

	// 本地默认使用 8080 端口，需要调整时通过 PORT 环境变量指定。
	port := cfg.Port

	// 开发服务只监听本机，启动失败时输出原因并结束进程。
	address := "127.0.0.1:" + port
	log.Printf("知页后端启动：http://%s", address)
	return engine.Run(address)
}
