import { Link } from 'react-router-dom';
import PlaygroundStage from '@/components/PlaygroundStage/PlaygroundStage';
import { useHomeInteraction } from '@/stores/homeInteraction';
import styles from './HomePlayground.module.scss';

// 首页场景演练场导览板块：双栏两端对齐，左侧为说明与跳转入口，右侧嵌入互动机制演示台。
export default function HomePlayground() {
    return (
        <section
            className={`section shell ${styles.section}`}
            id="wishlist"
            data-region="wishlist"
            onPointerEnter={() => {
                useHomeInteraction.getState().react('wishlist', 1);
            }}
            onFocusCapture={() => {
                useHomeInteraction.getState().react('wishlist', 1);
            }}
            aria-labelledby="home-playground-heading"
        >
            <div className={styles.copy}>
                <h2 id="home-playground-heading">
                    光看文档不够直观
                    <br />
                    不如亲手跑一遍
                </h2>
                <p>
                    把虚拟列表、实时通信这些常见场景做成独立可运行的小实验，把源码和效果结合起来学习
                </p>
                <Link
                    to="/playground"
                    className={`button primary ${styles.action}`}
                    data-cursor="去试试"
                >
                    去场景演练场看看 <span aria-hidden="true">↗</span>
                </Link>
            </div>

            <div className={styles.stageWrap}>
                <PlaygroundStage />
            </div>
        </section>
    );
}
