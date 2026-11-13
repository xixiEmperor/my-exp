import { projectPhases } from '../../constants/home';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { useProjectTimeline } from './useProjectTimeline';
import ProjectTimelineNode from './ProjectTimelineNode';
import ProjectPhasePanel from './ProjectPhasePanel';
import './ProjectUpdates.scss';

export default function HomeProjects() {
    const { active, currentIndex, phaseRefs, select, keyboard } = useProjectTimeline();

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
                <div>
                    <p className="updates-eyebrow">
                        <span aria-hidden="true">↗</span> 小站开发日志
                    </p>
                    <h2 id="project-heading">
                        这个小站，
                        <br />
                        又往前走了一点<span className="blue">。</span>
                    </h2>
                </div>
                <div className="updates-intro">
                    <span className="updates-live">
                        <i aria-hidden="true" />
                        持续更新中
                    </span>
                    <p>
                        做到了哪一步，接下来准备做什么。
                        <br />
                        沿着时间轴，看看小站的每一次变化。
                    </p>
                </div>
            </div>
            <div className="updates-board">
                <div className="updates-toolbar">
                    <span>
                        项目进度{' '}
                        <span className="updates-count">
                            / {String(projectPhases.length).padStart(2, '0')} 个阶段
                        </span>
                    </span>
                    <span>
                        点击节点查看详情 <span aria-hidden="true">↘</span>
                    </span>
                </div>
                {/* 节点与详情通过标签页语义关联，当前进度不随浏览历史阶段改变。 */}
                <div
                    className="updates-track"
                    role="tablist"
                    aria-label="项目开发阶段"
                    aria-orientation="horizontal"
                >
                    {projectPhases.map((phase, index) => (
                        <ProjectTimelineNode
                            key={phase.id}
                            phase={phase}
                            index={index}
                            selected={active === index}
                            nodeRef={(element) => {
                                phaseRefs.current[index] = element;
                            }}
                            onSelect={() => select(index)}
                            onKeyDown={(event) => keyboard(event, index)}
                        />
                    ))}
                </div>
                {/* 每个节点保留对应面板，未选中内容隐藏，读屏仍可正确找到关联目标。 */}
                {projectPhases.map((phase, index) => (
                    <ProjectPhasePanel
                        key={phase.id}
                        phase={phase}
                        index={index}
                        selected={active === index}
                    />
                ))}
                <div className="updates-footer">
                    <span>当前进度：{projectPhases[Math.max(0, currentIndex)].title}</span>
                    <div className="updates-controls">
                        <span>
                            {String(active + 1).padStart(2, '0')} /{' '}
                            {String(projectPhases.length).padStart(2, '0')}
                        </span>
                        <button
                            type="button"
                            disabled={active === 0}
                            aria-label="上一个开发阶段"
                            onClick={() => select(active - 1)}
                        >
                            ←
                        </button>
                        <button
                            type="button"
                            disabled={active === projectPhases.length - 1}
                            aria-label="下一个开发阶段"
                            onClick={() => select(active + 1)}
                        >
                            →
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
