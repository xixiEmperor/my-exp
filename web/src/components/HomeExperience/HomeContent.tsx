import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type TouchEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { useStore } from 'zustand';
import { homeStore } from '../../stores/home';
import {
    journeyItems,
    projectPhases,
    wishItems,
    contactEmail,
    homeNow,
} from '../../constants/home';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useClipboard } from '../../hooks/useClipboard';
import { useHomeVisibility, useHomeTilt, useHomeTimeline } from '../../hooks/useHomeExperience';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { toast } from '../../utils/toast';
import { HomeMagneticButton, HomeMagneticLink, useHomeMagnet } from './HomeMagnetic';
import HomeSculpture from './HomeSculpture';
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

export function ExperienceHero({ onAccent }: HeroProps) {
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
                            {titleLetters('从一行代码，', 0)}
                            <br />
                            {titleLetters('到', 6)}
                            <span className="blue" aria-hidden="true">
                                {titleLetters('更多可能。', 7)}
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
                        <p className="hero-script">
                            学新东西去咯！<span aria-hidden="true">✳</span>
                        </p>
                        <p className="hero-description">
                            写代码，踩坑，偶尔也会觉得前面白学了。
                            <br />
                            这里放着我的经历，也放着那些终于想明白的事。
                        </p>
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
                                去知识库坐坐 <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                    <HomeSculpture onAccent={onAccent} />
                </div>
                <div className="hero-bottom">
                    <div className="currently">
                        <i aria-hidden="true" />
                        <span>最近在做</span>
                        <span>搭一个小站，安放这些经历</span>
                    </div>
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

// 先回到展开前的位置再隐藏节点，避免长时间轴收起后把下方内容突然顶上来。
function scrollBeforeCollapse(top: number, reduced: boolean, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const started = performance.now();
        let frame = 0;
        const abort = () => {
            cancelAnimationFrame(frame);
            reject(new DOMException('组件已卸载', 'AbortError'));
        };
        const finish = () => {
            cancelAnimationFrame(frame);
            signal.removeEventListener('abort', abort);
            resolve();
        };
        const check = () => {
            if (Math.abs(window.scrollY - top) < 2) finish();
            else if (performance.now() - started > 1400) {
                // 浏览器中断平滑滚动时仍恢复位置，不在旧位置直接折掉长列表。
                window.scrollTo({ top, behavior: 'instant' });
                finish();
            } else frame = requestAnimationFrame(check);
        };

        signal.addEventListener('abort', abort, { once: true });

        // 等点击与禁用状态提交后再开始，避免浏览器把恢复滚动覆盖成点击定位。
        frame = requestAnimationFrame(() => {
            window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
            frame = requestAnimationFrame(check);
        });
    });
}

// 每张便签独立观察进场，隐藏项不参与节点经过状态。
function JourneyEntry({
    item,
    index,
    hidden,
}: {
    item: (typeof journeyItems)[number];
    index: number;
    hidden: boolean;
}) {
    const visibility = useHomeVisibility<HTMLElement>();

    return (
        <article
            ref={visibility.ref}
            className={`journey-item${visibility.entered ? ' is-visible passed is-node-pulsed' : ''}${visibility.visible ? ' is-in-view' : ''}${item.isCurrent ? ' current' : ''}`}
            data-journey-row
            data-loop
            hidden={hidden}
        >
            <div className="journey-card" data-cursor="看看">
                <div className="journey-meta">
                    <time>{item.year.replace('-', '.')}</time>
                    <span>{item.title}</span>
                </div>
                <div className="journey-body">
                    <p>{item.content}</p>
                    {item.isCurrent ? (
                        <span className="current-label">
                            <i aria-hidden="true" />
                            正在继续
                        </span>
                    ) : null}
                </div>
            </div>
            <span className="journey-node" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
            </span>
        </article>
    );
}

