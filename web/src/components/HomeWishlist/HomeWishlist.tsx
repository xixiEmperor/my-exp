import { wishItems } from '../../constants/home';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { HomeMagneticButton } from '../HomeExperience/HomeMagnetic';
import { useWishlistCarousel } from './useWishlistCarousel';

export default function HomeWishlist() {
    const { index, previous, next, keyboard, touchStart, touchEnd } = useWishlistCarousel();

    return (
        <section
            className="section shell future-section"
            id="wishlist"
            data-region="wishlist"
            onPointerEnter={() => useHomeInteraction.getState().react('wishlist', 1)}
            onFocusCapture={() => useHomeInteraction.getState().react('wishlist', 1)}
            aria-labelledby="future-heading"
        >
            <div className="future-copy">
                <h2 id="future-heading">
                    持续沉淀，
                    <br />
                    再加一点小巧思<span className="blue">。</span>
                </h2>
                <p>
                    把学过的东西和经验用自己的话写成文档。
                    <br />
                    顺带做一些可以亲手试的小东西，覆盖源码，实现效果和文档，放在站内分享。
                </p>
                <div className="wish-controls">
                    <span>{String(index + 1).padStart(2, '0')} / 03</span>
                    <div>
                        <HomeMagneticButton
                            className="round-button"
                            data-magnet
                            onClick={previous}
                            aria-label="上一张愿望"
                        >
                            ←
                        </HomeMagneticButton>
                        <HomeMagneticButton
                            className="round-button"
                            data-magnet
                            onClick={next}
                            aria-label="下一张愿望"
                        >
                            →
                        </HomeMagneticButton>
                    </div>
                </div>
            </div>
            <div
                className="wish-stage"
                tabIndex={0}
                aria-label="愿望清单，可用左右方向键切换"
                onKeyDown={keyboard}
                onTouchStart={touchStart}
                onTouchEnd={touchEnd}
            >
                {wishItems.map((item, itemIndex) => (
                    <article
                        className={`wish-card${index === itemIndex ? ' wish-enter' : ''}`}
                        key={item.id}
                        hidden={index !== itemIndex}
                    >
                        <span className="wish-label">该项目后续会新增</span>
                        <h3>
                            {item.title[0]}
                            <br />
                            {item.title[1]}
                        </h3>
                        <p>{item.content}</p>
                        <span className="wish-status">
                            <i aria-hidden="true" />
                            {item.status}
                        </span>
                        <span className="wish-symbol" aria-hidden="true">
                            {['✳', '↗', '⌘'][itemIndex]}
                        </span>
                    </article>
                ))}
            </div>
        </section>
    );
}
