package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"unicode/utf8"

	"zhiye/server/internal/dto"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"
	"zhiye/server/internal/utils"

	"github.com/go-sql-driver/mysql"
	gonanoid "github.com/matoous/go-nanoid/v2"
)

const (
	demoRootDir                 = "playground"
	maxDemoUploadBytes    int64 = 300 * 1024 * 1024
	demoUploadConcurrency       = 8
)

var (
	demoDirectoryPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	demoVerisonPattern   = regexp.MustCompile(`^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$`)
	demoIgnoredDirs      = map[string]bool{
		"node_modules": true,
		"dist":         true,
		".git":         true,
		".vite":        true,
		"coverage":     true,
		"tmp":          true,
		"logs":         true,
		"bin":          true,
	}
)

// demoUploadTask 描述单个待上传到 R2 的本地文件任务。
type demoUploadTask struct {
	localPath   string // 本地文件绝对或相对路径
	r2Key       string // 目标 R2 对象键
	contentType string // 上传时写入的 HTTP Content-Type
}

// DemoResourceService 管理 demos 表的查询、编辑、删除，以及静态产物和源码上传。
type DemoResourceService struct {
	repo          *repository.DemoResourcesRepo // demo 数据仓库
	r2Svc         *R2Service                    // R2 对象存储服务（可为 nil，表示未启用）
	workspaceRoot string                        // 本地 demo 目录根路径，默认 ".."
}

// NewDemoResourceService 创建 demo 资源服务实例，默认以仓库根目录（..）扫描本地文件。
func NewDemoResourceService(repo *repository.DemoResourcesRepo, r2Svc *R2Service) *DemoResourceService {
	return &DemoResourceService{
		repo:          repo,
		r2Svc:         r2Svc,
		workspaceRoot: "..",
	}
}

// demoResourceNotFound 将仓储层的记录不存在错误统一转换为业务层的 ErrDemoResourceNotFound。
// 这样上层 Handler 可以用 errors.Is 统一映射为 HTTP 404，同时保留原始错误方便排查。
func demoResourceNotFound(err error) error {
	if errors.Is(err, repository.ErrDemoResourceNotFound) {
		return fmt.Errorf("%w: %w", ErrDemoResourceNotFound, err)
	}
	return err
}

// GetDemoResourceByID 根据资源 ID 查询单条 demo 资源记录。
func (s *DemoResourceService) GetDemoResourceByID(ctx context.Context, id string) (model.DemoResources, error) {
	if strings.TrimSpace(id) == "" {
		return model.DemoResources{}, ErrInvalidResourceID
	}
	res, err := s.repo.FindDemoResourceByID(ctx, id)
	if err != nil {
		return model.DemoResources{}, demoResourceNotFound(err)
	}
	return res, nil
}

// GetAllDemoResources 查询资源表中全部已记录的 demo 资源。
func (s *DemoResourceService) GetAllDemoResources(ctx context.Context) ([]model.DemoResources, error) {
	return s.repo.FindAllDemoResources(ctx)
}

// GetDemoResourceBySlugAndVerison 根据 slug 和版本号查询唯一资源记录。
func (s *DemoResourceService) GetDemoResourceBySlugAndVerison(
	ctx context.Context,
	slug, verison string,
) (model.DemoResources, error) {
	if !demoDirectoryPattern.MatchString(slug) {
		return model.DemoResources{}, fmt.Errorf("%w: slug 只能包含小写字母、数字和中间连字符", ErrDemoResourceInvalid)
	}
	if !demoVerisonPattern.MatchString(verison) {
		return model.DemoResources{}, fmt.Errorf("%w: verison 必须为 x.x.x 格式", ErrDemoResourceInvalid)
	}
	res, err := s.repo.FindDemoResourceBySlugAndVerison(ctx, slug, verison)
	if err != nil {
		return model.DemoResources{}, demoResourceNotFound(err)
	}
	return res, nil
}

