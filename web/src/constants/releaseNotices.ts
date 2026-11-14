import type { ReleaseNotice } from '../types/home';

// 按发布日期从新到旧维护，发版后追加日期、说明和本次变化。
// 初始通知采用站主提供的上线示例，实际发版时可直接替换这条内容。
export const releaseNotices: readonly ReleaseNotice[] = [
    {
        id: 'launch-2026-11-03',
        date: '2026-11-03',
        title: '小站正式发布上线了',
        description: '小站和大家见面了。这里会记录每次发版新增的功能和调整。',
        changes: [
            '首页展示个人经历，沿着时间轴了解我的学习和开发过程。',
            '知识库集中展示笔记，方便查找和阅读。',
        ],
    },
];
