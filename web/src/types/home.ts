import type { IconName } from '../components/SiteIcon/SiteIcon';

// 首页各区域的数据契约，组件只展示内容，不维护额外副本。

// 项目卡片一句话说明在收起状态显示，详细内容在展开后显示。
export interface ProjectPhase {
    id: string;
    step: string;
    status: string;
    title: string;
    summary: string;
    detail: string;
    isCurrent: boolean;
}

export interface JourneyItem {
    id: string;
    year: string;
    stage: string;
    title: string;
    content: string;
    isCurrent: boolean;
}

// 愿望卡片的色调槽，具体色值由样式映射到点缀令牌。
export type WishTone = 'accent' | 'mint' | 'purple';

export interface WishItem {
    id: string;
    tone: WishTone;
    icon: IconName;
    title: readonly [string, string];
    content: string;
    status: string;
    caption: string;
}

export interface FutureItem {
    id: string;
    icon: IconName;
    title: string;
    status: string;
    detail: string;
}

export interface HeroTitle {
    lead: string;
    highlight: string;
    tail: string;
}

// 首页内的锚点用 # 开头，站内页面用路由路径，渲染时按前缀区分。
export interface HeroAction {
    label: string;
    href: string;
}

export interface HeroContent {
    title: HeroTitle;
    intro: string;
    primaryAction: HeroAction;
    secondaryAction: HeroAction;
}

export interface WeatherReading {
    temperature: number;
    symbol: string;
    description: string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;

    // 反查到的地名，形如「上海市 · 黄浦区」。查不到时是空串。
    location: string;

    // 浏览器实际返回的坐标，保留两位小数。用来核对定位有没有被网络出口带偏。
    coordinates: string;
}