// UpdateDemoResource 更新 demo 的展示名称、说明、标签和发布状态。
func (s *DemoResourceService) UpdateDemoResource(
	ctx context.Context,
	id string,
	req dto.UpdateDemoResourceReq,
) (model.DemoResources, error) {
	// 1. 校验主键 ID、展示名称和发布状态合法性。
	if strings.TrimSpace(id) == "" {
		return model.DemoResources{}, ErrInvalidResourceID
	}

	name := strings.TrimSpace(req.Name)
	if name == "" || utf8.RuneCountInString(name) > 255 {
		return model.DemoResources{}, fmt.Errorf("%w: name 不能为空且不能超过 255 个字符", ErrDemoResourceInvalid)
	}
	if req.Status != "draft" && req.Status != "published" {
		return model.DemoResources{}, fmt.Errorf("%w: status 只能为 draft 或 published", ErrDemoResourceInvalid)
	}

	// 2. 规范化可选字段：空白说明视为 nil，过滤空白标签。
	var description *string
	if req.Description != nil {
		trimmed := strings.TrimSpace(*req.Description)
		if trimmed != "" {
			description = &trimmed
		}
	}

	var tags []string
	for _, t := range req.Tags {
		if trimmed := strings.TrimSpace(t); trimmed != "" {
			tags = append(tags, trimmed)
		}
	}

	// 3. 写入数据库并返回更新后的最新实体。
	res, err := s.repo.UpdateDemoResourceInfo(ctx, id, name, description, tags, req.Status)
	if err != nil {
		return model.DemoResources{}, demoResourceNotFound(err)
	}
	return res, nil
}

// DeleteDemoResource 删除指定 demo 记录，并尽最大努力清理对应 R2 版本目录。
func (s *DemoResourceService) DeleteDemoResource(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidResourceID
	}
	// 1. 先查询出记录，拿到 slug 和 verison 以便后续清理 R2 目录。
	res, err := s.repo.FindDemoResourceByID(ctx, id)
	if err != nil {
		return demoResourceNotFound(err)
	}
	// 2. 删除数据库记录，确保列表不再展示。
	if err := s.repo.DeleteDemoResourceByID(ctx, id); err != nil {
		return demoResourceNotFound(err)
	}
	// 3. 尽最大努力删除 R2 下 demos/<slug>/<verison>/ 全部对象，目录不存在时忽略。
	if s.r2Svc != nil {
		prefix := fmt.Sprintf("demos/%s/%s/", res.Slug, res.Verison)
		if err := s.r2Svc.DeleteFolder(ctx, prefix); err != nil && !errors.Is(err, ErrR2NotFound) {
			return nil
		}
	}
	return nil
}

