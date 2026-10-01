import type { RefObject } from 'react';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './LoginPanel.module.scss';

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}

// 先完成遮罩结构，微信接口未接入时不生成假二维码或模拟登录成功。
export default function LoginPanel({ dialogRef, onClose }: Props) {
  return (
    <dialog ref={dialogRef} className={styles.panel} aria-labelledby="login-title" onCancel={onClose} onClose={onClose}>
      <div className={styles.header}>
        <span>知页.</span>
        <button type="button" onClick={onClose} aria-label="关闭登录">
          <SiteIcon name="close" />
        </button>
      </div>
      <div className={styles.body}>
        <h2 id="login-title">让好奇，继续往下走。</h2>
        <p>公众号验证码登录</p>
        <div className={styles.qrPlaceholder} role="status">
          <SiteIcon name="book" />
          <span>二维码准备中</span>
        </div>
        <label htmlFor="login-code">验证码</label>
        <input
          id="login-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="请输入 6 位验证码"
          maxLength={6}
          disabled
          aria-describedby="login-status"
        />
        <button className={styles.submit} type="button" disabled>
          登录，继续阅读
        </button>
        <p className={styles.status} id="login-status">
          微信登录服务尚未接入，暂不支持登录。
        </p>
      </div>
    </dialog>
  );
}
