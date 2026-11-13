import type { ProjectPhase } from '../../types/home';

interface Props {
    phase: ProjectPhase;
    index: number;
    selected: boolean;
}

// 面板保留与节点的关联关系，隐藏阶段不参与阅读和键盘导航。
export default function ProjectPhasePanel({ phase, index, selected }: Props) {
    return (
        <article
            className="updates-detail"
            role="tabpanel"
            id={`update-panel-${phase.id}`}
            aria-labelledby={`update-tab-${phase.id}`}
            hidden={!selected}
            tabIndex={0}
        >
            <div className="updates-detail-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
                <span>开发手记</span>
            </div>
            <div className="updates-detail-copy">
                <span className="updates-detail-status">
                    {phase.isCurrent ? '正在进行' : phase.status} · {phase.step}
                </span>
                <h3>{phase.title}</h3>
                <p>{phase.detail}</p>
            </div>
            <span className="updates-detail-symbol" aria-hidden="true">
                ↗
            </span>
        </article>
    );
}
