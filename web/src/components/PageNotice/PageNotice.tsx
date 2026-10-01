import { Link } from 'react-router-dom';
import styles from './PageNotice.module.scss';

interface Props {
  title: string;
  description: string;
}

// 为暂未实现的站内入口提供明确反馈，避免首页链接落到空白页面。
export default function PageNotice({ title, description }: Props) {
  return (
    <main id="main" className={styles.notice}>
      <span>知页 · 持续生长</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link to="/">回到首页 →</Link>
    </main>
  );
}
