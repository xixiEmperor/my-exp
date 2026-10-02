package service

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

type AuthService struct{}

func NewAuthService() *AuthService {
	return &AuthService{}
}

func (a AuthService) GenerateVerificationCode() (string, error) {
	// 随机生成 0～999999
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}

	// 不足六位时，左侧补 0
	return fmt.Sprintf("%06d", n.Int64()), nil
}