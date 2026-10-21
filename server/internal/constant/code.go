package constant

const (
	BindError = 2000
	// 验证码无效或已过期
	InvalidCode = 2001
	// 验证码有误，请输入正确验证码
	WrongCode = 2002
	// 验证过于频繁，请稍后再试
	RateLimit = 2003

	// 缺少身份信息
	WithoutToken = 4001
	// token 校验错误
	WrongToken = 4002
	// token 过期
	TokenExpires = 4003

	// 服务内部错误与参数错误分开，前端才能提示用户稍后重试。
	InternalError = 5000
)
