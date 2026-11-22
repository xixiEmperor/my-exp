package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"zhiye/server/internal/config"
	"zhiye/server/internal/database"
	"zhiye/server/internal/handler"
	"zhiye/server/internal/logger"
	"zhiye/server/internal/repository"
	"zhiye/server/internal/router"
	"zhiye/server/internal/service"

	"github.com/cloudflare/cloudflare-go/v7/option"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	limitredis "github.com/ulule/limiter/v3/drivers/store/redis"
)

func main() {
	// 只有程序入口决定退出；run 返回前会执行关闭连接的 defer。
	if err := run(); err != nil {
		// 日志文件可能尚未打开或已经关闭，最终退出原因直接输出到标准错误。
		_, _ = fmt.Fprintf(os.Stderr, "后端退出失败: %v\n", err)
		os.Exit(1)
	}
}

func run() (runErr error) {
	// 配置只加载一次，缺少必要配置时立即报告问题。
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// 在连接外部服务前接入日志，初始化故障也能写入服务器文件。
	logs, err := logger.New(cfg.Log)
	if err != nil {
		return err
	}
	logs.Install()
	defer func() {
		// 等数据库和 Redis 的 defer 执行完，再记录结果并关闭日志文件。
		if runErr != nil {
			logs.Error("后端运行失败", "type", "system", "error", runErr)
		} else {
			logs.Info("后端已停止", "type", "system")
		}
		if err := logs.Close(); err != nil {
			runErr = errors.Join(runErr, fmt.Errorf("关闭日志文件: %w", err))
		}
	}()

	// Gin 的框架诊断也进入统一日志，默认 INFO 级别不输出路由调试信息。
	gin.DefaultWriter = slog.NewLogLogger(logs.With("type", "system").Handler(), slog.LevelDebug).Writer()
	gin.DefaultErrorWriter = slog.NewLogLogger(logs.With("type", "system").Handler(), slog.LevelError).Writer()

	// 1. 连接到 mysql 服务
	sqlDB, err := database.NewMySQLClient(cfg.MySQLDSN, time.Duration(cfg.Log.SlowQueryMS)*time.Millisecond)
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
	fileService := service.NewFileService()

	// 3. 创建各部分 handler
	authHandler := handler.NewAuthHandler(authService, cfg.WechatCallbackToken, cfg.CookieSecure)
	articleHandler := handler.NewArticlesHandler(articleService)
	folderHandler := handler.NewFoldersHandler(folderService)
	fileHandler := handler.NewFileHandler(fileService)

	// 4. 创建装配后的路由，跨域配置随路由一起传入，保证中间件先于路由挂载。
	// 前端 dev server 监听在 127.0.0.1，和 localhost 属于不同的源，两个都要放行。
	engine := router.NewRouterGroup(authHandler, articleHandler, folderHandler, fileHandler, cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"https://my-exp.pages.dev",
			"https://blog.swifthire.top",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
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
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return fmt.Errorf("监听 HTTP 地址: %w", err)
	}
	// Ctrl+C 或服务器的 SIGTERM 触发停机，正在处理的请求最多等待十秒。
	signalCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	logs.Info("知页后端已启动", "type", "system", "address", address)
	return serveHTTP(signalCtx, listener, engine)
}

// serveHTTP 把服务结束和停止信号汇总到入口，日志文件在请求结束后才关闭。
func serveHTTP(ctx context.Context, listener net.Listener, handler http.Handler) error {
	server := &http.Server{
		Handler: handler, ReadHeaderTimeout: 5 * time.Second,
		ErrorLog: slog.NewLogLogger(slog.Default().With("type", "system").Handler(), slog.LevelError),
	}
	defer server.Close()
	serveErrors := make(chan error, 1)
	go func() {
		serveErrors <- server.Serve(listener)
	}()
	select {
	case err := <-serveErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("运行 HTTP 服务: %w", err)
	case <-ctx.Done():
		slog.Info("正在停止 HTTP 服务", "type", "system")
		// 使用独立上下文，不能把已经取消的信号上下文传给 Shutdown。
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("等待 HTTP 请求结束: %w", err)
		}
		if err := <-serveErrors; err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("停止 HTTP 服务: %w", err)
		}
		return nil
	}
}
