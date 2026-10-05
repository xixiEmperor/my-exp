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
	return &Response{
		Code: code,
		Msg:  msg,
		Data: data,
	}
}