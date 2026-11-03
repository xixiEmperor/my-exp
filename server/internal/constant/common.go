package constant

const (
	// 中间件中作为上下文的 key 常量
	CtxUserID   = "user_id"
	CtxUserInfo = "user_info"

	// 文章相关常量
	ArticlePub   = "published"
	ArticleDraft = "draft"
	SplitFlag    = "\n<ArticleSeparator />\n" // 作为分割 preview 的标志
)
