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
