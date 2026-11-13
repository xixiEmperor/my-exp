package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"unicode/utf8"

	cloudflare "github.com/cloudflare/cloudflare-go/v7"
	"github.com/cloudflare/cloudflare-go/v7/option"
	"github.com/cloudflare/cloudflare-go/v7/r2"
)

var (
	ErrInvalidImageKey    = errors.New("R2 路径不合法")
	ErrImageNotFound      = errors.New("R2 文件或文件夹不存在")
	ErrImageAlreadyExists = errors.New("R2 目标文件或文件夹已存在")
)

// ImageConfig 使用 Cloudflare API 令牌，不是 S3 的访问密钥。
type ImageConfig struct {
	AccountID  string
	APIToken   string
	BucketName string
}

// ImageService 管理固定存储桶中的文件和以路径前缀表示的文件夹。
type ImageService struct {
	objects    *r2.BucketObjectService
	accountID  string
	bucketName string
}

// NewImageService 校验配置；额外选项可用于注入 HTTP 客户端或设置请求超时。
func NewImageService(cfg ImageConfig, opts ...option.RequestOption) (*ImageService, error) {
	// 在创建客户端前检查必要配置，避免调用接口时才发现缺少账户或存储桶。
	if strings.TrimSpace(cfg.AccountID) == "" || strings.TrimSpace(cfg.APIToken) == "" ||
		strings.TrimSpace(cfg.BucketName) == "" {
		return nil, errors.New("缺少 R2 AccountID、APIToken 或 BucketName 配置")
	}

	// 禁用自动重试，避免流式上传重放以及删除操作被隐式重复执行。
	options := []option.RequestOption{
		option.WithAPIToken(cfg.APIToken),
		option.WithMaxRetries(0),
	}

	// 调用方选项放在默认选项之后，允许覆盖客户端和超时等设置。
	options = append(options, opts...)

	// 从完整客户端获取 R2 子服务，继承 SDK 默认 API 地址和请求配置。
	client := cloudflare.NewClient(options...)

	// 将账户和存储桶绑定到服务实例，后续操作只需要传入对象路径。
	return &ImageService{
		objects:    client.R2.Buckets.Objects,
		accountID:  cfg.AccountID,
		bucketName: cfg.BucketName,
	}, nil
}

// UploadFile 新建或覆盖文件，调用方负责关闭输入流；接口单次上传最多 300 MB。
func (s *ImageService) UploadFile(
	ctx context.Context,
	key string,
	body io.Reader,
	contentType string,
) (*r2.BucketObjectUploadResponse, error) {
	// 文件路径不能以 / 结尾，避免把上传文件当成文件夹占位对象。
	if err := validateImageKey(key, false); err != nil {
		return nil, err
	}
	// 空输入流无法上传，但包含零字节内容的有效输入流可以正常使用。
	if body == nil {
		return nil, errors.New("上传内容不能为空")
	}
	// 将内容和文件类型交给统一上传方法，使用原路径新建或覆盖对象。
	return s.upload(ctx, key, body, contentType)
}

// 先不看
// UpdateFile 先确认文件存在，再用新内容覆盖原文件。
func (s *ImageService) UpdateFile(
	ctx context.Context,
	key string,
	body io.Reader,
	contentType string,
) (*r2.BucketObjectUploadResponse, error) {
	// 先校验路径和输入流，非法参数不触发远程请求。
	if err := validateImageKey(key, false); err != nil {
		return nil, err
	}
	if body == nil {
		return nil, errors.New("上传内容不能为空")
	}
	// 读取原文件确认它存在，防止更新操作意外变成新建文件。
	response, err := s.GetFile(ctx, key)
	if err != nil {
		return nil, err
	}
	// 此处只检查存在性，不需要原文件内容，及时关闭响应体释放连接资源。
	response.Body.Close()
	// 存在性检查通过后，上传新内容覆盖同一路径。
	return s.upload(ctx, key, body, contentType)
}

// GetFile 返回内容和元信息，调用方读取完成后必须关闭 response.Body。
func (s *ImageService) GetFile(ctx context.Context, key string) (*http.Response, error) {
	// 公共读取入口只接受文件路径，文件夹占位对象由内部复制方法读取。
	if err := validateImageKey(key, false); err != nil {
		return nil, err
	}
	// 保留原始响应体和响应头，让调用方自行读取内容与元信息。
	return s.get(ctx, key)
}

// DeleteFile 删除单个文件，不接受文件夹路径。
func (s *ImageService) DeleteFile(ctx context.Context, key string) error {
	// 删除前校验完整文件路径，拒绝空路径和文件夹路径。
	if err := validateImageKey(key, false); err != nil {
		return err
	}
	// 单文件删除只提交这个对象的路径，不遍历目录中的其他对象。
	return s.delete(ctx, key)
}

