import type { TreeNode } from '@/types/article-tree';
import { useDraggable } from '@dnd-kit/react';
import { type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    id: string;
    data?: TreeNode;

    enabled?: boolean; // 不启用时直接展示内容，由包装器统一处理条件。
}

// 只有启用拖拽的节点才挂载拖拽行为。
function EnabledDragItem({ children, id, data }: Props) {
    const { ref } = useDraggable({
        id,
        data,
    });

    return <div ref={ref}>{children}</div>;
}

export default function DragItem({ enabled = true, ...props }: Props) {
    // 把拖拽 hook 放在独立组件中，避免条件调用 hook。
    if (!enabled) return props.children;

    return <EnabledDragItem {...props} />;
}
