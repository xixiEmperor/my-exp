package service

import (
	"zhiye/server/internal/repository"
)

type UsersService struct {
	repo *repository.UsersRepo
}

func NewUsersService(repo *repository.UsersRepo) *UsersService {
	return &UsersService{repo: repo}
}