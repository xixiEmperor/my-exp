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
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

interface Props {
    name: IconName;
}

// 无障碍名称一律由外层控件提供，图标本身对读屏隐藏。
export default function SiteIcon({ name }: Props) {
    const Icon = icons[name];

    return <Icon className={styles.icon} aria-hidden="true" focusable="false" />;
}
