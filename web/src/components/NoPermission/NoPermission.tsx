import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../EmptyState/EmptyState';
import styles from './NoPermission.module.scss';

export interface NoPermissionProps {
    // 主标题，默认文案面向路由守卫拦截的场景
    title?: string;

    // 补充说明，调用方可以按页面写更具体的原因
    description?: string;

    // 底部操作区；不传时默认给一个回首页的链接
    action?: ReactNode;
}

// 无权限页。整页替换掉原本的页面内容，所以自己带上 main 标签，
// 让跳转主内容链接和读屏软件仍然能找到页面主体。
export default function NoPermission({
    title = '当前账号没有访问权限',
    description = '这个页面只对站点管理员开放，如果确实需要查看，请先切换成管理员账号。',
    action,
}: NoPermissionProps) {
    // action 没传时退回首页，避免用户卡在无权限页没有出路
    const finalAction = action ?? (
        <Link className={styles.back} to="/">
            回到首页
        </Link>
    );

    return (
        <main id="main" className={styles.page}>
            <EmptyState icon="lock" title={title} description={description} action={finalAction} />
        </main>
    );
}
