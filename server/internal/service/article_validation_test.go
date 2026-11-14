package service

import (
	"bytes"
	"errors"
	"image"
	"image/png"
	"mime/multipart"
	"net/textproto"
	"strings"
	"testing"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/utils"
)

// 用真实 multipart 解析得到文件头，验证服务端检查的是内容而非客户端 MIME。
func testImageHeader(t *testing.T, data []byte, declaredType string) *multipart.FileHeader {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	h := textproto.MIMEHeader{}
	h.Set("Content-Disposition", `form-data; name="image"; filename="image.png"`)
	h.Set("Content-Type", declaredType)
	part, err := w.CreatePart(h)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(data); err != nil {
		t.Fatal(err)
	}
	w.Close()
	form, err := multipart.NewReader(&body, w.Boundary()).ReadForm(1 << 20)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { form.RemoveAll() })
	return form.File["image"][0]
}

// 业务层必须保留具体原因，调用方既能识别校验类别，也能区分失败场景。
func TestArticleValidationBusinessErrors(t *testing.T) {
	for _, tt := range []struct {
		id, content, status string
		want                error
	}{
		{"", "", "draft", ErrArticleInvalidID},
	} {
		_, err := NewArticlesService(nil, nil).UpdateArticle(t.Context(), tt.id, tt.content, tt.status, nil)
		if !errors.Is(err, tt.want) || !errors.Is(err, ErrArticleValidation) {
			t.Fatalf("未保留具体业务错误 %v: %v", tt.want, err)
		}
	}
}

// 覆盖正文、图片数量、单张大小和伪造类型，非法请求不能进入数据库或上传服务。
func TestValidateArticleUpdate(t *testing.T) {
	var pngData bytes.Buffer
	if err := png.Encode(&pngData, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
		t.Fatal(err)
	}
	valid := testImageHeader(t, pngData.Bytes(), "text/html")
	oversized := *valid
	oversized.Size = cons.MaxImageBytes + 1
	boundary := *valid
	boundary.Size = cons.MaxImageBytes
	tooMany := make(map[string]*multipart.FileHeader)
	for i := 0; i < 25; i++ {
		tooMany[strings.Repeat("a", i)] = valid
	}
	for _, tt := range []struct {
		name    string
		content string
		images  map[string]*multipart.FileHeader
		invalid bool
	}{
		{"空正文可以保存草稿", "", nil, false},
		{"正文不做长度校验", strings.Repeat("a", 2<<20), nil, false},
		{"正文不做UTF8校验", string([]byte{255}), nil, false},
		{"真实图片覆盖伪造MIME", "正文", map[string]*multipart.FileHeader{"image": valid}, false},
		{"单张大小边界", "正文", map[string]*multipart.FileHeader{"image": &boundary}, false},
		{"单张超过10MB", "正文", map[string]*multipart.FileHeader{"image": &oversized}, true},
		{"图片数量不设限制", "正文", tooMany, false},
		{"缺少图片文件", "正文", map[string]*multipart.FileHeader{"image": nil}, true},
		{"HTML伪装PNG", "正文", map[string]*multipart.FileHeader{"image": testImageHeader(t, []byte("<html>test</html>"), "image/png")}, true},
		{"拒绝SVG", "正文", map[string]*multipart.FileHeader{"image": testImageHeader(t, []byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`), "image/svg+xml")}, true},
		{"损坏PNG", "正文", map[string]*multipart.FileHeader{"image": testImageHeader(t, []byte("\x89PNG\r\n\x1a\n"), "image/png")}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			issue, err := utils.ValidateArticleUpdate("article", tt.images)
			if tt.invalid && issue == utils.ArticleValid || !tt.invalid && (issue != utils.ArticleValid || err != nil) {
				t.Fatalf("校验结果不符合预期: %v", err)
			}
			if tt.invalid {
				// 未提供依赖，只有在校验提前拒绝时才不会触发上传或查库。
				_, err = NewArticlesService(nil, nil).UpdateArticle(t.Context(), "article", tt.content, "draft", tt.images)
				if !errors.Is(err, ErrArticleValidation) {
					t.Fatalf("业务层未提前拒绝: %v", err)
				}
			}
		})
	}
}
