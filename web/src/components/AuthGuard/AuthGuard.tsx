import type { ReactNode } from 'react';
import { useUserStore } from '@/stores/user';
import NoPermission from '../NoPermission/NoPermission';

interface Props {
    children: ReactNode;
}

/**
 * 路由守卫组件
 * 负责 admin 及其子页面的用户权限校验
 */
export default function AuthGuard({ children }: Props) {
    const role = useUserStore((s) => s.userInfo?.role);

    // 没拿到用户信息或角色不是管理员，都交给无权限页处理
    if (role !== 'admin') {
        return <NoPermission />;
    }

    // 校验通过才渲染真正的页面内容
    return <>{children}</>;
}
