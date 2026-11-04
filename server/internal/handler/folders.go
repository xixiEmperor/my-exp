package handler

import (
	"errors"
	"net/http"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

// FoldersHandler 只管理文件夹 HTTP 请求。
type FoldersHandler struct {
	s *service.FoldersService
}

// NewFoldersHandler 注入文件夹自己的业务服务。
func NewFoldersHandler(s *service.FoldersService) *FoldersHandler {
	return &FoldersHandler{s: s}
}

// GetFolderChildren 返回子文件夹，文章列表由文章接口单独查询。
func (h *FoldersHandler) GetFolderChildren(c *gin.Context) {
	children, err := h.s.GetChildren(c.Request.Context(), c.Query("id"))
	if err != nil {
		// 缺少目录是参数错误，数据库查询故障是服务错误。
		if errors.Is(err, service.ErrInvalidDirectoryID) {
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "目录标识不能为空"))
			return
		}
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "文件夹查找失败"))
		return
	}
	// 业务成功码统一用 0，和登录接口保持一致
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "查找成功", children))
}

// CreateFolder 只创建文件夹，不接收文章创建参数。
func (h *FoldersHandler) CreateFolder(c *gin.Context) {
	var req dto.CreateFolderReq
	if err := bindCreateRequest(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "文件夹创建参数非法"))
		return
	}

	// 与创建文章保持一致，处理失败并返回创建后的完整数据。
	res, err := h.s.CreateFolder(c.Request.Context(), req.ParentID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidDirectoryID) {
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "父目录标识不能为空"))
			return
		}
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "创建文件夹失败"))
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}

// RenameFolder 只修改文件夹名称。
func (h *FoldersHandler) RenameFolder(c *gin.Context) {
	var req dto.RenameFolderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "重命名参数非法"))
		return
	}

	res, err := h.s.RenameFolder(c.Request.Context(), req.ID, req.Name)
	if err != nil {
		switch {
		// 标识缺失和名称非法都属于请求参数问题。
		case errors.Is(err, service.ErrInvalidResourceID), errors.Is(err, service.ErrInvalidName):
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "名称不能为空或过长"))
		case errors.Is(err, service.ErrFolderNotFound):
			c.JSON(http.StatusNotFound, dto.Fail(cons.NotFound, "文件夹不存在"))
		default:
			c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "重命名失败"))
		}
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}

// Delete 文件夹级联删除
func (h *FoldersHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.s.DeleteFolder(c.Request.Context(), id); err != nil {
		switch {
		// 标识缺失属于请求参数问题。
		case errors.Is(err, service.ErrInvalidResourceID):
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "文件夹标识不能为空"))
		case errors.Is(err, service.ErrFolderNotFound):
			c.JSON(http.StatusNotFound, dto.Fail(cons.NotFound, "文件夹不存在"))
		default:
			c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "删除失败"))
		}
		return
	}
	// 删除成功按统一响应格式返回
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", nil))
}
