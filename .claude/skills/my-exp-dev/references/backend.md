# 后端开发规范

## 1. 分层职责与调用方向

```text
router
  → middleware (when required)
  → handler
  → service
  → repository
  → MySQL / Redis
```

依赖创建方向由 `server/main.go` 负责装配。业务调用方向向下，结果和错误向上返回。

### 1.1 main.go：组合根

- 读取配置、初始化数据库/Redis 客户端。
- 创建 repository、service、handler。
- 将依赖传入 router。
- 启动 HTTP 服务并负责资源关闭。
- 不承载具体业务规则。

项目当前使用构造函数注入：

```go
repo := repository.NewArticlesRepo(db)
svc := service.NewArticlesService(repo)
h := handler.NewArticlesHandler(svc)
engine := router.NewRouterGroup(/* handlers and dependencies */)
```

不要创建包级全局单例。实例在当前应用生命周期内只需由 `main.go` 创建一次即可。

### 1.2 router 层

- 定义路由路径、HTTP 方法、handler 映射。
- 按模块拆分注册函数。
- 为路由组挂载中间件。
- `router/index.go` 统一装配模块路由。
- 中间件应在对应路由注册前挂载。
- 不在 router 中执行数据库查询或业务判断。

### 1.3 middleware 层

- 负责请求级横切逻辑，例如认证、权限前置拦截、跨域、日志等。
- 从 Header/Cookie 提取身份凭证、验证 JWT、将必要身份信息写入 request context。
- 可通过小接口依赖 service，以便查询用户角色/资料。
- 不承担文章创建、目录规则等具体业务。
- 对管理员接口，路由组必须使用 `MustLogin()` 与 `RequireAdmin(...)`；不能只靠前端守卫。
- OptionalAuth 适用于游客也能访问、但登录后响应可能不同的接口。
- 必须明确处理用户记录不存在、查询故障和游客三种情况；不能忽略 service 错误后把 nil 用户当成有效登录用户。
- context key 统一使用项目常量；不要散落字符串。

### 1.4 handler 层

负责 HTTP 适配：

- 读取 path/query/header/body。
- 绑定并校验请求参数。
- 调用 service 完成业务。
- 将业务错误映射为 HTTP 状态码和统一 DTO 响应。
- 设置 Cookie、Header、状态码并写出响应。

不负责：

- 复杂业务规则；
- 直接调用 repository；
- 编写 GORM/Redis 查询；
- 在 handler 中重复实现 service 的业务判断。

使用 `c.Request.Context()` 传给 service。handler 可以使用 `*gin.Context`，但不要把它传入 service/repository。

请求体绑定应遵循接口约定。对于创建资源且要求拒绝未知字段的接口，可复用 `bindCreateRequest`；不要未经评估把所有旧接口绑定行为一次性改掉。

### 1.5 service 层

负责业务规则和业务流程：

- 参数的业务语义校验。
- 多个 repository 调用的编排。
- 权限相关的资源可见性判断。
- 创建/更新规则、状态流转、命名规则、幂等策略等。
- 将 repository 错误转换为可识别的业务错误（仅在确有业务语义时）。
- 为 middleware 提供必要的用户/角色查询能力。

约束：

- 使用标准库 `context.Context`，通常作为第一个参数。
- 不依赖 Gin，不写 HTTP 状态码、Cookie 或响应 JSON。
- 不把请求 context 保存到长期存活的 service 字段。
- 不为了每个 CRUD 方法创建单独的 service struct；按业务模块组织。
- 不把纯数据库查询条件下沉成业务判断，也不在 repository 判断用户角色、发布状态等业务规则。

### 1.6 repository 层

负责持久化：

- 封装 GORM 查询、创建、更新、删除。
- 封装 Redis 键、TTL、Lua 原子操作等存储细节。
- 使用 `db.WithContext(ctx)` 或 Redis 命令的 context。
- 返回数据或错误；必要时返回存储层事实类型（例如 Redis 消费结果）。
- 不决定 HTTP 状态码，不返回面向用户的提示文案。
- 不判断“是否管理员”“是否允许发布”等业务规则。

基础 CRUD 可以直接使用 GORM，不要为了形式增加一套通用 repository 框架。若某个存储操作具有并发/原子性要求，应在 repository 封装完整原子操作，service 再解释结果。

### 1.7 model 层

- GORM 表映射结构体放在这里。
- 数据库字段映射使用 `gorm` tag。
- 可定义数据库查询投影/简要结构，但要明确它们是持久化查询结果。
- 不放 HTTP 参数校验、Gin 类型或业务流程。
- 不要把 model 直接当作新接口的响应契约；新接口优先由 DTO 映射输出，避免数据库结构变化直接影响 API。

当前部分 model 有 JSON tag 并直接被 handler 返回。属于已有实现，不应扩大这种耦合；修改旧接口时按需求渐进改善。

### 1.8 dto 层

- 定义网络传输结构：请求体、响应体、统一响应、Cookie/外部回调所需的传输结构等。
- JSON/XML tag 与接口契约保持一致。
- 不把 GORM 查询逻辑放在 DTO。
- 新代码优先让 DTO 留在 handler 边界：handler 将 request DTO 转成 service 参数，将 service 结果映射为 response DTO。
- 当前部分 service 直接依赖 dto。新增功能避免继续扩大这种耦合；若需要业务返回对象，可在 service 定义结果类型，或使用清晰的业务类型，不要为了“纯粹”强行引入 domain 大框架。

### 1.9 constant / utils / apperr

