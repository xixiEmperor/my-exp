package utils

import "strconv"

// UniqueName 返回未被占用的名称，重名时依次尝试全角括号中的编号。
// 调用方传入同级名称；重命名时应排除当前节点自身的名称。
func UniqueName(name string, existingNames []string) string {
	// 使用集合检查名称，避免每次尝试编号都遍历整个列表。
	// Go 没有内置的 set 类型，习惯用 map 来模拟：key 是名字，value 不重要。
	// struct{} 是空结构体，不占内存，所以用它当 value，纯粹表示"这个 key 存在"
	used := make(map[string]struct{}, len(existingNames))

	for _, existing := range existingNames {
		// struct{}{} 是创建一个空结构体的值，前一个 struct{} 是类型，后一个 {} 是实例
		used[existing] = struct{}{}
	}

	// 先看看要用的名称是否存在，如果不存在说明直接可用，返回就行了
	if _, exists := used[name]; !exists {
		return name
	}

	// 从 1 开始选择第一个可用编号，删除后留下的空号可以重新使用。
	for i := 1; ; i++ {
		// 依次查看 name（1），name（2），只要没有被使用过，就返回给调用方使用
		candidate := name + "（" + strconv.Itoa(i) + "）"
		if _, exists := used[candidate]; !exists {
			return candidate
		}
	}
}
