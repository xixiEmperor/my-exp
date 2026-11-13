import type { KeyboardEvent, RefCallback } from 'react';
import type { ProjectPhase } from '../../types/home';

interface Props {
    phase: ProjectPhase;
    index: number;
    selected: boolean;
    nodeRef: RefCallback<HTMLButtonElement>;
    onSelect: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

// 单个阶段节点只负责展示和事件转发，状态由时间轴统一管理。
export default function ProjectTimelineNode({
    phase,
    index,
    selected,
    nodeRef,
    onSelect,
    onKeyDown,
}: Props) {
    return (
        <button
            type="button"
            className={`updates-node${selected ? ' is-selected' : ''}${phase.isCurrent ? ' is-current' : ''}`}
            id={`update-tab-${phase.id}`}
            role="tab"
            aria-selected={selected}
            aria-controls={`update-panel-${phase.id}`}
            tabIndex={selected ? 0 : -1}
            ref={nodeRef}
            onClick={onSelect}
            onKeyDown={onKeyDown}
        >
            <span className="updates-node-meta">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{phase.isCurrent ? '正在进行' : phase.status}</span>
            </span>
            <span className="updates-node-line" aria-hidden="true">
                <i />
            </span>
            <span className="updates-node-title">{phase.title}</span>
            <span className="updates-node-summary">{phase.summary}</span>
        </button>
    );
}