// RenameFile 也可用于移动文件；目标已存在时返回错误，复制成功后才删除源文件。
// 检查和写入不是事务，并发修改同一路径时需要调用方协调。
func (s *ImageService) RenameFile(ctx context.Context, source, target string) error {
	// 源路径和目标路径都必须合法，避免复制成功后才发现无法删除源文件。
	if err := validateImageKey(source, false); err != nil {
		return err
	}
	if err := validateImageKey(target, false); err != nil {
		return err
	}
	// 拒绝原地重命名，否则复制后的删除会把同一个对象删除。
	if source == target {
		return ErrInvalidImageKey
	}
	// 列表查询按前缀匹配，因此还要按完整路径检查目标是否已经存在。
	objects, err := s.list(ctx, target)
	if err != nil {
		return err
	}
	for _, object := range objects {
		if object.Key == target {
			return fmt.Errorf("%w: %s", ErrImageAlreadyExists, target)
		}
	}
	// 先复制到目标路径，复制失败时保留源文件。
	if err := s.copy(ctx, source, target); err != nil {
		return err
	}
	// 目标上传成功后再删除源文件，完成重命名或跨目录移动。
	return s.delete(ctx, source)
}

// CreateFolder 用零字节占位对象保存空文件夹，重复创建不会清空已有内容。
func (s *ImageService) CreateFolder(ctx context.Context, folder string) error {
	// 统一目录末尾的 /，同时拒绝根目录和非法目录路径。
	prefix, err := imageFolderPrefix(folder, false)
	if err != nil {
		return err
	}
	// 上传零字节对象作为目录标记，让没有任何文件的目录也能被查询到。
	_, err = s.upload(ctx, prefix, strings.NewReader(""), "application/octet-stream")
	return err
}

// ImageFolderContent 返回直接子文件和子文件夹，文件夹路径统一以 / 结尾。
type ImageFolderContent struct {
	Files   []r2.BucketObjectListResponse `json:"files"`
	Folders []string                      `json:"folders"`
}

// GetFolder 查询直接子项，空字符串或 / 表示根目录；不存在的目录返回业务错误。
func (s *ImageService) GetFolder(ctx context.Context, folder string) (ImageFolderContent, error) {
	// 查询允许根目录，根目录对应空前缀，其他目录统一补齐 /。
	prefix, err := imageFolderPrefix(folder, true)
	if err != nil {
		return ImageFolderContent{}, err
	}
	// 取出目录下所有层级的对象，再按相对路径整理直接子项。
	objects, err := s.list(ctx, prefix)
	if err != nil {
		return ImageFolderContent{}, err
	}
	// 普通目录没有占位对象也没有子文件时视为不存在，空存储桶的根目录仍可查询。
	if prefix != "" && len(objects) == 0 {
		return ImageFolderContent{}, ErrImageNotFound
	}
	// 使用空数组保持响应格式稳定，用 map 合并多个文件指向的同一个子目录。
	result := ImageFolderContent{Files: make([]r2.BucketObjectListResponse, 0), Folders: make([]string, 0)}
	folders := make(map[string]bool)
	for _, object := range objects {
		// 文件夹本身的占位对象不属于它的子项。
		relative := strings.TrimPrefix(object.Key, prefix)
		if relative == "" {
			continue
		}
		// 相对路径中的第一个 / 划出直接子目录，更深层文件归到这个子目录下。
		if index := strings.IndexByte(relative, '/'); index >= 0 {
			folders[prefix+relative[:index+1]] = true
		} else {
			// 没有剩余目录分隔符的对象就是当前目录的直接子文件。
			result.Files = append(result.Files, object)
		}
	}
	// 将去重后的子目录转成数组并排序，避免 map 遍历造成返回顺序变化。
	for folder := range folders {
		result.Folders = append(result.Folders, folder)
	}
	sort.Strings(result.Folders)
	return result, nil
}

// ListFiles 查询目录下全部层级的文件，自动遍历分页并排除文件夹占位对象。
func (s *ImageService) ListFiles(ctx context.Context, folder string) ([]r2.BucketObjectListResponse, error) {
	// 使用目录前缀限定查询范围，根目录会匹配整个存储桶。
	prefix, err := imageFolderPrefix(folder, true)
	if err != nil {
		return nil, err
	}
	objects, err := s.list(ctx, prefix)
	if err != nil {
		return nil, err
	}
	// 保留所有层级的文件，只过滤以 / 结尾的目录占位对象。
	files := make([]r2.BucketObjectListResponse, 0, len(objects))
	for _, object := range objects {
		if !strings.HasSuffix(object.Key, "/") {
			files = append(files, object)
		}
	}
	return files, nil
}

