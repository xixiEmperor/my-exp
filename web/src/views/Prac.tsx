import { useEffect, useRef, useState } from 'react';
import styles from './Prac.module.scss';
import {
    initialize,
    getService,
    IEditorService,
    IViewsService,
} from '@codingame/monaco-vscode-api';
import { URI } from '@codingame/monaco-vscode-api/vscode/vs/base/common/uri';
import getViewsServiceOverride, {
    renderSidebarPart,
    renderEditorPart,
} from '@codingame/monaco-vscode-views-service-override';
import getFilesServiceOverride, {
    registerCustomProvider,
    RegisteredFileSystemProvider,
    RegisteredReadOnlyFile,
} from '@codingame/monaco-vscode-files-service-override';
import getConfigurationServiceOverride, {
    initUserConfiguration,
} from '@codingame/monaco-vscode-configuration-service-override';
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override';
import getTextMateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override';
import '@codingame/monaco-vscode-json-default-extension';
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import EditorWorker from '@codingame/monaco-vscode-api/workers/editor.worker?worker';
import TextMateWorker from '@codingame/monaco-vscode-textmate-service-override/worker?worker';
import '@codingame/monaco-vscode-typescript-basics-default-extension';
import '@codingame/monaco-vscode-markdown-basics-default-extension';
import { EditorsOrder } from '@codingame/monaco-vscode-api/vscode/vs/workbench/common/editor';
import { CDN_BASE_URL } from '@/constants/articles';

// 先固定资源登记信息，后续由后台接口返回同样的版本与文件路径。
const demoResource = {
    id: 'virtual-list-fixed-height',
    slug: 'virtual-list',
    implementation: 'fixed-height',
    verison: '1.1.0',
    file_paths: [
        'fixed-height/README.md',
        'fixed-height/web/.gitignore',
        'fixed-height/web/index.html',
        'fixed-height/web/package.json',
        'fixed-height/web/pnpm-lock.yaml',
        'fixed-height/web/src/App.css',
        'fixed-height/web/src/App.tsx',
        'fixed-height/web/src/main.tsx',
        'fixed-height/web/tsconfig.json',
        'fixed-height/web/vite.config.ts',
    ],
};
const resourceBase = `${CDN_BASE_URL}/demos/${demoResource.slug}/${demoResource.verison}`;
const previewUrl = `${resourceBase}/preview/index.html`;
const rootUri = URI.parse(`demo://${demoResource.id}/${demoResource.verison}`);
const fileUri = URI.joinPath(rootUri, 'fixed-height/web/src/App.tsx');
const provider = new RegisteredFileSystemProvider(true);
provider.mkdirSync(rootUri);
registerCustomProvider('demo', provider);

// Worker 由 Vite 打包到主站，源码仍直接从 CDN 请求。
window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
        return label === 'TextMateWorker' ? new TextMateWorker() : new EditorWorker();
    },
};

// 服务在整个页面只初始化一次，路由往返和 StrictMode 均复用它。
let initialization: Promise<void> | undefined;
// 挂载与关闭依次执行，避免 StrictMode 或路由往返时旧清理误关新标签。
let workbenchTask: Promise<void> = Promise.resolve();

// 文件树只需要元数据，HEAD 获取大小，正文仍等打开文件后才读取。
class SourceFile extends RegisteredReadOnlyFile {
    constructor(
        uri: URI,
        read: () => Promise<Uint8Array>,
        private readonly measure: () => Promise<number>,
    ) {
        super(uri, read, 0);
    }

    override async getSize() {
        try {
            return await this.measure();
        } catch (error) {
            throw new Error('无法读取源码文件信息', { cause: error });
        }
    }
}

