import { A11y, Keyboard, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import SiteIcon from '../SiteIcon/SiteIcon';
import { wishItems, wishlistA11y } from '../../constants/home';
import type { ReactNode } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import styles from './HomeWishlist.module.scss';
import 'swiper/css';
import 'swiper/css/pagination';

interface Props {
    index: number;
    caption: string;
    reducedMotion: boolean;
    onSlideChange: (swiper: SwiperInstance) => void;
    onPrev: () => void;
    onNext: () => void;
}

// 愿望清单用轮播展示，一屏一张。
// 翻页按钮自己渲染，不用 Swiper 自带的那对，省得和自己的样式打架。
export default function HomeWishlist({
    index,
    caption,
    reducedMotion,
    onSlideChange,
    onPrev,
    onNext,
}: Props) {
    const slideNodes: ReactNode[] = [];

    wishItems.forEach((item) => {
        slideNodes.push(
            <SwiperSlide key={item.id}>
                <article className={styles.card} data-tone={item.tone}>
                    <div className={styles.top}>
                        <span className={styles.check} aria-hidden="true"></span>
                        <span>{item.caption}</span>
                    </div>
                    {/* 整屏宽的卡片横过来排，图标在左、文案在右，比竖排更耐看。 */}
                    <div className={styles.main}>
                        <span className={styles.icon}>
                            <SiteIcon name={item.icon} />
                        </span>
                        <div className={styles.text}>
                            <h3>
                                {item.title[0]}
                                <br />
                                {item.title[1]}
                            </h3>
                            <p>{item.content}</p>
                        </div>
                    </div>
                    <div className={styles.bottom}>
                        <span>{item.status}</span>
                    </div>
                </article>
            </SwiperSlide>,
        );
    });

    return (
        <section className={styles.carousel} aria-label="愿望清单">
            <Swiper
                modules={[A11y, Keyboard, Pagination]}
                slidesPerView={1}
                keyboard={{ enabled: true, onlyInViewport: true }}
                rewind
                speed={reducedMotion ? 0 : 420}
                onSwiper={onSlideChange}
                onSlideChange={onSlideChange}
                a11y={wishlistA11y}
            >
                {slideNodes}
            </Swiper>
            <div className={styles.caption}>
                <button
                    className={[styles.nav, styles.prev].join(' ')}
                    type="button"
                    aria-label="上一张愿望"
                    onClick={onPrev}
                >
                    <SiteIcon name="chevron" />
                </button>
                <div className={styles.captionText} aria-live="polite" aria-atomic="true">
                    <span className={styles.position}>
                        {`${String(index + 1).padStart(2, '0')} / ${String(wishItems.length).padStart(2, '0')}`}
                    </span>
                    <span className={styles.summary}>{caption}</span>
                </div>
                <button
                    className={styles.nav}
                    type="button"
                    aria-label="下一张愿望"
                    onClick={onNext}
                >
                    <SiteIcon name="chevron" />
                </button>
            </div>
        </section>
    );
}
