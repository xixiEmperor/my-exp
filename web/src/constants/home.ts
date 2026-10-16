import type { FutureItem, HeroContent, JourneyItem, ProjectPhase, WishItem } from '../types/home';

// 首页所有展示内容集中在这一份配置里，组件只读取，不再各自维护副本。

// 联系方式还没有真实内容。填入邮箱后，联系面板的复制按钮会自动可用。
export const contactEmail = '2559762795@qq.com';

export const heroContent: HeroContent = {
    title: {
        lead: '欢迎来到',
        highlight: 'xixiEmperor',
        tail: '的个人博客 & 知识库',
    },
    intro: '这里记录我的学习与工作经历，也收纳值得反复琢磨的技术知识。你可以沿着时间轴认识我，也可以在知识库看看有没有对你有价值的东西。',
    primaryAction: { label: '认识我的经历', href: '#journey' },
    secondaryAction: { label: '去知识库坐坐', href: '/knowledge' },
};

// 每个区块的标题区文案。四个区块共用 HomeSection 的结构，只换这里的文字。
export const sectionHeadings = {
    journey: {
        eyebrow: '开发生涯',
        title: '前端开发 → 不再分栈。',
        description:
            '从学长推荐前端，到实习接触跨端开发，再到 AI 爆发，学习其他技术栈已不再是难事，就这么一步一步被推着往前走，不过学起来倒也挺有意思，学无止境啊。',
        index: '01',
    },
    projects: {
        eyebrow: '开发历程',
        title: '项目的开发历程，也记录开发初心。',
        description:
            '暑期实习转正结束回学校背八股刷算法是真无聊，干脆利用已有的经验新起一个项目，锻炼锻炼架构能力，顺便沉淀沉淀。（都怪在线的Obsidian要氪金）',
        index: '02',
    },
    wishlist: {
        eyebrow: '未来计划',
        title: '持续沉淀 + 小巧思',
        description:
            '把学过的东西和经验都用自己的话写成文档加深理解，而且准备面试的时候翻看MDN，发现了一堆比较好玩的 Web API，以后用他们做点小东西，都放这项目里。',
        index: '03',
    },
};

// 纵向成长时间轴，阶段顺序就是数组顺序，节点编号由索引生成。
export const journeyItems: readonly JourneyItem[] = [
    {
        id: 'learning-start',
        year: '2024-07',
        stage: '学习的起点',
        title: '公式打法，黑马程序员起手，入门三件套和框架。',
        content:
            '每天学点无聊的html，css，这么多css属性到底谁能全记下来啊，而且感觉代码乱乱的。最后发现很多东西全部封装好了，学习框架的时候弹幕高呼《白学！》',
        isCurrent: false,
    },
    {
        id: 'first-project',
        year: '2025-03',
        stage: '走进实践',
        title: '跟学长一起做他的毕设，也是我的第一个项目。',
        content:
            '终于开始把分散的知识搭建成一个有意义的东西了，这会cursor出来不久，氪金用cursor，感觉前面又白学了，但第一次感觉有了AI学东西更快了',
        isCurrent: false,
    },
    {
        id: 'first-working-exp',
        year: '2025-07',
        stage: '第一段实习',
        title: '找到了第一段实习，不过是小厂。',
        content:
            '虽然是小厂，而且回头看感觉这项目也就是很简单一个项目，但还是让初出茅庐的我学到了很多东西，滚起了实习经历的小雪球。',
        isCurrent: false,
    },
    {
        id: 'second-project',
        year: '2025-09',
        stage: '依旧实践',
        title: '利用实习学到的知识，完成自己的第二个项目。',
        content:
            '这里我已经离职了，ld太push了，我明明已经按时按量完成了任务，还觉得我工作量不够，我直接就是离职沉淀准备跳槽大厂。',
        isCurrent: false,
    },
    {
        id: 'second-working-exp',
        year: '2025-11',
        stage: '第二段实习',
        title: '入职大厂，成为了百度人。',
        content:
            '我的两个项目和实习经历，让我也有了人人羡慕的大厂实习，开始接触更宏大的架构，也遇到了很好的同事和实习生，说真的现在依旧怀念百度。',
        isCurrent: false,
    },
    {
        id: 'third-project',
        year: '2025-12',
        stage: '第三个项目',
        title: '不断拓宽前端的技术视野。',
        content:
            '开始从Vue3转向React，真正学习了React之后才理解八股中对于两个框架生态的比较，React的生态真丰富啊，就是写起来比Vue3复杂点，但谁让大厂用React用的多呢。',
        isCurrent: false,
    },
    {
        id: 'third-working-exp',
        year: '2026-03',
        stage: '第三段实习',
        title: '暑期实习，我成为了鹅孝子。',
        content:
            '到这里我的技术视野和实习经历的雪球已经滚的很大了，投了腾讯的暑期提前批，本来只是想投着练手，没想到直接过了，那还说啥了，直接不面了，学新东西去咯',
        isCurrent: false,
    },
    {
        id: 'forth-project',
        year: '2026-04',
        stage: '第四个项目',
        title: '接触 Agent 应用开发。',
        content:
            '从百度离职后gap了一个月，开始狠狠地学期 Agent 开发，一方面是比较感兴趣，另一方面是环境所迫，不学真的没办法，不过学了一些之后，发现也没有想象中的那么难，还是得先学好后端基础。',
        isCurrent: false,
    },
    {
        id: 'after-summer',
        year: '2026-09',
        stage: '秋招',
        title: '成功转正，开始秋招。',
        content:
            '本以为三段实习两段大厂+211本已经能在秋招杀红眼了，没想到今年秋招环境这么差。不过还好，最终还是拿了腾讯，字节，携程的offer，没达到自己的预期，但今年真是有饭吃就是胜利啊',
        isCurrent: false,
    },
    {
        id: 'new-start',
        year: '2026-10',
        stage: '记录新的开始',
        title: '搭一个项目，安放这些经历。',
        content:
            '把学习过程、开发经验和还没想通的问题，慢慢整理成自己的知识库。希望有朝一日，我也能成为一个牛逼的架构师',
        isCurrent: true,
    },
];

