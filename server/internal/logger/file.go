package logger

import (
	"os"
	"sync"

	"gopkg.in/natefinch/lumberjack.v2"
)

// managedFile 阻止 Lumberjack 在 Close 之后被迟到的 Write 再次打开。
type managedFile struct {
	mu     sync.Mutex
	file   *lumberjack.Logger
	closed bool
}

func (f *managedFile) Write(p []byte) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.closed {
		return 0, os.ErrClosed
	}
	return f.file.Write(p)
}

// Rotate 和 Close 共用锁，关闭文件后也不能再创建新的备份文件。
func (f *managedFile) Rotate() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.closed {
		return os.ErrClosed
	}
	return f.file.Rotate()
}

func (f *managedFile) Close() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.closed {
		return nil
	}
	f.closed = true
	return f.file.Close()
}
