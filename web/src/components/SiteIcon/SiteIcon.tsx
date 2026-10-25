import type { CSSProperties } from 'react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Check,
    ChevronRight,
    CircleCheck,
    CircleX,
    Clock,
    Cloud,
    CodeXml,
    Compass,
    Copy,
    Droplet,
    FileText,
    Gauge,
    Globe,
    Info,
    Layers,
    LayoutGrid,
    Link as LinkIcon,
    List,
    Lock,
    LogOut,
    MapPin,
    Menu,
    Moon,
    Search,
    Server,
    Sparkle,
    Sparkles,
    Sun,
    TriangleAlert,
    User,
    Wind,
    X,
    FolderClosed,
    File,
    UserRoundPen,
    FilePlus,
    FolderPlus,
    FolderPen,
    Save,
    SavePen,
    Send,
    type LucideIcon,
} from 'lucide-react';
import styles from './SiteIcon.module.scss';

// 图标统一取自 lucide，只有键名留在这里，调用方按业务语义取名。
// 尺寸、线宽和颜色都由 .icon 统一控制，颜色继承当前文字色。
const icons = {
    brand: FileText,
    arrow: ArrowRight,
    'arrow-left': ArrowLeft,
    'arrow-up': ArrowUpRight,
    down: ArrowDown,
    chevron: ChevronRight,
    book: BookOpen,
    code: CodeXml,
    server: Server,
    spark: Sparkle,
    globe: Globe,
    grid: LayoutGrid,
    clock: Clock,
    search: Search,
    close: X,
    menu: Menu,
    list: List,
    lock: Lock,
    user: User,
    logout: LogOut,
    check: Check,
    success: CircleCheck,
    error: CircleX,
    alert: TriangleAlert,
    link: LinkIcon,
    info: Info,
    copy: Copy,
    sun: Sun,
    moon: Moon,
    sparkles: Sparkles,
    layers: Layers,
    compass: Compass,
    cloud: Cloud,
    wind: Wind,
    droplet: Droplet,
    gauge: Gauge,
    pin: MapPin,
    folder: FolderClosed,
    file: File,
    admin: UserRoundPen,
    createFile: FilePlus,
    createFolder: FolderPlus,
    renameFile: SavePen,
    renameFolder: FolderPen,

    // 编辑器工具栏用：存草稿和发布各留一个语义化的名字
    save: Save,
    publish: Send,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

interface Props {
    name: IconName;
    /** 调用方追加的类名，用来覆盖 .icon 管不到的颜色、间距等样式 */
    className?: string;
    /** 图标边长，数字按 px 处理，字符串会原样透传给 CSS，不传沿用 .icon 里的 20px */
    size?: number | string;
    /** 线宽，不传沿用 .icon 里的默认值 */
    strokeWidth?: number;
    /** 行内样式，优先级最高，留给个别需要微调的位置 */
    style?: CSSProperties;
}

// 无障碍名称一律由外层控件提供，图标本身对读屏隐藏。
export default function SiteIcon({ name, className, size, strokeWidth, style }: Props) {
    const Icon = icons[name];

    // 尺寸和线宽通过 CSS 变量下发，让调用方既能用 props 控制，
    // 也能继续用外部样式覆盖，不用和 .icon 里的默认值抢优先级
    const vars: Record<string, string> = {};
    if (size !== undefined) {
        vars['--icon-size'] = typeof size === 'number' ? `${size}px` : size;
    }
    if (strokeWidth !== undefined) {
        vars['--icon-stroke'] = String(strokeWidth);
    }

    return (
        <Icon
            className={className ? `${styles.icon} ${className}` : styles.icon}
            style={{ ...vars, ...style } as CSSProperties}
            aria-hidden="true"
            focusable="false"
        />
    );
}
