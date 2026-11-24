import {
    getService,
    IEditorService,
    initialize,
    IViewsService,
} from '@codingame/monaco-vscode-api';
import { URI } from '@codingame/monaco-vscode-api/vscode/vs/base/common/uri';
import { EditorsOrder } from '@codingame/monaco-vscode-api/vscode/vs/workbench/common/editor';
import EditorWorker from '@codingame/monaco-vscode-api/workers/editor.worker?worker';
import getConfigurationServiceOverride, {
    initUserConfiguration,
    reinitializeWorkspace,
} from '@codingame/monaco-vscode-configuration-service-override';
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override';
import getFilesServiceOverride, {
    registerCustomProvider,
    RegisteredFileSystemProvider,
    RegisteredReadOnlyFile,
} from '@codingame/monaco-vscode-files-service-override';
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override';
import getTextMateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import TextMateWorker from '@codingame/monaco-vscode-textmate-service-override/worker?worker';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getViewsServiceOverride, {
    renderEditorPart,
    renderSidebarPart,
} from '@codingame/monaco-vscode-views-service-override';

// TODO：这里后续可以改成基于当前demo所用到的代码类型动态导入，减小包体积
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import '@codingame/monaco-vscode-json-default-extension';
import '@codingame/monaco-vscode-typescript-basics-default-extension';
import '@codingame/monaco-vscode-markdown-basics-default-extension';
import '@codingame/monaco-vscode-css-default-extension';
import '@codingame/monaco-vscode-scss-default-extension';
import '@codingame/monaco-vscode-html-default-extension';
import '@codingame/monaco-vscode-go-default-extension';
import '@codingame/monaco-vscode-yaml-default-extension';
import '@codingame/monaco-vscode-shellscript-default-extension';
import '@codingame/monaco-vscode-sql-default-extension';
import type { DemoResource } from '@/types/demos';
import { getDemoSourceUrl, pickDefaultEntryFile } from '@/utils/demos';
import { ensureWorkbenchIconTheme, ZHIYE_ICON_THEME_ID } from './workbenchIconTheme';

export type WorkbenchPhase = 'booting' | 'loading' | 'ready' | 'error';

export interface WorkbenchSnapshot {
    phase: WorkbenchPhase;
    statusText: string;
    activeFile: string | null;
    errorMessage: string | null;
}

export interface MountWorkbenchOptions {
    demo: Pick<DemoResource, 'id' | 'slug' | 'verison' | 'file_paths'>;
    sidebarContainer: HTMLElement;
    editorContainer: HTMLElement;
    onSnapshot: (snapshot: WorkbenchSnapshot) => void;
}

// 单次挂载内存缓存上限 8MB，避免大体量源码占用过多页面内存。
const MAX_SOURCE_CACHE_BYTES = 8 * 1024 * 1024;

const bootWorkspaceUri = URI.from({
    scheme: 'demo',
    authority: 'playground',
    path: '/bootstrap',
});

const fileSystemProvider = new RegisteredFileSystemProvider(true);

try {
    fileSystemProvider.mkdirSync(bootWorkspaceUri);
} catch {
    // 热更新重复执行时目录已存在，安全忽略。
}

registerCustomProvider('demo', fileSystemProvider);

// Worker 由主站 Vite 构建托管，源码正文仍按需直接向 CDN 拉取。
window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
        return label === 'TextMateWorker' ? new TextMateWorker() : new EditorWorker();
    },
};

// 全局只初始化一次 VS Code 核心服务，路由切换与 StrictMode 共享同一实例。
let workbenchInitPromise: Promise<void> | undefined;

// 挂载与释放串行排队，防止切换版本或离开详情时旧清理误关新打开的模型。
let workbenchQueue: Promise<void> = Promise.resolve();

// 只读文件节点：目录树只需元信息，HEAD 按需测算字节大小，正文在点击打开标签时才拉取。
class RemoteSourceFile extends RegisteredReadOnlyFile {
    private readonly measureSize: () => Promise<number>;

    constructor(uri: URI, read: () => Promise<Uint8Array>, measureSize: () => Promise<number>) {
        super(uri, read, 0);
        this.measureSize = measureSize;
    }

    override async getSize(): Promise<number> {
        return this.measureSize();
    }
}

