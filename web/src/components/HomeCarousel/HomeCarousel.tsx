import type { ReactNode } from 'react';
import { carouselItems } from '../../constants/home';
import { A11y, Keyboard, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import CarouselScene from './CarouselScene';
import styles from './HomeCarousel.module.scss';

interface Props {
  index: number;
  description: string;
  reducedMotion: boolean;
  onSlideChange: (swiper: SwiperInstance) => void;
}

// Swiper 管理导航、分页和触摸行为，只定制内容与外观。
export default function HomeCarousel({ index, description, reducedMotion, onSlideChange }: Props) {
  // 轮播页面与总数都来自配置，避免增删内容后分页提示失配。
  const slideNodes: ReactNode[] = [];

  carouselItems.forEach((item, sceneIndex) => {
    slideNodes.push(
      <SwiperSlide key={item.id}>
        <CarouselScene item={item} index={sceneIndex} />
      </SwiperSlide>,
    );
  });

  return (
    <section className={styles.carousel} aria-label="博客精选内容">
      <Swiper
        className={styles.swiper}
        modules={[A11y, Keyboard, Navigation, Pagination]}
        navigation
        pagination={{ clickable: true }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        rewind
        speed={reducedMotion ? 0 : 420}
        onSwiper={onSlideChange}
        onSlideChange={onSlideChange}
        a11y={{
          containerRoleDescriptionMessage: '内容轮播',
          prevSlideMessage: '上一张',
          nextSlideMessage: '下一张',
          paginationBulletMessage: '查看第 {{index}} 张内容',
          slideLabelMessage: '{{index}} / {{slidesLength}}',
        }}
      >
        {slideNodes}
      </Swiper>
      <div className={styles.caption} aria-live="polite" aria-atomic="true">
        <span>{`${String(index + 1).padStart(2, '0')} / ${String(carouselItems.length).padStart(2, '0')}`}</span>
        <span className={styles.description}>{description}</span>
      </div>
    </section>
  );
}