// DeleteFolder 先完整列出对象再逐个删除，禁止删除根目录。
// R2 不支持文件夹事务，失败时错误包含具体路径，已完成的删除不会回滚。
func (s *ImageService) DeleteFolder(ctx context.Context, folder string) error {
	// 删除操作禁止根目录，目录末尾的 / 也能避免匹配名称相近的其他目录。
	prefix, err := imageFolderPrefix(folder, false)
	if err != nil {
		return err
	}
	// 先完成全部分页查询，查询失败时不开始删除，也避免边删边查影响分页。
	objects, err := s.list(ctx, prefix)
	if err != nil {
		return err
	}
	// 没有占位对象和子对象时，报告目录不存在。
	if len(objects) == 0 {
		return ErrImageNotFound
	}
	// 逐个删除文件和目录占位对象，遇到错误立即停止并返回具体对象的错误。
	for _, object := range objects {
		if err := s.delete(ctx, object.Key); err != nil {
			return err
		}
	}
	return nil
}

// RenameFolder 保留所有相对路径，支持移动整个目录；禁止源目标互相包含。
// 全部复制成功后才开始删除，复制失败会保留源目录和已复制的目标对象。
func (s *ImageService) RenameFolder(ctx context.Context, source, target string) error {
	// 统一源目录与目标目录的前缀格式，并禁止操作根目录。
	from, err := imageFolderPrefix(source, false)
	if err != nil {
		return err
	}
	to, err := imageFolderPrefix(target, false)
	if err != nil {
		return err
	}
	// 拒绝相同目录和互相包含的目录，避免复制与删除范围发生重叠。
	if strings.HasPrefix(to, from) || strings.HasPrefix(from, to) {
		return ErrInvalidImageKey
	}
	// 先完整获取源目录对象，后续复制和删除都使用同一份路径列表。
	objects, err := s.list(ctx, from)
	if err != nil {
		return err
	}
	if len(objects) == 0 {
		return ErrImageNotFound
	}
	// 目标前缀下只要已有对象就拒绝移动，避免合并目录或覆盖目标文件。
	existing, err := s.list(ctx, to)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return ErrImageAlreadyExists
	}
	// 替换目录前缀并保留相对路径，先复制全部文件和空目录占位对象。
	for _, object := range objects {
		if err := s.copy(ctx, object.Key, to+strings.TrimPrefix(object.Key, from)); err != nil {
			return err
		}
	}
	// 所有复制都成功后才开始删除源对象，复制中途失败不会删除源目录。
	for _, object := range objects {
		if err := s.delete(ctx, object.Key); err != nil {
			return err
		}
	}
	return nil
}

// list 不使用 delimiter，避免分页中丢失子文件夹分组信息。
func (s *ImageService) list(ctx context.Context, prefix string) ([]r2.BucketObjectListResponse, error) {
	// SDK 根据响应中的游标请求下一页，沿用调用方传入的上下文。
	pager := s.objects.ListAutoPaging(
		ctx,
		s.bucketName,
		r2.BucketObjectListParams{
			AccountID: cloudflare.F(s.accountID),
			Prefix:    cloudflare.F(prefix),
		},
	)
	objects := make([]r2.BucketObjectListResponse, 0)
	for pager.Next() {
		object := pager.Current()
		// 再次确认返回对象属于指定前缀，防止后续递归操作处理目录外的对象。
		if !strings.HasPrefix(object.Key, prefix) {
			return nil, fmt.Errorf("R2 返回了目录外的对象: %s", object.Key)
		}
		objects = append(objects, object)
	}
	// 遍历结束也可能是分页请求失败，必须检查错误，不能返回不完整的列表。
	if err := pager.Err(); err != nil {
		return nil, fmt.Errorf("列出 R2 路径 %s: %w", prefix, err)
	}
	return objects, nil
}

// upload 对路径做转义，防止文件名中的问号或井号改变请求地址。
func (s *ImageService) upload(
	ctx context.Context,
	key string,
	body io.Reader,
	contentType string,
	opts ...option.RequestOption,
) (*r2.BucketObjectUploadResponse, error) {
	// 显式提供文件类型时覆盖 SDK 默认的 application/octet-stream。
	if contentType != "" {
		opts = append(opts, option.WithHeader("Content-Type", contentType))
	}
	// 转义完整对象路径，并把账户、存储桶、内容流和额外请求头交给 SDK。
	result, err := s.objects.Upload(
		ctx,
		s.bucketName,
		url.PathEscape(key),
		body,
		r2.BucketObjectUploadParams{
			AccountID: cloudflare.F(s.accountID),
		},
		opts...,
	)
	if err != nil {
		return nil, imageOperationError("上传", key, err)
	}
	return result, nil
}

