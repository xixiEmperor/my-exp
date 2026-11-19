import { useDroppable } from '@dnd-kit/react';
import type { ReactNode } from 'react';
import { type TreeNode } from '@/types/article-tree';
import style from './DropItem.module.scss';

interface Props {
    children: ReactNode;
    id: string;
    data?: TreeNode;
    enabled?: boolean; // 不启用时直接展示内容，由包装器统一处理条件。
}

// 只有启用放置的节点才注册拖拽目标。
function EnabledDropItem({ children, id, data }: Props) {
    const { ref, isDropTarget } = useDroppable({
        id,
        data,
    });

    return (
        <div ref={ref} className={isDropTarget ? style.dropping : ''}>
            {children}
        </div>
    );
}

export default function DropItem({ enabled = true, ...props }: Props) {
    // 把放置 hook 放在独立组件中，避免条件调用 hook。
    if (!enabled) return props.children;

    return <EnabledDropItem {...props} />;
}
