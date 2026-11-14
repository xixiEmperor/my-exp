package service

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"reflect"
	"strings"
	"testing"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"
	"zhiye/server/internal/utils"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// 验证不同换行下的登录正文，以及旧预览字段不会产生重复分隔符。
func TestFindArticleContentSeparator(t *testing.T) {
	for _, newline := range []string{"\n", "\r\n"} {
		for _, role := range []string{"guest", "user", "admin"} {
			t.Run(role+fmtNewlineName(newline), func(t *testing.T) {
				sqlDB, mock, err := sqlmock.New()
				if err != nil {
					t.Fatal(err)
				}
				t.Cleanup(func() { _ = sqlDB.Close() })
				db, err := gorm.Open(mysql.New(mysql.Config{Conn: sqlDB, SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
				if err != nil {
					t.Fatal(err)
				}
				svc := NewArticlesService(repository.NewArticlesRepo(db), nil)
				content := "预览" + newline + cons.SplitFlag + newline + "正文"
				// 用旧的错误预览数据验证游客返回仍会在标记处截断。
				mock.ExpectQuery("SELECT .* FROM .articles. WHERE").WithArgs("article", 1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "status", "content", "preview"}).AddRow("article", "published", content, content))
				ctx := context.Background()
				if role != "guest" {
					ctx = context.WithValue(ctx, cons.CtxUserInfo, &model.Users{Role: role})
				}
				article, err := svc.FindArticleContent(ctx, "article")
				if err != nil {
					t.Fatal(err)
				}
				got := article.(model.ArticlesDetail).Content
				want := content
				if role == "user" {
					want = "预览" + newline + newline + "正文"
				}
				if role == "guest" {
					want = "预览" + newline + "\n" + cons.SplitFlag + "\n"
				}
				if got != want {
					t.Fatalf("正文 = %q, want %q", got, want)
				}
				if err := mock.ExpectationsWereMet(); err != nil {
					t.Fatal(err)
				}
			})
		}
	}
}

// 给不同换行的测试提供便于识别的名称。
func fmtNewlineName(newline string) string {
	if newline == "\r\n" {
		return "CRLF"
	}
	return "LF"
}

// TestExtractURL 验证图片地址抽取与 web 端 subUrls 的规则一致。
func TestExtractURL(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    []string
	}{
		{
			name:    "普通图片",
			content: "![图片](https://static.swifthire.top/my-exp/a/b.webp)",
			want:    []string{"https://static.swifthire.top/my-exp/a/b.webp"},
		},
		{
			name:    "多张图片和普通链接",
			content: "![一](https://cdn.test/1.webp) 正文 [链接](https://example.com) ![二](https://cdn.test/2.webp)",
			want:    []string{"https://cdn.test/1.webp", "https://cdn.test/2.webp"},
		},
		{
			name:    "空内容",
			content: "",
			want:    []string{},
		},
		{
			name:    "没有图片",
			content: "只有文字和 [链接](https://example.com)",
			want:    []string{},
		},
		{
			name:    "图片重复出现",
			content: "![一](https://cdn.test/1.webp)![二](https://cdn.test/1.webp)",
			want:    []string{"https://cdn.test/1.webp", "https://cdn.test/1.webp"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := utils.ExtractURL(tt.content); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("extractURL() = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestImageObjectKey 验证 CDN URL 只截掉基地址，非 CDN 地址直接拒绝。
func TestImageObjectKey(t *testing.T) {
	key, err := imageObjectKey(cons.CDN_BASE_URL + "/my-exp/article/image.webp")
	if err != nil {
		t.Fatal(err)
	}
	if key != "my-exp/article/image.webp" {
		t.Fatalf("对象路径错误: %s", key)
	}

	for _, cdnURL := range []string{
		"https://example.com/my-exp/article/image.webp",
		cons.CDN_BASE_URL + "/",
	} {
		if _, err := imageObjectKey(cdnURL); !errors.Is(err, ErrCDNPostFailed) {
			t.Errorf("非法 URL 未拒绝: %s, %v", cdnURL, err)
		}
	}
}

// TestDeletableImageKey 验证只有当前文章目录下的 CDN 图片可以进入删除流程。
func TestDeletableImageKey(t *testing.T) {
	const articleID = "articleA"
	tests := []struct {
		name   string
		cdnURL string
		want   string
	}{
		{
			name:   "当前文章目录",
			cdnURL: cons.CDN_BASE_URL + "/my-exp/articleA/image.webp",
			want:   "my-exp/articleA/image.webp",
		},
		{
			name:   "其他文章目录",
			cdnURL: cons.CDN_BASE_URL + "/my-exp/articleB/image.webp",
			want:   "",
		},
		{
			name:   "前缀相同的其他文章",
			cdnURL: cons.CDN_BASE_URL + "/my-exp/articleAB/image.webp",
			want:   "",
		},
		{
			name:   "外链图片",
			cdnURL: "https://example.com/image.webp",
			want:   "",
		},
		{
			name:   "CDN 根路径",
			cdnURL: cons.CDN_BASE_URL + "/",
			want:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := deletableImageKey(articleID, tt.cdnURL); got != tt.want {
				t.Fatalf("deletableImageKey() = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestUploadImage 用本地 R2 服务验证对象路径、文件类型和文件内容。
func TestUploadImage(t *testing.T) {
	var gotPath, gotType, gotBody string
	imageSvc := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath = strings.TrimPrefix(r.URL.Path, "/accounts/account/r2/buckets/images/objects/")
		gotType = r.Header.Get("Content-Type")
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		writeImageJSON(w, map[string]any{"key": gotPath}, "")
	})

	// 构造一份 multipart 表单，得到和请求绑定后一致的 FileHeader。
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	// 使用真实 PNG，并保留客户端的 WebP 声明，验证上传使用实际文件类型。
	var imageData bytes.Buffer
	if err := png.Encode(&imageData, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
		t.Fatal(err)
	}
	part, err := writer.CreateFormFile("file", "image.webp")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(imageData.Bytes()); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	form, err := multipart.NewReader(&buf, writer.Boundary()).ReadForm(1 << 20)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = form.RemoveAll() })

	header := form.File["file"][0]
	header.Header.Set("Content-Type", "image/webp")
	svc := &ArticlesService{imageSvc: imageSvc}
	cdnURL := cons.CDN_BASE_URL + "/my-exp/article/image.webp"
	if err := svc.uploadImage(context.Background(), cdnURL, header); err != nil {
		t.Fatal(err)
	}

	if gotPath != "my-exp/article/image.webp" {
		t.Errorf("对象路径错误: %s", gotPath)
	}
	if gotType != "image/png" {
		t.Errorf("文件类型错误: %s", gotType)
	}
	if gotBody != imageData.String() {
		t.Errorf("文件内容错误: %s", gotBody)
	}
}
