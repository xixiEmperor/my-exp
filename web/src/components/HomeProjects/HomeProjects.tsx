import { projectPhases } from '../../constants/home';
import SiteIcon from '../SiteIcon/SiteIcon';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import type { ProjectPhase } from '../../types/home';
import styles from './HomeProjects.module.scss';

interface Props {
  activePhase: number;
  phase: ProjectPhase;
  onSelect: (index: number) => void;
  onHover: (event: PointerEvent<HTMLButtonElement>, index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function HomeProjects({ activePhase, phase, onSelect, onHover, onKeyDown }: Props) {
  const stepNodes: ReactNode[] = [];
  const tagNodes: ReactNode[] = [];

  // 导航和详情读取同一份配置，新增阶段时无需同步修改按钮结构。
  projectPhases.forEach((item, index) => {
    const isActive = activePhase === index;

    stepNodes.push(
      <button
        key={item.id}
        id={`phase-${index}`}
        role="tab"
        aria-controls="project-detail"
        data-phase={index}
        className={[styles['project-step'], isActive ? styles.active : ''].join(' ')}
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onSelect(index)}
        onFocus={() => onSelect(index)}
        onPointerEnter={(event) => onHover(event, index)}
        onKeyDown={(event) => onKeyDown(event, index)}
      >
        <span className={styles['step-position']}>{String(index + 1).padStart(2, '0')}</span>
        <span className={[styles['step-status'], item.isCurrent ? styles.current : ''].join(' ')}>
          {item.status}
        </span>
        <span className={styles['step-title']}>{item.stepTitle}</span>
        <span className={styles['step-caption']}>{item.caption}</span>
      </button>,
    );
  });

  phase.tags.forEach((tag) => {
    tagNodes.push(<span key={tag}>{tag}</span>);
  });

  return (
    <section className={styles['project-section']} id="projects">
      <div className={styles['home-container']}>
        <div className={styles['chapter-heading']} data-reveal="">
          <div className={styles['chapter-label']}>
            <span>02</span> BUILDING IN PUBLIC
          </div>
          <div className={styles['chapter-heading-row']}>
            <h2>
              从一个小念头，
              <br />
              到这个叫知页的地方。
            </h2>
            <p>
              不只展示结果，也记录过程。
              <br />
              那些为什么做、怎么做，都值得留下。
            </p>
          </div>
        </div>
        <div className={styles['project-intention']} data-reveal="">
          <span className={styles['intention-icon']} data-icon="spark">
            <SiteIcon name="spark" />
          </span>
          <div>
            <span className={styles['intention-label']}>开发初心 / WHY I BUILD THIS</span>
            <p>
              收藏了很多，却总在需要时重新搜索。
              <br />
              我想有个自己的地方，把学过的东西讲清楚，也把做过的事情留下来。
            </p>
          </div>
          <span className={styles['intention-doodle']} aria-hidden="true">
            idea
            <br />
            <svg viewBox="0 0 70 25">
              <path d="M3 6q40 22 61 4M53 4l12 6-10 9"></path>
            </svg>
          </span>
        </div>
        <div className={styles['project-rail-wrap']} data-reveal="">
          <div className={styles['project-rail']} role="tablist" aria-label="知页开发历程">
            {stepNodes}
          </div>
        </div>
        <div
          className={styles['project-detail']}
          id="project-detail"
          role="tabpanel"
          tabIndex={0}
          data-reveal=""
          aria-labelledby={`phase-${activePhase}`}
        >
          <div className={styles['project-detail-number']} id="project-detail-number">
            {String(activePhase + 1).padStart(2, '0')}
          </div>
          <div className={styles['project-detail-main']}>
            <div className={styles['detail-kicker']} id="project-detail-kicker">
              {phase.kicker}
            </div>
            <h3 id="project-detail-title">{phase.title}</h3>
            <p id="project-detail-description">{phase.description}</p>
            <div className={styles['detail-tags']} id="project-detail-tags">
              {tagNodes}
            </div>
          </div>
          <span className={styles['detail-corner']} aria-hidden="true">
            ↗
          </span>
        </div>
        <div className={styles['project-footnote']}>
          <span data-icon="info">
            <SiteIcon name="info" />
          </span>
          悬浮或点击节点，看看这一步的思考与取舍。
        </div>
      </div>
    </section>
  );
}
