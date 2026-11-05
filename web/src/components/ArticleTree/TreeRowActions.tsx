import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type MouseEventHandler,
} from 'react';
import { createPortal } from 'react-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import styles from './TreeRowActions.module.scss';
import { useArticleTree } from '@/hooks/useArticleTree';

interface TreeRowActionsProps {
    /** 当前这一行对应的节点 id，创建和删除请求都用它作为目标 */
    nodeId: string;
    /** 当前节点的名称，删除确认框里会展示 */
    name: string;
    /** 是否是文件夹行，文件夹展示创建类菜单项，文章展示删除菜单项 */
    hasArrow: boolean;
    /** 光标是否悬停在所属行上，控制触发按钮显隐，托盘展开时不隐藏 */
    visible: boolean;
    /** 重命名的输入框和状态在行组件上，这里只负责触发 */
    onRename: () => void;
}

// 行操作托盘。悬停时每行右侧出现 ··· 按钮，点开后是纵向菜单，
// 创建和删除直接用 useArticleTree 里的请求方法，run 的时机由这里自己控制。
export default function TreeRowActions({
    nodeId,
    name,
    hasArrow,
    visible,
    onRename,
}: TreeRowActionsProps) {
    // 创建和删除的请求方法与状态直接来自统一的目录树 hook，失败提示等行为保持一致
    const { createArticleRequest, createFolderRequest, deleteArticleRequest, deleteFolderRequest } =
        useArticleTree();

    const [open, setOpen] = useState<boolean>(false);
    // 正在确认删除的目标，null 表示确认框关闭
    const [confirming, setConfirming] = useState<'article' | 'folder' | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    // 托盘用 portal 渲染到 body，这里记录它相对视口的固定定位
    const [panelPos, setPanelPos] = useState<CSSProperties>({});

    // useLayoutEffect 中回调在渲染前执行
    // 展开时按触发按钮的位置计算托盘坐标，右缘对齐按钮右缘，顶部贴着按钮下方
    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        const rect = rootRef.current?.getBoundingClientRect();

        if (rect) {
            setPanelPos({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.right,
                transform: 'translateX(-100%)',
            });
        }
    }, [open]);

    // 页面滚动或窗口变化时托盘会和按钮错位，直接收起最简单
    useEffect(() => {
        if (!open) {
            return;
        }

        const close = () => {
            setOpen(false);
        };

        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);

        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    // 托盘展开时监听一次全局按下事件，点在托盘外面就收起
    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;

            // 托盘通过 portal 渲染在 body 下，不在 rootRef 里，要单独放行
            if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [open]);

    /** 菜单项点击后统一收起托盘，再执行对应的业务动作 */
    const withClose =
        (action: () => void): MouseEventHandler =>
        (e) => {
            e.stopPropagation();
            setOpen(false);
            action();
        };

    // 各菜单项对应的业务动作，run 的时机全部收在托盘内部；
    // 删除只负责记录目标打开确认框，真正的删除在确认回调里
    const onCreateArticle = () => {
        createArticleRequest.run(nodeId);
    };

    const onCreateFolder = () => {
        createFolderRequest.run(nodeId);
    };

    const onDeleteArticle = () => {
        deleteArticleRequest.run(nodeId);
    };

    const onDeleteFolder = () => {
        deleteFolderRequest.run(nodeId);
    };

    return (
        <div ref={rootRef} className={styles.root} onClick={(e) => e.stopPropagation()}>
            <button
                className={`${styles.trigger} ${visible || open ? '' : styles.hiddenTrigger}`}
                title="更多操作"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
            >
                <SiteIcon name="more" size={16}></SiteIcon>
            </button>

            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        className={styles.panel}
                        style={panelPos}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 文件夹和文章都支持重命名 */}
                        <button className={styles.item} onClick={withClose(onRename)}>
                            <SiteIcon
                                name={hasArrow ? 'renameFolder' : 'renameFile'}
                                size={14}
                            ></SiteIcon>
                            重命名
                        </button>

                        {/* 只有文件夹才展示创建文件夹和创建文章 */}
                        {hasArrow && (
                            <>
                                <button
                                    className={styles.item}
                                    onClick={withClose(onCreateArticle)}
                                    disabled={createArticleRequest.loading}
                                >
                                    <SiteIcon name="createFile" size={14}></SiteIcon>
                                    创建文章
                                </button>
                                <button
                                    className={styles.item}
                                    onClick={withClose(onCreateFolder)}
                                    disabled={createFolderRequest.loading}
                                >
                                    <SiteIcon name="createFolder" size={14}></SiteIcon>
                                    创建文件夹
                                </button>
                            </>
                        )}

                        {/* 只有文章才展示删除，删除本身还要走二次确认 */}
                        {!hasArrow && (
                            <button
                                className={`${styles.item} ${styles.danger}`}
                                onClick={withClose(() => setConfirming('article'))}
                                disabled={deleteArticleRequest.loading}
                            >
                                <SiteIcon name="delete" size={14}></SiteIcon>
                                删除文章
                            </button>
                        )}

                        {/* 只有文件夹才展示删除文件夹，级联删除风险更大，确认文案里要提示 */}
                        {hasArrow && (
                            <button
                                className={`${styles.item} ${styles.danger}`}
                                onClick={withClose(() => setConfirming('folder'))}
                                disabled={deleteFolderRequest.loading}
                            >
                                <SiteIcon name="delete" size={14}></SiteIcon>
                                删除文件夹
                            </button>
                        )}
                    </div>,
                    // 托盘挂到 body 下，避开目录树各级容器的 overflow hidden 裁剪
                    document.body,
                )}

            <ConfirmDialog
                open={confirming !== null}
                title={confirming === 'folder' ? '删除文件夹' : '删除文章'}
                description={
                    confirming === 'folder'
                        ? `确定删除文件夹「${name}」吗？其中的全部子文件夹和文章都会一起删除，删除后无法恢复。`
                        : `确定删除「${name}」吗？删除后无法恢复。`
                }
                confirmText="删除"
                danger
                onClose={() => setConfirming(null)}
                onConfirm={() => {
                    // 按确认时记录的目标执行删除，避免关闭过程中状态变化引起误删
                    if (confirming === 'folder') {
                        onDeleteFolder();
                    } else if (confirming === 'article') {
                        onDeleteArticle();
                    }
                }}
            ></ConfirmDialog>
        </div>
    );
}
