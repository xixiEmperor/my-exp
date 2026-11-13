import { Link } from 'react-router-dom';
import { homeNow } from '../../constants/home';
import { useHomeVisibility } from '../../hooks/useHomeExperience';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { HomeMagneticLink } from '../HomeExperience/HomeMagnetic';
import HomeSculpture from '../HomeExperience/HomeSculpture';
import type { SculptureAccent } from '../../utils/homeSculpture';

interface HeroProps {
    onAccent: (accent: SculptureAccent) => void;
}

const titleLabel = '从一行代码，到更多可能。';

// 字形只是视觉层，完整标题仍然只向读屏提供一次。
function titleLetters(text: string, offset: number) {
    return Array.from(text).map((letter, index) => (
        <span
            key={`${offset}-${index}`}
            className="hero-letter"
            aria-hidden="true"
            style={{ '--delay': `${(offset + index) * 32}ms` } as React.CSSProperties}
        >
            {letter}
        </span>
    ));
}

export default function HomeHero({ onAccent }: HeroProps) {
    const visibility = useHomeVisibility<HTMLElement>('home');

    return (
        <>
            <section
                className="hero shell"
                ref={visibility.ref}
                onPointerEnter={() => useHomeInteraction.getState().react('main', 1)}
                id="home"
                data-home-section="home"
                data-region="main"
                onFocusCapture={() => useHomeInteraction.getState().react('main', 1)}
                aria-labelledby="hero-title"
            >
                <div className="hero-grid">
                    <div className="hero-copy is-entering">
                        <p className="hero-greeting">
                            你好，我是 xixiEmperor <span aria-hidden="true">↘</span>
                        </p>
                        <h1 id="hero-title" aria-label={titleLabel}>
                            {titleLetters('欢迎来到，', 0)}
                            <br />
                            {/* {titleLetters('到', 6)} */}
                            <span className="blue" aria-hidden="true">
                                {titleLetters('xixiEmperor 的主页。', 7)}
                                <svg
                                    className="hero-underline"
                                    viewBox="0 0 330 28"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M4 17 Q84 3 167 15 T326 13 M28 24 Q175 12 294 22"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </h1>
                        {/* <p className="hero-script">
                            学新东西去咯！<span aria-hidden="true">✳</span>
                        </p>
                        <p className="hero-description">
                            写代码，踩坑，偶尔也会觉得前面白学了。
                            <br />
                            这里放着我的经历，也放着那些终于想明白的事。
                        </p> */}
                        <div className="hero-actions">
                            <HomeMagneticLink
                                className="button primary"
                                data-magnet
                                data-cursor="点我"
                                href="#journey"
                            >
                                沿着时间轴认识我 <span aria-hidden="true">↗</span>
                            </HomeMagneticLink>
                            <Link className="text-link" to="/knowledge">
                                去知识库看看 <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                    <HomeSculpture onAccent={onAccent} />
                </div>
                <div className="hero-bottom">
                    {homeNow.reading ? (
                        <div className="currently">
                            <i aria-hidden="true" />
                            <span>在读</span>
                            <span>{homeNow.reading}</span>
                        </div>
                    ) : null}
                    {homeNow.writing ? (
                        <div className="currently">
                            <i aria-hidden="true" />
                            <span>在写</span>
                            <span>{homeNow.writing}</span>
                        </div>
                    ) : null}
                    <a className="scroll-link" href="#journey">
                        往下看看 <span aria-hidden="true">↓</span>
                    </a>
                </div>
            </section>
            <div className="stack-strip" aria-label="技术方向">
                <div className="shell stack-inner">
                    <span>React</span>
                    <i aria-hidden="true">✳</i>
                    <span>TypeScript</span>
                    <i aria-hidden="true">✳</i>
                    <span>Vue</span>
                    <i aria-hidden="true">✳</i>
                    <span>Go</span>
                    <i aria-hidden="true">✳</i>
                    <span>Agent</span>
                </div>
            </div>
        </>
    );
}
