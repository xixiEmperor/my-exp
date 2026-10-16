export interface NavigationItem {
    id: string;
    label: string;
    to: string;
    activePath?: string;
}

// 页面入口与锚点入口分开描述，只有页面入口参与当前路由高亮。
export const mainNavigation: readonly NavigationItem[] = [
    { id: 'home', label: '首页', to: '/', activePath: '/' },
    {
        id: 'knowledge',
        label: '知识库',
        to: '/knowledge',
        activePath: '/knowledge',
    },
];

// 侧栏快捷跳转和顶栏探索菜单共用这一份，不再另抄一份。
export const sectionNavigation: readonly NavigationItem[] = [
    { id: 'journey', label: '我的经历', to: '/#journey' },
    { id: 'projects', label: '项目手记', to: '/#projects' },
    { id: 'wishlist', label: '以后想做的事', to: '/#wishlist' },
    { id: 'contact', label: '联系我', to: '/#contact' },
];
