import HomeHero from '../../components/HomeHero/HomeHero';
import HomeCarousel from '../../components/HomeCarousel/HomeCarousel';
import HomeJourney from '../../components/HomeJourney/HomeJourney';
import HomeProjects from '../../components/HomeProjects/HomeProjects';
import HomeWishlist from '../../components/HomeWishlist/HomeWishlist';
import HomeContact from '../../components/HomeContact/HomeContact';
import { useHomePage } from '../../hooks/useHomePage';
import styles from './HomeView.module.scss';

// 视图只组合首页的五个区域，交互和生命周期交给页面 hook。
export default function HomeView() {
  const page = useHomePage();

  return (
    <main id="main" ref={page.rootRef} className={styles.view}>
      <HomeHero>
        <HomeCarousel
          index={page.carouselIndex}
          description={page.carouselDescription}
          reducedMotion={page.reducedMotion}
          onSlideChange={page.syncSlide}
        />
      </HomeHero>
      <HomeJourney timelineRef={page.timelineRef} progressRef={page.progressRef} />
      <HomeProjects
        activePhase={page.activeProject}
        phase={page.project}
        onSelect={page.selectProject}
        onHover={page.hoverProject}
        onKeyDown={page.handleProjectKey}
      />
      <HomeWishlist />
      <HomeContact />
    </main>
  );
}
