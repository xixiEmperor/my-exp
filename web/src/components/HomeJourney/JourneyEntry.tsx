import { journeyItems } from '../../constants/home';
import { useHomeVisibility } from '../../hooks/useHomeExperience';

// 每张便签独立观察进场，隐藏项不参与节点经过状态。
export default function JourneyEntry({
    item,
    index,
    hidden,
}: {
    item: (typeof journeyItems)[number];
    index: number;
    hidden: boolean;
}) {
    const visibility = useHomeVisibility<HTMLElement>();

    return (
        <article
            ref={visibility.ref}
            className={`journey-item${visibility.entered ? ' is-visible passed is-node-pulsed' : ''}${visibility.visible ? ' is-in-view' : ''}${item.isCurrent ? ' current' : ''}`}
            data-journey-row
            data-loop
            hidden={hidden}
        >
            <div className="journey-card" data-cursor="看看">
                <div className="journey-meta">
                    <time>{item.year.replace('-', '.')}</time>
                    <span>{item.title}</span>
                </div>
                <div className="journey-body">
                    <p>{item.content}</p>
                    {item.isCurrent ? (
                        <span className="current-label">
                            <i aria-hidden="true" />
                            正在继续
                        </span>
                    ) : null}
                </div>
            </div>
            <span className="journey-node" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
            </span>
        </article>
    );
}
