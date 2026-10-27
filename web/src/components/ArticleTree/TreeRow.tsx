import { type MouseEventHandler, type ReactNode, useState } from 'react';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './ArticleTree.module.scss';
import { useArticles } from '@/hooks/useArticles';

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
    /** 当前渲染的文件夹 id */
    folderId?: string;
}

// 文件夹行和文件行共用的外壳，缩进计算和箭头占位只在这里维护一份
export default function TreeRow({
    level,
    onClick,
    fromAdmin,
    hasArrow = false,
    open = false,
    children,
    folderId,
}: TreeRowProps) {
    const [mouseIn, setMouseIn] = useState<boolean>(false);
    const [renaming, setRenaming] = useState<boolean>(false);

    const { createNodeRequest } = useArticles();

    const onEnter = () => {
        setMouseIn(true);
    };

    const onLeave = () => {
        setMouseIn(false);
    };

    const onCreateArticle: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        createNodeRequest.run(folderId!, 'article');
    };
    const onCreateFolder: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        createNodeRequest.run(folderId!, 'folder');
    };
    const onRenameFile: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        setRenaming(true);
    };
    const onRenameFolder: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        setRenaming(true);
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
                        onBlur={() => {
                            setRenaming(false);
                        }}
                        type="text"
                        autoFocus
                        className={styles['tree-input']}
                        defaultValue={children?.toString()}
                    />
                ) : (
                    <span className={styles['tree-label']}>{children}</span>
                )}

                {/* 当前渲染位置处于后台，且光标进入时展示工具栏 */}
                {mouseIn && fromAdmin && (
                    <div className={styles['tree-toolbar']}>
                        {/* 只有文件夹才展示创建文件夹和创建文件按钮 */}
                        {hasArrow && !renaming && (
                            <>
                                <button
                                    className={styles['']}
                                    onClick={onRenameFolder}
                                    title="重命名"
                                >
                                    <SiteIcon name="renameFolder" size={14}></SiteIcon>
                                </button>
                                <button
                                    className={styles['']}
                                    onClick={onCreateArticle}
                                    title="创建文章"
                                >
                                    <SiteIcon name="createFile" size={14}></SiteIcon>
                                </button>
                                <button
                                    className={styles['']}
                                    onClick={onCreateFolder}
                                    title="创建文件夹"
                                >
                                    <SiteIcon
                                        name="createFolder"
                                        size={15}
                                        style={{ transform: 'translateY(1px)' }}
                                    ></SiteIcon>
                                </button>
                            </>
                        )}

                        {/* 否则就只展示重命名文件按钮 */}
                        {!hasArrow && !renaming && (
                            <button className={styles['']} onClick={onRenameFile}>
                                <SiteIcon name="renameFile" size={14}></SiteIcon>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
