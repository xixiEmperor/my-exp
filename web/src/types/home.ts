import type { IconName } from '../components/SiteIcon/SiteIcon';

// 首页项目详情的数据契约，组件只展示内容，不维护额外副本。
export interface ProjectPhase {
  id: string;
  status: string;
  stepTitle: string;
  caption: string;
  isCurrent: boolean;
  kicker: string;
  title: string;
  description: string;
  tags: readonly string[];
}

// 阶段差异全部作为数据描述，时间轴只维护一份卡片结构。
export interface JourneyItem {
  id: string;
  year: string;
  stage: string;
  title: string;
  content: string;
  tags: readonly string[];
  caption: string;
  direction: 'left' | 'right';
  isCurrent: boolean;
}

export interface WishItem {
  id: string;
  color: 'blue' | 'warm' | 'green';
  icon: IconName;
  title: readonly [string, string];
  content: string;
  status: string;
  caption: string;
}

export interface ContactItem {
  id: string;
  label: string;
  value: string;
  status: string;
}

export type CarouselSceneId = 'notes' | 'building' | 'life';

// 文案、跳转与底部提示共用一份配置，避免轮播数量或顺序不同步。
export interface CarouselItem {
  id: CarouselSceneId;
  kicker: string;
  title: readonly [string, string];
  content: readonly [string, string];
  href: string;
  linkLabel: string;
  description: string;
}
