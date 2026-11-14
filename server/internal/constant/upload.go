package constant

// 上传边界集中定义，正文按 UTF-8 字节数计算，单张图片最多 10MB。
const (
	MaxImageBytes int64 = 10 << 20
	// 为所有图片、正文和表单头预留有界空间，避免无限读取请求。
	MultipartMemoryBytes int64 = 8 << 20
)
