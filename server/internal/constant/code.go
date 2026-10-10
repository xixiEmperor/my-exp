package constant

const (
	BindError   = 2000
	InvalidCode = 2001
	// 服务内部错误与参数错误分开，前端才能提示用户稍后重试。
	InternalError = 5000
)
