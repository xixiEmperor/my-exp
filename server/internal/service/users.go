package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"

	"gorm.io/gorm"
)

type UsersService struct {
	repo *repository.UsersRepo
}

func NewUsersService(repo *repository.UsersRepo) *UsersService {
	return &UsersService{repo: repo}
}

// 查找用户的入口，此处后续可以扩展为一个Switch查找
func (u *UsersService) FindUser(ctx context.Context, openid string) (*model.Users, error) {
	return u.repo.FindUserByOpenID(ctx, openid)
}

// FindOrCreateUser 把首次使用时自动创建用户的业务规则留在 service。
func (u *UsersService) FindOrCreateUser(ctx context.Context, openid string) (*model.Users, error) {
	// 新用户与已有用户返回相同类型，认证流程不必再额外查询资料。
	user, err := u.FindUser(ctx, openid)
	if err == nil {
		return user, nil
	}
	// 数据库断开等错误不能当成新用户，否则会掩盖真正的故障。
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	// 8 个随机字节转换成 16 个十六进制字符，与现有表的昵称约定一致。
	var bytes [8]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return nil, fmt.Errorf("生成初始昵称: %w", err)
	}
	return u.repo.CreateUser(ctx, openid, hex.EncodeToString(bytes[:]))
}
