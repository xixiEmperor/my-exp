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

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService struct {
	codes *repository.VerificationCodes
	users *UsersService
}

// TokenTTL 同时用于令牌和 Cookie，避免两边分别写死有效期。
const TokenTTL = 30 * 24 * time.Hour

// verificationCodeTTL 是验证码以及 loginId 的缓存有效期。
const verificationCodeTTL = 5 * time.Minute

// maxCodeAttempts 是同一个验证码允许的最大失败次数，超过后直接限流。
const maxCodeAttempts = 5

const loginIDAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

// LoginResult 只描述登录结果，不包含 Gin 或 Cookie 等 HTTP 细节。
type LoginResult struct {
	User  *model.Users
	Token string
}

// Login 组织完整登录步骤，任何一步失败都不返回可使用的登录结果。
func (a *AuthService) Login(ctx context.Context, loginId, code string) (*LoginResult, error) {
	user, err := a.VerifyCode(ctx, loginId, code)
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
	UserID uint64 `json:"id"`
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
func (a *AuthService) GenerateVerificationCode(ctx context.Context, userID string) (*dto.VerifyBody, error) {
	credentials := dto.VerifyBody{}

	if userID == "" {
		return &credentials, errors.New("微信用户标识不能为空")
	}

	// 生成临时登录id
	loginId, err := NewLoginID(8)
	if err != nil {
		return &credentials, err
	}

	// 如果没有缓存随机生成 0～999999
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return &credentials, err
	}

	// 不足六位时，左侧补 0
	code := fmt.Sprintf("%06d", n.Int64())

	// 缓存到 redis 并设置 5min 有效期
	saved, err := a.codes.SaveIfAbsent(ctx, loginId, userID, code, verificationCodeTTL)
	if err != nil {
		return &credentials, fmt.Errorf("保存验证码: %w", err)
	}
	if !saved {
		// 同一个用户还有未过期的验证码，不重复下发。
		return &credentials, ErrCodeActive
	}

	credentials.Code = code
	credentials.LoginId = loginId
	return &credentials, nil
}

// 验证验证码
func (a *AuthService) VerifyCode(ctx context.Context, loginId, code string) (*model.Users, error) {
	// repository 只回答存储层发生了什么，通过与否、提示什么由这里判断。
	result, err := a.codes.Consume(ctx, loginId, code)
	if err != nil {
		return nil, fmt.Errorf("消费验证码: %w", err)
	}

	switch result.Status {
	case repository.ConsumeMissing:
		// 键不存在，说明验证码已过期或从未生成。
		return nil, ErrInvalidCode
	case repository.ConsumeMismatched:
		// attempt 是自增后的值，超过上限就改提示限流，不再允许继续试探。
		if result.Attempt > maxCodeAttempts {
			return nil, ErrRateLimit
		}
		return nil, ErrWrongCode
	}

	// 验证码命中时 repository 已经把它删除，这里只负责取得用户；
	// 签发令牌由 Login 组织，Cookie 由 handler 写入。

	// 查找用户信息
	// 如果找不到对应用户信息，说明是新用户，则创建对应用户信息
	user, err := a.users.FindOrCreateUser(ctx, result.Openid)
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
		UserID: id,
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
func VerifyToken(encoded string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")

	if strings.TrimSpace(secret) == "" {
		// 服务端配置问题，不是认证错误，原样往上抛
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
		switch {
		case errors.Is(err, jwt.ErrTokenExpired):
			return nil, apperr.ErrTokenExpired
		case errors.Is(err, jwt.ErrTokenMalformed),
			errors.Is(err, jwt.ErrTokenSignatureInvalid),
			errors.Is(err, jwt.ErrTokenInvalidIssuer),
			errors.Is(err, jwt.ErrTokenRequiredClaimMissing),
			errors.Is(err, jwt.ErrTokenUnverifiable),
			errors.Is(err, jwt.ErrTokenNotValidYet):
			return nil, apperr.ErrTokenInvalid
		default:
			// 未知错误不要吞掉，原样返回，由中间件当成 500 并记日志
			return nil, err
		}
	}

	return claims, nil
}

func NewLoginID(length int) (string, error) {
	max := big.NewInt(int64(len(loginIDAlphabet)))
	b := make([]byte, length)

	for i := range b {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}

		b[i] = loginIDAlphabet[n.Int64()]
	}

	return string(b), nil
}
