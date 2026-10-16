import HomeWorkspace from '../../components/HomeWorkspace/HomeWorkspace';
import HomeSideRail from '../../components/HomeSideRail/HomeSideRail';
import QuickLinksWidget from '../../components/HomeSideRail/QuickLinksWidget';
import LocalTimeWidget from '../../components/HomeSideRail/LocalTimeWidget';
import WeatherWidget from '../../components/HomeSideRail/WeatherWidget';
import HomeHero from '../../components/HomeHero/HomeHero';
import HomeSection from '../../components/HomeSection/HomeSection';
import HomeJourney from '../../components/HomeJourney/HomeJourney';
import HomeProjects from '../../components/HomeProjects/HomeProjects';
import HomeWishlist from '../../components/HomeWishlist/HomeWishlist';
import HomeContact from '../../components/HomeContact/HomeContact';
import { sectionNavigation } from '../../constants/navigation';
import { heroContent, sectionHeadings } from '../../constants/home';
import { useHomePage } from '../../hooks/useHomePage';
import styles from './HomeView.module.scss';

// 视图只组合首页的区域，交互和生命周期交给页面 hook。
export default function HomeView() {
    const page = useHomePage();

    return (
        <main id="main" ref={page.rootRef} className={styles.view}>
            <HomeWorkspace
                leftRail={
                    <HomeSideRail side="left" ariaLabel="关于我和快捷跳转">
                        <QuickLinksWidget items={sectionNavigation} delay={1} />
                    </HomeSideRail>
                }
                rightRail={
                    <HomeSideRail side="right" ariaLabel="本地信息小组件">
                        <WeatherWidget />
                        <LocalTimeWidget delay={1} />
                    </HomeSideRail>
                }
            >
                <HomeHero content={heroContent} />
                <HomeSection id="journey" {...sectionHeadings.journey}>
                    <HomeJourney timelineRef={page.timelineRef} progressRef={page.progressRef} />
                </HomeSection>
                <HomeSection id="projects" {...sectionHeadings.projects}>
                    <HomeProjects
                        activeStep={page.activeProject}
                        trackRef={page.trackRef}
                        onToggle={page.toggleProject}
                        onKeyDown={page.handleProjectKey}
                    />
                </HomeSection>
                <HomeSection id="wishlist" {...sectionHeadings.wishlist}>
                    <HomeWishlist
                        index={page.wishlistIndex}
                        caption={page.wishlistCaption}
                        reducedMotion={page.reducedMotion}
                        onSlideChange={page.syncSlide}
                        onPrev={page.goPrevWish}
                        onNext={page.goNextWish}
                    />
                </HomeSection>
                <HomeContact
                    email={page.contactEmail}
                    copied={page.emailCopied}
                    onCopyEmail={page.copyEmail}
                />
            </HomeWorkspace>
        </main>
    );
}
