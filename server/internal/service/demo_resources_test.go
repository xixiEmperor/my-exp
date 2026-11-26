package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"zhiye/server/internal/dto"
	"zhiye/server/internal/repository"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/cloudflare/cloudflare-go/v7/option"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func newMockR2Service(t *testing.T, fn roundTripFunc) *R2Service {
	t.Helper()
	svc, err := NewR2Service(
		R2Config{AccountID: "acc", APIToken: "tok", BucketName: "bkt"},
		option.WithBaseURL("https://r2.example.invalid"),
		option.WithHTTPClient(&http.Client{Transport: fn}),
	)
	if err != nil {
		t.Fatal(err)
	}
	return svc
}

func newMockDemoResourcesRepo(t *testing.T) (*repository.DemoResourcesRepo, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	db, err := gorm.Open(
		mysql.New(mysql.Config{Conn: sqlDB, SkipInitializeWithVersion: true}),
		&gorm.Config{DisableAutomaticPing: true},
	)
	if err != nil {
		t.Fatal(err)
	}
	return repository.NewDemoResourcesRepo(db), mock
}

func jsonHTTPResponse(status int, payload any) *http.Response {
	body, _ := json.Marshal(payload)
	return &http.Response{
		StatusCode: status,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(bytes.NewReader(body)),
	}
}

func writeTestFile(t *testing.T, path string, content []byte) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, content, 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestDemoResourceQueries(t *testing.T) {
	repo, mock := newMockDemoResourcesRepo(t)
	svc := NewDemoResourceService(repo, nil, "")
	now := time.Now()

	t.Run("按ID查询", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{
			"id", "slug", "name", "description", "tags", "status",
			"implementation", "verison", "file_paths", "exclude_paths", "created_at",
		}).AddRow(
			"res1", "demo-a", "demo-a", nil, nil, "draft",
			"default", "1.0.0", `["web/src/App.tsx"]`, nil, now,
		)
		mock.ExpectQuery("SELECT \\* FROM `demos` WHERE id = \\? LIMIT \\?").
			WithArgs("res1", 1).
			WillReturnRows(rows)

		got, err := svc.GetDemoResourceByID(context.Background(), "res1")
		if err != nil {
			t.Fatalf("GetDemoResourceByID 失败: %v", err)
		}
		if got.ID != "res1" || got.Verison != "1.0.0" {
			t.Fatalf("结果不符合预期: %+v", got)
		}
	})

	t.Run("空ID返回参数错误", func(t *testing.T) {
		if _, err := svc.GetDemoResourceByID(context.Background(), ""); !errors.Is(err, ErrInvalidResourceID) {
			t.Fatalf("错误 = %v，期望 %v", err, ErrInvalidResourceID)
		}
	})

	t.Run("按slug和verison查询", func(t *testing.T) {
		mock.ExpectQuery("SELECT \\* FROM `demos` WHERE slug = \\? AND verison = \\? LIMIT \\?").
			WithArgs("demo-a", "1.0.0", 1).
			WillReturnRows(sqlmock.NewRows([]string{"id"}))

		_, err := svc.GetDemoResourceBySlugAndVerison(context.Background(), "demo-a", "1.0.0")
		if !errors.Is(err, ErrDemoResourceNotFound) {
			t.Fatalf("错误 = %v，期望 %v", err, ErrDemoResourceNotFound)
		}
	})
}

func TestCreateDemoResourceValidation(t *testing.T) {
	repo, _ := newMockDemoResourcesRepo(t)
	svc := NewDemoResourceService(repo, nil, "")

	cases := []struct {
		name string
		req  dto.CreateDemoResourceReq
		want error
	}{
		{
			name: "非法slug",
			req:  dto.CreateDemoResourceReq{Slug: "Bad_Slug", Implementation: "default", Verison: "1.0.0"},
			want: ErrDemoResourceInvalid,
		},
		{
			name: "非法verison",
			req:  dto.CreateDemoResourceReq{Slug: "virtual-list", Implementation: "default", Verison: "1.0"},
			want: ErrDemoResourceInvalid,
		},
		{
			name: "非法exclude",
			req:  dto.CreateDemoResourceReq{Slug: "virtual-list", Implementation: "default", Verison: "1.0.0", ExcludePaths: []string{"../secret"}},
			want: ErrDemoResourceInvalid,
		},
		{
			name: "未配置R2",
			req:  dto.CreateDemoResourceReq{Slug: "virtual-list", Implementation: "default", Verison: "1.0.0"},
			want: ErrR2NotConfigured,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := svc.CreateDemoResource(context.Background(), tc.req)
			if !errors.Is(err, tc.want) {
				t.Fatalf("错误 = %v，期望 %v", err, tc.want)
			}
		})
	}
}

