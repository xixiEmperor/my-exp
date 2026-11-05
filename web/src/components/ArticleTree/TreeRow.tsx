import {
    type FocusEventHandler,
    type KeyboardEvent,
    type ReactNode,
    useState,
} from 'react';
import SiteIcon from '../SiteIcon/SiteIcon';
import TreeRowActions from './TreeRowActions';
import styles from './ArticleTree.module.scss';
import { useArticleTree } from '@/hooks/useArticleTree';

/** 每往下一层增加的缩进距离 */
const INDENT_STEP = 16;
/** 最左侧的基础留白 */
const INDENT_BASE = 8;

interface TreeRowProps {
    /** 节点所在层级，从 0 开始 */
    level: number;
    /** 点击这一行时触发 */
    onClick?: () => void;
    /** 是否显示展开箭头，文件传 false，此时用透明占位保持文字对齐 */
    hasArrow?: boolean;
    /** 箭头是否处于展开状态，只在 hasArrow 为 true 时有意义 */
    open?: boolean;
    /** 行内的文字内容 */
    children: ReactNode;
    /** 当前文件列表是否是在后台渲染 */
    fromAdmin: boolean;
    /** 当前这一行对应的节点 id，文件夹行同时用作新建文章、新建文件夹的目标目录 */
    nodeId: string;
}

// 文件夹行和文件行共用的外壳，缩进计算和箭头占位只在这里维护一份
export default function TreeRow({
    level,
    onClick,
    fromAdmin,
    hasArrow = false,
    open = false,
    children,
    nodeId,
}: TreeRowProps) {
    const [mouseIn, setMouseIn] = useState<boolean>(false);
    const [renaming, setRenaming] = useState<boolean>(false);

    const { renameArticleRequest, renameFolderRequest } = useArticleTree();

    /** 显示中的节点名称，输入框的初始值和改名比较都用它 */
    const currentName = children?.toString() ?? '';

    const onEnter = () => {
        setMouseIn(true);
    };

    const onLeave = () => {
        setMouseIn(false);
    };

    /** 重命名的输入框和提交逻辑都在行上，托盘只需要一个开关 */
    const onRenameStart = () => {
        setRenaming(true);
    };

    /** 输入框失焦时提交重命名，空名称或没有改动就放弃本次操作 */
    const onRenameBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        // 去掉首尾空白，和后端的名称校验保持一致
        const nextName = e.currentTarget.value.trim();

        setRenaming(false);

        if (!nextName || nextName === currentName) {
            return;
        }

        // 有展开箭头的就是文件夹，其余按文章处理，成功后的状态由 hook 更新
        if (hasArrow) {
            void renameFolderRequest.run(nodeId, nextName);
        } else {
            void renameArticleRequest.run(nodeId, nextName);
        }
    };

    /** 回车提交，Esc 取消并恢复原来的名称 */
    const onRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            // 回车直接失焦，提交逻辑统一放在失焦回调里
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            // 先还原输入框内容再失焦，失焦逻辑看到没有改动就不会发请求
            e.currentTarget.value = currentName;
            e.currentTarget.blur();
        }
    };

    return (
        <div
            className={styles['tree-row']}
            style={{ paddingLeft: level * INDENT_STEP + INDENT_BASE }}
            title={children?.toString()}
            onClick={onClick}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            <span
                className={`${styles['tree-arrow']} ${hasArrow ? '' : styles.placeholder} ${open ? styles.open : ''}`}
            >
                ▶
            </span>
            <div className={styles['tree-content']}>
                <SiteIcon name={hasArrow ? 'folder' : 'file'} size={14}></SiteIcon>
                {renaming ? (
                    <input
                        onBlur={onRenameBlur}
                        onKeyDown={onRenameKeyDown}
                        type="text"
                        autoFocus
                        className={styles['tree-input']}
                        defaultValue={currentName}
                    />
                ) : (
                    <span className={styles['tree-label']}>{children}</span>
                )}
            </div>

            {/* 当前渲染位置处于后台时挂载行操作托盘，重命名期间收起避免误触。
                组件常驻挂载，触发按钮靠 visible 控制显隐，托盘展开后移出行的过程中菜单不能消失 */}
            {fromAdmin && !renaming && (
                <TreeRowActions
                    nodeId={nodeId}
                    name={currentName}
                    hasArrow={hasArrow}
                    visible={mouseIn}
                    onRename={onRenameStart}
                ></TreeRowActions>
            )}
        </div>
    );
}
