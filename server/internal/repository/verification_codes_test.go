package repository

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newCodeRepository(t *testing.T) (*VerificationCodes, *miniredis.Miniredis) {
	t.Helper()
	// 每个测试独占内存中的 Redis，避免碰到开发环境里的真实验证码。
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { client.Close() })
	return NewVerificationCodes(client), server
}

func TestVerificationCodes(t *testing.T) {
	repo, server := newCodeRepository(t)
	ctx := context.Background()
	for _, tc := range []struct {
		user, code string
		want       int
	}{
		{"alice", "000123", 1},
		{"alice", "000124", 0},
		{"bob", "000123", -1},
		{"bob", "000125", 1},
	} {
		if got, err := repo.Save(ctx, tc.user, tc.code, 5*time.Minute); err != nil || got != tc.want {
			t.Fatalf("Save(%s, %s)=%d, %v", tc.user, tc.code, got, err)
		}
	}
	// 碰撞失败不能留下半条索引，也不能覆盖原来的用户。
	if server.Exists("auth:code:000124") {
		t.Fatal("重复申请留下了多余验证码")
	}
	if user, err := repo.Consume(ctx, "000123"); err != nil || user != "alice" {
		t.Fatalf("Consume=%q, %v", user, err)
	}
	if server.Exists("auth:openid:alice") {
		t.Fatal("消费后用户索引未删除")
	}
	if _, err := repo.Consume(ctx, "000123"); !errors.Is(err, redis.Nil) {
		t.Fatalf("重复消费应失败，实际 %v", err)
	}
	// 推进模拟时钟，确认两个索引都按五分钟过期。
	server.FastForward(5 * time.Minute)
	if _, err := repo.Consume(ctx, "000125"); !errors.Is(err, redis.Nil) {
		t.Fatalf("过期验证码仍然有效: %v", err)
	}
	if server.Exists("auth:openid:bob") {
		t.Fatal("用户索引未过期")
	}
}

func TestConsumeCodeConcurrently(t *testing.T) {
	repo, _ := newCodeRepository(t)
	ctx := context.Background()
	if _, err := repo.Save(ctx, "alice", "000123", time.Minute); err != nil {
		t.Fatal(err)
	}
	// 多个请求同时提交同一个验证码，只允许一个请求成功。
	var successes atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			user, err := repo.Consume(ctx, "000123")
			if err == nil && user == "alice" {
				successes.Add(1)
			} else if !errors.Is(err, redis.Nil) {
				t.Errorf("意外结果 user=%q err=%v", user, err)
			}
		}()
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("成功次数=%d", successes.Load())
	}
}
