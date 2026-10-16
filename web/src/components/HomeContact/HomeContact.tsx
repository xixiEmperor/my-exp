import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './HomeContact.module.scss';

interface Props {
    email: string;
    copied: boolean;
    onCopyEmail: () => void;
}

// 深色联系面板。邮箱还没配置时复制按钮保持不可用，避免点了没有任何反馈。
export default function HomeContact({ email, copied, onCopyEmail }: Props) {
    const hasEmail = email.length > 0;
    const copyLabel = copied ? '已复制 ✓' : '复制联系邮箱';

    return (
        <section className={styles.panel} id="contact">
            <div className={styles.copy}>
                <span className={styles.eyebrow}>SAY HELLO</span>
                <h2>有想法，欢迎来聊聊。</h2>
                <p>技术交流、项目合作，或者分享一个有意思的问题，都欢迎联系我。</p>
                {!hasEmail && (
                    <p className={styles.note}>
                        邮箱还没有填写。填入之后，这里的复制按钮会自动可用。
                    </p>
                )}
            </div>
            <div className={styles.actions}>
                <Link className={[styles.button, styles.primary].join(' ')} to="/knowledge">
                    先去知识库逛逛
                    <SiteIcon name="arrow" />
                </Link>
                <button
                    className={styles.button}
                    type="button"
                    disabled={!hasEmail}
                    onClick={onCopyEmail}
                >
                    <SiteIcon name="copy" />
                    {copyLabel}
                </button>
            </div>
        </section>
    );
}
