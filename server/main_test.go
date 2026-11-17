package main

import (
	"context"
	"io"
	"net"
	"net/http"
	"testing"
	"time"
)

// 使用真实本机连接，验证停止信号不会立即中断正在处理的请求。
func TestServeHTTPWaitsForActiveRequest(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	entered := make(chan struct{})
	release := make(chan struct{})
	defer func() {
		// 失败分支也释放 handler，避免留下阻塞的测试协程。
		select {
		case <-release:
		default:
			close(release)
		}
	}()
	served := make(chan error, 1)
	go func() {
		served <- serveHTTP(ctx, listener, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			close(entered)
			<-release
			_, _ = io.WriteString(w, "请求完整结束")
		}))
	}()
	completed := make(chan error, 1)
	go func() {
		// 关闭代理，确保测试仅连接刚创建的本机监听地址。
		client := &http.Client{Transport: &http.Transport{Proxy: nil}, Timeout: 3 * time.Second}
		defer client.CloseIdleConnections()
		response, err := client.Get("http://" + listener.Addr().String())
		if err != nil {
			completed <- err
			return
		}
		defer response.Body.Close()
		body, err := io.ReadAll(response.Body)
		if err == nil && string(body) != "请求完整结束" {
			err = io.ErrUnexpectedEOF
		}
		completed <- err
	}()
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("HTTP 请求没有进入 handler")
	}
	cancel()
	select {
	case err := <-served:
		t.Fatalf("请求未结束时服务已经退出: %v", err)
	case <-time.After(50 * time.Millisecond):
	}
	close(release)
	select {
	case err := <-completed:
		if err != nil {
			t.Fatalf("停机时请求没有完整返回: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("HTTP 请求没有结束")
	}
	select {
	case err := <-served:
		if err != nil {
			t.Fatalf("服务没有正常停止: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("服务没有停止")
	}
}
