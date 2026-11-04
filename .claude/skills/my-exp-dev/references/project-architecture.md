# 项目架构与当前代码现状

## 1. 项目定位与技术栈

`my-exp` 是个人主页、知识库与文章管理项目。当前仓库采用前后端分离结构。

| 区域          | 当前技术                                         |
| ------------- | ------------------------------------------------ |
| 前端          | React 19、TypeScript 5.9、Vite 7、React Router 6 |
| 状态管理      | Zustand 5、Immer、Zustand DevTools、Persist      |
| 样式          | Sass / SCSS Modules、全局 design tokens          |
| UI / 编辑     | Ant Design、MDXEditor、react-markdown 等依赖     |
| 后端          | Go 1.26、Gin 1.12                                |
| 数据访问      | GORM、MySQL                                      |
| 缓存/临时数据 | Redis                                            |
| 认证          | JWT、Cookie、微信验证码登录                      |

依赖版本以 `web/package.json`、`web/pnpm-lock.yaml`、`server/go.mod` 为准。不要仅凭本文件假设依赖版本仍未变化。

## 2. 已检查的仓库快照

本规范初版基于 `master` 分支提交：

- Commit：`c60f80b76fb0d5bc121c7a86be4c04b8f638ba75`
- 提交日期：2026-11-03
- 提交说明：收紧文章获取接口权限校验，调整更新文章内容时 preview 的切割逻辑，前端新增一键增加分隔符功能。

每次实际开发仍需检查最新工作区，不得把该快照当作永久不变的事实。

## 3. 目录结构

### 前端 `web/src`

```text
src/
├── api/            # request 封装及按业务模块拆分的接口函数
├── components/     # 可复用 UI 组件，通常每个组件一个目录
├── config/         # 主题等运行配置
├── constants/      # 请求码、导航、首页等常量
├── hooks/          # 请求编排、业务逻辑、浏览器副作用
├── router/         # 集中式路由配置
├── stores/         # Zustand 状态
├── styles/         # 全局样式、tokens、动效、阅读样式
├── types/          # 前端 API、业务及视图类型
├── utils/          # 通用工具、错误提示、Cookie 等
└── views/          # 路由页面和页面级布局
```

主要数据流：

```text
View
 ├── use Hook ─────── API module ───── request.ts ───── fetch
 │       └─────────── Zustand Store
 └── reusable Components
```

当前已存在文章详情缓存、文件夹树缓存、文章草稿 localStorage 持久化、登录态、主题、Toast 等 Store。

### 后端 `server`

```text
server/
├── main.go                  # 程序入口与依赖装配
├── internal/
│   ├── apperr/              # 跨层基础设施/认证错误
│   ├── config/              # 环境配置加载
│   ├── constant/            # 跨包常量
│   ├── database/            # MySQL / Redis 客户端初始化
│   ├── dto/                 # HTTP 请求和响应结构
│   ├── handler/              # Gin 请求处理
│   ├── middlewares/          # 认证、授权等中间件
│   ├── model/                # GORM 数据模型及查询投影
│   ├── repository/           # MySQL / Redis 存取
│   ├── router/               # 路由和中间件装配
│   ├── service/              # 业务规则
│   └── utils/                # 通用工具
├── sql/                      # 初始化 SQL
└── go.mod
```

后端数据流：

```text
HTTP
  → router
  → middleware（按路由需要）
  → handler
  → service
  → repository
  → MySQL / Redis
```

依赖创建方向由 `main.go` 统一装配：

```text
database clients
  → repositories
  → services
  → handlers
  → router
  → HTTP server
```

## 4. 当前架构事实

### 前端

- API 入口为 `web/src/api/request.ts`，各模块 API 放在 `web/src/api/`。
- `useRequest` 管理 `data/loading/error`，执行 service，捕获错误并调用 `handleError`。
- 文章详情缓存与请求中去重位于 `useArticles.ts` 和 `useArticlesStore`，不是 `useRequest` 的通用功能。
- 文件夹树缓存和加载状态位于 `useArticleTree.ts` 与 `useArticlesStore`。
- 草稿使用 `useDraftStore` + Zustand `persist` 写入 localStorage。
- Store 通常使用 `create + immer + devtools`；只有确实需要跨刷新保留的数据才使用 persist。
- 路由集中在 `web/src/router/index.ts`，后台页面采用 `React.lazy`。
- 样式使用组件级 `.module.scss`，主题变量集中在 `styles/tokens.scss`。

### 后端

- `main.go` 通过 `NewXxx` 创建 repo、service、handler，并注入依赖。
- 结构体依赖字段通常为小写，外部通过构造函数装配。
- handler 使用 `gin.Context`；service/repository 使用标准库 `context.Context`。
- Repository 使用 GORM `WithContext`，Redis 操作接收请求 context。
- 路由在 `router/index.go` 装配，CORS 中间件在注册路由前挂载。
- 管理接口通过 `MustLogin` 与 `RequireAdmin` 保护。
- 文章和文件夹的公开读取使用 `OptionalAuth`，服务层按用户身份控制可见内容。
- 当前项目没有独立 domain 目录；不要为了形式强行引入 DDD 全套分层。

## 5. 已知文档/实现差异与风险

这些是初次检查时发现的事项。开发时先重新确认是否已修复。

1. 根目录 README 仍称后端仅提供健康检查，但当前代码已经包含登录、文章、文件夹接口。
2. `server/README.md` 有部分过时描述，例如 JWT 有效期、鉴权接入情况和测试覆盖；以当前代码为准。
3. `web/vite.config.ts` 当前没有配置 README 所描述的 `/api` proxy；`request.ts` 当前使用 `testBaseUrl`。新增接口必须复用现有 `request`，不要自行假设代理存在。
4. `AuthGuard` 组件已存在，但当前 `router/index.ts` 中 `/admin` 路由没有挂载它。即使未来接入，也只能作为前端体验控制，后端仍必须鉴权。
5. 当前 Go 测试文件仅发现 `config/config_test.go` 与 `utils/name_test.go`。不要声称 service、repository、handler 或 middleware 已有全面测试。
6. `OptionalAuth` 当前忽略 `FindUserByID` 的错误，并可能把 nil 用户写入 context；新增/调整认证逻辑时必须明确区分用户不存在、数据库故障和游客。
7. `FindArticleContent` 对已通过 JWT 验证但用户记录不存在的情况需要 nil 防护，不能只检查类型断言是否成功。
8. 部分 handler 将所有 service 错误统一映射为 400，或将未知错误映射为客户端错误。新增接口应区分参数错误、未认证、无权限、资源不存在和内部错误。
9. 部分 repository 用 `apperr.MySQLError` 替换底层错误，可能丢失错误链。新代码优先使用 `%w` 包装原始错误，并在边界映射。
10. 当前 service 有直接依赖 `dto` 的实现，边界并不完全统一。新代码优先让 DTO 留在 HTTP 边界，避免继续扩大 transport 与业务逻辑的耦合。

## 6. 修改原则

- 旧模块只在需求触及时做必要修正，不借新增功能全面翻修。
- 如果新实现需要沿用旧接口的行为，先确认兼容性；不能因“更整洁”擅自改变响应字段、HTTP 状态码、Cookie、路由或数据语义。
- 对已知风险，如果本次任务经过相关代码，优先避免复制；是否修复旧问题按需求范围决定，必要时向用户说明。
