package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

type AuthService struct {
	codes *repository.VerificationCodes
	users *UsersService
}

// TokenTTL 同时用于令牌和 Cookie，避免两边分别写死有效期。
const TokenTTL = 2 * time.Hour

// LoginResult 只描述登录结果，不包含 Gin 或 Cookie 等 HTTP 细节。
type LoginResult struct {
	User  *model.Users
	Token string
}

// Login 组织完整登录步骤，任何一步失败都不返回可使用的登录结果。
func (a *AuthService) Login(ctx context.Context, code string) (*LoginResult, error) {
	user, err := a.VerifyCode(ctx, code)
	if err != nil {
		return nil, err
	}
	// 直接复用验证时取得的用户，不再查询一次数据库。
	token, err := a.GenerateToken(user.ID)
	if err != nil {
		return nil, fmt.Errorf("签发登录令牌: %w", err)
	}
	return &LoginResult{User: user, Token: token}, nil
}

type Claims struct {
	// 与 MySQL BIGINT UNSIGNED 和 model.Users.ID 保持一致。
	ID uint64 `json:"id"`
	jwt.RegisteredClaims
}

// 创建 auth 服务实例
func NewAuthService(codes *repository.VerificationCodes, users *UsersService) *AuthService {
	return &AuthService{
		codes: codes,
		users: users,
	}
}

// 生成验证码
func (a *AuthService) GenerateVerificationCode(ctx context.Context, userID string) (string, error) {
	// 先查看当前用户是否有缓存,如果有缓存且未过期，不处理，直接返回
	// 检查已移到 repository 的原子脚本中，避免检查之后状态被其他请求改变。
	if userID == "" {
		return "", errors.New("微信用户标识不能为空")
	}
	// 六位验证码可能碰撞，限制重试次数，避免缓存接近满载时无限循环。
	for attempt := 0; attempt < 5; attempt++ {
		// 如果没有缓存随机生成 0～999999
		n, err := rand.Int(rand.Reader, big.NewInt(1000000))
		if err != nil {
			return "", err
		}

		// 不足六位时，左侧补 0
		code := fmt.Sprintf("%06d", n.Int64())

		// 缓存到 redis 并设置 5min 有效期, 同时设置一个反向的映射（code -> id），便于登录时反查登录用户
		result, err := a.codes.Save(ctx, userID, code, 5*time.Minute)
		if err != nil {
			return "", fmt.Errorf("保存验证码: %w", err)
		}
		switch result {
		case 1:
			return code, nil
		case 0:
			return "", ErrCodeActive
		}
	}
	return "", errors.New("生成验证码多次碰撞，请重试")
}

// 验证验证码
func (a *AuthService) VerifyCode(ctx context.Context, code string) (*model.Users, error) {
	// 从 redis 里面反查 openid，并原子删除 code 键
	// repository 一次删除两个索引，service 只处理业务结果。
	openid, err := a.codes.Consume(ctx, code)

	// 如果找不到，说明已过期或不存在
	if errors.Is(err, redis.Nil) {
		return nil, ErrInvalidCode
	}
	if err != nil {
		return nil, fmt.Errorf("消费验证码: %w", err)
	}

	// 验证码消费完成后，只负责取得用户；签发令牌由 Login 组织，Cookie 由 handler 写入。

	// 查找用户信息
	// 如果找不到对应用户信息，说明是新用户，则创建对应用户信息
	user, err := a.users.FindOrCreateUser(ctx, openid)
	if err != nil {
		// 创建逻辑统一放在 UsersService，这里只向上返回失败原因。
		return nil, fmt.Errorf("准备验证码用户: %w", err)
	}

	// 将用户交回 Login，令牌和展示资料都来自同一个用户。
	return user, nil
}

// 生成 jwt
func (a *AuthService) GenerateToken(id uint64) (string, error) {
	// .env 已在启动时加载到进程环境中，Getenv 读取内存中的值，不会重新读取文件。
	jwtSecret := os.Getenv("JWT_SECRET")

	// 启动时已经校验；这里仍保留检查，便于独立调用和测试时明确返回配置错误。
	if strings.TrimSpace(jwtSecret) == "" {
		return "", errors.New("缺少 JWT_SECRET 配置")
	}

	claims := Claims{
		ID: id,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "my-exp",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// HS256 要求字节切片，传 string 会导致运行时签名失败。
	return token.SignedString([]byte(jwtSecret))
}

// VerifyToken 验证签名、算法、签发者和过期时间，不能只解码后就信任载荷。
func (a *AuthService) VerifyToken(encoded string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")

	if strings.TrimSpace(secret) == "" {
		return nil, errors.New("缺少 JWT_SECRET 配置")
	}

	claims := &Claims{}
	_, err := jwt.ParseWithClaims(
		encoded,
		claims,
		func(token *jwt.Token) (any, error) {
			return []byte(secret), nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer("my-exp"),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		return nil, fmt.Errorf("校验登录令牌: %w", err)
	}
	
	return claims, nil
}
