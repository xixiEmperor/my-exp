import { useEffect, useRef, useState } from 'react';
import SiteIcon from '../SiteIcon/SiteIcon';
import type { UserInfo } from '../../types/user';
import styles from './UserMenu.module.scss';

interface Props {
    userInfo: UserInfo;
    onLogout: () => void;
}

// 登录后的账号入口。组件只管展开收起这类界面状态，
// 点菜单之后要跳哪里、怎么退登都由参数交给外部处理。
export default function UserMenu({ userInfo, onLogout }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // 展开期间才挂全局监听，收起之后不留多余的监听器。
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        // 用 pointerdown 而不是 click，鼠标按下时就能收起，
        // 不会出现按在别处、松手后才反应过来的迟滞感。
        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        // Esc 收起后焦点回到入口按钮，键盘用户不会掉在半空中。
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            setIsOpen(false);
            triggerRef.current?.focus();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // 头像里放名字首字，中文取第一个汉字，英文名统一转成大写。
    const initial = userInfo.name.trim().slice(0, 1).toUpperCase();

    const handleToggle = () => {
        setIsOpen((open) => !open);
    };

    // 两个动作都先收起菜单，再交给外部，避免菜单盖在跳转后的页面上。
    const handleProfile = () => {
        setIsOpen(false);
    };

    const handleLogout = () => {
        setIsOpen(false);
        onLogout();
    };

    return (
        <div ref={rootRef} className={styles['user-menu']}>
            <button
                ref={triggerRef}
                type="button"
                className={styles.trigger}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={handleToggle}
            >
                <span className={styles.avatar} aria-hidden="true">
                    {initial}
                </span>
                <span className={styles.name}>{userInfo.name}</span>
                <span className={styles.caret} data-icon="">
                    <SiteIcon name="down" />
                </span>
            </button>
            {isOpen && (
                <div className={styles.menu} role="menu" aria-label="账号菜单">
                    {/* 菜单顶部再报一次身份，展开后不必回头看入口文字。 */}
                    <div className={styles.identity}>
                        <span className={styles['identity-name']}>{userInfo.name}</span>
                        <span className={styles['identity-role']}>{userInfo.role}</span>
                    </div>
                    <button
                        type="button"
                        role="menuitem"
                        className={styles.item}
                        onClick={handleProfile}
                    >
                        <SiteIcon name="user" />
                        <span>个人主页</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className={styles.item}
                        data-danger=""
                        onClick={handleLogout}
                    >
                        <SiteIcon name="logout" />
                        <span>退出登录</span>
                    </button>
                </div>
            )}
        </div>
    );
}
