package service

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/cloudflare/cloudflare-go/v7/option"
)

// imageTestTransport 在本地接收请求，验证默认地址时不连接真实 Cloudflare。
type imageTestTransport struct {
	t *testing.T
}

// RoundTrip 检查完整客户端是否为 R2 请求设置了默认 API 地址。
func (transport imageTestTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	if request.URL.Scheme != "https" || request.URL.Host != "api.cloudflare.com" ||
		request.URL.Path != "/client/v4/accounts/account/r2/buckets/images/objects/a.png" {
		transport.t.Errorf("默认 API 地址错误: %s", request.URL)
	}
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"font/woff2"}},
		Body:       io.NopCloser(strings.NewReader("font")),
		Request:    request,
	}, nil
}

// TestImageDefaultAPIAddress 防止只初始化子服务时遗漏 SDK 默认 API 地址。
func TestImageDefaultAPIAddress(t *testing.T) {
	// 固定环境变量，避免本机的 Cloudflare 地址配置影响默认地址断言。
	previous, exists := os.LookupEnv("CLOUDFLARE_BASE_URL")
	if err := os.Unsetenv("CLOUDFLARE_BASE_URL"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if exists {
			_ = os.Setenv("CLOUDFLARE_BASE_URL", previous)
		}
	})
	s, err := NewImageService(
		ImageConfig{AccountID: "account", APIToken: "token", BucketName: "images"},
		option.WithHTTPClient(&http.Client{Transport: imageTestTransport{t: t}}),
	)
	if err != nil {
		t.Fatal(err)
	}
	response, err := s.GetFile(context.Background(), "a.png")
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
}

// newTestImageService 通过本地 HTTP 服务验证真实 SDK 的请求和响应处理。
func newTestImageService(t *testing.T, handler http.HandlerFunc) *ImageService {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	s, err := NewImageService(
		ImageConfig{AccountID: "account", APIToken: "token", BucketName: "images"},
		option.WithBaseURL(server.URL),
	)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

// writeImageJSON 统一输出 Cloudflare 响应格式。
func writeImageJSON(w http.ResponseWriter, result any, cursor string) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).
		Encode(map[string]any{"success": true, "result": result, "result_info": map[string]any{"cursor": cursor}})
}

// TestImageFileOperations 验证特殊字符路径、原始上传内容以及下载后的内容。
func TestImageFileOperations(t *testing.T) {
	key := "图片/a name.png"
	var stored string
	s := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token" {
			t.Error("缺少令牌")
		}
		if r.URL.Path != "/accounts/account/r2/buckets/images/objects/"+key || r.URL.RawQuery != "" {
			t.Errorf("路径不正确: %s", r.URL)
		}
		switch r.Method {
		case http.MethodPut:
			if r.Header.Get("Content-Type") != "image/png" {
				t.Error("文件类型未保留")
			}
			body, _ := io.ReadAll(r.Body)
			stored = string(body)
			writeImageJSON(w, map[string]any{"key": key, "size": "3"}, "")
		case http.MethodGet:
			w.Header().Set("Content-Type", "image/png")
			_, _ = io.WriteString(w, stored)
		case http.MethodDelete:
			stored = ""
			writeImageJSON(w, map[string]any{"key": key}, "")
		}
	})
	ctx := context.Background()
	if _, err := s.UploadFile(ctx, key, strings.NewReader("old"), "image/png"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateFile(ctx, key, strings.NewReader("new"), "image/png"); err != nil {
		t.Fatal(err)
	}
	response, err := s.GetFile(ctx, key)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, _ := io.ReadAll(response.Body)
	if string(body) != "new" {
		t.Fatalf("更新结果: %s", body)
	}
	if err := s.DeleteFile(ctx, key); err != nil {
		t.Fatal(err)
	}
	if stored != "" {
		t.Fatal("文件未删除")
	}
}

