package handler

import (
	"errors"
	"net/http"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

type ArticlesHandler struct {
	s *service.ArticlesService
}

func NewArticlesHandler(s *service.ArticlesService) *ArticlesHandler {
	return &ArticlesHandler{
		s: s,
	}
}

// 获取文章内容以及相关信息
func (h *ArticlesHandler) GetArticleContent(c *gin.Context) {
	article_id := c.Query("id")

	nodes, err := h.s.FindArticleContent(c.Request.Context(), article_id)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.InternalError, "文件查找错误"))
		return
	}

	// 业务成功码统一用 0，和登录接口保持一致
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "查找成功", nodes))
}

// 返回文章列表，不查询文件夹资源。
func (h *ArticlesHandler) GetArticlesByFolderID(c *gin.Context) {
	articles, err := h.s.GetArticlesByFolderID(c.Request.Context(), c.Query("folder_id"))
	if err != nil {
		if errors.Is(err, service.ErrInvalidDirectoryID) {
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "目录标识不能为空"))
			return
		}
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "文章列表查找失败"))
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "查找成功", articles))
}

// CreateArticle 只创建文章，旧的 type 字段会在绑定时被拒绝。
func (h *ArticlesHandler) CreateArticle(c *gin.Context) {
	var req dto.CreateArticleReq
	if err := bindCreateRequest(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "文章创建参数非法"))
		return
	}

	res, err := h.s.CreateArticle(c.Request.Context(), req.FolderID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidDirectoryID) {
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "目录标识不能为空"))
			return
		}
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "创建文章失败"))
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}
