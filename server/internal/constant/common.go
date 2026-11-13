package constant

const (
	// 中间件中作为上下文的 key 常量
	CtxUserID   = "user_id"
	CtxUserInfo = "user_info"

	// 文章相关常量
	ArticlePub   = "published"
	ArticleDraft = "draft"
	// 换行只负责排版，不参与匹配，兼容表单提交后的 CRLF。
	SplitFlag = "<ArticleSeparator />" // 作为分割 preview 的标志

	// CDN基地址
	CDN_BASE_URL = "https://static.swifthire.top"
)
