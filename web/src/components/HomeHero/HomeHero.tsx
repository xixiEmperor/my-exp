import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import type { ReactNode } from 'react';
import styles from './HomeHero.module.scss';

interface Props {
  children: ReactNode;
}

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function HomeHero({ children }: Props) {
  return (
    <section className={[styles['home-welcome'], styles['home-container']].join(' ')} id="about">
      <div className={styles['welcome-background']} aria-hidden="true"></div>
      <div className={styles['welcome-meta']}>
        <span className={styles['welcome-status']}>
          <i></i>一直在学，也一直在做
        </span>
        <span className={styles['welcome-edition']}>PERSONAL SPACE / VOL. 01</span>
      </div>
      <div className={styles['welcome-heading']}>
        <div className={styles['welcome-greeting']}>
          HELLO, NICE TO MEET YOU <span aria-hidden="true">✳</span>
        </div>
        <h1>
          你好，欢迎来到我的
          <span className={styles['hand-underline']}>
            数字小院
            <svg viewBox="0 0 340 20" preserveAspectRatio="none" aria-hidden="true">
              <path d="M5 13Q125 0 334 11M22 18Q160 9 306 16"></path>
            </svg>
          </span>
          。
        </h1>
        <p>
          这里有我的学习轨迹、开发手记，还有一些慢慢做出来的小东西。
          <br />
          你可以认识我，也可以翻开一篇笔记，带走一点新的理解。
        </p>
      </div>
      <div className={styles['welcome-links']}>
        <Link className={[styles.button, styles['button-primary']].join(' ')} to="/knowledge">
          去知识库坐坐
          <span data-icon="arrow">
            <SiteIcon name="arrow" />
          </span>
        </Link>
        <a className={styles['text-link']} href="#journey">
          看看我的来时路
          <span data-icon="down">
            <SiteIcon name="down" />
          </span>
        </a>
        <span className={styles['welcome-signature']}>记录，让走过的路有迹可循。</span>
      </div>

      {/* 轮播由按钮和键盘操作，不自动切换，避免打断正在阅读的内容。 */}
      {children}
      <div className={styles['welcome-end']}>
        <span>一个人的记录 · 一个不断生长的小站</span>
        <a href="#journey">
          向下，认识我
          <span data-icon="down">
            <SiteIcon name="down" />
          </span>
        </a>
      </div>
    </section>
  );
}
