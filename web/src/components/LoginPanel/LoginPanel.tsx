import { type RefObject, useRef } from 'react';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './LoginPanel.module.scss';
import gzh from '@/assets/gzh.jpg';
import { login } from '@/api/users';

interface Props {
    dialogRef: RefObject<HTMLDialogElement | null>;
    onClose: () => void;
}

// 先完成遮罩结构，微信接口未接入时不生成假二维码或模拟登录成功。
export default function LoginPanel({ dialogRef, onClose }: Props) {
    const idRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);

    const handleLogin = async () => {
        const code = codeRef.current?.value;
        const loginId = idRef.current?.value;

        if (code?.length !== 6) return;

        await login(loginId!, code);
    };

    return (
        <dialog
            ref={dialogRef}
            className={styles.panel}
            aria-labelledby="login-title"
            onCancel={onClose}
            onClose={onClose}
        >
            <div className={styles.header}>
                <span>xixiEmperor.</span>
                <button type="button" onClick={onClose} aria-label="关闭登录">
                    <SiteIcon name="close" />
                </button>
            </div>
            <div className={styles.body}>
                <h2 id="login-title">让好奇，继续往下走。</h2>
                <p>公众号验证码登录</p>
                <div className={styles.qrPlaceholder} role="status">
                    <img src={gzh} alt="" />
                </div>
                <div className={styles.loginForm}>
                    <input
                        ref={idRef}
                        id="login-id"
                        autoComplete="one-time-code"
                        placeholder="请输入loginId"
                        aria-describedby="login-status"
                    />
                    <input
                        ref={codeRef}
                        id="login-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="请输入 6 位验证码"
                        maxLength={6}
                        aria-describedby="login-status"
                    />
                </div>
                <button className={styles.submit} type="button" onClick={handleLogin}>
                    登录，继续阅读
                </button>
            </div>
        </dialog>
    );
}
