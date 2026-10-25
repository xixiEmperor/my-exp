package utils

import "testing"

func TestUniqueName(t *testing.T) {
	// 覆盖首次创建、连续重名、空号复用和无关名称，防止按数量编号造成冲突。
	cases := []struct {
		name     string
		existing []string
		want     string
	}{
		{"新建文件", nil, "新建文件"},
		{"新建文件", []string{"新建文件"}, "新建文件（1）"},
		{"新建文件", []string{"新建文件", "新建文件（1）", "新建文件（2）"}, "新建文件（3）"},
		{"新建文件", []string{"新建文件", "新建文件（2）"}, "新建文件（1）"},
		{"新建文件", []string{"新建文件（1）", "其他文件"}, "新建文件"},
		{"新建文件夹", []string{"新建文件夹", "新建文件夹（1）"}, "新建文件夹（2）"},
	}
	for _, tc := range cases {
		if got := UniqueName(tc.name, tc.existing); got != tc.want {
			t.Errorf("UniqueName(%q, %v) = %q, want %q", tc.name, tc.existing, got, tc.want)
		}
	}
}
