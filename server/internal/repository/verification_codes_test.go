package repository

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

// 使用真实 Lua 执行路径，验证锁定不能被正确验证码绕过。
func TestVerificationCodeLockAndExpiry(t *testing.T) {
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { client.Close() })
	repo := NewVerificationCodes(client)
	ctx := context.Background()
	if ok, err := repo.SaveIfAbsent(ctx, "23456789", "wechat-user", "123456", 5*time.Minute); err != nil || !ok {
		t.Fatalf("保存失败: %v, %v", ok, err)
	}
	for i := 1; i <= 5; i++ {
		result, err := repo.Consume(ctx, "23456789", "000000", 5)
		if err != nil {
			t.Fatal(err)
		}
		want := ConsumeMismatched
		if i == 5 {
			want = ConsumeLimited
		}
		if result.Status != want {
			t.Fatalf("第 %d 次失败状态 = %v，期望 %v", i, result.Status, want)
		}
	}
	result, err := repo.Consume(ctx, "23456789", "123456", 5)
	if err != nil || result.Status != ConsumeLimited {
		t.Fatalf("正确验证码绕过锁定: %+v, %v", result, err)
	}
	if ok, err := repo.SaveIfAbsent(ctx, "ABCDEFGH", "wechat-user", "123456", 5*time.Minute); err != nil || ok {
		t.Fatalf("锁定期间重复下发: %v, %v", ok, err)
	}
	server.FastForward(5 * time.Minute)
	if ok, err := repo.SaveIfAbsent(ctx, "ABCDEFGH", "wechat-user", "123456", 5*time.Minute); err != nil || !ok {
		t.Fatalf("过期后不能重新下发: %v, %v", ok, err)
	}
}

// 并发消费只能成功一次，成功后微信用户可以获取下一组凭据。
func TestVerificationCodeConsumeOnce(t *testing.T) {
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { client.Close() })
	repo := NewVerificationCodes(client)
	ctx := context.Background()
	if ok, err := repo.SaveIfAbsent(ctx, "23456789", "wechat-user", "123456", time.Minute); err != nil || !ok {
		t.Fatal("无法准备验证码", err)
	}
	var successes atomic.Int32
	var wg sync.WaitGroup
	for range 10 {
		wg.Go(func() {
			result, err := repo.Consume(ctx, "23456789", "123456", 5)
			if err != nil {
				t.Error(err)
			}
			if result.Status == ConsumeMatched {
				successes.Add(1)
			}
		})
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("消费成功次数 = %d", successes.Load())
	}
	if ok, err := repo.SaveIfAbsent(ctx, "ABCDEFGH", "wechat-user", "654321", time.Minute); err != nil || !ok {
		t.Fatalf("成功后用户索引未清理: %v, %v", ok, err)
	}
}

// 并发微信回调使用不同登录标识时，也只能为同一个用户保存一组凭据。
func TestVerificationCodeConcurrentIssue(t *testing.T) {
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { client.Close() })
	repo := NewVerificationCodes(client)
	var saved atomic.Int32
	var wg sync.WaitGroup
	for _, id := range []string{"23456789", "ABCDEFGH", "JKMNPQRS"} {
		wg.Go(func() {
			ok, err := repo.SaveIfAbsent(context.Background(), id, "wechat-user", "123456", time.Minute)
			if err != nil {
				t.Error(err)
			}
			if ok {
				saved.Add(1)
			}
		})
	}
	wg.Wait()
	if saved.Load() != 1 {
		t.Fatalf("同一用户保存了 %d 组验证码", saved.Load())
	}
}
