import { journeyItems } from '../../constants/home';
import { useHomeVisibility, useHomeTimeline } from '../../hooks/useHomeExperience';
import { useHomeInteraction } from '../../stores/homeInteraction';
import JourneyEntry from './JourneyEntry';
import { useJourneyExpansion } from './useJourneyExpansion';

export default function HomeJourney() {
    const visibility = useHomeVisibility<HTMLElement>('journey');
    const timeline = useHomeTimeline();
    const { expanded, busy, toggle } = useJourneyExpansion();

    return (
        <section
            className="section shell journey-section"
            ref={visibility.ref}
            onPointerEnter={() => useHomeInteraction.getState().react('journey', 1)}
            id="journey"
            data-region="journey"
            onFocusCapture={() => useHomeInteraction.getState().react('journey', 1)}
            data-home-section="journey"
            aria-labelledby="journey-heading"
        >
            <div className="section-intro">
                <h2 id="journey-heading">
                    前端开发，
                    <br />
                    到不再分栈
                </h2>
                <p>
                    从学长推荐前端，到实习接触跨端开发，再到学习
                    Agent。就这样一步一步被推着往前走，学起来倒也挺有意思。
                </p>
                <div className="journey-stamp" aria-hidden="true">
                    <span>2024</span>
                    <span className="stamp-arrow">↗</span>
                    <span>2026</span>
                </div>
            </div>
            <div className="journey-list" ref={timeline.ref} data-journey-list>
                <div className="journey-spine" aria-hidden="true">
                    <i
                        data-journey-progress
                        style={{ transform: `scaleY(${timeline.progress})` }}
                    />
                </div>
                {journeyItems.map((item, index) => (
                    <JourneyEntry
                        key={item.id}
                        item={item}
                        index={index}
                        hidden={!expanded && index >= 3}
                    />
                ))}
            </div>
            <div className="journey-divider">
                <button
                    id="journey-toggle"
                    disabled={busy}
                    aria-expanded={expanded}
                    aria-controls="journey"
                    onClick={toggle}
                >
                    {expanded ? '收起完整历程' : '查看完整历程'}
                    <span aria-hidden="true">{expanded ? '↑' : '↓'}</span>
                </button>
            </div>
        </section>
    );
}