async function bootWorkbenchServices(): Promise<void> {
    // 先注册自定义文件类型与目录图标主题扩展，再写入用户配置启用。
    ensureWorkbenchIconTheme();

    await initUserConfiguration(
        JSON.stringify({
            'workbench.colorTheme': 'Dark Modern',
            'workbench.iconTheme': ZHIYE_ICON_THEME_ID,
            'workbench.startupEditor': 'none',
            'workbench.editor.enablePreview': false,
            'workbench.editor.restoreViewState': true,
            'breadcrumbs.enabled': true,
            'editor.minimap.enabled': false,
            'editor.fontSize': 13.5,
            'editor.lineHeight': 22,
            'editor.fontFamily':
                "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
            'editor.fontLigatures': true,
            'editor.wordWrap': 'on',
            'editor.scrollBeyondLastLine': false,
            'editor.smoothScrolling': true,
            'editor.padding.top': 14,
            'editor.padding.bottom': 16,
            'editor.renderLineHighlight': 'gutter',
            'explorer.compactFolders': false,
            'workbench.list.smoothScrolling': true,
            'files.exclude': { '**/.git': true },
            'security.workspace.trust.enabled': false,
            'workbench.colorCustomizations': {
                'sideBar.background': '#111319',
                'sideBar.foreground': '#c9d2e3',
                'sideBar.border': '#222735',
                'sideBarSectionHeader.background': '#111319',
                'sideBarSectionHeader.foreground': '#8a96ad',
                'sideBarSectionHeader.border': '#1d2230',
                'list.activeSelectionBackground': '#1e2638',
                'list.activeSelectionForeground': '#f4f7ff',
                'list.inactiveSelectionBackground': '#191f2e',
                'list.hoverBackground': '#171c28',
                'editor.background': '#141720',
                'editorGutter.background': '#141720',
                'editorLineNumber.foreground': '#4b556b',
                'editorLineNumber.activeForeground': '#b8c4dc',
                'editorGroupHeader.tabsBackground': '#0e1016',
                'editorGroupHeader.tabsBorder': '#222735',
                'tab.activeBackground': '#141720',
                'tab.activeForeground': '#f4f7ff',
                'tab.activeBorderTop': '#6ea8fe',
                'tab.inactiveBackground': '#0e1016',
                'tab.inactiveForeground': '#7d89a1',
                'tab.border': '#1b202c',
                'breadcrumb.background': '#141720',
                'breadcrumb.foreground': '#7d89a1',
                'scrollbarSlider.background': '#2d354866',
                'scrollbarSlider.hoverBackground': '#3e496399',
            },
        }),
    );

    await initialize(
        {
            ...getViewsServiceOverride(),
            ...getFilesServiceOverride(),
            ...getConfigurationServiceOverride(),
            ...getExplorerServiceOverride(),
            ...getLanguagesServiceOverride(),
            ...getTextMateServiceOverride(),
            ...getThemeServiceOverride(),
        },
        undefined,
        {
            workspaceProvider: {
                workspace: { folderUri: bootWorkspaceUri },
                trusted: true,
                async open() {
                    return false;
                },
            },
        },
    );
}

function ensureWorkbenchInitialized(): Promise<void> {
    if (!workbenchInitPromise) {
        workbenchInitPromise = bootWorkbenchServices().catch((error: unknown) => {
            workbenchInitPromise = undefined;

            throw new Error('VS Code 工作台初始化失败', { cause: error });
        });
    }

    return workbenchInitPromise;
}

