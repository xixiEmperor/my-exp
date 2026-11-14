package config

import "testing"

func TestLoadRequiresJWTSecret(t *testing.T) {
	// 使用临时目录，避免测试读取真实 .env 后把缺失配置补齐。
	t.Chdir(t.TempDir())
	t.Setenv("MYSQL_DSN", "test-dsn")
	t.Setenv("WECHAT_CALLBACK_TOKEN", "test-token")
	for _, secret := range []string{"", "   ", "test-secret"} {
		t.Setenv("JWT_SECRET", secret)
		_, err := Load()
		if secret == "test-secret" {
			if err != nil {
				t.Fatalf("配置齐全仍然失败: %v", err)
			}
		} else if err == nil || err.Error() != "缺少 JWT_SECRET 配置" {
			t.Fatalf("缺少密钥时应阻止启动，实际错误: %v", err)
		}
	}
}

// 生产默认启用 Secure，本地可关闭，非法配置必须阻止启动。
func TestCookieSecureConfig(t *testing.T) {
	t.Chdir(t.TempDir())
	t.Setenv("MYSQL_DSN", "test-dsn")
	t.Setenv("WECHAT_CALLBACK_TOKEN", "test-token")
	t.Setenv("JWT_SECRET", "test-secret")
	for _, tt := range []struct {
		value   string
		secure  bool
		invalid bool
	}{
		{"", true, false}, {"true", true, false}, {"false", false, false}, {"invalid", false, true},
	} {
		t.Setenv("COOKIE_SECURE", tt.value)
		cfg, err := Load()
		if tt.invalid {
			if err == nil {
				t.Fatal("非法 Cookie 配置未拒绝")
			}
		} else if err != nil || cfg.CookieSecure != tt.secure {
			t.Fatalf("配置 %s 得到 %v, %v", tt.value, cfg.CookieSecure, err)
		}
	}
}
