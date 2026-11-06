import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/ui';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { HOME_ACCENT_STORAGE_KEY } from '../../config/homeAccent';
import { toast } from '../../utils/toast';

const commands = [
    { label: '回到首页', anchor: 'main', search: 'home' },
    { label: '查看我的经历', anchor: 'journey', search: 'journey' },
    { label: '查看项目', anchor: 'projects', search: 'project' },
    { label: '去知识库坐坐', route: '/knowledge', search: 'knowledge' },
    { label: '查看愿望清单', anchor: 'wishlist', search: 'wish' },
    { label: '联系我', anchor: 'contact', search: 'contact' },
    { label: '切换主题', control: 'theme', search: 'theme' },
    { label: '换成蓝色雕塑', accent: 'blue' as const, search: 'blue' },
    { label: '换成绿色雕塑', accent: 'green' as const, search: 'green' },
    { label: '换成橙色雕塑', accent: 'orange' as const, search: 'orange' },
    { label: '复制邮箱', control: 'email', search: 'email' },
    { label: '和小伙伴打招呼', control: 'buddy', search: 'buddy' },
    { label: '刷新当前位置的天气', control: 'weather', search: 'weather' },
    { label: '展开或收起完整历程', control: 'timeline', search: 'timeline' },
];

// 原生 dialog 保留 Escape 与焦点返回，命令只调用已有组件的入口。
export default function HomeCommands() {
    const dialog = useRef<HTMLDialogElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const navigate = useNavigate();
    const filtered = commands.filter((command) =>
        `${command.label} ${command.search}`.toLowerCase().includes(query.toLowerCase()),
    );
    const open = () => {
        setQuery('');
        setSelected(0);
        dialog.current?.showModal();
        input.current?.focus();
    };
    const close = () => dialog.current?.close();
    const execute = async (index: number) => {
        const command = filtered[index];

        if (!command) return;

        close();

        if (command.route) navigate(command.route);
        else if (command.anchor) document.getElementById(command.anchor)?.scrollIntoView();
        else if (command.accent) {
            useUIStore.getState().setHomeAccent(command.accent);

            try {
                localStorage.setItem(HOME_ACCENT_STORAGE_KEY, command.accent);
            } catch {
                // 当前主题仍可更新，不要求持久化一定成功。
            }
        } else if (command.control) {
            try {
                await useHomeInteraction.getState().actions[command.control]?.();
            } catch {
                toast.info('这次操作没有完成，请再试一次。');
            }
        }

        if (!command.control) toast.info(command.label);
    };
    const keyboard = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            execute(selected);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            setSelected(
                (previous) =>
                    (previous + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) %
                    Math.max(1, filtered.length),
            );
        }
    };

    useEffect(() => {
        const shortcut = (event: globalThis.KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                open();
            }
        };

        document.addEventListener('keydown', shortcut);

        return () => document.removeEventListener('keydown', shortcut);
    }, []);

    return (
        <>
            <button
                className="home-command-entry"
                aria-label="打开快捷命令，快捷键 Ctrl 或 Command K"
                onClick={open}
            >
                ⌘K
            </button>
            <dialog className="home-command-dialog" ref={dialog} aria-label="快捷命令">
                <div className="home-command-top">
                    <label htmlFor="home-command-search">想去哪里？</label>
                    <button onClick={close} aria-label="关闭命令面板">
                        ×
                    </button>
                </div>
                <input
                    id="home-command-search"
                    ref={input}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setSelected(0);
                    }}
                    onKeyDown={keyboard}
                    placeholder="查找板块或操作…"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-controls="home-command-list"
                    aria-activedescendant={filtered.length ? `home-command-${selected}` : undefined}
                />
                <div role="listbox" id="home-command-list" aria-label="可用命令">
                    {filtered.map((command, index) => (
                        <div
                            role="option"
                            tabIndex={-1}
                            id={`home-command-${index}`}
                            key={command.label}
                            aria-selected={index === selected}
                            onClick={() => execute(index)}
                        >
                            {command.label}
                            <span aria-hidden="true">↵</span>
                        </div>
                    ))}
                </div>
                {filtered.length === 0 ? <p>没有匹配的命令。</p> : null}
                <small>↑ ↓ 选择 · Enter 执行 · Esc 关闭</small>
            </dialog>
        </>
    );
}
