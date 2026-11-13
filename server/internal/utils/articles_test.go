package utils

import (
	"reflect"
	"testing"
)

// TestUniqueURL 验证去重后保留首次出现顺序。
func TestUniqueURL(t *testing.T) {
	tests := []struct {
		name string
		urls []string
		want []string
	}{
		{
			name: "没有重复",
			urls: []string{"a", "b"},
			want: []string{"a", "b"},
		},
		{
			name: "保留首次出现顺序",
			urls: []string{"b", "a", "b", "c", "a"},
			want: []string{"b", "a", "c"},
		},
		{
			name: "空切片",
			urls: []string{},
			want: []string{},
		},
		{
			name: "全部重复",
			urls: []string{"a", "a", "a"},
			want: []string{"a"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := UniqueURL(tt.urls); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("UniqueURL() = %v, want %v", got, tt.want)
			}
		})
	}
}