async function startWorkbench() {
    try {
        await initUserConfiguration(
            JSON.stringify({
                'workbench.colorTheme': 'Default Dark Modern',
                'workbench.startupEditor': 'none',
                'workbench.editor.enablePreview': false,
                'editor.minimap.enabled': false,
                'editor.fontSize': 14,
                'editor.wordWrap': 'on',
                'editor.scrollBeyondLastLine': false,
                'explorer.compactFolders': false,
                'workbench.editor.restoreViewState': true,
                'files.exclude': { '**/.git': true },
                'security.workspace.trust.enabled': false,
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
                    workspace: { folderUri: rootUri },
                    trusted: true,
                    async open() {
                        return false;
                    },
                },
            },
        );
    } catch (error) {
        throw new Error('VS Code 工作台初始化失败', { cause: error });
    }
}

function initializeWorkbench() {
    if (!initialization) initialization = startWorkbench();

    return initialization;
}

export default function Prac() {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState('正在初始化工作台…');
    const [failed, setFailed] = useState(false);
    // 移动端只展示预览，不初始化源码工作台或读取源码。
    const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
    const [sourceHidden, setSourceHidden] = useState(false);
    const [previewHidden, setPreviewHidden] = useState(false);
    const [previewAttempt, setPreviewAttempt] = useState(0);
    const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        const media = window.matchMedia('(max-width: 700px)');

        function updateMode() {
            setIsMobile(media.matches);
        }

        media.addEventListener('change', updateMode);

        return () => media.removeEventListener('change', updateMode);
    }, []);

    useEffect(() => {
        if (isMobile) return;

        // StrictMode 重挂载时复用模块内的服务初始化。
        let disposed = false;
        let releaseParts: (() => void) | undefined;
        let editorService: IEditorService | undefined;
        const registrations: { dispose(): void }[] = [];
        const cache = new Map<string, Uint8Array>();
        const requests = new Map<string, Promise<Uint8Array>>();
        const sizes = new Map<string, number>();
        const controller = new AbortController();

        // 后台恢复其他标签的请求不能覆盖当前活动文件的提示。
        function isCurrentSource(path: string) {
            const resource = editorService?.activeEditor?.resource;

            return !resource || resource.toString() === URI.joinPath(rootUri, path).toString();
        }

        // 直接读取 CDN 原文，只在本次挂载的浏览器内存中保留字节。
        async function loadSource(path: string): Promise<Uint8Array> {
            const cached = cache.get(path);

            if (cached) return cached;

            const pending = requests.get(path);

            if (pending) return pending;

            async function request() {
                try {
                    if (!disposed && isCurrentSource(path)) setStatus(`正在读取 ${path}…`);

                    const url = `${resourceBase}/sources/${path.split('/').map(encodeURIComponent).join('/')}`;
                    const response = await fetch(url, { signal: controller.signal });

                    if (!response.ok) throw new Error(`读取 ${path} 失败：HTTP ${response.status}`);

                    const bytes = new Uint8Array(await response.arrayBuffer());

                    if (disposed) throw new DOMException('页面已离开', 'AbortError');

                    // 原始内容缓存有总量限制，编辑器模型仍由工作台管理。
                    if (bytes.byteLength <= 8 * 1024 * 1024) {
                        const total = Array.from(cache.values()).reduce(
                            (size, value) => size + value.byteLength,
                            0,
                        );

                        if (total + bytes.byteLength > 8 * 1024 * 1024) cache.clear();

                        cache.set(path, bytes);
                    }

                    sizes.set(path, bytes.byteLength);

                    if (isCurrentSource(path)) {
                        setFailed(false);
                        setStatus(`只读 · UTF-8 · ${path}`);
                    }

                    return bytes;
                } catch (error) {
                    if (!disposed && isCurrentSource(path)) {
                        setFailed(true);
                        setStatus(error instanceof Error ? error.message : '源码读取失败');
                    }

                    throw error;
                } finally {
                    requests.delete(path);
                }
            }

            const result = request();
            requests.set(path, result);

            return result;
        }

        async function measureSource(path: string) {
            try {
                const size = sizes.get(path);

                if (size !== undefined) return size;

                const response = await fetch(
                    `${resourceBase}/sources/${path.split('/').map(encodeURIComponent).join('/')}`,
                    { method: 'HEAD', signal: controller.signal },
                );

                if (!response.ok) throw new Error(`读取文件信息失败：HTTP ${response.status}`);

                const length = response.headers.get('Content-Length');

                if (length !== null && Number.isFinite(Number(length))) {
                    sizes.set(path, Number(length));

                    return Number(length);
                }

                return (await loadSource(path)).byteLength;
            } catch (error) {
                throw new Error(`无法读取 ${path}，请检查网络及 CDN 的 CORS 配置`, {
                    cause: error,
                });
            }
        }

        async function release() {
            try {
                // 关闭本页打开的标签，让工作台释放文件模型。
                // 关闭所有属于本版本的标签，包括从文件树另外打开的文件。
                if (editorService) {
                    const identifiers = editorService
                        .getEditors(EditorsOrder.SEQUENTIAL)
                        .filter(
                            ({ editor }) =>
                                editor.resource?.scheme === rootUri.scheme &&
                                editor.resource.authority === rootUri.authority &&
                                editor.resource.path.startsWith(`${rootUri.path}/`),
                        );

                    await editorService.closeEditors(identifiers);
                }
            } catch (error) {
                console.error('关闭源码标签失败', error);
            } finally {
                registrations.forEach((registration) => registration.dispose());
                registrations.length = 0;
                releaseParts?.();
                releaseParts = undefined;
                cache.clear();
                sizes.clear();
            }
        }

        async function mount() {
            try {
                await initializeWorkbench();

                if (disposed || !sidebarRef.current || !editorRef.current) return;

                const sidebar = renderSidebarPart(sidebarRef.current);
                const editor = renderEditorPart(editorRef.current);

                releaseParts = () => {
                    sidebar.dispose();
                    editor.dispose();
                };

                // 一次注册完整文件树，每个文件的正文请求在工作台读取时才发起。
                demoResource.file_paths.forEach((path) => {
                    registrations.push(
                        provider.registerFile(
                            new SourceFile(
                                URI.joinPath(rootUri, path),
                                async () => {
                                    try {
                                        return await loadSource(path);
                                    } catch (error) {
                                        throw new Error(`读取 ${path} 失败`, { cause: error });
                                    }
                                },
                                async () => {
                                    try {
                                        return await measureSource(path);
                                    } catch (error) {
                                        throw new Error(`读取 ${path} 信息失败`, { cause: error });
                                    }
                                },
                            ),
                        ),
                    );
                });

                const views = await getService(IViewsService);
                await views.openView('workbench.explorer.fileView', true);

                if (disposed) return;

                const editors = await getService(IEditorService);
                editorService = editors;

                // 切回已有标签不会重新读取文件，状态栏跟随工作台当前活动文件更新。
                registrations.push(
                    editors.onDidActiveEditorChange(() => {
                        const resource = editors.activeEditor?.resource;

                        if (resource?.authority !== rootUri.authority) return;

                        const path = resource.path.slice(rootUri.path.length + 1);

                        if (!disposed && cache.has(path)) {
                            setFailed(false);
                            setStatus(`只读 · UTF-8 · ${path}`);
                        }
                    }),
                );

                // 先确认默认文件读取成功，避免工作台错误页被误报为加载完成。
                await loadSource('fixed-height/web/src/App.tsx');

                if (disposed) return;

                const pane = await editors.openEditor({
                    resource: fileUri,
                    options: { pinned: true },
                });

                if (!pane?.input) throw new Error('无法打开源码编辑器');

                if (disposed) {
                    await release();

                    return;
                }

                setStatus('只读 · UTF-8 · fixed-height/web/src/App.tsx');
            } catch (error) {
                if (disposed) return;

                await release();
                setFailed(true);
                let message = error instanceof Error ? error.message : '工作台加载失败';

                if (error instanceof TypeError) {
                    message = 'CDN 请求失败，请检查网络及 CDN 的 CORS 配置';
                }

                setStatus(message);
            }
        }

        setFailed(false);
        setStatus('正在加载定高虚拟列表源码…');
        const previousTask = workbenchTask;

        async function attach() {
            try {
                await previousTask;

                if (!disposed) await mount();
            } catch (error) {
                if (!disposed) {
                    setFailed(true);
                    setStatus(error instanceof Error ? error.message : '工作台加载失败');
                }
            }
        }

        const mounting = attach();
        workbenchTask = mounting;

        return () => {
            // 离开页面取消请求，并释放当前挂载和文件引用。
            disposed = true;
            controller.abort();

            async function detach() {
                try {
                    await mounting;
                    await release();
                } catch (error) {
                    console.error('释放工作台失败', error);
                }
            }

            workbenchTask = detach();
        };
    }, [attempt, isMobile]);

    return (
        <main id="main" className={styles.page}>
            <header className={styles.toolbar}>
                <div>
                    <span className={styles.eyebrow}>SCENARIO PLAYGROUND</span>
                    <h1>
                        定高虚拟列表 <span className={styles.version}>v{demoResource.verison}</span>
                    </h1>
                    <p className={styles.description}>
                        10,000 条记录，40px 固定行高，只渲染可见区与缓冲行。
                    </p>
                </div>
                <div className={styles.actions}>
                    <button
                        type="button"
                        aria-pressed={sourceHidden}
                        onClick={() => {
                            setSourceHidden(!sourceHidden);
                            setPreviewHidden(false);
                        }}
                    >
                        {sourceHidden ? '展开源码' : '收起源码'}
                    </button>
                    <button
                        type="button"
                        aria-pressed={previewHidden}
                        onClick={() => {
                            setPreviewHidden(!previewHidden);
                            setSourceHidden(false);
                        }}
                    >
                        {previewHidden ? '展开预览' : '收起预览'}
                    </button>
                </div>
            </header>
            {/* 文件树和编辑器标签均由 VS Code 工作台渲染。 */}
            <div
                className={`${styles.panels} ${sourceHidden || previewHidden ? styles.singlePanel : ''}`}
            >
                <section
                    className={styles.sourcePanel}
                    aria-label="只读源码工作台"
                    hidden={sourceHidden || isMobile}
                >
                    <div className={styles.panelToolbar}>
                        <span>
                            源码 <small>{demoResource.file_paths.length} 个文件</small>
                        </span>
                        <span className={styles.readonly}>只读</span>
                    </div>
                    <div className={`${styles.workbench} monaco-workbench`}>
                        <div ref={sidebarRef} className={styles.sidebar} />
                        <div ref={editorRef} className={styles.editor} />
                    </div>
                    <footer className={styles.sourceStatus} role="status">
                        <span>{status}</span>
                        {failed && (
                            <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                                重试加载
                            </button>
                        )}
                    </footer>
                </section>
                <section
                    className={styles.previewPanel}
                    aria-label="定高虚拟列表效果预览"
                    hidden={previewHidden && !isMobile}
                >
                    <div className={styles.panelToolbar}>
                        <span>效果预览</span>
                        <div className={styles.actions}>
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewStatus('loading');
                                    setPreviewAttempt((value) => value + 1);
                                }}
                            >
                                刷新预览
                            </button>
                            <a href={previewUrl} target="_blank" rel="noreferrer">
                                单独打开 ↗
                            </a>
                        </div>
                    </div>
                    <div className={styles.previewContent}>
                        <iframe
                            key={previewAttempt}
                            src={previewUrl}
                            title="定高虚拟列表 1.1.0 效果预览"
                            sandbox="allow-scripts allow-same-origin"
                            referrerPolicy="no-referrer"
                            onLoad={() => setPreviewStatus('ready')}
                            onError={() => setPreviewStatus('error')}
                        />
                        {previewStatus !== 'ready' && (
                            <div className={styles.previewMessage} role="status">
                                {previewStatus === 'loading'
                                    ? '正在加载效果预览…'
                                    : '预览加载失败，请点击刷新预览重试。'}
                            </div>
                        )}
                    </div>
                    <div className={styles.previewHint}>
                        滚动列表，或点击顶部和底部按钮，观察渲染区间变化。
                    </div>
                </section>
            </div>
            <footer className={styles.status} role="status">
                <span>{demoResource.implementation} · 源码与预览使用同一版本</span>
                <span>static.swifthire.top</span>
            </footer>
        </main>
    );
}
