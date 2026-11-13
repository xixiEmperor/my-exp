import { contactEmail } from '../../constants/home';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { useContactEmail } from './useContactEmail';

export default function HomeContact() {
    const { copyHint, fallback, celebration, buttonRef, magnet, copyEmail } = useContactEmail();

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
                    <p>技术交流、项目合作，或对于知识库中的某处内容有不同的看法，欢迎联系我。</p>
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
