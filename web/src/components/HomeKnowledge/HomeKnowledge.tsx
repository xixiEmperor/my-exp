import { Link } from 'react-router-dom';
import { useHomeVisibility, useHomeTilt } from '../../hooks/useHomeExperience';
import { useHomeInteraction } from '../../stores/homeInteraction';

export default function HomeKnowledge() {
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
                        把学过的东西讲一遍，
                        <br />
                        变成自己的理解<span>。</span>
                    </h2>
                    <p>
                        写一些技术方案，也写踩过的坑。
                        <br />
                        把零散的经验构建成知识体系。
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
