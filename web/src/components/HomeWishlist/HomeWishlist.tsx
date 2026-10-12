import type { ReactNode } from 'react';
import { wishItems } from '../../constants/home';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './HomeWishlist.module.scss';

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function HomeWishlist() {
  // 配色、图标和文案都是卡片数据，结构只维护一份。
  const wishNodes: ReactNode[] = [];

  wishItems.forEach((item, index) => {
    wishNodes.push(
      <article
        key={item.id}
        className={[styles['wish-card'], styles[`wish-${item.color}`]].join(' ')}
        data-reveal=""
      >
        <div className={styles['wish-top']}>
          <span className={styles['wish-check']} aria-hidden="true"></span>
          <span>WISH / {String(index + 1).padStart(3, '0')}</span>
        </div>
        <span className={styles['wish-icon']} data-icon={item.icon}>
          <SiteIcon name={item.icon} />
        </span>
        <h3>
          {item.title[0]}
          <br />
          {item.title[1]}
        </h3>
        <p>{item.content}</p>
        <div className={styles['wish-bottom']}>
          <span>{item.status}</span>
          <span>{item.caption}</span>
        </div>
      </article>,
    );
  });

  return (
    <section
      className={[styles['wishlist-section'], styles['home-container']].join(' ')}
      id="wishlist"
    >
      <div className={styles['chapter-heading']} data-reveal="">
        <div className={styles['chapter-label']}>
          <span>03</span> SOMEDAY, MAYBE
        </div>
        <div className={styles['chapter-heading-row']}>
          <h2>
            还想做一些，
            <br />
            有意思的小事情。
          </h2>
          <p>
            先把愿望写在这里。
            <br />
            不急着全部完成，一件一件慢慢来。
          </p>
        </div>
      </div>
      <div className={styles['wishlist-grid']}>{wishNodes}</div>
      <div className={styles['wishlist-handnote']} aria-hidden="true">
        <span>不用太着急，好东西慢慢长出来。</span>
        <svg viewBox="0 0 110 30">
          <path d="M3 5q45 33 98 6M91 4l12 7-8 11"></path>
        </svg>
      </div>
    </section>
  );
}