// CreateDemoResource 上传指定 demo 版本的静态构建产物与源码到 R2，并写入 demos 表。
func (s *DemoResourceService) CreateDemoResource(
	ctx context.Context,
	req dto.CreateDemoResourceReq,
) (model.DemoResources, error) {
	// 1. 校验请求参数并确认 R2 服务已配置。
	excludes, err := validateCreateDemoResourceReq(req)
	if err != nil {
		return model.DemoResources{}, err
	}
	if s.r2Svc == nil {
		return model.DemoResources{}, ErrR2NotConfigured
	}

	// 2. 先检查数据库是否已存在相同 (slug, verison)，避免无效扫描和上传。
	if _, err := s.repo.FindDemoResourceBySlugAndVerison(ctx, req.Slug, req.Verison); err == nil {
		return model.DemoResources{}, ErrDemoResourceConflict
	} else if !errors.Is(err, repository.ErrDemoResourceNotFound) {
		return model.DemoResources{}, err
	}

	// 3. 定位本地唯一的实现目录及 web/dist 产物目录，分别收集待上传任务。
	sceneDir, selectedDir, distDir, err := s.resolveDemoDirectories(req.Slug, req.Implementation)
	if err != nil {
		return model.DemoResources{}, err
	}

	// 3.1 构建出 R2 存储路径前缀，也是作为 key，调用 R2 api 的时候使用
	r2Prefix := fmt.Sprintf("demos/%s/%s/", req.Slug, req.Verison)
	// 3.2 收集 demo 前端产物，并构建出产物路径
	artifactTasks, err := collectDemoArtifacts(distDir, r2Prefix+"preview/")
	if err != nil {
		return model.DemoResources{}, err
	}
	// 3.3 收集 demo 源码，并构建出源码存放路径
	sourceTasks, filePaths, err := collectDemoSources(
		sceneDir,
		selectedDir,
		req.Implementation,
		r2Prefix+"sources/",
		excludes,
	)
	if err != nil {
		return model.DemoResources{}, err
	}

	// 4. 上传前检查目标目录是否已有残留文件，避免覆盖已有发布版本。
	if err := s.ensureR2PrefixesEmpty(ctx, r2Prefix+"preview/", r2Prefix+"sources/"); err != nil {
		return model.DemoResources{}, err
	}

	// 5. 合并构建产物与源码任务并并发上传到 R2；任一失败则回滚清理已上传对象。
	allTasks := make([]demoUploadTask, 0, len(artifactTasks)+len(sourceTasks))
	allTasks = append(allTasks, artifactTasks...)
	allTasks = append(allTasks, sourceTasks...)

	uploadedKeys, err := s.uploadDemoTasks(ctx, allTasks)
	if err != nil {
		s.cleanupUploadedKeys(uploadedKeys)
		return model.DemoResources{}, err
	}

	// 6. 自动生成 21 位 NanoID 主键，默认展示名称设为 slug、状态设为 draft 并写入 demos 表。
	id, err := gonanoid.New()
	if err != nil {
		s.cleanupUploadedKeys(uploadedKeys)
		return model.DemoResources{}, fmt.Errorf("生成资源 ID 失败: %w", err)
	}

	var excludePaths []string
	if len(excludes) > 0 {
		excludePaths = excludes
	}

	resource := model.DemoResources{
		ID:             id,
		Slug:           req.Slug,
		Name:           req.Slug,
		Description:    nil,
		Tags:           nil,
		Status:         "draft",
		Implementation: req.Implementation,
		Verison:        req.Verison,
		FilePaths:      filePaths,
		ExcludePaths:   excludePaths,
	}

	// 7. 写库失败时同步清理本次已上传的 R2 对象，保持数据一致性。
	if err := s.repo.CreateDemoResource(ctx, &resource); err != nil {
		s.cleanupUploadedKeys(uploadedKeys)
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
			return model.DemoResources{}, ErrDemoResourceConflict
		}
		return model.DemoResources{}, err
	}

	return resource, nil
}

// validateCreateDemoResourceReq 校验新建 demo 的请求参数，并将排除规则标准化为正斜杠相对路径。
func validateCreateDemoResourceReq(req dto.CreateDemoResourceReq) ([]string, error) {
	// 1. 校验目录标识、实现目录名和版本号格式，防止路径拼接时出现非法字符。
	if !demoDirectoryPattern.MatchString(req.Slug) {
		return nil, fmt.Errorf("%w: slug 只能包含小写字母、数字和中间连字符", ErrDemoResourceInvalid)
	}
	if !demoDirectoryPattern.MatchString(req.Implementation) {
		return nil, fmt.Errorf("%w: implementation 只能包含小写字母、数字和中间连字符", ErrDemoResourceInvalid)
	}
	if !demoVerisonPattern.MatchString(req.Verison) {
		return nil, fmt.Errorf("%w: verison 必须为 x.x.x 格式", ErrDemoResourceInvalid)
	}

	// 2. 标准化排除规则，将工具返回的底层格式错误包装为 ErrDemoResourceInvalid。
	excludes, err := utils.NormalizeDemoExcludes(req.ExcludePaths)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrDemoResourceInvalid, err)
	}
	return excludes, nil
}