// TestImageFolderPagination 验证第二页、空目录占位对象和直接子目录的归类。
func TestImageFolderPagination(t *testing.T) {
	s := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("prefix") != "photos/" {
			t.Fatalf("目录前缀错误: %s", r.URL)
		}
		if r.URL.Query().Get("cursor") == "next" {
			writeImageJSON(w, []map[string]any{{"key": "photos/sub/b.png"}, {"key": "photos/empty/"}}, "")
		} else {
			writeImageJSON(w, []map[string]any{{"key": "photos/"}, {"key": "photos/a.png"}}, "next")
		}
	})
	content, err := s.GetFolder(context.Background(), "photos")
	if err != nil {
		t.Fatal(err)
	}
	if len(content.Files) != 1 || content.Files[0].Key != "photos/a.png" ||
		!reflect.DeepEqual(content.Folders, []string{"photos/empty/", "photos/sub/"}) {
		t.Fatalf("目录结果错误: %+v", content)
	}
	files, err := s.ListFiles(context.Background(), "photos/")
	if err != nil || len(files) != 2 {
		t.Fatalf("递归文件结果错误: %+v, %v", files, err)
	}
}

// TestImageFolderDelete 先列完所有分页再删除，名称相近的目录不会被包含。
func TestImageFolderDelete(t *testing.T) {
	var operations []string
	s := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			operations = append(operations, "list")
			if r.URL.Query().Get("prefix") != "photos/" {
				t.Error("目录前缀缺少分隔符")
			}
			if r.URL.Query().Get("cursor") == "next" {
				writeImageJSON(w, []map[string]any{{"key": "photos/sub/b.png"}}, "")
			} else {
				writeImageJSON(w, []map[string]any{{"key": "photos/"}}, "next")
			}
		} else {
			operations = append(
				operations,
				"delete:"+strings.TrimPrefix(r.URL.Path, "/accounts/account/r2/buckets/images/objects/"),
			)
			writeImageJSON(w, map[string]any{}, "")
		}
	})
	if err := s.DeleteFolder(context.Background(), "photos"); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(operations, []string{"list", "list", "delete:photos/", "delete:photos/sub/b.png"}) {
		t.Fatalf("执行顺序错误: %v", operations)
	}
}

// TestImageRenameFailure 上传失败时不得删除源对象，并验证复制时的 HTTP 元信息。
func TestImageRenameFailure(t *testing.T) {
	deletes := 0
	s := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Query().Has("prefix"):
			prefix := r.URL.Query().Get("prefix")
			if prefix == "old/" {
				writeImageJSON(w, []map[string]any{{"key": "old/a.png"}, {"key": "old/sub/b.png"}}, "")
			} else {
				writeImageJSON(w, []map[string]any{}, "")
			}
		case r.Method == http.MethodGet:
			w.Header().Set("Content-Type", "image/png")
			w.Header().Set("Cache-Control", "max-age=60")
			_, _ = io.WriteString(w, "data")
		case r.Method == http.MethodPut:
			if r.Header.Get("Content-Type") != "image/png" || r.Header.Get("Cache-Control") != "max-age=60" {
				t.Error("复制丢失 HTTP 元信息")
			}
			if strings.HasSuffix(r.URL.Path, "/new/sub/b.png") {
				w.WriteHeader(http.StatusInternalServerError)
			} else {
				writeImageJSON(w, map[string]any{}, "")
			}
		case r.Method == http.MethodDelete:
			deletes++
			writeImageJSON(w, map[string]any{}, "")
		}
	})
	if err := s.RenameFolder(context.Background(), "old", "new"); err == nil {
		t.Fatal("复制失败未报告错误")
	}
	if deletes != 0 {
		t.Fatal("复制失败后删除了源文件")
	}
}

