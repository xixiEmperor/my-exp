# 知页

个人博客与知识库。前端已实现个人博客首页，包括 Swiper 轮播、个人经历时间轴、项目历程、未来计划和联系区。后端目前只提供健康检查接口，原有 HTML demo 继续作为设计参考。

经历和联系方式仍为明确标注的示例内容。知识库入口目前展示待开发说明，登录遮罩尚未接入微信服务，因此不会生成虚假二维码或模拟登录成功。日期、天气、额外作品集等扩展没有加入。

## 环境要求

- Node.js 20.19 及以上的 20.x，或 22.12 及以上版本。
- pnpm 10.17.1。
- Go 1.26 及以上。

## 启动前端

在项目根目录打开 CMD，依次执行：

```bat
cd web
pnpm install
pnpm dev
```

访问 http://127.0.0.1:5173 。前端开发服务将 `/api` 请求转发到 http://127.0.0.1:8080 ，保留完整路径。

## 启动后端

在项目根目录打开另一个 CMD，依次执行：

```bat
cd server
go mod download
air
```

Air 会读取 `server/.air.toml`，保存 Go 源码、配置或依赖文件后自动重新编译并重启后端。Windows 下生成的程序放在 `server/tmp/zhiye-api.exe`，退出时自动清理。

首次使用时，先安装项目配置对应的 Air 版本：

```bat
go install github.com/air-verse/air@v1.67.4
```

安装位置由 `go env GOBIN` 决定，未设置时使用 `go env GOPATH` 对应目录下的 `bin`。需要将该目录加入 `PATH`，让 CMD 能找到 `air` 命令。Air 作为开发工具单独安装，不需要通过 `go get` 加入后端业务依赖。只想启动一次、不监听文件变化时，仍可使用 `go run .`。

健康检查地址为 http://127.0.0.1:8080/api/v1/health ，正常返回 `status` 为 `ok`、`service` 为 `zhiye-api` 的 JSON。前后端都启动后，也可以通过 http://127.0.0.1:5173/api/v1/health 验证开发代理。

需要调整后端端口时，在启动前使用 CMD 设置 `PORT`。前端代理目标也需要同步修改。当前健康检查只验证服务存活，启动不需要 MySQL、Redis 或微信配置。

## 基础检查

前端在 `web` 目录执行：

```bat
pnpm typecheck
pnpm build
```

后端在 `server` 目录执行：

```bat
go vet ./...
go build -o bin/zhiye-api.exe .
```

## 当前目录

| 位置 | 用途 |
| --- | --- |
| `web/src/main.ts` | 挂载 React 和 RouterProvider |
| `web/src/App.tsx` | 共用导航、页面出口、页脚和登录遮罩 |
| `web/src/views/home/HomeView.tsx` | 集成首页各区域 |
| `web/src/router/index.ts` | 唯一的配置式路由表 |
| `web/src/views`、`components`、`hooks`、`stores` | 视图、组件、业务逻辑和 Zustand 状态 |
| `web/src/constants/home.ts` | 项目历程详情和轮播说明 |
| `web/public/fonts/alibaba-puhuiti` | 本地阿里巴巴普惠体与字体来源说明 |
| `web/src/utils`、`api`、`assets` | 保留工具、接口和资源目录 |
| `web/src/types`、`styles`、`constants`、`config` | 公共类型、样式、常量和配置 |
| `server/main.go` | Gin 启动入口和健康检查接口 |
| `server/internal` | 按技术职责保留后端高层目录，尚未实现业务模块 |
| `server/migrations`、`server/scripts` | 后续数据库变更和维护脚本 |
| `docs`、`deploy` | 后续开发资料和部署配置 |

空目录使用 `.gitkeep` 保留结构。组件实现时按组件名建文件夹，一个或几个 TSX 配一个 `.module.scss`。

前端已使用 React、React Router 6、Zustand、Sass 和 Swiper。首页轮播的导航、分页、键盘和触摸切换由 Swiper 处理。hooks 订阅和更新 Zustand，组件接收状态与操作。组件按名称独立建文件夹，每个文件夹使用一个 `.module.scss`。

经历时间轴通过 IntersectionObserver 逐项显现，并尊重系统减少动态效果的设置。项目历程支持悬浮、点击和方向键操作。阿里巴巴普惠体通过本地字体文件加载。

首页可以独立于后端浏览。AntD、MDXEditor 和 react-markdown 等依赖在实现对应业务时再加入，目前没有建立数据库连接。开发服务由你按上述命令手动启动。
