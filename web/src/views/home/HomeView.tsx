import { useCallback } from 'react';
import HomeHero from '../../components/HomeHero/HomeHero';
import HomeJourney from '../../components/HomeJourney/HomeJourney';
import HomeUpdates from '../../components/HomeUpdates/HomeUpdates';
import HomeKnowledge from '../../components/HomeKnowledge/HomeKnowledge';
import HomeWishlist from '../../components/HomeWishlist/HomeWishlist';
import HomeContact from '../../components/HomeContact/HomeContact';
import { HomeWeatherHanger, HomeBuddyHanger } from '../../components/HomeExperience/HomeHangers';
import { useHomeDocumentHidden } from '../../hooks/useHomeExperience';
import HomeFeedback from '../../components/HomeExperience/HomeFeedback';
import type { SculptureAccent } from '../../utils/homeSculpture';
import { useUIStore } from '../../stores/ui';
import { HOME_ACCENT_STORAGE_KEY } from '../../config/homeAccent';
import styles from './HomeView.module.scss';

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
        <main id="main" className={`${styles.view}${pageHidden ? ' is-page-hidden' : ''}`}>
            <HomeWeatherHanger />
            <HomeBuddyHanger />
            <HomeFeedback />
            <HomeHero onAccent={onAccent} />
            <HomeJourney />
            <HomeUpdates />
            <HomeKnowledge />
            <HomeWishlist />
            <HomeContact />
        </main>
    );
}