// get 供复制占位对象时复用，因此允许内部传入以 / 结尾的路径。
func (s *ImageService) get(ctx context.Context, key string) (*http.Response, error) {
	// 路径转义后查询指定对象，响应体留给公共读取入口或内部复制方法处理。
	response, err := s.objects.Get(
		ctx,
		s.bucketName,
		url.PathEscape(key),
		r2.BucketObjectGetParams{
			AccountID: cloudflare.F(s.accountID),
		},
	)
	if err != nil {
		// 统一补充操作与路径信息，并将远程 404 映射为文件不存在。
		return nil, imageOperationError("读取", key, err)
	}
	return response, nil
}

// delete 将底层错误保留下来，调用方仍可使用 errors.As 检查 Cloudflare 错误。
func (s *ImageService) delete(ctx context.Context, key string) error {
	// 对指定对象发起删除，目录占位对象也按普通对象处理。
	_, err := s.objects.Delete(
		ctx,
		s.bucketName,
		url.PathEscape(key),
		r2.BucketObjectDeleteParams{AccountID: cloudflare.F(s.accountID)},
	)
	if err != nil {
		// 保留失败对象的路径，方便递归删除中断后定位未完成的操作。
		return imageOperationError("删除", key, err)
	}
	return nil
}

// copy 转发内容和 HTTP 元信息；这个接口不提供服务端复制或自定义元信息写入。
func (s *ImageService) copy(ctx context.Context, source, target string) error {
	// 先读取源对象，读取失败时不创建目标对象。
	response, err := s.get(ctx, source)
	if err != nil {
		return err
	}
	// 无论上传成功还是失败，都在退出时关闭源对象的响应体。
	defer response.Body.Close()
	// 将常见 HTTP 元信息加入目标上传请求，尽量保持文件的下载和缓存行为。
	opts := make([]option.RequestOption, 0)
	for _, header := range []string{"Cache-Control", "Content-Disposition", "Content-Encoding", "Content-Language", "Expires"} {
		if value := response.Header.Get(header); value != "" {
			opts = append(opts, option.WithHeader(header, value))
		}
	}
	// 将源内容流上传到目标路径，源文件的删除由重命名方法单独决定。
	_, err = s.upload(ctx, target, response.Body, response.Header.Get("Content-Type"), opts...)
	return err
}

// imageOperationError 将 404 同时映射为业务错误并保留原始错误。
func imageOperationError(operation, key string, err error) error {
	// 从可能已经包装过的错误中提取 Cloudflare 错误，按 HTTP 状态码识别 404。
	var apiError *cloudflare.Error
	if errors.As(err, &apiError) && apiError.StatusCode == http.StatusNotFound {
		// 同时包装业务错误和原始错误，兼容 errors.Is 与 errors.As 两种检查方式。
		return fmt.Errorf("%s R2 路径 %s: %w: %w", operation, key, ErrImageNotFound, err)
	}
	// 其他错误只补充操作和路径，保留底层错误用于判断权限或网络问题。
	return fmt.Errorf("%s R2 路径 %s: %w", operation, key, err)
}

// validateImageKey 不清理路径，避免把非法输入静默转换成另一个对象的路径。
func validateImageKey(key string, folder bool) error {
	// 检查 UTF-8、字节长度与禁止字符，路径必须从存储桶内部的相对位置开始。
	// 真实 R2 API 对问号、井号和百分号的上传、读取路径处理不一致，拒绝它们以避免生成无法读取的对象。
	if !utf8.ValidString(key) || len(key) == 0 || len(key) > 1024 || strings.HasPrefix(key, "/") ||
		strings.ContainsAny(key, "\\?#%\x00\r\n") {
		return ErrInvalidImageKey
	}
	// 末尾的 / 专门表示目录，普通文件路径不能使用这个形式。
	if !folder && strings.HasSuffix(key, "/") {
		return ErrInvalidImageKey
	}
	// 去掉目录末尾的分隔符后逐段校验，拒绝空目录段以及 . 和 ..。
	for _, part := range strings.Split(strings.TrimSuffix(key, "/"), "/") {
		if strings.TrimSpace(part) == "" || part == "." || part == ".." {
			return ErrInvalidImageKey
		}
	}
	return nil
}

// imageFolderPrefix 统一补充目录分隔符，保证 photos 不会匹配 photos-old。
func imageFolderPrefix(folder string, allowRoot bool) (string, error) {
	// 只有允许查询根目录的操作，才把空字符串或 / 转成空前缀。
	if allowRoot && (folder == "" || folder == "/") {
		return "", nil
	}
	// 给普通目录补齐末尾分隔符，让前缀匹配严格限制在该目录内部。
	prefix := folder
	if !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}
	// 按目录规则校验最终前缀，禁止补齐后的非法路径进入远程操作。
	if err := validateImageKey(prefix, true); err != nil {
		return "", err
	}
	return prefix, nil
}
