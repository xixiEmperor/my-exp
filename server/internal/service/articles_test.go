package service

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"reflect"
	"strings"
	"testing"

	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/utils"
)

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
	part, err := writer.CreateFormFile("file", "image.webp")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("webp-data")); err != nil {
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
	if gotType != "image/webp" {
		t.Errorf("文件类型错误: %s", gotType)
	}
	if gotBody != "webp-data" {
		t.Errorf("文件内容错误: %s", gotBody)
	}
}
