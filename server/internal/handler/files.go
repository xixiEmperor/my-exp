package handler

import (
	"zhiye/server/internal/dto"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

type FileHandler struct {
	s *service.FileService
}

func NewFileHandler(s *service.FileService) *FileHandler {
	return &FileHandler{s: s}
}

// 获取现有 demo 列表。
func (h *FileHandler) GetDemoNames(c *gin.Context) {
	// 将请求上下文传给服务，响应沿用现有接口格式。
	names, err := h.s.GetName(c.Request.Context())
	if err != nil {
		c.JSON(400, dto.Fail(-1, "demo 列表获取出错"))
		return
	}

	c.JSON(200, dto.SuccessWithData(0, "请求成功", names))
}

func (h *FileHandler) GetDemoVary(c *gin.Context) {
	demo_name := c.Query("demo_name")

	varys, err := h.s.GetVery(c.Request.Context(), demo_name)
	if err != nil {
		c.JSON(400, dto.Fail(-1, "demo 变体获取出错"))
		return
	}

	c.JSON(200, dto.SuccessWithData(0, "请求成功", varys))
}

// 获取指定 demo 变体目录下的全部文件路径。
func (h *FileHandler) GetDemoSourcePaths(c *gin.Context) {
	demo_name := c.Query("demo_name")
	vary_name := c.Query("vary_name")

	// 查询源码路径时必须明确指定 demo 和变体。
	if demo_name == "" || vary_name == "" {
		c.JSON(400, dto.Fail(-1, "demo_name 和 vary_name 不能为空"))
		return
	}

	paths, err := h.s.GetSourcePaths(c.Request.Context(), demo_name, vary_name)
	if err != nil {
		c.JSON(400, dto.Fail(-1, "demo 源码文件路径获取出错"))
		return
	}

	c.JSON(200, dto.SuccessWithData(0, "请求成功", paths))
}

// 获取指定 demo 变体的当前版本号。
func (h *FileHandler) GetDemoVersion(c *gin.Context) {
	demo_name := c.Query("demo_name")
	vary_name := c.Query("vary_name")

	// 版本号由服务读取变体配置，接口只处理参数和响应。
	if demo_name == "" || vary_name == "" {
		c.JSON(400, dto.Fail(-1, "demo_name 和 vary_name 不能为空"))
		return
	}

	version, err := h.s.GetVersion(c.Request.Context(), demo_name, vary_name)
	if err != nil {
		c.JSON(400, dto.Fail(-1, "demo 变体版本获取出错"))
		return
	}

	c.JSON(200, dto.SuccessWithData(0, "请求成功", version))
}
