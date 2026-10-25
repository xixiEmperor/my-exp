package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"zhiye/server/internal/repository"
	"zhiye/server/internal/service"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func TestCreateFolder(t *testing.T) {
	// 从 HTTP 入口验证根目录、子目录、名称去重以及数据库错误的返回。
	cases := []struct {
		name      string
		parent    string
		queryFail bool
		writeFail bool
	}{
		{name: "根目录", parent: "root"},
		{name: "子目录", parent: "parent-id"},
		{name: "查询失败", parent: "root", queryFail: true},
		{name: "写入失败", parent: "root", writeFail: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sqlDB, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			defer sqlDB.Close()
			db, err := gorm.Open(mysql.New(mysql.Config{Conn: sqlDB, SkipInitializeWithVersion: true}), &gorm.Config{})
			if err != nil {
				t.Fatal(err)
			}

			// 根目录必须查询 NULL，子目录必须按传入的父节点过滤。
			query := "SELECT .* FROM `folders` WHERE parent_id IS NULL"
			if tc.parent != "root" {
				query = "SELECT .* FROM `folders` WHERE parent_id = \\?"
			}
			expect := mock.ExpectQuery(query)
			var parent any
			if tc.parent != "root" {
				parent = tc.parent
				expect.WithArgs(tc.parent)
			}
			if tc.queryFail {
				expect.WillReturnError(errors.New("查询失败"))
			} else {
				expect.WillReturnRows(sqlmock.NewRows([]string{"id", "name", "parent_id"}).
					AddRow("existing-1", "新建文件夹", parent).
					AddRow("existing-2", "新建文件夹（1）", parent))
				mock.ExpectBegin()
				// 校验去重后的名称和实际写入的父节点，主键与创建时间由程序生成。
				insert := mock.ExpectExec("INSERT INTO `folders`").WithArgs(sqlmock.AnyArg(), "新建文件夹（2）", parent, 0, sqlmock.AnyArg())
				if tc.writeFail {
					insert.WillReturnError(errors.New("写入失败"))
					mock.ExpectRollback()
				} else {
					insert.WillReturnResult(sqlmock.NewResult(0, 1))
					mock.ExpectCommit()
				}
			}

			// 使用真实的处理函数、业务服务和数据仓库，仅替换数据库连接。
			h := NewArticlesHandler(service.NewArticlesService(repository.NewArticlesRepo(db), nil))
			router := gin.New()
			router.POST("/articles/create", h.CreateArticleOrFolder)
			req := httptest.NewRequest(http.MethodPost, "/articles/create", strings.NewReader(`{"type":"folder","folder_id":"`+tc.parent+`"}`))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)
			wantStatus := http.StatusOK
			if tc.queryFail || tc.writeFail {
				wantStatus = http.StatusInternalServerError
			}
			if res.Code != wantStatus {
				t.Fatalf("状态码 = %d，期望 %d，响应：%s", res.Code, wantStatus, res.Body.String())
			}
			if wantStatus == http.StatusOK {
				var body struct {
					Data struct {
						ID       string  `json:"id"`
						Name     string  `json:"name"`
						ParentID *string `json:"parent_id"`
					} `json:"data"`
				}
				if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if len(body.Data.ID) != 21 || body.Data.Name != "新建文件夹（2）" {
					t.Fatalf("创建结果不正确：%s", res.Body.String())
				}
				if (tc.parent == "root" && body.Data.ParentID != nil) || (tc.parent != "root" && (body.Data.ParentID == nil || *body.Data.ParentID != tc.parent)) {
					t.Fatalf("父节点不正确：%s", res.Body.String())
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}
