import { journeyItems } from '../../constants/home';
import type { ReactNode, RefObject } from 'react';
import styles from './HomeJourney.module.scss';

interface Props {
  timelineRef: RefObject<HTMLDivElement | null>;
  progressRef: RefObject<HTMLElement | null>;
}
// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function HomeJourney({ timelineRef, progressRef }: Props) {
  // 每次渲染单独收集节点，阶段和标签都使用稳定的内容标识。
  const journeyNodes: ReactNode[] = [];

  journeyItems.forEach((item, index) => {
    const tagNodes: ReactNode[] = [];

    item.tags.forEach((tag) => {
      tagNodes.push(<span key={tag}>{tag}</span>);
    });

    const className = [
      styles['journey-item'],
      styles[`journey-${item.direction}`],
      item.isCurrent ? styles['journey-now'] : '',
    ].join(' ');

    journeyNodes.push(
      <article key={item.id} className={className} data-reveal="" data-reveal-direction={item.direction}>
        <div className={styles['journey-card']}>
          <div className={styles['journey-card-top']}>
            <span className={styles['journey-year']}>
              {item.year}
              {item.isCurrent && <span className={styles['now-marker']}>NOW</span>}
            </span>
            <span className={styles['journey-kind']}>{item.stage}</span>
          </div>
          <span className={styles['journey-node']} aria-hidden="true"></span>
          <h3>{item.title}</h3>
          <p>{item.content}</p>
          <div className={styles['journey-tags']}>{tagNodes}</div>
        </div>
        <div className={styles['journey-margin']}>
          <span>{item.caption}</span>
          <i>{String(index + 1).padStart(2, '0')}</i>
        </div>
      </article>,
    );
  });

  return (
    <section className={[styles['journey-section'], styles['home-container']].join(' ')} id="journey">
      <div className={styles['chapter-heading']} data-reveal="">
        <div className={styles['chapter-label']}>
          <span>01</span> MY JOURNEY
        </div>
        <div className={styles['chapter-heading-row']}>
          <h2>
            走过的路，
            <br />
            都藏在现在的自己里。
          </h2>
          <p>
            从第一次好奇，到把想法变成作品。
            <br />
            这里留下我的学习和工作轨迹。
          </p>
        </div>
        <div className={styles['sample-label']}>
          <span></span>以下年份与经历为排版示例，待替换为真实内容
        </div>
      </div>
      <div className={styles['journey-timeline']} id="journey-timeline" ref={timelineRef}>
        <div className={styles['journey-spine']} aria-hidden="true">
          <i id="journey-progress" ref={progressRef}></i>
        </div>
        {journeyNodes}
        <div className={styles['journey-next']}>
          <span></span>下一段故事，正在发生。
        </div>
      </div>
    </section>
  );
}
