package handler

import (
	"errors"
	"net/http"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/logger"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

// SortChildren 调整单个父目录下子文件夹和文章的组内排序。
func (h *FoldersHandler) SortChildren(c *gin.Context) {
	var req dto.SortFolderChildrenReq
	// 复用严格 JSON 绑定，拒绝未知字段或尾部多余内容。
	if err := bindCreateRequest(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "排序参数非法"))
		return
	}

	if err := h.s.SortChildren(c.Request.Context(), req.ParentID, req.FolderIDs, req.ArticleIDs); err != nil {
		switch {
		// 目录或节点参数非法、重复 ID 均映射为 400。
		case errors.Is(err, service.ErrInvalidDirectoryID),
			errors.Is(err, service.ErrInvalidResourceID),
			errors.Is(err, service.ErrDuplicateSortID):
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, err.Error()))
		// 目标父目录已被删除，映射为 404。
		case errors.Is(err, service.ErrFolderNotFound):
			c.JSON(http.StatusNotFound, dto.Fail(cons.NotFound, err.Error()))
		// 提交的子节点集合与数据库当前状态不一致，映射为 409 触发前端刷新。
		case errors.Is(err, service.ErrSortConflict):
			c.JSON(http.StatusConflict, dto.Fail(cons.Conflict, err.Error()))
		// 其余视为服务端或数据库异常，记录日志且不暴露底层错误。
		default:
			logger.FromContext(c.Request.Context()).Error("调整目录排序失败", "type", "business", "error", err)
			c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "调整排序失败"))
		}
		return
	}

	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", nil))
}