export function ExperienceJourney() {
    const visibility = useHomeVisibility<HTMLElement>('journey');
    const timeline = useHomeTimeline();
    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState(false);
    const startScroll = useRef(0);
    const pending = useRef<AbortController | null>(null);
    const reduced = useReducedMotion();

    useEffect(() => () => pending.current?.abort(), []);

    const toggle = useCallback(async () => {
        if (!expanded) {
            startScroll.current = window.scrollY;
            setExpanded(true);

            return;
        }

        const controller = new AbortController();
        pending.current = controller;
        setBusy(true);

        try {
            await scrollBeforeCollapse(startScroll.current, reduced, controller.signal);
            setExpanded(false);
        } catch {
            // 卸载取消滚动后不再回写旧页面的状态。
        } finally {
            if (!controller.signal.aborted) setBusy(false);
        }
    }, [expanded, reduced]);

    useEffect(() => useHomeInteraction.getState().registerAction('timeline', toggle), [toggle]);

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
                    到不再分栈<span className="blue">。</span>
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
                {expanded ? (
                    <div className="journey-tail">
                        <span aria-hidden="true">✳</span> 后面的故事，边走边写。
                    </div>
                ) : null}
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

export function ExperienceProjects() {
    const active = useStore(homeStore, (state) => state.activeProject);
    const setActive = useStore(homeStore, (state) => state.setActiveProject);
    const phaseRefs = useRef<(HTMLElement | null)[]>([]);
    const tilt = useHomeTilt();
    const [drawing, setDrawing] = useState(false);
    const current = projectPhases[Math.max(0, active)];

    useEffect(() => {
        setDrawing(true);
        const timer = window.setTimeout(() => setDrawing(false), 800);

        return () => clearTimeout(timer);
    }, [active]);

    // 索引由渲染闭包传入，方向键仅通过已注册引用移动焦点。
    const select = (event: MouseEvent<HTMLElement>, index: number) => {
        event.preventDefault();
        setActive(active === index ? -1 : index);
    };
    const keyboard = (event: KeyboardEvent<HTMLElement>, origin: number) => {
        if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;

        event.preventDefault();

        const index =
            (origin + (event.key === 'ArrowDown' ? 1 : -1) + projectPhases.length) %
            projectPhases.length;

        setActive(index);
        phaseRefs.current[index]?.focus();
    };

    return (
        <section
            className="section shell project-section"
            id="projects"
            data-region="projects"
            onPointerEnter={() => useHomeInteraction.getState().react('projects', 1)}
            onFocusCapture={() => useHomeInteraction.getState().react('projects', 1)}
            aria-labelledby="project-heading"
        >
            <div className="section-heading">
                <h2 id="project-heading">
                    一个小站，慢慢打磨<span className="blue">。</span>
                </h2>
                <p>
                    记录开发历程，也留下开发初心。
                    <br />
                    把经验用自己的话写下来。
                </p>
            </div>
            <div className="project-grid">
                <div
                    className={`project-cover${drawing ? ' is-drawing' : ''}`}
                    data-build-stage={Math.max(0, active)}
                >
                    <div className="build-top">
                        <span>
                            <i aria-hidden="true" /> 小站搭建中
                        </span>
                        <span>{String(Math.max(0, active) + 1).padStart(2, '0')} / 04</span>
                    </div>
                    <div className="build-preview" {...tilt} data-build-preview aria-hidden="true">
                        <div className="preview-browser">
                            <i />
                            <i />
                            <i />
                            <span>我的小站</span>
                        </div>
                        <div className="preview-nav">
                            <span>✳ xixiEmperor.</span>
                            <span>首页 · 知识库</span>
                        </div>
                        <div className="preview-hero">
                            <div>
                                <span className="preview-kicker">你好，欢迎来坐坐</span>
                                <strong>
                                    从一行代码，
                                    <br />
                                    到更多可能。
                                </strong>
                                <span className="preview-stroke" />
                            </div>
                            <span className="preview-flower">✳</span>
                        </div>
                        <div className="preview-notes">
                            <span>01 学一点</span>
                            <span>02 做一点</span>
                            <span>03 记下来</span>
                        </div>
                        <span className="preview-pencil" key={active}>
                            ✎
                        </span>
                        <span className="preview-guide guide-one" />
                        <span className="preview-guide guide-two" />
                    </div>
                    <div className="build-caption">
                        <span>{current.title}</span>
                        <p>{current.summary}</p>
                    </div>
                    <div className="build-progress" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                    </div>
                </div>
                <div className="project-phases">
                    {projectPhases.map((phase, index) => (
                        <details className="project-phase" key={phase.id} open={active === index}>
                            <summary
                                ref={(element) => {
                                    phaseRefs.current[index] = element;
                                }}
                                data-phase={index}
                                onClick={(event) => select(event, index)}
                                onKeyDown={(event) => keyboard(event, index)}
                            >
                                <span className="phase-index">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span>
                                    {phase.title}
                                    <small>{phase.summary}</small>
                                </span>
                                <span
                                    className={`phase-status${phase.isCurrent ? ' current' : ''}`}
                                >
                                    {phase.status}
                                </span>
                                <span className="expand" aria-hidden="true">
                                    +
                                </span>
                            </summary>
                            <p>{phase.detail}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function ExperienceKnowledge() {
    const visibility = useHomeVisibility<HTMLElement>('knowledge');
    const tilt = useHomeTilt();

    return (
        <section
            className="knowledge-section"
            ref={visibility.ref}
            onPointerEnter={() => useHomeInteraction.getState().react('knowledge', 1)}
            id="knowledge"
            data-region="knowledge"
            onFocusCapture={() => useHomeInteraction.getState().react('knowledge', 1)}
            data-home-section="knowledge"
            aria-labelledby="knowledge-heading"
        >
            <div className="shell knowledge-inner">
                <div>
                    <h2 id="knowledge-heading">
                        把学过的东西，
                        <br />
                        变成自己的理解<span>。</span>
                    </h2>
                    <p>
                        写方案，也写踩过的坑。
                        <br />
                        让零散的经验找到彼此，让下一次出发有迹可循。
                    </p>
                    <Link className="button light" data-cursor="看看" to="/knowledge">
                        翻开知识库 <span aria-hidden="true">↗</span>
                    </Link>
                </div>
                <div
                    className={`knowledge-art${visibility.visible ? ' is-in-view' : ''}`}
                    {...tilt}
                    data-knowledge-art
                    data-loop
                >
                    <span className="asterisk" data-home-asterisk aria-hidden="true">
                        ✳
                    </span>
                    <Link
                        style={tilt.style}
                        className="knowledge-topic topic-one"
                        data-knowledge-topic
                        data-cursor="看看"
                        to="/knowledge"
                    >
                        前端基础 <span aria-hidden="true">↗</span>
                    </Link>
                    <Link
                        className="knowledge-topic topic-two"
                        data-knowledge-topic
                        data-cursor="看看"
                        to="/knowledge"
                    >
                        项目实践 <span aria-hidden="true">↗</span>
                    </Link>
                    <Link
                        className="knowledge-topic topic-three"
                        data-knowledge-topic
                        data-cursor="看看"
                        to="/knowledge"
                    >
                        Agent 开发 <span aria-hidden="true">↗</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}

export function ExperienceWishlist() {
    const index = useStore(homeStore, (state) => state.wishlistIndex);
    const touch = useRef<[number, number] | null>(null);

    useEffect(() => {
        useHomeInteraction
            .getState()
            .announce(`${index + 1} / ${wishItems.length}，${wishItems[index].title.join('')}`);
    }, [index]);

    // 延续原来的首页 store，切换路由后回来仍停在刚才读到的愿望。
    const move = (offset: number) => {
        const state = homeStore.getState();

        state.setWishlistIndex(
            (state.wishlistIndex + offset + wishItems.length) % wishItems.length,
        );
    };
    const previous = () => move(-1);
    const next = () => move(1);
    const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
    };
    const touchStart = (event: TouchEvent<HTMLDivElement>) => {
        touch.current = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    };
    const touchEnd = (event: TouchEvent<HTMLDivElement>) => {
        if (!touch.current) return;

        const dx = event.changedTouches[0].clientX - touch.current[0];
        const dy = event.changedTouches[0].clientY - touch.current[1];
        touch.current = null;

        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) move(dx < 0 ? 1 : -1);
    };

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
                    把学过的东西和经验，用自己的话写成文档。
                    <br />
                    也想做一些可以亲手试的小东西。
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
                        <span className="wish-label">以后想做的事</span>
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

export function ExperienceContact() {
    const { copied, copy } = useClipboard();
    const [fallback, setFallback] = useState(false);
    const lastFeedback = useRef(0);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const magnet = useHomeMagnet();
    const reduced = useReducedMotion();
    const [celebration, setCelebration] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!celebration) return;

        const timer = window.setTimeout(() => setCelebration(null), 900);

        return () => clearTimeout(timer);
    }, [celebration]);

    let copyHint = '点击复制邮箱';

    if (copied) copyHint = '邮箱已复制';
    else if (fallback) copyHint = '复制受限，可手动复制或打开邮件应用';

    const copyEmail = useCallback(async () => {
        try {
            const ok = await copy(contactEmail);
            setFallback(!ok);
            useHomeInteraction.getState().react(ok ? 'copied' : 'copyFailed');

            if (ok && !reduced && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setCelebration({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }

            // 按钮反馈即时更新，读屏与弹出提示留出间隔，连点也不会刷屏。
            if (Date.now() - lastFeedback.current >= 4000) {
                lastFeedback.current = Date.now();

                if (ok) toast.success('邮箱已复制，期待你的来信。');
                else toast.info('请手动复制邮箱，或使用邮件入口。');
            }
        } catch {
            setFallback(true);
        }
    }, [copy, reduced]);

    useEffect(() => useHomeInteraction.getState().registerAction('email', copyEmail), [copyEmail]);

    return (
        <section
            className="contact-section"
            id="contact"
            data-region="contact"
            onPointerEnter={() => useHomeInteraction.getState().react('contact', 1)}
            onFocusCapture={() => useHomeInteraction.getState().react('contact', 1)}
        >
            {celebration
                ? Array.from({ length: 10 }, (_, index) => (
                      <span
                          key={index}
                          className="home-confetti"
                          aria-hidden="true"
                          style={
                              {
                                  left: celebration.x,
                                  top: celebration.y,
                                  '--dx': `${Math.cos(index * 0.63) * 90}px`,
                                  '--dy': `${Math.sin(index * 0.63) * 70 - 30}px`,
                              } as React.CSSProperties
                          }
                      >
                          ✳
                      </span>
                  ))
                : null}
            <div className="shell contact-main">
                <h2>
                    有想法，
                    <br />
                    欢迎来聊聊<span className="blue">。</span>
                </h2>
                <div className="contact-details">
                    <p>技术交流、项目合作，或者分享一个有意思的问题。</p>
                    <button
                        className="email-button"
                        {...magnet}
                        ref={buttonRef}
                        id="copy-email"
                        data-magnet
                        onClick={copyEmail}
                    >
                        {contactEmail}
                        <span aria-hidden="true">↗</span>
                    </button>
                    <p className="copy-hint">{copyHint}</p>
                    {fallback ? <a href={`mailto:${contactEmail}`}>打开邮件应用 →</a> : null}
                </div>
            </div>
        </section>
    );
}
