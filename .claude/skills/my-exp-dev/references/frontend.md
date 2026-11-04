# 前端开发规范

## 1. 分层与职责

### 1.1 请求层 `web/src/api`

分为两部分：

- `request.ts`：基于原生 `fetch` 的统一请求封装，负责 URL 查询参数拼接、请求头、JSON 请求体、credentials、signal、响应解析和统一错误抛出。
- `<module>.ts`：按业务模块封装 API，例如 `articles.ts`、`folders.ts`、`users.ts`。只描述接口地址、方法、参数和返回类型。

约束：

- 业务 API 必须复用 `request`，禁止每个模块自己调用 `fetch`。
- 统一响应体当前为 `{ code, msg, data }`，`request<T>` 已经检查 HTTP 状态和业务码，并返回 `data`。
- 查询参数通过 `params` 传递；请求体通过 `body` 传递；需要 Cookie 的接口显式设置 `credentials: 'include'`。
- 需要取消请求时将 `AbortSignal` 传给 API，再传入 `request`。
- API 函数不负责 toast、页面状态、Store 写入或业务判断。
- 不要为了返回 Promise 而无意义地写 `async` + `return await`。
- 新接口必须定义明确的参数和返回类型，不使用随意的 `any`。

### 1.2 `useRequest`

当前职责：

- 管理 `data`、`loading`、`error`。
- 通过 `run(...params)` 执行传入的异步 service。
- 捕获异常，更新 error，并调用 `handleError`。
- 提供 `reset()` 清理请求状态。

重要边界：

- 当前 `useRequest` **不提供通用缓存、请求去重、自动取消或缓存失效**。
- 请求失败时 `run` 返回 `undefined`，调用方必须考虑返回值可能为空。
- 不要把所有业务缓存逻辑塞进该 Hook。缓存策略由业务 Hook 和 Store 按数据语义实现。
- 如果未来要扩展通用请求能力，先提出明确需求并评估并发 loading、取消、竞态和缓存键设计，不得默默改变现有语义。

### 1.3 业务 Hook `web/src/hooks`

负责把 API、Store、React 状态和副作用编排成页面可用的能力。

例如：

- `useArticles`：文章详情查询、缓存命中、请求去重、文章更新后同步 Store 和草稿。
- `useArticleTree`：目录加载、节点组合、创建节点后更新 Store。
- `useLogin`：登录、退出、Cookie 读取和用户 Store 同步。
- `useTheme`：主题偏好与系统主题合成，并同步 document。

约束：

- Hook 可以调用 API、`useRequest` 和 Store。
- 业务规则与跨组件副作用放 Hook/service，不要塞进纯展示组件。
- Hook 返回页面所需的状态和操作，不要暴露无关内部实现。
- 订阅 Store 时使用 selector，只订阅真正需要的字段。
- `getState()` 适合在事件/异步回调中读取最新状态，或读取稳定 action；渲染需要响应变化的数据必须通过 Hook selector 订阅。
- 避免闭包旧快照；异步回调中需要最新数据时，从 Store 重新读取。
- 请求并发时考虑竞态、取消、组件卸载和过期响应覆盖。

### 1.4 Store `web/src/stores`

负责共享状态及其状态转换，不负责发 HTTP 请求。

当前 Store 包括：

- `articles.ts`：文章实体映射、文件夹节点和目录加载状态。
- `draft.ts`：按文章 ID 存储本地草稿，并持久化 localStorage。
- `user.ts`：登录状态和用户展示资料。
- `ui.ts`：菜单、登录弹窗、主题偏好。
- `toast.ts`：全局提示队列。

约束：

- 共享、跨组件或跨路由状态使用 Zustand。
- 临时、局部、只影响一个组件的状态优先使用 `useState`。
- Store action 负责状态更新，不在 action 中隐式发起网络请求。
- 默认不持久化服务端缓存；只有草稿、用户明确偏好等确有刷新恢复需求的数据才使用 persist。
- 现有 Store 使用 `create`、`immer`、`devtools`；需要持久化时按 `draft.ts` 的 `persist + createJSONStorage` 模式实现。
- Immer 更新时直接修改 draft state；不要混用不必要的深拷贝。
- Store selector 返回稳定字段，避免每次渲染创建新对象/数组。

### 1.5 组件层 `web/src/components`

