package handler

import (
	"context"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	// 依赖不对外暴露，避免请求处理过程中被外部随意替换。
	authService   authService
	callbackToken string
}

// 接口由使用方定义，只列出 handler 需要的方法，测试时可以模拟服务故障。
type authService interface {
	GenerateVerificationCode(context.Context, string) (string, error)
	Login(context.Context, string) (*service.LoginResult, error)
}

func NewAuthHandler(s authService, callbackToken string) *AuthHandler {
	return &AuthHandler{authService: s, callbackToken: callbackToken}
}

func (a *AuthHandler) GetWechatCallback(c *gin.Context) {
	token := a.callbackToken
	// 临时诊断：确认请求到达这个 Go 服务
	c.Header("X-Debug-Origin", "wechat-demo")
	log.Println("收到公众号 GET 回调")

	if !validSignature(c, token) {
		c.Status(http.StatusForbidden)
		return
	}

	echostr := c.Query("echostr")
	if echostr == "" {
		c.Status(http.StatusBadRequest)
		return
	}

	c.Data(
		http.StatusOK,
		"text/plain; charset=utf-8",
		[]byte(echostr),
	)
}

func (a *AuthHandler) PostWechatCallback(c *gin.Context) {
	// 这里类似 nodejs 里面的 dotenv，可以读取环境变量
	// .env 已由 config.Load 在启动时读取，这里直接使用注入的配置。
	token := a.callbackToken

	// 校验微信的请求，如果不通过，直接拒绝请求
	if !validSignature(c, token) {
		c.Status(http.StatusForbidden)
		return
	}

	// 声明一个变量用于接收微信请求的请求体
	var msg dto.IncomingMessage

	err := c.ShouldBindXML(&msg)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	// 非文本消息和事件，暂时不回复
	if msg.MsgType != "text" {
		c.String(http.StatusOK, "success")
		return
	}

	// 拒绝缺失收发件人的消息，避免创建空的用户索引。
	if msg.FromUserName == "" || msg.ToUserName == "" {
		c.Status(http.StatusBadRequest)
		return
	}
	// 使用请求的标准上下文，让下游操作可以响应 HTTP 请求取消。
	code, err := a.authService.GenerateVerificationCode(c.Request.Context(), msg.FromUserName)
	if err != nil {
		// 如果是验证码未过期的错误，直接静默返回就好，不需要回复多余内容
		if errors.Is(err, service.ErrCodeActive) {
			c.Status(http.StatusOK)
			return
		}

		// 基础设施故障返回 500，具体原因只记录在服务端。
		log.Printf("生成验证码失败：%v", err)
		c.Status(http.StatusInternalServerError)
		return
	}

	content := "验证码为：" + code + ", 5分钟内有效"

	reply := dto.TextReply{
		// 收件人和发件人需要与收到的消息互换
		ToUserName:   msg.FromUserName,
		FromUserName: msg.ToUserName,
		CreateTime:   time.Now().Unix(),
		MsgType:      "text",
		Content:      content,
	}

	c.XML(http.StatusOK, reply)
}

func (a *AuthHandler) Verify(c *gin.Context) {
	var body dto.VerifyBody

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(cons.BindError, "请求异常"))
		return
	}
	fmt.Println(body.Code)

	// service 完成验证码验证和令牌签发，handler 只处理 HTTP 输入输出。
	result, err := a.authService.Login(c.Request.Context(), body.Code)

	if err != nil {
		if errors.Is(err, service.ErrInvalidCode) {
			c.JSON(http.StatusBadRequest, dto.Fail(cons.InvalidCode, "验证码无效或已过期"))
			return
		}
		// 任何未预期的错误都必须结束请求，不能继续落入成功分支。
		log.Printf("登录失败：%v", err)
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "服务暂时不可用"))
		return
	}

	// 先完成序列化，再写两个 Cookie，避免准备资料失败时只写入 token。
	info, err := json.Marshal(dto.UserInfo{
		ID:   strconv.FormatUint(result.User.ID, 10),
		Name: result.User.Name,
		Role: result.User.Role,
	})
	if err != nil {
		log.Printf("序列化用户资料失败：%v", err)
		c.JSON(http.StatusInternalServerError, dto.Fail(cons.InternalError, "服务暂时不可用"))
		return
	}
	// URL 编码保证中文、空格和引号可以安全放进 Cookie，前端用 decodeURIComponent 还原。
	userInfo := url.PathEscape(string(info))
	maxAge := int(service.TokenTTL / time.Second)
	secure := c.Request.TLS != nil
	// Path=/ 允许页面读取 userinfo；不设置 Domain，限制为当前主机。
	// SameSite=Lax 适用于当前同站点部署；userinfo 仅供展示，不能作为权限依据。
	http.SetCookie(c.Writer, &http.Cookie{
		Name: "token", 
		Value: result.Token, 
		Path: "/", 
		MaxAge: maxAge,
		HttpOnly: true, 
		Secure: secure, 
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name: "userinfo", 
		Value: userInfo, 
		Path: "/", 
		MaxAge: maxAge,
		HttpOnly: false, 
		Secure: secure, 
		SameSite: http.SameSiteLaxMode,
	})
	c.JSON(http.StatusOK, dto.Success(0))
}

// 明文模式下，验证微信请求的签名
func validSignature(c *gin.Context, token string) bool {
	signature := c.Query("signature")
	timestamp := c.Query("timestamp")
	nonce := c.Query("nonce")

	// 空令牌也必须拒绝，避免配置缺失时仍接受可以被伪造的签名。
	if token == "" || signature == "" || timestamp == "" || nonce == "" {
		return false
	}

	parts := []string{token, timestamp, nonce}
	sort.Strings(parts)

	sum := sha1.Sum([]byte(strings.Join(parts, "")))
	expected := hex.EncodeToString(sum[:])

	return subtle.ConstantTimeCompare(
		[]byte(expected),
		[]byte(signature),
	) == 1
}
