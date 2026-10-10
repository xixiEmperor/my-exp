package service

import (
	"context"
	"errors"
	"testing"
	"time"
	"zhiye/server/internal/repository"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func TestGenerateToken(t *testing.T) {
	// 实际解析签名后的结果，可以发现把 string 错当作 HS256 密钥的错误。
	secret := "test-only-secret"
	// 测试结束后自动恢复环境变量，不依赖开发机器的真实密钥。
	t.Setenv("JWT_SECRET", secret)
	auth := &AuthService{}
	encoded, err := auth.GenerateToken(42)
	if err != nil {
		t.Fatal(err)
	}
	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(encoded, claims, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer("my-exp"), jwt.WithExpirationRequired())
	if err != nil || !parsed.Valid || claims.ID != 42 {
		t.Fatalf("签名校验失败: %v, claims=%+v", err, claims)
	}
	t.Setenv("JWT_SECRET", "")
	if _, err := auth.GenerateToken(42); err == nil {
		t.Fatal("空密钥应返回错误")
	}
}

func TestLogin(t *testing.T) {
	for _, scenario := range []string{"成功", "验证码不存在", "签名失败"} {
		t.Run(scenario, func(t *testing.T) {
			// 使用真实 service 组合模拟存储，确认 Login 返回的资料与令牌属于同一用户。
			t.Setenv("JWT_SECRET", "test-secret")
			server := miniredis.RunT(t)
			client := redis.NewClient(&redis.Options{Addr: server.Addr()})
			t.Cleanup(func() { client.Close() })
			sqlDB, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { sqlDB.Close() })
			db, err := gorm.Open(mysql.New(mysql.Config{Conn: sqlDB, SkipInitializeWithVersion: true}), &gorm.Config{})
			if err != nil {
				t.Fatal(err)
			}
			codes := repository.NewVerificationCodes(client)
			auth := NewAuthService(codes, NewUsersService(repository.NewUsersRepo(db)))
			if scenario != "验证码不存在" {
				if _, err := codes.Save(context.Background(), "openid-42", "000123", time.Minute); err != nil {
					t.Fatal(err)
				}
				// 只允许一次用户查询，签名不能再查询相同资料。
				mock.ExpectQuery("SELECT .* FROM `users`").WithArgs("openid-42", 1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "openid", "name", "role"}).AddRow(42, "openid-42", "测试用户", "user"))
			}
			if scenario == "签名失败" {
				t.Setenv("JWT_SECRET", "")
			}
			result, err := auth.Login(context.Background(), "000123")
			if scenario == "成功" {
				if err != nil {
					t.Fatal(err)
				}
				claims, err := auth.VerifyToken(result.Token)
				if err != nil || claims.ID != result.User.ID || result.User.Name != "测试用户" {
					t.Fatalf("登录结果不一致: %+v, %v", result, err)
				}
			} else {
				if err == nil || result != nil {
					t.Fatal("失败时不应返回部分登录结果")
				}
				if scenario == "验证码不存在" && !errors.Is(err, ErrInvalidCode) {
					t.Fatalf("错误类型丢失: %v", err)
				}
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestVerifyTokenRejectsInvalidClaims(t *testing.T) {
	auth := &AuthService{}
	t.Setenv("JWT_SECRET", "test-secret")
	for _, scenario := range []string{"过期", "错误签发者", "缺少过期时间", "错误算法", "错误密钥"} {
		t.Run(scenario, func(t *testing.T) {
			claims := Claims{ID: 42, RegisteredClaims: jwt.RegisteredClaims{
				Issuer: "my-exp", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			}}
			var method jwt.SigningMethod = jwt.SigningMethodHS256
			secret := "test-secret"
			switch scenario {
			case "过期":
				claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
			case "错误签发者":
				claims.Issuer = "other"
			case "缺少过期时间":
				claims.ExpiresAt = nil
			case "错误算法":
				method = jwt.SigningMethodHS384
			case "错误密钥":
				secret = "wrong-secret"
			}
			encoded, err := jwt.NewWithClaims(method, claims).SignedString([]byte(secret))
			if err != nil {
				t.Fatal(err)
			}
			if _, err := auth.VerifyToken(encoded); err == nil {
				t.Fatal("无效令牌通过校验")
			}
		})
	}
}
