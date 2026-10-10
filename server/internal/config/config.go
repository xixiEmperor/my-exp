package config

import (
	"errors"
	"fmt"
	"os"
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
}

// Load 在启动时读取一次配置，系统环境变量优先于本地 .env。
func Load() (Config, error) {
	// .env 只方便本地开发；部署时可以直接由运行环境提供配置。
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, fmt.Errorf("读取 .env: %w", err)
	}
	cfg := Config{
		Port:                os.Getenv("PORT"),
		MySQLDSN:            os.Getenv("MYSQL_DSN"),
		RedisAddr:           os.Getenv("REDIS_ADDR"),
		RedisPassword:       os.Getenv("REDIS_PASSWORD"),
		WechatCallbackToken: os.Getenv("WECHAT_CALLBACK_TOKEN"),
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
