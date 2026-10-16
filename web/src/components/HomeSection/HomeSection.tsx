import type { ReactNode } from 'react';
import styles from './HomeSection.module.scss';

interface Props {
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    index: string;
    children: ReactNode;
}

// 首页各区块共用的标题区和外层留白，内容由调用方传入。
export default function HomeSection({ id, eyebrow, title, description, index, children }: Props) {
    return (
        <section className={styles.section} id={id}>
            <header className={styles.heading}>
                <div>
                    <span className={styles.eyebrow}>{eyebrow}</span>
                    <h2 className={styles.title}>{title}</h2>
                    <p className={styles.desc}>{description}</p>
                </div>
                <span className={styles.index}>{index}</span>
            </header>
            {children}
        </section>
    );
}
