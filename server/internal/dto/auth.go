package dto

import "encoding/xml"

// 微信推送来的消息
type IncomingMessage struct {
	ToUserName   string `xml:"ToUserName"`
	FromUserName string `xml:"FromUserName"`
	MsgType      string `xml:"MsgType"`
	Content      string `xml:"Content"`
}

// 我们回复给用户的文本消息
type TextReply struct {
	XMLName      xml.Name `xml:"xml"`
	ToUserName   string   `xml:"ToUserName"`
	FromUserName string   `xml:"FromUserName"`
	CreateTime   int64    `xml:"CreateTime"`
	MsgType      string   `xml:"MsgType"`
	Content      string   `xml:"Content"`
}

// 验证验证码请求体
type VerifyBody struct {
	// 保留字符串类型，避免 000123 这样的验证码丢失开头的零。
	Code string `json:"code" binding:"required,len=6,ascii,numeric"`
}

// UserInfo 仅包含前端展示字段，避免把 OpenID 等内部资料写入可读 Cookie。
type UserInfo struct {
	// 使用字符串表示数据库 ID，避免 JavaScript 对较大整数丢失精度。
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}
