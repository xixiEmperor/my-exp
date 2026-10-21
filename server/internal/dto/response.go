package dto

type Response struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data any    `json:"data,omitempty"`
}

func Fail(code int, msg string) *Response {
	return &Response{
		Code: code,
		Msg:  msg,
	}
}

func Success(code int) *Response {
	return &Response{
		Code: code,
		Msg:  "success",
	}
}

func SuccessWithData(code int, msg string, data any) *Response {
	// 不要在这里提前 json.Marshal，否则 Data 是 []byte，外层再序列化一次会变成 base64 字符串
	return &Response{
		Code: code,
		Msg:  msg,
		Data: data,
	}
}
