package handler

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"zhiye/server/internal/service"
)

// 没有数据库或图片依赖，非法上传必须在进入业务操作前被拒绝。
func TestRejectInvalidArticleUpload(t *testing.T) {
	for _, tt := range []struct {
		name      string
		files     int
		duplicate bool
		status    int
	}{
		{"同字段多个文件", 2, true, http.StatusBadRequest},
		{"伪造图片", 1, false, http.StatusBadRequest},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var body bytes.Buffer
			w := multipart.NewWriter(&body)
			w.WriteField("id", "article")
			w.WriteField("content", "正文")
			w.WriteField("status", "draft")
			for i := 0; i < tt.files; i++ {
				name := strings.Repeat("a", i+1)
				if tt.duplicate {
					name = "image"
				}
				part, err := w.CreateFormFile(name, "image.png")
				if err != nil {
					t.Fatal(err)
				}
				part.Write([]byte("<html>fake image</html>"))
			}
			w.Close()
			r := gin.New()
			r.POST("/update", NewArticlesHandler(service.NewArticlesService(nil, nil)).UpdateArticle)
			req := httptest.NewRequest(http.MethodPost, "/update", &body)
			req.Header.Set("Content-Type", w.FormDataContentType())
			response := httptest.NewRecorder()
			r.ServeHTTP(response, req)
			if response.Code != tt.status {
				t.Fatalf("状态=%d，期望=%d: %s", response.Code, tt.status, response.Body.String())
			}
		})
	}
}
