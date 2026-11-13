import siteMark from '../../assets/siteicon-transparent.png';
import styles from './SiteMark.module.scss';

// 站点署名统一使用透明图标，旁边已有名称时不重复朗读。
export default function SiteMark({ size = 28 }: { size?: number }) {
    return <img className={styles.mark} src={siteMark} width={size} height={size} alt="" />;
}
