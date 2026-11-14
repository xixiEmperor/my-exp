import type { KeyboardEvent, RefCallback } from 'react';
import type { ReleaseNotice } from '../../types/home';

interface Props {
    notice: ReleaseNotice;
    selected: boolean;
    nodeRef: RefCallback<HTMLButtonElement>;
    onSelect: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

// 节点只展示发布日期和通知标题，详情留给下方的面板。
export default function ReleaseTimelineNode({
    notice,
    selected,
    nodeRef,
    onSelect,
    onKeyDown,
}: Props) {
    return (
        <button
            type="button"
            className={`updates-node${selected ? ' is-selected' : ''}`}
            id={`update-tab-${notice.id}`}
            role="tab"
            aria-selected={selected}
            aria-controls={`update-panel-${notice.id}`}
            tabIndex={selected ? 0 : -1}
            ref={nodeRef}
            onClick={onSelect}
            onKeyDown={onKeyDown}
        >
            <time dateTime={notice.date}>{notice.date}</time>
            <span className="updates-node-line" aria-hidden="true">
                <i />
            </span>
            <span className="updates-node-title">{notice.title}</span>
        </button>
    );
}
