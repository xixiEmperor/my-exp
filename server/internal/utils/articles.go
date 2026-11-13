package utils

import (
	"regexp"
	"slices"
)

// markdownImageURL 匹配 markdown 图片语法 ![...](url)，第一个捕获组是图片地址。
// Go 的 regexp 没有 g 标志，FindAllStringSubmatch 等价于 web 端的 matchAll。
var markdownImageURL = regexp.MustCompile(`!\[[^\]]*\]\(([^)]+)\)`)

// 抽取正文中的图片 CDN URL，规则与 web 端 subUrls 保持一致。
func ExtractURL(content string) []string {
	matches := markdownImageURL.FindAllStringSubmatch(content, -1)
	urls := make([]string, 0, len(matches))
	for _, match := range matches {
		urls = append(urls, match[1])
	}
	return urls
}

func Diff(old, new []string) ([]string, []string) {
	// 初始化两个切片
	add := make([]string, 0)
	del := make([]string, 0)

	// 遍历新数组，如果当前val在旧数组中不存在，说明是新增
	for _, v := range new {
		if !slices.Contains(old, v) {
			add = append(add, v)
		}
	}

	// 遍历旧数组，如果当前val在新数组中不存在，说明是要删除的
	for _, v := range old {
		if !slices.Contains(new, v) {
			del = append(del, v)
		}
	}

	return add, del
}
