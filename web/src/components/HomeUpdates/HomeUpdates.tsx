import { releaseNotices } from '../../constants/releaseNotices';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { useReleaseTimeline } from './useReleaseTimeline';
import ReleaseTimelineNode from './ReleaseTimelineNode';
import ReleaseNoticePanel from './ReleaseNoticePanel';
import './HomeUpdates.scss';

// 通知按发版日期浏览，选中的节点只决定下方展示哪次更新。
export default function HomeUpdates() {
    const { active, nodeRefs, select, keyboard } = useReleaseTimeline();

    return (
        <section
            className="section shell project-section project-updates"
            id="projects"
            data-region="projects"
            onPointerEnter={() => useHomeInteraction.getState().react('projects', 1)}
            onFocusCapture={() => useHomeInteraction.getState().react('projects', 1)}
            aria-labelledby="project-heading"
        >
            <div className="updates-heading">
                <h2 id="project-heading">小站升级记录</h2>
                <div className="updates-controls">
                    <button
                        type="button"
                        disabled={active === 0}
                        aria-label="上一条更新通知"
                        onClick={() => select(active - 1)}
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        disabled={active === releaseNotices.length - 1}
                        aria-label="下一条更新通知"
                        onClick={() => select(active + 1)}
                    >
                        →
                    </button>
                </div>
            </div>
            {/* 节点固定宽度，通知增加后通过横向滚动浏览，不压缩标题。 */}
            <div
                className="updates-track"
                role="tablist"
                aria-label="发版通知"
                aria-orientation="horizontal"
            >
                {releaseNotices.map((notice, index) => (
                    <ReleaseTimelineNode
                        key={notice.id}
                        notice={notice}
                        selected={active === index}
                        nodeRef={(element) => {
                            nodeRefs.current[index] = element;
                        }}
                        onSelect={() => select(index)}
                        onKeyDown={(event) => keyboard(event, index)}
                    />
                ))}
            </div>
            {/* 每条通知保留对应面板，日期和新增功能作为主要内容。 */}
            {releaseNotices.map((notice, index) => (
                <ReleaseNoticePanel key={notice.id} notice={notice} selected={active === index} />
            ))}
        </section>
    );
}
