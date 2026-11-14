package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config 保存需要传给其他组件的配置；JWT_SECRET 只在启动时校验，不在各层传递。
type Config struct {
	Port                string
	MySQLDSN            string
	RedisAddr           string
	RedisPassword       string
	WechatCallbackToken string
	// 首次注册时匹配这个 OpenID 的微信用户创建为管理员，留空则不指定管理员。
	AdminOpenID string
	// 默认启用生产环境的安全 Cookie，本地 HTTP 开发可以显式关闭。
	CookieSecure bool
	// R2 图片存储为可选项，三项都未配置时不启用图片上传。
	R2AccountID  string
	R2APIToken   string
	R2BucketName string
}

// Load 在启动时读取一次配置，系统环境变量优先于本地 .env。
func Load() (Config, error) {
	// .env 只方便本地开发；部署时可以直接由运行环境提供配置。
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, fmt.Errorf("读取 .env: %w", err)
	}
	cfg := Config{
		CookieSecure:        true,
		Port:                os.Getenv("PORT"),
		MySQLDSN:            os.Getenv("MYSQL_DSN"),
		RedisAddr:           os.Getenv("REDIS_ADDR"),
		RedisPassword:       os.Getenv("REDIS_PASSWORD"),
		WechatCallbackToken: os.Getenv("WECHAT_CALLBACK_TOKEN"),
		AdminOpenID:         strings.TrimSpace(os.Getenv("ADMIN_OPENID")),
		R2AccountID:         os.Getenv("R2_ACCOUNT_ID"),
		R2APIToken:          os.Getenv("R2_API_TOKEN"),
		R2BucketName:        os.Getenv("R2_BUCKET_NAME"),
	}
	// 只信任启动配置，不使用客户端可伪造的转发请求头判断 HTTPS。
	if value := os.Getenv("COOKIE_SECURE"); value != "" {
		secure, err := strconv.ParseBool(value)
		if err != nil {
			return Config{}, errors.New("COOKIE_SECURE 必须为 true 或 false")
		}
		cfg.CookieSecure = secure
	}
	// 地址和端口可以有开发默认值，数据库密码与微信令牌必须显式提供。
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.RedisAddr == "" {
		cfg.RedisAddr = "127.0.0.1:6379"
	}
	if cfg.MySQLDSN == "" {
		return Config{}, errors.New("缺少 MYSQL_DSN 配置")
	}
	if cfg.WechatCallbackToken == "" {
		return Config{}, errors.New("缺少 WECHAT_CALLBACK_TOKEN 配置")
	}
	// 在连接数据库和启动 HTTP 服务前检查密钥，避免收到登录请求才发现配置缺失。
	if strings.TrimSpace(os.Getenv("JWT_SECRET")) == "" {
		return Config{}, errors.New("缺少 JWT_SECRET 配置")
	}
	return cfg, nil
}