// resolveDemoDirectories 根据 slug 和 implementation 定位本地场景目录、实现目录和构建产物目录。
func (s *DemoResourceService) resolveDemoDirectories(
	slug, implementation string,
) (sceneDir, selectedDir, distDir string, err error) {
	// 1. 基于固定根目录 playground 拼接场景目录、实现目录与构建产物目录。
	sceneDir = filepath.Join(s.workspaceRoot, demoRootDir, slug)
	selectedDir = sceneDir
	if implementation != "default" {
		selectedDir = filepath.Join(sceneDir, implementation)
	}
	distDir = filepath.Join(selectedDir, "web", "dist")

	// 2. 依次校验场景根目录、实现目录和 web/dist 是否存在、为普通目录且非符号链接。
	for _, item := range []struct {
		path          string
		label         string
		rejectSymlink bool
	}{
		{sceneDir, "源码根目录", true},
		{selectedDir, "实现目录", true},
		{distDir, "构建产物目录 web/dist", false},
	} {
		if err := utils.CheckDemoDir(item.path, item.label, item.rejectSymlink); err != nil {
			return "", "", "", fmt.Errorf("%w: %w", ErrDemoResourceInvalid, err)
		}
	}

	return sceneDir, selectedDir, distDir, nil
}

// collectDemoArtifacts 遍历构建产物目录（web/dist），收集所有待上传的静态资源任务。
// 会校验不能包含符号链接、单文件不能超过 300MB、且必须存在 index.html 入口文件。
func collectDemoArtifacts(distDir, previewPrefix string) ([]demoUploadTask, error) {
	var tasks []demoUploadTask
	hasIndexHTML := false

	// filepath.WalkDir 会递归遍历 distDir 下的每一级子目录和文件，并对每一项调用回调函数。
	// 比旧的 filepath.Walk 更省内存，因为 entry（fs.DirEntry）只在需要时才读取详细元信息。
	err := filepath.WalkDir(distDir, func(path string, entry fs.DirEntry, walkErr error) error {
		// 如果读取某个子目录本身失败（例如权限不足），walkErr 不为 nil，直接返回中止遍历。
		if walkErr != nil {
			return walkErr
		}
		// entry.Type() 返回文件类型位，不触发额外磁盘 stat；禁止软链接防止把外部文件打包上传。
		if entry.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("%w: 构建产物中不允许符号链接: %s", ErrDemoResourceInvalid, path)
		}
		// 文件夹本身不需要上传到 R2，返回 nil 继续往下一层遍历。
		if entry.IsDir() {
			return nil
		}
		// IsRegular() 判断是否为普通文件（排除管道、设备文件、Socket 等特殊文件）。
		if !entry.Type().IsRegular() {
			return fmt.Errorf("%w: 不支持的构建产物类型: %s", ErrDemoResourceInvalid, path)
		}
		// entry.Info() 获取文件大小等完整元信息（类似 os.Stat），这里用来检查是否超过 300MB。
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if info.Size() > maxDemoUploadBytes {
			return fmt.Errorf("%w: 文件超过 300MB 上限: %s", ErrDemoResourceInvalid, entry.Name())
		}

		// filepath.Rel(基准目录, 当前路径) 计算相对路径；Windows 下会得到反斜杠 "\"。
		rel, err := filepath.Rel(distDir, path)
		if err != nil {
			return err
		}
		// filepath.ToSlash 把路径分隔符统一转成正斜杠 "/"，因为 R2 对象键和 URL 都使用 "/"。
		relSlash := filepath.ToSlash(rel)
		if relSlash == "index.html" {
			hasIndexHTML = true
		}

		tasks = append(tasks, demoUploadTask{
			localPath:   path,
			r2Key:       previewPrefix + relSlash,
			contentType: utils.DemoArtifactContentType(path),
		})
		return nil
	})
	if err != nil {
		return nil, err
	}
	if !hasIndexHTML {
		return nil, fmt.Errorf("%w: 构建产物缺少 index.html", ErrDemoResourceInvalid)
	}

	// 按 R2 对象键字典序排序，保证每次扫描生成的任务顺序稳定可预测。
	sort.Slice(tasks, func(i, j int) bool {
		return tasks[i].r2Key < tasks[j].r2Key
	})
	return tasks, nil
}

