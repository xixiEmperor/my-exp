import type { TreeNode } from '@/types/article-tree';
import { useDraggable } from '@dnd-kit/react';
import { type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    id: string;
    data?: TreeNode;
}

export default function DragItem({ children, id, data }: Props) {
    const { ref } = useDraggable({
        id,
        data,
    });

    return <div ref={ref}>{children}</div>;
}
