import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { CarouselItem, CarouselSceneId } from '../../types/home';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './HomeCarousel.module.scss';

// 三个场景是静态展示内容，滑动、分页和导航全部交给 Swiper。
const illustrations: Record<CarouselSceneId, ReactNode> = {
  notes: (
    <>
      {/* 右侧用纸页和文字表现知识库，不使用图片或复杂动效。 */}
      <div
        className={[styles['slide-illustration'], styles['notes-illustration']].join(' ')}
        aria-label="知识笔记纸页插画"
      >
        <div className={[styles['floating-label'], styles['label-top']].join(' ')}>
          THINK IN CONNECTIONS
        </div>
        <div className={styles['notebook-back']}></div>
        <div className={styles['notebook-page']}>
          <div className={styles['notebook-top']}>
            <span data-icon="book">
              <SiteIcon name="book" />
            </span>
            <span>知页 / 学习手记</span>
            <span>001</span>
          </div>
          <span className={styles['notebook-topic']}>前端开发 · React</span>
          <h3>
            从一次渲染，
            <br />
            理解一整个过程。
          </h3>
          <div className={styles['notebook-lines']}>
            <i></i>
            <i></i>
            <i></i>
          </div>
          <div className={styles['notebook-quote']}>
            写下来的时候，
            <br />
            才发现自己又懂了一点。
          </div>
          <div className={styles['notebook-bottom']}>
            <span>LEARN → UNDERSTAND</span>
            <span data-icon="link">
              <SiteIcon name="link" />
            </span>
          </div>
        </div>
        <span className={styles['note-sticker']}>
          慢慢来，
          <br />
          比较快。
        </span>
        <span
          className={[styles['notebook-spark'], styles['spark-a']].join(' ')}
          aria-hidden="true"
        >
          ✳
        </span>
        <span
          className={[styles['notebook-spark'], styles['spark-b']].join(' ')}
          aria-hidden="true"
        >
          +
        </span>
      </div>
    </>
  ),
  building: (
    <>
      <div
        className={[styles['slide-illustration'], styles['build-illustration']].join(' ')}
        aria-label="项目设计卡片插画"
      >
        <div className={styles['blueprint-grid']}></div>
        <div className={styles['build-window']}>
          <div className={styles['build-window-bar']}>
            <span>
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span>zhiye / workspace</span>
          </div>
          <div className={styles['build-window-body']}>
            <span className={styles['build-overline']}>FROM A SMALL IDEA</span>
            <h3>
              让一个想法，
              <br />
              有自己的形状。
            </h3>
            <div className={styles['build-wire']}>
              <span></span>
              <div>
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
            <div className={styles['build-ticks']}>
              <span>✓ 清楚的边界</span>
              <span>✓ 好用的细节</span>
            </div>
          </div>
        </div>
        <span className={styles['build-tag']}>
          WORK IN PROGRESS <span>↗</span>
        </span>
        <span className={styles['build-note']}>
          先做出来，
          <br />
          再慢慢变好。
        </span>
      </div>
    </>
  ),
  life: (
    <>
      <div
        className={[styles['slide-illustration'], styles['life-illustration']].join(' ')}
        aria-label="个人经历手记插画"
      >
        <div className={[styles.postcard, styles['postcard-back']].join(' ')}>
          <span>THE NEXT CHAPTER</span>
        </div>
        <div className={styles.postcard}>
          <div className={styles['postcard-stamp']}>
            知页
            <br />
            <span>JOURNAL</span>
          </div>
          <span className={styles['postcard-label']}>TO MY FUTURE SELF</span>
          <h3>
            保持好奇，
            <br />
            继续向前。
          </h3>
          <div className={styles['postcard-path']}>
            <span></span>
            <i></i>
            <span></span>
            <i></i>
            <span></span>
          </div>
          <p>起点 · 实践 · 新的开始</p>
          <div className={styles['postcard-bottom']}>每一段经历，都算数。</div>
        </div>
        <div className={styles['life-flower']} aria-hidden="true">
          ✳
        </div>
      </div>
    </>
  ),
};

interface Props {
  item: CarouselItem;
  index: number;
}

export default function CarouselScene({ item, index }: Props) {
  // 相同文案结构只渲染一次，插画按场景标识选择，各自保持独立。
  const linkContent = (
    <>
      {item.linkLabel}
      <span data-icon="arrow-up">
        <SiteIcon name="arrow-up" />
      </span>
    </>
  );

  return (
    <article className={[styles['personal-slide'], styles[`slide-${item.id}`]].join(' ')}>
      <div className={styles['slide-grid']} aria-hidden="true"></div>
      <div className={styles['slide-copy']}>
        <div className={styles['slide-kicker']}>
          <span>{String(index + 1).padStart(2, '0')}</span> {item.kicker}
        </div>
        <h2>
          {item.title[0]}
          <br />
          {item.title[1]}
        </h2>
        <p>
          {item.content[0]}
          <br />
          {item.content[1]}
        </p>
        {item.href.startsWith('#') ? (
          <a href={item.href} className={styles['slide-link']}>
            {linkContent}
          </a>
        ) : (
          <Link to={item.href} className={styles['slide-link']}>
            {linkContent}
          </Link>
        )}
      </div>
      {illustrations[item.id]}
    </article>
  );
}