// TestImageValidationAndNotFound 验证非法路径不发请求，404 可按业务错误处理。
func TestImageValidationAndNotFound(t *testing.T) {
	requests := 0
	s := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
		requests++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_, _ = io.WriteString(w, `{"success":false,"errors":[{"code":10007,"message":"not found"}]}`)
	})
	ctx := context.Background()
	for _, key := range []string{"", "/", "/a", "a//b", "a/../b", "a\\b", "a/", "a\x00b", "a#b.png", "a%b.png", "a?b.png"} {
		if err := s.DeleteFile(ctx, key); !errors.Is(err, ErrInvalidImageKey) {
			t.Errorf("非法路径被接受: %q", key)
		}
	}
	if err := s.DeleteFolder(ctx, "/"); !errors.Is(err, ErrInvalidImageKey) {
		t.Fatal("允许删除根目录")
	}
	if err := s.RenameFolder(ctx, "a", "a/b"); !errors.Is(err, ErrInvalidImageKey) {
		t.Fatal("允许移动到子目录")
	}
	if requests != 0 {
		t.Fatal("校验失败仍发送了请求")
	}
	if _, err := s.GetFile(ctx, "missing.png"); !errors.Is(err, ErrImageNotFound) {
		t.Fatalf("404 未映射: %v", err)
	}
}

// TestImageRenameSuccessAndConflict 验证复制顺序、目录相对路径以及重名保护。
func TestImageRenameSuccessAndConflict(t *testing.T) {
	for _, folder := range []bool{false, true} {
		t.Run(map[bool]string{false: "file", true: "folder"}[folder], func(t *testing.T) {
			var operations []string
			conflict := false
			s := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
				key := strings.TrimPrefix(r.URL.Path, "/accounts/account/r2/buckets/images/objects/")
				if r.URL.Query().Has("prefix") {
					prefix := r.URL.Query().Get("prefix")
					if prefix == "old/" {
						writeImageJSON(w, []map[string]any{{"key": "old/"}, {"key": "old/sub/a.png"}}, "")
					} else if conflict {
						writeImageJSON(w, []map[string]any{{"key": prefix}}, "")
					} else {
						writeImageJSON(w, []map[string]any{}, "")
					}
					return
				}
				operations = append(operations, r.Method+":"+key)
				switch r.Method {
				case http.MethodGet:
					_, _ = io.WriteString(w, "data")
				case http.MethodPut:
					writeImageJSON(w, map[string]any{"key": key}, "")
				case http.MethodDelete:
					writeImageJSON(w, map[string]any{"key": key}, "")
				}
			})
			ctx := context.Background()
			rename := func() error {
				if folder {
					return s.RenameFolder(ctx, "old", "new")
				}
				return s.RenameFile(ctx, "old.png", "new.png")
			}
			if err := rename(); err != nil {
				t.Fatal(err)
			}
			want := []string{"GET:old.png", "PUT:new.png", "DELETE:old.png"}
			if folder {
				want = []string{
					"GET:old/",
					"PUT:new/",
					"GET:old/sub/a.png",
					"PUT:new/sub/a.png",
					"DELETE:old/",
					"DELETE:old/sub/a.png",
				}
			}
			if !reflect.DeepEqual(operations, want) {
				t.Fatalf("重命名执行顺序错误: %v", operations)
			}
			operations = nil
			conflict = true
			if err := rename(); !errors.Is(err, ErrImageAlreadyExists) {
				t.Fatalf("重名未报告: %v", err)
			}
			if len(operations) != 0 {
				t.Fatal("目标存在时仍修改了文件")
			}
		})
	}
}

// TestImageCreateFolder 验证空文件夹占位对象和空目录查询。
func TestImageCreateFolder(t *testing.T) {
	created := false
	s := newTestImageService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			if !strings.HasSuffix(r.URL.Path, "/empty/") {
				t.Error("占位对象缺少目录分隔符")
			}
			body, _ := io.ReadAll(r.Body)
			if len(body) != 0 {
				t.Error("占位对象不是空内容")
			}
			created = true
			writeImageJSON(w, map[string]any{"key": "empty/", "size": "0"}, "")
		} else {
			writeImageJSON(w, []map[string]any{{"key": "empty/"}}, "")
		}
	})
	if err := s.CreateFolder(context.Background(), "empty"); err != nil {
		t.Fatal(err)
	}
	content, err := s.GetFolder(context.Background(), "empty")
	if !created || err != nil || len(content.Files) != 0 || len(content.Folders) != 0 {
		t.Fatalf("空目录结果错误: %+v, %v", content, err)
	}
}