- `constant`：跨包稳定常量，如上下文 key、状态值、响应码、文章分隔符。
- `utils`：与具体业务无关的可复用工具函数。
- `apperr`：跨层通用错误，如基础设施或 token 错误。
- 业务专属错误优先放在 `service`；repository 只有在需要向上暴露特定存储语义时才定义错误。
- 不要求每个包都必须存在 `errors.go`。

## 2. 构造函数和依赖注入

标准模式：

```go
type ArticlesService struct {
    articleRepo *repository.ArticlesRepo
}

func NewArticlesService(articleRepo *repository.ArticlesRepo) *ArticlesService {
    return &ArticlesService{articleRepo: articleRepo}
}
```

约束：

- 依赖字段通常小写，避免外部随意替换内部依赖。
- 使用 `NewXxx` 创建实例。
- 构造函数参数明确列出依赖。
- 由 `main.go` 统一创建和注入。
- 不在包 init、全局变量或请求处理中偷偷创建数据库连接。
- 只有调用方确实需要替换实现时，才在调用方定义小接口。不要机械地给每个 service/repository 建接口。

## 3. context 规则

- handler 调用 `service` 时传 `c.Request.Context()`。
- service 方法签名优先 `func (s *XxxService) Do(ctx context.Context, ...)`。
- repository 使用 `db.WithContext(ctx)`；Redis 使用 `Command(ctx, ...)`。
- 不将 `*gin.Context` 传给 service/repository。
- 不在结构体字段中保存某一次请求的 context。
- context 用于取消、超时和请求级值传递，不作为普通参数袋。

## 4. 错误处理规范

### 错误定义

- 使用 `errors.New` 定义稳定 sentinel error。
- 需要携带数据时使用自定义错误类型。
- 通过 `errors.Is` / `errors.As` 判断，不比较错误字符串。
- 用 `fmt.Errorf("操作描述: %w", err)` 保留原始错误链。

### 向上返回

- repository 返回存储错误或明确的存储语义错误。
- service 将确实具有业务含义的错误转换为业务错误。
- handler/middleware 在 HTTP 边界将错误映射为响应。
- 未知错误应记录服务端日志并返回通用 5xx，不得向客户端暴露 SQL、Redis、密钥等内部细节。
- 同一错误尽量只在请求边界记录一次，避免每层重复打印。
- 不要吞掉错误、用 nil 伪装成功，或用 panic 处理可预期失败。

### HTTP 映射建议

| 错误语义                     | HTTP |
| ---------------------------- | ---: |
| 请求格式/参数非法            |  400 |
| 未登录、Token 缺失/过期/无效 |  401 |
| 已登录但无权限               |  403 |
| 资源不存在                   |  404 |
| 资源冲突/重复操作            |  409 |
| 频率限制                     |  429 |
| 未知内部错误/数据库故障      |  500 |

最终映射需遵循现有 API 契约，不能在未确认兼容性的情况下修改旧接口响应。

## 5. 鉴权与数据可见性

- `MustLogin`：要求存在且有效的凭证。
- `OptionalAuth`：允许游客；有效凭证时加载身份信息。
- `RequireAdmin`：要求已登录且角色为 admin。
- 管理员写接口（创建、更新、删除等）必须在服务端路由挂载登录和管理员校验。
- 对公开读取接口，若登录身份会影响草稿/预览等数据可见性，使用 OptionalAuth 并在 service 中判断数据范围。
- 用户可读 Cookie `userinfo` 只用于前端展示，不能作为权限依据。
- JWT 验证成功不代表用户数据库记录一定存在；处理用户删除、禁用、查询失败等情况。
- 对用户拥有的资源，还需校验资源归属，不能仅判断用户已登录。
- 前端 `AuthGuard` 不能替代后端授权。

## 6. 命名与 Go 风格

- 包名使用简短小写单词。
- 导出符号使用 PascalCase；未导出符号使用 camelCase。
- Go 变量和函数名使用 Go 风格，不用 snake_case；JSON/数据库字段 tag 可按 API/DB 约定保留 snake_case。
- 错误变量通常以 `Err` 开头。
- 接收者名称简短且在同一类型的方法间保持一致。
- 文件按职责拆分，不要求一个文件对应一个类。
- 所有 Go 文件使用 `gofmt` 格式化。
- 只在确有必要时引入接口、泛型或额外抽象。

## 7. 新增接口时的文件清单

根据功能需要选择，不是强制全部创建：

| 文件/层                  | 何时需要                         |
| ------------------------ | -------------------------------- |
| `dto/<module>.go`        | 有新的 HTTP 请求/响应结构        |
| `model/<module>.go`      | 新表、字段映射或查询投影         |
| `repository/<module>.go` | 需要新的持久化操作               |
| `service/<module>.go`    | 存在业务规则或需要编排操作       |
| `handler/<module>.go`    | 新 HTTP handler                  |
| `router/<module>.go`     | 新路由映射或中间件策略           |
| `main.go`                | 新增构造依赖需要装配时           |
| `errors.go`              | 该层确实有需要导出的自定义错误时 |

新增 handler/service/repository 不意味着一定要新增一个全局实例；按构造函数模式注入。

## 8. 验证命令

在 `server/` 目录执行：

```bash
gofmt -w <本次修改的 Go 文件>
go test ./...
go vet ./...
go build ./...
```

接口改动额外验证：

- 游客；
- 普通登录用户；
- 管理员；
- 无效/过期 token；
- 资源不存在；
- 数据库/Redis 故障；
- 请求取消和重复提交（如适用）。

当前测试覆盖有限。新增重要业务规则时应补测试，不得仅因项目过去缺少测试就省略关键验证。
