package handler

import (
	"errors"
	"mime/multipart"
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
		if errors.Is(err, service.ErrNotPublished) {
			c.JSON(http.StatusForbidden, dto.Fail(cons.Forbidden, "无权获取该文章"))
			return
		}
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

// 重命名文章标题
func (h *ArticlesHandler) RenameArticle(c *gin.Context) {
	var req dto.RenameArticleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "重命名参数非法"))
		return
	}

	res, err := h.s.RenameArticle(c.Request.Context(), req.ID, req.Title)
	if err != nil {
		switch {
		// 标识缺失和名称非法都属于请求参数问题。
		case errors.Is(err, service.ErrInvalidResourceID), errors.Is(err, service.ErrInvalidName):
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "名称不能为空或过长"))
		case errors.Is(err, service.ErrArticleNotFound):
			c.JSON(http.StatusNotFound, dto.Fail(cons.NotFound, "文章不存在"))
		default:
			c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "重命名失败"))
		}
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}

// 更新文章内容
func (h *ArticlesHandler) UpdateArticle(c *gin.Context) {
	var req dto.UpdateArticleReq

	// 这里先绑基础数据
	err := c.ShouldBind(&req)
	if err != nil {
		c.JSON(400, dto.Fail(-1, "绑定失败"))
		return
	}

	// 手动绑图片数据
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(400, dto.Fail(-1, "无法处理图片数据"))
		return
	}
	req.Images = make(map[string]*multipart.FileHeader, len(form.File))
	for url, headers := range form.File {
		if len(headers) == 0 {
			continue
		}
		req.Images[url] = headers[0]
	}

	res, err := h.s.UpdateArticle(c.Request.Context(), req.ID, req.Content, req.Status, req.Images)
	if err != nil {
		c.JSON(400, dto.Fail(-1, "更新失败"))
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}

// Delete 文章删除
func (h *ArticlesHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.s.DeleteArticle(c.Request.Context(), id); err != nil {
		switch {
		// 标识缺失属于请求参数问题。
		case errors.Is(err, service.ErrInvalidResourceID):
			c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "文章标识不能为空"))
		case errors.Is(err, service.ErrArticleNotFound):
			c.JSON(http.StatusNotFound, dto.Fail(cons.NotFound, "文章不存在"))
		default:
			c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "删除失败"))
		}
		return
	}
	// 删除成功按统一响应格式返回
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", nil))
}
