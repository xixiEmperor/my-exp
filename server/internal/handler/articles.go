package handler

import (
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

func (h *ArticlesHandler) GetFolderNodes(c *gin.Context) {
	id := c.Query("id")

	nodes, err := h.s.FindNodes(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.InternalError, "文件查找错误"))
		return
	}

	// 业务成功码统一用 0，和登录接口保持一致
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "查找成功", nodes))
}

func (h *ArticlesHandler) GetArticles(c *gin.Context) {
	article_id := c.Query("id")

	nodes, err := h.s.FindArticleContent(c.Request.Context(), article_id)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.InternalError, "文件查找错误"))
		return
	}

	// 业务成功码统一用 0，和登录接口保持一致
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "查找成功", nodes))
}

func (h *ArticlesHandler) CreateArticleOrFolder(c *gin.Context) {
	var req dto.CreateArticleOrFolderReq

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "服务器内部错误"))
		return
	}

	switch req.Type {
	case "article":
		res, err := h.s.CreateArticle(c.Request.Context(), req.FolderId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "创建文章失败"))
			return
		}
		c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
	case "folder":
		// 与创建文章保持一致，处理失败并返回创建后的完整数据。
		res, err := h.s.CreateFolder(c.Request.Context(), req.FolderId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "创建文件夹失败"))
			return
		}
		c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
	default:
		c.JSON(http.StatusBadRequest, dto.Fail(-1, "创建的内容类型非法"))
	}
}
