import { useHomeProgress } from '../../hooks/useHomeExperience';
import { useHomeInteraction } from '../../stores/homeInteraction';

// 首页只保留阅读进度与无障碍播报，光标皮肤由项目统一管理。
export default function HomeFeedback() {
    const progress = useHomeProgress();
    const announcement = useHomeInteraction((state) => state.announcement);

    return (
        <>
            <div
                className="reading-progress"
                aria-hidden="true"
                style={{ transform: `scaleX(${progress})` }}
            />
            <p className="home-announcer" role="status" aria-live="polite">
                {announcement}
            </p>
        </>
    );
}
