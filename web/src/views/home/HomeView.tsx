import { lazy, Suspense, useCallback } from 'react';
import HomeHero from '../../components/HomeHero/HomeHero';
import HomeJourney from '../../components/HomeJourney/HomeJourney';
import HomeUpdates from '../../components/HomeUpdates/HomeUpdates';
import HomeKnowledge from '../../components/HomeKnowledge/HomeKnowledge';
import HomePlayground from '../../components/HomePlayground/HomePlayground';
import HomeContact from '../../components/HomeContact/HomeContact';
import { HomeWeatherHanger } from '../../components/HomeExperience/HomeHangers';
import { useHomeDocumentHidden } from '../../hooks/useHomeExperience';
import HomeFeedback from '../../components/HomeExperience/HomeFeedback';
import type { SculptureAccent } from '../../utils/homeSculpture';
import { useUIStore } from '../../stores/ui';
import { HOME_ACCENT_STORAGE_KEY } from '../../config/homeAccent';
import styles from './HomeView.module.scss';

const HomeThreeBg = lazy(() => import('../../components/HomeThreeBg/HomeThreeBg'));

// 视图只组合首页的区域，交互和生命周期交给页面 hook。
export default function HomeView() {
    const pageHidden = useHomeDocumentHidden();
    const onAccent = useCallback((accent: SculptureAccent) => {
        // 视觉偏好交回现有 UI store，根节点属性由 React 声明，不手动修改应用壳层。
        useUIStore.getState().setHomeAccent(accent);

        try {
            localStorage.setItem(HOME_ACCENT_STORAGE_KEY, accent);
        } catch {
            // 存储不可用时仍保留当前会话的视觉反馈。
        }
    }, []);

    return (
        <>
            <Suspense fallback={null}>
                <HomeThreeBg />
            </Suspense>
            <main id="main" className={`${styles.view}${pageHidden ? ' is-page-hidden' : ''}`}>
                <HomeWeatherHanger />
                <HomeFeedback />
                <HomeHero onAccent={onAccent} />
                <HomeJourney />
                <HomeUpdates />
                <HomeKnowledge />
                <HomePlayground />
                <HomeContact />
            </main>
        </>
    );
}
