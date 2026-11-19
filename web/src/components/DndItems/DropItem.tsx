import { useDroppable } from '@dnd-kit/react';
import type { ReactNode } from 'react';
import { type TreeNode } from '@/types/article-tree';
import style from './DropItem.module.scss';

interface Props {
    children: ReactNode;
    id: string;
    data?: TreeNode;
}

export default function DropItem({ children, id, data }: Props) {
    const { ref, isDropTarget } = useDroppable({
        id,
        data,
    });

    return (
        <div ref={ref} className={isDropTarget ? style['dropping'] : ''}>
            {children}
        </div>
    );
}
