# 根目录命令与资源推送

在仓库根目录使用 CMD 执行 pnpm install。workspace 包含主站 web、后续 tools、demos 下的单实现与多实现前端，以及现有 playground 下的前端。各项目保留自己的 package.json、锁文件和构建入口，构建依赖审批统一放在 pnpm-workspace.yaml。

根目录 pnpm dev、pnpm build、pnpm preview、pnpm typecheck、pnpm lint 与格式化命令对应主站。pnpm build:all 和 pnpm typecheck:all 检查所有前端。单独运行某个示例时使用 pnpm --filter 包名加上该包的命令。

```bat
rem 在根目录安装整个 workspace。
pnpm install
rem 启动主站。
pnpm dev
rem 单独启动现有虚拟列表示例。
pnpm --filter @playground/virtual-list-fixed-height dev
rem 构建选定实现。
pnpm --filter @playground/virtual-list-fixed-height build
rem 检查本地文件和目标目录，不连接 R2。
pnpm push:artifacts --slug virtual-list --implementation fixed-height --verison 1.1.0 --dry-run
```

scripts/push-artifacts.mjs 只推送已构建的 web/dist，目标为 demos/slug/verison/preview。单实现使用 implementation default，多实现填写实际目录名。脚本支持现有 playground 路径，R2 中仍统一使用 demos 前缀。如果两种目录都有同名实现产物，脚本会停止，要求先整理目录。

脚本使用 Cloudflare 官方 cloudflare SDK，上传方式参考 [Upload Object 文档](https://developers.cloudflare.com/api/typescript/resources/r2/subresources/buckets/subresources/objects/methods/upload/)。通过 client.r2.buckets.objects.list 检查已有版本，再通过 client.r2.buckets.objects.upload 上传文件。

真正推送前，将 scripts/.env.example 中的 R2_ACCOUNT_ID、R2_BUCKET 与 CLOUDFLARE_API_TOKEN 填入 scripts/.env。使用 Cloudflare API Token，并为对应账户授予对象列表与上传所需的 Workers R2 Storage 权限。根目录命令自动加载 scripts/.env，也可以在 CMD 中使用 set 配置同名变量。

```bat
rem 推送已构建的前端产物。
pnpm push:artifacts --slug virtual-list --implementation fixed-height --verison 1.1.0
rem 查看参数说明。
pnpm push:artifacts --help
```

源码与产物分别检查 sources 和 preview 目录，所属目录已有文件时拒绝上传。这样可以先上传产物，再向同版本上传源码，也可以交换顺序。官方文档没有声明上传接口支持条件写入，因此这里的发布前检查不能保证并发发布互不覆盖，请避免同时推送同一个场景版本。推送中途失败会保留已经上传的文件，请检查并清理该次未完成发布，或改用新版本。脚本不会自动删除远端文件。

官方上传接口单文件上限为 300 MB，脚本在开始上传前检查全部文件大小。写入失败后不自动重试。

发布前确保构建产物来自本次源码。预览使用相对资源路径，index.html 位于 preview/index.html，文件按对应类型设置 Content-Type，并使用带版本的长期缓存。

scripts/push-sources.mjs 单独推送原始源码，使用同一份 scripts/.env。单实现上传到 sources/web 和 sources/server，多实现保留实现名，例如 sources/fixed-height/web/src/App.tsx。多实现只扫描所选目录，并在存在时附带场景根 README.md。

```bat
rem 先检查所选实现的源码路径，不连接 R2。
pnpm push:sources --slug virtual-list --implementation fixed-height --verison 1.1.0 --dry-run
rem 上传源码，与产物使用相同版本。
pnpm push:sources --slug virtual-list --implementation fixed-height --verison 1.1.0
rem 追加排除项，可重复传入，路径相对于所选实现。
pnpm push:sources --slug virtual-list --implementation fixed-height --verison 1.1.0 --exclude web/coverage --exclude server/tmp --dry-run
```

源码默认排除 node_modules、dist、.git、.vite、coverage、tmp、logs、bin、真实 .env 配置，以及常见运行日志、可执行文件和密钥文件。保留 .env.example 等环境示例。目录排除包括全部子项，自定义规则只支持相对文件或目录路径。符号链接不收集，二进制和非 UTF-8 文件跳过并提示。

源码全部使用 text/plain; charset=utf-8，原始 HTML 也按文本展示，保留原文件内容与注释。命令输出按场景根计算的 file_paths JSON 数组，供核对后台登记结果，不向 R2 写入额外索引文件。

发布前从同一份源码构建产物，再用相同 slug、implementation 和 verison 分别推送两类资源。后台扫描使用相同排除规则，并在两类资源均上传成功后登记版本。两个命令不写数据库，也不部署 Go 服务。现有 Go 部署入口仍见 server/scripts/DEPLOY.md。

各实现复制到仓库外验证时，运行 pnpm install --frozen-lockfile --ignore-workspace，再执行 pnpm build。
