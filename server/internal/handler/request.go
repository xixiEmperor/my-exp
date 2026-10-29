package handler

import (
	"encoding/json"
	"errors"
	"io"

	"github.com/gin-gonic/gin"
)

// bindCreateRequest 只用于新建资源，局部拒绝旧 type 等未知字段。
func bindCreateRequest(c *gin.Context, req any) error {
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(req); err != nil {
		return err
	}
	// 请求体只能包含一个 JSON 值，尾部额外内容也视为参数错误。
	if err := decoder.Decode(new(any)); err != io.EOF {
		return errors.New("请求体只能包含一个 JSON 对象")
	}
	return nil
}
