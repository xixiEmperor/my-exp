package service

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
	"zhiye/server/internal/errType"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type AuthService struct{
	rdb *redis.Client
}

func NewAuthService(rdb *redis.Client) *AuthService {
	return &AuthService{
		rdb: rdb,
	}
}

func (a AuthService) GenerateVerificationCode(ctx *gin.Context, userID string) (string, error) {
	// 先查看当前用户是否有缓存,如果有缓存且未过期，不处理，直接返回
	ttl, err := a.rdb.TTL(ctx, userID).Result()
	if err != nil {
		return "", err
	}

	if ttl > 0 {
		return "", errType.CodeIsNotExpire
	}

	// 如果没有缓存随机生成 0～999999
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}

	// 不足六位时，左侧补 0
	code := fmt.Sprintf("%06d", n.Int64())

	// 缓存到 redis 并设置 5min 有效期, 同时设置一个反向的映射（code -> id），便于登录时反查登录用户
	a.rdb.SetNX(ctx, userID, code, 300 * time.Second)
	a.rdb.SetNX(ctx, code, userID, 300 * time.Second)

	return code, nil
}

func (a AuthService) VerifyCode(ctx *gin.Context, code string) error {
	// 从 redis 里面反查 openid，并原子删除 code 键
	openid, err := a.rdb.GetDel(ctx, code).Result()

	// 如果找不到，说明已过期或不存在
	if err == redis.Nil {
		return errType.CodeIsNotExists
	}
	if err != nil {
		panic(err)
	}

	// 如果验证码存在：
	// 1. 删除 id 键
	// 2. 进行 jwt 签发
	if err := a.rdb.Del(ctx, openid).Err(); err != nil {
		panic(err)
	}

	return nil
}