func TestCreateDemoResourceSuccess(t *testing.T) {
	root := t.TempDir()
	scene := filepath.Join(root, "playground", "virtual-list")
	impl := filepath.Join(scene, "fixed-height")

	writeTestFile(t, filepath.Join(scene, "README.md"), []byte("# Virtual List"))
	writeTestFile(t, filepath.Join(impl, "web", "dist", "index.html"), []byte("<html></html>"))
	writeTestFile(t, filepath.Join(impl, "web", "dist", "assets", "app.js"), []byte("console.log(1)"))
	writeTestFile(t, filepath.Join(impl, "web", "src", "App.tsx"), []byte("export const App = () => null;"))
	writeTestFile(t, filepath.Join(impl, "web", "coverage", "lcov.info"), []byte("ignored"))
	writeTestFile(t, filepath.Join(impl, "web", "node_modules", "pkg", "index.js"), []byte("ignored"))
	writeTestFile(t, filepath.Join(impl, "web", ".env"), []byte("SECRET=1"))
	writeTestFile(t, filepath.Join(impl, "web", ".env.example"), []byte("SECRET="))
	writeTestFile(t, filepath.Join(impl, "web", "bin.dat"), []byte{0x00, 0x01, 0x02})

	var (
		mu       sync.Mutex
		uploaded = make(map[string]string)
	)
	r2Svc := newMockR2Service(t, func(r *http.Request) (*http.Response, error) {
		switch r.Method {
		case http.MethodGet:
			return jsonHTTPResponse(http.StatusOK, map[string]any{
				"success": true,
				"result":  []any{},
			}), nil
		case http.MethodPut:
			key := strings.TrimPrefix(r.URL.Path, "/accounts/acc/r2/buckets/bkt/objects/")
			mu.Lock()
			uploaded[key] = r.Header.Get("Content-Type")
			mu.Unlock()
			return jsonHTTPResponse(http.StatusOK, map[string]any{
				"success": true,
				"result":  map[string]any{"key": key},
			}), nil
		default:
			return jsonHTTPResponse(http.StatusMethodNotAllowed, map[string]any{"success": false}), nil
		}
	})

	repo, mock := newMockDemoResourcesRepo(t)
	svc := &DemoResourceService{repo: repo, r2Svc: r2Svc, workspaceRoot: root}

	mock.ExpectQuery("SELECT \\* FROM `demos` WHERE slug = \\? AND verison = \\? LIMIT \\?").
		WithArgs("virtual-list", "1.1.0", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `demos`").
		WithArgs(
			sqlmock.AnyArg(),
			"virtual-list",
			"virtual-list",
			nil,
			nil,
			"draft",
			"fixed-height",
			"1.1.0",
			`["README.md","fixed-height/web/.env.example","fixed-height/web/src/App.tsx"]`,
			`["web/coverage"]`,
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	got, err := svc.CreateDemoResource(context.Background(), dto.CreateDemoResourceReq{
		Slug:           "virtual-list",
		Implementation: "fixed-height",
		Verison:        "1.1.0",
		ExcludePaths:   []string{"web/coverage/"},
	})
	if err != nil {
		t.Fatalf("CreateDemoResource 失败: %v", err)
	}
	if got.Name != "virtual-list" || got.Status != "draft" || got.Verison != "1.1.0" || len(got.FilePaths) != 3 {
		t.Fatalf("返回结果不符合预期: %+v", got)
	}
	if uploaded["demos/virtual-list/1.1.0/preview/index.html"] != "text/html; charset=utf-8" {
		t.Fatalf("preview index.html Content-Type 不符合预期: %v", uploaded)
	}
	if uploaded["demos/virtual-list/1.1.0/preview/assets/app.js"] != "text/javascript; charset=utf-8" {
		t.Fatalf("preview app.js Content-Type 不符合预期: %v", uploaded)
	}
	if uploaded["demos/virtual-list/1.1.0/sources/fixed-height/web/src/App.tsx"] != "text/plain; charset=utf-8" {
		t.Fatalf("sources App.tsx Content-Type 不符合预期: %v", uploaded)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestCreateDemoResourceCleanupOnDBError(t *testing.T) {
	root := t.TempDir()
	impl := filepath.Join(root, "playground", "demo-a")
	writeTestFile(t, filepath.Join(impl, "web", "dist", "index.html"), []byte("<html></html>"))
	writeTestFile(t, filepath.Join(impl, "web", "src", "main.ts"), []byte("export {}"))

	var (
		mu      sync.Mutex
		deleted []string
	)
	r2Svc := newMockR2Service(t, func(r *http.Request) (*http.Response, error) {
		switch r.Method {
		case http.MethodGet:
			return jsonHTTPResponse(http.StatusOK, map[string]any{"success": true, "result": []any{}}), nil
		case http.MethodPut:
			return jsonHTTPResponse(http.StatusOK, map[string]any{"success": true, "result": map[string]any{"key": "ok"}}), nil
		case http.MethodDelete:
			mu.Lock()
			deleted = append(deleted, r.URL.Path)
			mu.Unlock()
			return jsonHTTPResponse(http.StatusOK, map[string]any{"success": true}), nil
		default:
			return jsonHTTPResponse(http.StatusMethodNotAllowed, map[string]any{}), nil
		}
	})

	repo, mock := newMockDemoResourcesRepo(t)
	svc := &DemoResourceService{repo: repo, r2Svc: r2Svc, workspaceRoot: root}

	mock.ExpectQuery("SELECT \\* FROM `demos` WHERE slug = \\? AND verison = \\? LIMIT \\?").
		WithArgs("demo-a", "1.0.0", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `demos`").WillReturnError(errors.New("db down"))
	mock.ExpectRollback()

	_, err := svc.CreateDemoResource(context.Background(), dto.CreateDemoResourceReq{
		Slug:           "demo-a",
		Implementation: "default",
		Verison:        "1.0.0",
	})
	if err == nil {
		t.Fatal("期望返回数据库错误")
	}
	if len(deleted) != 2 {
		t.Fatalf("期望清理 2 个已上传的 R2 对象，实际清理 %d 个: %v", len(deleted), deleted)
	}
}
