import type { ReactNode } from 'react';
import { contactItems } from '../../constants/home';
import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './HomeContact.module.scss';

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function HomeContact() {
  // 联系方式统一由配置生成，补充内容时无需复制整行结构。
  const contactNodes: ReactNode[] = [];

  contactItems.forEach((item) => {
    contactNodes.push(
      <div key={item.id} className={styles['contact-row']}>
        <span>{item.label}</span>
        <span>{item.value}</span>
        <span className={styles['contact-placeholder']}>{item.status}</span>
      </div>,
    );
  });

  return (
    <section className={styles['contact-section']} id="contact">
      <div className={[styles['home-container'], styles['contact-inner']].join(' ')}>
        <div className={styles['contact-copy']} data-reveal="">
          <div className={styles['chapter-label']}>
            <span>04</span> LET'S SAY HELLO
          </div>
          <h2>
            代码之外，
            <br />
            也很高兴认识你<span>。</span>
          </h2>
          <p>
            可以聊聊前端、分享一个想法，
            <br />
            或者只是来打个招呼。
          </p>
          <Link className={[styles['button'], styles['button-primary']].join(' ')} to="/knowledge">
            先去知识库逛逛
            <span data-icon="arrow">
              <SiteIcon name="arrow" />
            </span>
          </Link>
        </div>
        <div className={styles['contact-card']} data-reveal="">
          <div className={styles['contact-card-heading']}>
            <span className={styles['contact-wave']} aria-hidden="true">
              hi.
            </span>
            <span>KEEP IN TOUCH</span>
          </div>
          {contactNodes}
          <p className={styles['contact-note']}>这里将展示真实联系方式，当前仅为布局示例。</p>
          <div className={styles['contact-card-footer']}>
            <span className={styles['tiny-square']}></span>保持好奇，下次见。
          </div>
        </div>
      </div>
    </section>
  );
}