- 放可复用 UI 和交互组件。
- 通过 props 接收数据、状态和回调。
- 不直接拼 API URL、不直接访问数据库、不承载页面路由决策。
- 组件内部可以管理纯局部交互状态。
- 组件样式优先放同目录 `<Component>.module.scss`。
- 组件只有一个明确职责；复杂逻辑抽成 Hook 或子组件。

### 1.6 视图层 `web/src/views`

- 一个 View 对应一个路由页面或页面级布局。
- 负责调用业务 Hook、订阅必要 Store、组织组件和路由 Outlet。
- 不重复实现请求底层细节。
- 页面级派生数据可用 `useMemo`，事件回调按需使用 `useCallback`。
- 不要把整个业务系统塞进一个 View。

### 1.7 类型层 `web/src/types`

- 存放前端 API 请求/响应类型、业务实体、视图模型和状态类型。
- 按业务模块拆分，例如 `articles.ts`、`folders.ts`、`user.ts`。
- API 返回结构与前端内部树节点等视图结构不同，应定义不同类型并显式转换。
- 使用 `Pick`、`Omit` 等工具类型复用字段，但避免构造难以理解的复杂类型。
- 只导入类型时使用 `import type`。

### 1.8 工具、常量、路由和样式

- `utils`：与具体页面无关、可复用的工具函数；有副作用的工具应明确命名和边界。
- `constants`：跨文件稳定常量，如响应码、导航配置；不要把易变业务数据随意堆进常量。
- `config`：主题、运行环境等配置逻辑。
- `router/index.ts`：集中声明路由，后台页面按需 lazy load。
- `styles/tokens.scss`：全站色彩、圆角、阴影、尺寸等 design tokens。
- 组件样式使用 CSS Modules；全局样式只放真正全局的规则。

## 2. 前端请求与状态流

标准链路：

```text
View
  → business Hook
      → useRequest (when request state is needed)
          → module API
              → request.ts
                  → fetch
      → Zustand Store (when state is shared/cached)
  → Components receive props
```

不要让 View 绕过 Hook，直接操作请求细节；也不要为了每个 API 都建立一个没有额外逻辑的 Hook。若简单页面只需一次只读请求，可按邻近模块最简洁的模式实现。

## 3. 文章/目录类缓存的参考规则

当前文章模块体现了按业务数据设计缓存的方式：

- 文章实体按 `id` 放在 `articles` 映射中。
- 文件夹按 `id` 保存子节点、加载状态。
- `idle / loading / loaded / error` 区分未加载、请求中、成功（包括空数组）和失败。
- 文章详情请求中的 ID 使用 `pendingArticleIds` 去重。
- 草稿是本地编辑态，不等同于服务端文章实体；保存成功后再清除对应草稿。
- 文件夹和文章是独立资源时，分别请求、分别建模，不把它们强行合并成一个后端实体。

新模块不必照搬文章 Store；只有存在共享读取、缓存或跨页面状态需求时才建立 Store。

## 4. 类型、命名与代码风格

- TypeScript 开启 strict；保持类型明确。
- 组件、接口、类型使用 PascalCase；变量、函数、Hook 使用 camelCase。
- Hook 名以 `use` 开头。
- API 函数使用清晰动词，如 `getArticleDetail`、`createFolder`、`updateArticle`。
- 文件按模块/组件组织，遵循已有别名 `@/`。
- ESLint 与 Prettier 配置为准，不自行发明冲突的格式规则。
- 避免 `any`、非必要断言、重复 `async/await`、过长函数和隐式副作用。
- React Hook 依赖必须正确；不要通过关闭 exhaustive-deps 来掩盖闭包问题。

## 5. 错误处理

- `request.ts` 将 HTTP 错误和业务码错误转换为异常。
- `useRequest` 捕获异常并统一调用 `handleError`。
- 需要局部恢复或更新状态的 Hook 可以 catch 后更新状态，再 `throw` 保留失败语义；不要写只捕获又原样抛出的无意义 try/catch。
- 不要在 API 模块和 View 重复 toast 同一个错误。
- 对取消请求、用户主动关闭弹窗等预期行为，避免误报为普通错误。

## 6. 路由与权限

- 路由集中在 `router/index.ts`。
- 页面路由参数通过 React Router 读取。
- `AuthGuard` 即使接入，也只是前端体验控制；真正权限由后端中间件和 service 规则保障。
- 不得根据 localStorage、可读 Cookie 或 Zustand 的 `role` 决定服务端是否允许操作。

## 7. 验证命令

在 `web/` 目录执行：

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

按改动范围选择必要命令。不要因为格式检查失败就顺手格式化无关文件。