// 横向项目时间轴。卡片收起时只显示标题和一句话，展开后补充细节。
export const projectPhases: readonly ProjectPhase[] = [
    {
        id: 'idea',
        step: 'STEP 01 · 想法',
        status: '想法',
        title: '先把问题写下来',
        summary: '决定这个小站为什么存在',
        detail: '这里既是个人博客，也是长期使用的知识库。首页负责让人认识我，知识库负责把内容讲清楚。先保证记录、查找和阅读这条主线足够顺畅，再慢慢扩展。',
        isCurrent: false,
    },
    {
        id: 'prototype',
        step: 'STEP 02 · 原型',
        status: '当前',
        title: '给想法一个样子',
        summary: '博客有个性，阅读有留白',
        detail: '首页用三栏工作台、时间轴和手记展示个人经历；知识库减少装饰，把空间留给文章。两边共用字体、主题色和导航，让从认识我到阅读内容的过程连贯自然。',
        isCurrent: true,
    },
    {
        id: 'publishing',
        step: 'STEP 03 · 内容',
        status: '接下来',
        title: '打通写作与阅读',
        summary: '让一篇笔记完整走到读者面前',
        detail: '计划用 MDXEditor 完成编辑，react-markdown 负责阅读展示。围绕草稿、发布和登录后的阅读范围，把内容从写下到被读到的流程接通。这部分目前还在设计阶段。',
        isCurrent: false,
    },
    {
        id: 'iteration',
        step: 'STEP 04 · 迭代',
        status: '持续迭代',
        title: '在使用中慢慢打磨',
        summary: '把细节交给真实的问题',
        detail: '先把基础体验做好，再根据使用中的问题逐步增加能力。可能是一条更清楚的学习路线，也可能是一个可以亲手操作的功能演练场。新增什么，由真实需要来决定。',
        isCurrent: false,
    },
];

// 愿望清单用轮播展示，色调由 tone 决定，具体色值在样式里映射。
export const wishItems: readonly WishItem[] = [
    {
        id: 'playground',
        tone: 'accent',
        icon: 'code',
        title: ['一个可以亲手试的', '功能演练场'],
        content: '把拖拽、文件处理和编辑器这些功能，做成可以体验、可以拆解的小模块。',
        status: '计划中',
        caption: 'LEARN BY PLAYING',
    },
    {
        id: 'learning-path',
        tone: 'mint',
        icon: 'book',
        title: ['把分散的笔记', '串成学习路线'],
        content: '围绕一个问题，从基础原理走到完整实践。让每一篇文章，都能找到下一步。',
        status: '慢慢整理',
        caption: 'CONNECT THE DOTS',
    },
    {
        id: 'project-notes',
        tone: 'purple',
        icon: 'link',
        title: ['分享更多', '做项目的真实过程'],
        content: '讲方案，也讲踩过的坑。把权衡和复盘写下来，让经验不只停留在结果里。',
        status: '持续记录',
        caption: 'SHARE THE PROCESS',
    },
];

// 未来计划用折叠卡展示，默认收起，点开才展开说明。
export const futureItems: readonly FutureItem[] = [
    {
        id: 'knowledge-graph',
        icon: 'link',
        title: '让知识彼此连接',
        status: 'KNOWLEDGE GRAPH · 探索中',
        detail: '为文章建立分类、标签和关联关系，逐步形成可浏览的知识脉络，而不只是按时间排列的文章列表。',
    },
    {
        id: 'interactive-labs',
        icon: 'code',
        title: '把技术原理做成实验',
        status: 'INTERACTIVE LABS · 计划中',
        detail: '为大文件上传、拖拽、虚拟列表、并发控制等主题制作可以调整参数、观察结果、对比实现方式的演练场。',
    },
    {
        id: 'ai-workflow',
        icon: 'sparkles',
        title: '探索 AI 与个人知识管理',
        status: 'AI WORKFLOW · 长期方向',
        detail: '在内容检索、知识问答和工作流之间找到实用的结合点，让模型能基于自己的内容完成检索、总结和辅助操作。',
    },
    {
        id: 'tiny-widgets',
        icon: 'grid',
        title: '做一个有温度的技术主页',
        status: 'TINY WIDGETS · 持续迭代',
        detail: '把天气、当地时间、阅读进度这类小功能放在两侧留白里，让主页有细节，但不干扰主要内容。',
    },
];

// 愿望清单轮播的无障碍提示，Swiper 与文案提示共用同一份。
export const wishlistA11y = {
    containerRoleDescriptionMessage: '愿望清单内容轮播',
    prevSlideMessage: '上一张愿望',
    nextSlideMessage: '下一张愿望',
    paginationBulletMessage: '查看第 {{index}} 张愿望',
    slideLabelMessage: '{{index}} / {{slidesLength}}',
};
