package handler

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/logger"
	"zhiye/server/internal/service"
)

// respondMoveError 统一移动请求的参数、资源和数据库错误响应。
func respondMoveError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidResourceID), errors.Is(err, service.ErrInvalidDirectoryID), errors.Is(err, service.ErrInvalidMove):
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, err.Error()))
	case errors.Is(err, service.ErrFolderNotFound), errors.Is(err, service.ErrArticleNotFound):
		c.JSON(http.StatusNotFound, dto.Fail(cons.NotFound, err.Error()))
	default:
		logger.FromContext(c.Request.Context()).Error("移动失败", "type", "business", "error", err)
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "移动失败"))
	}
}

// MoveFolder 移动文件夹，并保留整个子目录结构。
func (h *FoldersHandler) MoveFolder(c *gin.Context) {
	var req dto.MoveFolderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "文件夹移动参数非法"))
		return
	}
	res, err := h.s.MoveFolder(c.Request.Context(), req.ID, req.ParentID)
	if err != nil {
		respondMoveError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}

// MoveArticle 移动文章，响应包含实际标题和所属目录。
func (h *ArticlesHandler) MoveArticle(c *gin.Context) {
	var req dto.MoveArticleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "文章移动参数非法"))
		return
	}
	res, err := h.s.MoveArticle(c.Request.Context(), req.ID, req.FolderID)
	if err != nil {
		respondMoveError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}