// collectDemoSources 扫描所选实现目录下的源码文件，过滤忽略目录、敏感文件、非 UTF-8/二进制文件及自定义排除规则。
// 返回待上传任务列表以及按字典序排序的相对路径列表（写入数据库的 file_paths 字段）。
func collectDemoSources(
	sceneDir, selectedDir, implementation, sourcesPrefix string,
	excludes []string,
) ([]demoUploadTask, []string, error) {
	type sourceItem struct {
		localPath string
		relPath   string
	}
	var items []sourceItem

	// addSourceFile 负责对单个源码文件做合法性检查（普通文件、大小、UTF-8 纯文本）并加入收集列表。
	addSourceFile := func(path string) error {
		// os.Lstat 读取文件元信息而不跟随软链接。
		info, err := os.Lstat(path)
		if err != nil {
			return err
		}
		// 跳过软链接或非普通文件（例如目录或特殊设备文件）。
		if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
			return nil
		}
		if info.Size() > maxDemoUploadBytes {
			return fmt.Errorf("%w: 源码文件超过 300MB 上限: %s", ErrDemoResourceInvalid, info.Name())
		}

		// os.ReadFile 一次性读取文件全部字节，用于判断它是不是纯文本源码。
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		// 非合法 UTF-8 编码或包含空字节 '\x00'（常见于图片/可执行文件等二进制）的文件直接跳过。
		if !utf8.Valid(data) || bytes.IndexByte(data, 0) >= 0 {
			return nil
		}

		// 源码相对路径以场景根目录（sceneDir）为基准，和数据库 file_paths 约定保持一致。
		rel, err := filepath.Rel(sceneDir, path)
		if err != nil {
			return err
		}
		items = append(items, sourceItem{
			localPath: path,
			relPath:   filepath.ToSlash(rel),
		})
		return nil
	}

	// 递归遍历所选实现目录（selectedDir）。
	err := filepath.WalkDir(selectedDir, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		// 遍历的第一个回调就是根目录 selectedDir 本身，直接跳过不做过滤判断。
		if path == selectedDir {
			return nil
		}

		// 计算相对于所选实现目录的路径，用来匹配用户填写的 exclude_paths 规则。
		relToSelected, err := filepath.Rel(selectedDir, path)
		if err != nil {
			return err
		}
		localPath := filepath.ToSlash(relToSelected)
		for _, rule := range excludes {
			if localPath == rule || strings.HasPrefix(localPath, rule+"/") {
				// 如果是目录被排除，返回 filepath.SkipDir 告诉 WalkDir 不要再进入该目录内部。
				if entry.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		name := entry.Name()
		// 过滤 .git、.env 以及 .log/.exe 等敏感或运行产物。
		if utils.ShouldIgnoreSourceEntry(name) {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// 跳过软链接，防止循环引用或泄露目录外的文件。
		if entry.Type()&os.ModeSymlink != 0 {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// 如果是常见依赖或构建目录（如 node_modules、dist），整目录跳过不遍历内部文件。
		if entry.IsDir() {
			if demoIgnoredDirs[name] {
				return filepath.SkipDir
			}
			return nil
		}

		return addSourceFile(path)
	})
	if err != nil {
		return nil, nil, err
	}

	// 多实现场景（implementation != "default"）时，如果场景根目录下有 README.md，也一并附带上传。
	if implementation != "default" {
		readmePath := filepath.Join(sceneDir, "README.md")
		if info, statErr := os.Lstat(readmePath); statErr == nil && info.Mode().IsRegular() {
			if err := addSourceFile(readmePath); err != nil {
				return nil, nil, err
			}
		}
	}

	if len(items) == 0 {
		return nil, nil, fmt.Errorf("%w: 排除后没有可上传的源码文件", ErrDemoResourceInvalid)
	}

	// 按相对路径字典序排序，确保前端展示与数据库存储顺序稳定。
	sort.Slice(items, func(i, j int) bool {
		return items[i].relPath < items[j].relPath
	})

	tasks := make([]demoUploadTask, 0, len(items))
	filePaths := make([]string, 0, len(items))
	for _, item := range items {
		tasks = append(tasks, demoUploadTask{
			localPath:   item.localPath,
			r2Key:       sourcesPrefix + item.relPath,
			contentType: "text/plain; charset=utf-8",
		})
		filePaths = append(filePaths, item.relPath)
	}
	return tasks, filePaths, nil
}

// ensureR2PrefixesEmpty 在上传前检查目标 R2 目录前缀下是否已有文件，防止新发布意外覆盖已有版本。
func (s *DemoResourceService) ensureR2PrefixesEmpty(ctx context.Context, prefixes ...string) error {
	for _, prefix := range prefixes {
		existing, err := s.r2Svc.ListFiles(ctx, prefix)
		if err != nil {
			return fmt.Errorf("检查 R2 目标目录 %s 失败: %w", prefix, err)
		}
		if len(existing) > 0 {
			return fmt.Errorf("%w: R2 目录 %s 已存在文件", ErrDemoResourceConflict, prefix)
		}
	}
	return nil
}

// uploadDemoTasks 使用固定数量的 worker 协程并发上传文件到 R2，控制同时打开的文件句柄和网络并发数。
// 任意一个文件上传失败时立即取消上下文并停止后续任务，返回已成功上传的 key 列表以便调用方回滚清理。
func (s *DemoResourceService) uploadDemoTasks(ctx context.Context, tasks []demoUploadTask) ([]string, error) {
	// context.WithCancel 派生的 uploadCtx 可在任一协程失败时调用 cancel()，通知其他正在上传的请求提前终止。
	uploadCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	// 无缓冲通道 taskCh 用于向 worker 协程逐个分发上传任务。
	taskCh := make(chan demoUploadTask)
	var (
		mu           sync.Mutex     // 保护多协程共享的 uploadedKeys 与 firstErr，避免数据竞争
		uploadedKeys []string       // 记录已成功上传到 R2 的对象键，用于失败回滚
		firstErr     error          // 只记录最先发生的错误
		wg           sync.WaitGroup // 等待所有 worker 协程执行结束
	)

	// 并发协程数不超过 demoUploadConcurrency（8），任务更少时按任务数创建即可。
	workers := demoUploadConcurrency
	if len(tasks) < workers {
		workers = len(tasks)
	}

	// 启动固定数量的 worker 协程，循环从 taskCh 中领取任务并上传。
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for task := range taskCh {
				// os.Open 以只读模式打开本地文件，得到 *os.File（实现了 io.Reader 接口）。
				f, err := os.Open(task.localPath)
				if err != nil {
					mu.Lock()
					if firstErr == nil {
						firstErr = fmt.Errorf("打开文件 %s 失败: %w", task.localPath, err)
						cancel()
					}
					mu.Unlock()
					return
				}

				// 流式上传文件内容后立即关闭文件句柄，避免长时间占用系统文件描述符。
				_, uploadErr := s.r2Svc.UploadFile(uploadCtx, task.r2Key, f, task.contentType)
				_ = f.Close()
				if uploadErr != nil {
					mu.Lock()
					if firstErr == nil {
						firstErr = uploadErr
						cancel()
					}
					mu.Unlock()
					return
				}

				mu.Lock()
				uploadedKeys = append(uploadedKeys, task.r2Key)
				mu.Unlock()
			}
		}()
	}

	// 主协程向 taskCh 投递任务；一旦 uploadCtx 被取消（有协程出错或外部取消请求），立即停止投递。
	for _, task := range tasks {
		select {
		case <-uploadCtx.Done():
			break
		case taskCh <- task:
		}
		if uploadCtx.Err() != nil {
			break
		}
	}
	// 关闭通道通知所有 worker 没有新任务了，然后 wg.Wait() 阻塞等待它们全部退出。
	close(taskCh)
	wg.Wait()

	if firstErr != nil {
		return uploadedKeys, firstErr
	}
	return uploadedKeys, nil
}

// cleanupUploadedKeys 在上传中途失败或写库失败时尽最大努力清理已上传的 R2 对象。
func (s *DemoResourceService) cleanupUploadedKeys(keys []string) {
	if s.r2Svc == nil || len(keys) == 0 {
		return
	}
	for _, key := range keys {
		_ = s.r2Svc.DeleteFile(context.Background(), key)
	}
}
