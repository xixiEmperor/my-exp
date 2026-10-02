package handler

import (
	"crypto/sha1"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	AuthService *service.AuthService
}

func NewAuthHandler(s *service.AuthService) *AuthHandler {
	return &AuthHandler{AuthService: s}
}

func (a *AuthHandler) GetWechatCallback (c *gin.Context) {
	token := os.Getenv("WECHAT_CALLBACK_TOKEN")
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

func (a *AuthHandler) PostWechatCallback (c *gin.Context) {
	// 这里类似
	token := os.Getenv("WECHAT_CALLBACK_TOKEN")
	if !validSignature(c, token) {
		c.Status(http.StatusForbidden)
		return
	}

	var msg dto.IncomingMessage

	err := c.ShouldBindXML(&msg)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	fmt.Println(msg)

	// 非文本消息和事件，暂时不回复
	if msg.MsgType != "text" {
		c.String(http.StatusOK, "success")
		return
	}

	code, err := a.AuthService.GenerateVerificationCode()
	if err != nil {
		c.Status(http.StatusBadRequest)
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

// 明文模式下，验证微信请求的签名
func validSignature(c *gin.Context, token string) bool {
	signature := c.Query("signature")
	timestamp := c.Query("timestamp")
	nonce := c.Query("nonce")

	if signature == "" || timestamp == "" || nonce == "" {
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