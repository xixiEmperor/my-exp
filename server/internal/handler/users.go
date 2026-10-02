package handler

import (
	"zhiye/server/internal/service"
)

type UsersHandler struct {
	service service.UsersService
}