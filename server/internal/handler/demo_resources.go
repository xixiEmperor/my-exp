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

// DemoResourceHandler 处理 demo 表的查询、创建、编辑与删除请求。
type DemoResourceHandler struct {
	s *service.DemoResourceService
}

// NewDemoResourceHandler 创建 DemoResourceHandler 实例。
func NewDemoResourceHandler(s *service.DemoResourceService) *DemoResourceHandler {
	return &DemoResourceHandler{s: s}
}

// GetDemoResources 查询 demo 列表；同时传 slug 与 verison 时返回唯一版本记录。
func (h *DemoResourceHandler) GetDemoResources(c *gin.Context) {
	slug := c.Query("slug")
	verison := c.Query("verison")

	if slug != "" && verison != "" {
		res, err := h.s.GetDemoResourceBySlugAndVerison(c.Request.Context(), slug, verison)
		if err != nil {
			h.writeDemoResourceError(c, "查询demo资源失败", err)
			return
		}
		c.JSON(http.StatusOK, dto.SuccessWithData(0, "请求成功", res))
		return
	}

	list, err := h.s.GetAllDemoResources(c.Request.Context())
	if err != nil {
		h.writeDemoResourceError(c, "查询全部demo资源列表失败", err)
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "请求成功", list))
}

// GetDemoResourceByID 根据主键 id 查询单条 demo 记录。
func (h *DemoResourceHandler) GetDemoResourceByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.s.GetDemoResourceByID(c.Request.Context(), id)
	if err != nil {
		h.writeDemoResourceError(c, "查询demo资源失败", err)
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "请求成功", res))
}

// CreateDemoResource 上传 demo 静态产物与源码到 R2，并自动生成主键写入 demos 表。
func (h *DemoResourceHandler) CreateDemoResource(c *gin.Context) {
	var req dto.CreateDemoResourceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "demo资源参数非法"))
		return
	}

	res, err := h.s.CreateDemoResource(c.Request.Context(), req)
	if err != nil {
		h.writeDemoResourceError(c, "添加demo资源失败", err)
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}

// UpdateDemoResource 编辑 demo 的展示名称、说明、标签和发布状态。
func (h *DemoResourceHandler) UpdateDemoResource(c *gin.Context) {
	var req dto.UpdateDemoResourceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "demo编辑参数非法"))
		return
	}

	res, err := h.s.UpdateDemoResource(c.Request.Context(), c.Param("id"), req)
	if err != nil {
		h.writeDemoResourceError(c, "编辑demo失败", err)
		return
	}
	c.JSON(http.StatusOK, dto.SuccessWithData(0, "success", res))
}

// DeleteDemoResource 删除指定 demo 记录并清理对应 R2 版本目录。
func (h *DemoResourceHandler) DeleteDemoResource(c *gin.Context) {
	if err := h.s.DeleteDemoResource(c.Request.Context(), c.Param("id")); err != nil {
		h.writeDemoResourceError(c, "删除demo失败", err)
		return
	}
	c.JSON(http.StatusOK, dto.Success(0))
}

func (h *DemoResourceHandler) writeDemoResourceError(c *gin.Context, logMsg string, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidResourceID), errors.Is(err, service.ErrDemoResourceInvalid):
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, err.Error()))
	case errors.Is(err, service.ErrDemoResourceNotFound):
		c.JSON(http.StatusNotFound, dto.Fail(cons.NotFound, err.Error()))
	case errors.Is(err, service.ErrDemoResourceConflict):
		c.JSON(http.StatusConflict, dto.Fail(cons.BindError, err.Error()))
	case errors.Is(err, service.ErrR2NotConfigured):
		c.JSON(http.StatusServiceUnavailable, dto.Fail(cons.InternalError, err.Error()))
	default:
		logger.FromContext(c.Request.Context()).Error(logMsg, "type", "business", "error", err)
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, logMsg))
	}
}