// 挂载指定 demo 版本的只读文件树与多标签编辑器，返回异步释放句柄。
export function mountDemoWorkbench({
    demo,
    sidebarContainer,
    editorContainer,
    onSnapshot,
}: MountWorkbenchOptions): () => void {
    let disposed = false;
    let releaseParts: (() => void) | undefined;
    let editorService: IEditorService | undefined;
    const registrations: { dispose(): void }[] = [];
    const byteCache = new Map<string, Uint8Array>();
    const pendingLoads = new Map<string, Promise<Uint8Array>>();
    const sizeCache = new Map<string, number>();
    const controller = new AbortController();

    // URI 按 (id, verison) 隔离 authority，根目录仅保留场景 slug 以便资源管理器清晰展示。
    const rootUri = URI.from({
        scheme: 'demo',
        authority: `${demo.id}-${demo.verison}`,
        path: `/${demo.slug}`,
    });

    function emitSnapshot(snapshot: WorkbenchSnapshot): void {
        if (!disposed) {
            onSnapshot(snapshot);
        }
    }

    function isActivePath(relativePath: string): boolean {
        const currentResource = editorService?.activeEditor?.resource;

        if (!currentResource) {
            return true;
        }

        return currentResource.toString() === URI.joinPath(rootUri, relativePath).toString();
    }

    // 按需请求 CDN 源码字节，合并并发同文件请求并限制内存缓存体积。
    async function loadSourceBytes(relativePath: string): Promise<Uint8Array> {
        const hit = byteCache.get(relativePath);

        if (hit) {
            return hit;
        }

        const inflight = pendingLoads.get(relativePath);

        if (inflight) {
            return inflight;
        }

        async function runFetch(): Promise<Uint8Array> {
            try {
                if (isActivePath(relativePath)) {
                    emitSnapshot({
                        phase: 'loading',
                        statusText: `正在从 CDN 拉取 ${relativePath}…`,
                        activeFile: relativePath,
                        errorMessage: null,
                    });
                }

                const sourceUrl = getDemoSourceUrl(demo, relativePath);
                const response = await fetch(sourceUrl, { signal: controller.signal });

                if (!response.ok) {
                    throw new Error(`读取 ${relativePath} 失败（HTTP ${response.status}）`);
                }

                const bytes = new Uint8Array(await response.arrayBuffer());

                if (disposed) {
                    throw new DOMException('工作台已卸载', 'AbortError');
                }

                if (bytes.byteLength <= MAX_SOURCE_CACHE_BYTES) {
                    let cachedTotal = 0;

                    for (const value of byteCache.values()) {
                        cachedTotal += value.byteLength;
                    }

                    if (cachedTotal + bytes.byteLength > MAX_SOURCE_CACHE_BYTES) {
                        byteCache.clear();
                    }

                    byteCache.set(relativePath, bytes);
                }

                sizeCache.set(relativePath, bytes.byteLength);

                if (isActivePath(relativePath)) {
                    emitSnapshot({
                        phase: 'ready',
                        statusText: '源码只读挂载完成',
                        activeFile: relativePath,
                        errorMessage: null,
                    });
                }

                return bytes;
            } catch (error) {
                if (!disposed && isActivePath(relativePath)) {
                    let message = '源码读取失败';

                    if (error instanceof TypeError) {
                        message = 'CDN 源码请求失败，请检查网络连接或跨域配置';
                    } else if (error instanceof Error) {
                        message = error.message;
                    }

                    emitSnapshot({
                        phase: 'error',
                        statusText: message,
                        activeFile: relativePath,
                        errorMessage: message,
                    });
                }

                throw error;
            } finally {
                pendingLoads.delete(relativePath);
            }
        }

        const promise = runFetch();
        pendingLoads.set(relativePath, promise);

        return promise;
    }

    // stat 阶段优先用 HEAD 获取文件字节数；若 CDN 不支持 HEAD 或返回异常状态，则回退 GET 正文测算。
    async function measureSourceBytes(relativePath: string): Promise<number> {
        const knownSize = sizeCache.get(relativePath);

        if (knownSize !== undefined) {
            return knownSize;
        }

        const sourceUrl = getDemoSourceUrl(demo, relativePath);

        try {
            const response = await fetch(sourceUrl, {
                method: 'HEAD',
                signal: controller.signal,
            });

            if (response.ok) {
                const lengthHeader = response.headers.get('Content-Length');
                const parsedLength = lengthHeader !== null ? Number(lengthHeader) : Number.NaN;

                if (Number.isFinite(parsedLength) && parsedLength >= 0) {
                    sizeCache.set(relativePath, parsedLength);

                    return parsedLength;
                }
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
            }
        }

        const bytes = await loadSourceBytes(relativePath);

        return bytes.byteLength;
    }

    // 卸载或切换版本时关闭当前 URI 根下全部已打开标签并释放模型引用与 DOM 部件。
    async function releaseCurrentMount(): Promise<void> {
        try {
            if (editorService) {
                const opened = editorService
                    .getEditors(EditorsOrder.SEQUENTIAL)
                    .filter(
                        ({ editor }) =>
                            editor.resource?.scheme === rootUri.scheme &&
                            editor.resource.authority === rootUri.authority &&
                            editor.resource.path.startsWith(`${rootUri.path}/`),
                    );

                if (opened.length > 0) {
                    await editorService.closeEditors(opened);
                }
            }
        } catch (error) {
            console.error('关闭工作台标签失败', error);
        } finally {
            for (const item of registrations) {
                item.dispose();
            }

            registrations.length = 0;
            releaseParts?.();
            releaseParts = undefined;
            byteCache.clear();
            sizeCache.clear();
        }
    }

    async function performMount(): Promise<void> {
        try {
            emitSnapshot({
                phase: 'booting',
                statusText: '正在初始化源码工作台…',
                activeFile: null,
                errorMessage: null,
            });

            await ensureWorkbenchInitialized();

            if (disposed) {
                return;
            }

            // 空文件列表兜底创建根目录，有文件时 registerFile 会自动补齐各级父目录。
            try {
                fileSystemProvider.mkdirSync(rootUri);
            } catch {
                // 同一版本再次进入时根目录可能已创建，安全跳过。
            }

            for (const rawPath of demo.file_paths) {
                const normalizedPath = rawPath.replace(/^\/+/, '');

                if (normalizedPath) {
                    const targetUri = URI.joinPath(rootUri, normalizedPath);

                    registrations.push(
                        fileSystemProvider.registerFile(
                            new RemoteSourceFile(
                                targetUri,
                                () => loadSourceBytes(normalizedPath),
                                () => measureSourceBytes(normalizedPath),
                            ),
                        ),
                    );
                }
            }

            // 切换工作空间目录根，使资源管理器立刻展示当前 demo 与所选版本的文件树。
            await reinitializeWorkspace({
                id: `${demo.id}-${demo.verison}`,
                uri: rootUri,
            });

            if (disposed) {
                await releaseCurrentMount();

                return;
            }

            const sidebarDisposable = renderSidebarPart(sidebarContainer);
            const editorDisposable = renderEditorPart(editorContainer);

            releaseParts = () => {
                sidebarDisposable.dispose();
                editorDisposable.dispose();
            };

            const viewsService = await getService(IViewsService);
            await viewsService.openView('workbench.explorer.fileView', true);

            if (disposed) {
                await releaseCurrentMount();

                return;
            }

            const editors = await getService(IEditorService);
            editorService = editors;

            // 用户在标签栏或资源管理器切换文件时，同步更新外层面包屑与状态栏提示。
            registrations.push(
                editors.onDidActiveEditorChange(() => {
                    const activeUri = editors.activeEditor?.resource;

                    if (
                        !activeUri ||
                        activeUri.scheme !== rootUri.scheme ||
                        !activeUri.path.startsWith(`${rootUri.path}/`)
                    ) {
                        return;
                    }

                    const relativePath = activeUri.path.slice(rootUri.path.length + 1);

                    if (byteCache.has(relativePath)) {
                        emitSnapshot({
                            phase: 'ready',
                            statusText: '源码只读挂载完成',
                            activeFile: relativePath,
                            errorMessage: null,
                        });
                    }
                }),
            );

            const entryFile = pickDefaultEntryFile(demo.file_paths);

            if (!entryFile) {
                emitSnapshot({
                    phase: 'ready',
                    statusText: '当前版本暂无可展示的源码文件',
                    activeFile: null,
                    errorMessage: null,
                });

                return;
            }

            // 先确认入口源码可正常拉取，再交给编辑器打开固定标签页。
            await loadSourceBytes(entryFile);

            if (disposed) {
                await releaseCurrentMount();

                return;
            }

            const entryUri = URI.joinPath(rootUri, entryFile);
            const pane = await editors.openEditor({
                resource: entryUri,
                options: { pinned: true },
            });

            if (!pane?.input) {
                throw new Error('无法打开默认源码文件标签');
            }

            if (disposed) {
                await releaseCurrentMount();

                return;
            }

            emitSnapshot({
                phase: 'ready',
                statusText: '源码只读挂载完成',
                activeFile: entryFile,
                errorMessage: null,
            });
        } catch (error) {
            if (disposed) {
                return;
            }

            await releaseCurrentMount();

            let message = '工作台加载失败';

            if (error instanceof TypeError) {
                message = 'CDN 源码请求失败，请检查网络连接或跨域配置';
            } else if (error instanceof Error) {
                message = error.message;
            }

            emitSnapshot({
                phase: 'error',
                statusText: message,
                activeFile: null,
                errorMessage: message,
            });
        }
    }

    const previousOperation = workbenchQueue;

    async function runQueuedMount(): Promise<void> {
        await previousOperation;

        if (!disposed) {
            await performMount();
        }
    }

    const currentMountPromise = runQueuedMount();
    workbenchQueue = currentMountPromise;

    return () => {
        disposed = true;
        controller.abort();

        async function runQueuedDetach(): Promise<void> {
            try {
                await currentMountPromise;
            } finally {
                await releaseCurrentMount();
            }
        }

        workbenchQueue = runQueuedDetach();
    };
}
