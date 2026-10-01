import type { CarouselItem, ContactItem, JourneyItem, ProjectPhase, WishItem } from '../types/home';

// 项目节点与详情共用同一份数据，交互只保存当前索引。
export const projectPhases: readonly ProjectPhase[] = [
  {
    id: 'idea',
    status: '想法',
    stepTitle: '先把问题写下来',
    caption: '决定这个小站为什么存在',
    isCurrent: false,
    kicker: '从需求开始，而不是从功能清单开始',
    title: '先想清楚，什么值得留下。',
    description:
      '知页既是个人博客，也是长期使用的知识库。首页负责让人认识我，知识库负责把内容讲清楚。先保证记录、查找和阅读这条主线足够顺畅，再慢慢扩展。',
    tags: ['个人表达', '内容组织', '长期使用'],
  },
  {
    id: 'prototype',
    status: '当前 · 原型设计',
    stepTitle: '给想法一个样子',
    caption: '博客有个性，阅读有留白',
    isCurrent: true,
    kicker: '当前阶段 / 正在打磨首页与知识库原型',
    title: '有个性的首页，安静的阅读空间。',
    description:
      '首页用轮播、时间轴和手记展示个人经历；知识库减少装饰，把空间留给文章。两边共用阿里巴巴普惠体、蓝色强调和导航，让从认识我到阅读内容的过程连贯自然。',
    tags: ['个人博客', '阅读体验', '原型设计'],
  },
  {
    id: 'publishing',
    status: '接下来',
    stepTitle: '打通写作与阅读',
    caption: '让一篇笔记完整走到读者面前',
    isCurrent: false,
    kicker: '下一步 / 从一份草稿到一篇公开文章',
    title: '让写作和阅读，完整地连起来。',
    description:
      '计划用 MDXEditor 完成编辑，react-markdown 负责阅读展示。围绕草稿、发布和登录后的阅读范围，把内容从写下到被读到的流程接通。这部分目前还在设计阶段。',
    tags: ['Markdown', '草稿与发布', '尚未实现'],
  },
  {
    id: 'iteration',
    status: '持续迭代',
    stepTitle: '在使用中慢慢打磨',
    caption: '把细节交给真实的问题',
    isCurrent: false,
    kicker: '后续计划 / 用真实需求决定下一次迭代',
    title: '留一点空白，给以后的自己。',
    description:
      '先把基础体验做好，再根据使用中的问题逐步增加能力。可能是一条更清楚的学习路线，也可能是一个可以亲手操作的功能演练场。新增什么，由真实需要来决定。',
    tags: ['持续使用', '功能演练', '未来计划'],
  },
];

// 当前只展示已确认的三个主题，不自动播放。
export const carouselItems: readonly CarouselItem[] = [
  {
    id: 'notes',
    kicker: 'NOTES & THOUGHTS',
    title: ['把学过的东西，', '真正变成自己的。'],
    content: ['记录答案，也记录它是怎么来的。', '从零散的知识，到可以串起来的理解。'],
    href: '/knowledge',
    linkLabel: '翻开我的笔记',
    description: '学习笔记，慢慢长成知识库。',
  },
  {
    id: 'building',
    kicker: 'IDEAS INTO THINGS',
    title: ['想法不只放在脑海，', '也想把它做出来。'],
    content: ['从第一张草图，到第一个能用的版本。', '记录那些决定、取舍，还有推倒重来的时刻。'],
    href: '#projects',
    linkLabel: '看看项目手记',
    description: '把一个想法，认真做成能用的东西。',
  },
  {
    id: 'life',
    kicker: 'ALONG THE WAY',
    title: ['每走过一段路，', '都留下一点痕迹。'],
    content: ['学习、工作，和一次次重新出发。', '有些变化很小，回头看却已经走了很远。'],
    href: '#journey',
    linkLabel: '沿着时间往回看',
    description: '沿着时间，看看那些走过的路。',
  },
];

// 保留当前展示内容，阶段卡片和标签都从配置中生成。
export const journeyItems: readonly JourneyItem[] = [
  {
    id: 'learning-start',
    year: '2020',
    stage: '学习的起点',
    title: '第一次，让想法出现在屏幕上。',
    content: '从一个简单的页面开始，认识代码怎样变成界面。比起记住答案，更想知道它为什么这样工作。',
    tags: ['基础学习', '保持好奇'],
    caption: 'THE BEGINNING',
    direction: 'left',
    isCurrent: false,
  },
  {
    id: 'project-practice',
    year: '2022',
    stage: '走进实践',
    title: '从会写一段代码，到做完一个项目。',
    content: '开始把分散的知识放进真实场景。遇到问题、查找原因、重新调整，也逐渐学会为自己的选择做解释。',
    tags: ['项目实践', '解决问题'],
    caption: 'LEARNING BY DOING',
    direction: 'right',
    isCurrent: false,
  },
  {
    id: 'work-growth',
    year: '2024',
    stage: '工作中的成长',
    title: '开始在意，代码以外的事情。',
    content: '除了把功能做出来，也开始关注沟通、边界和长期维护。真正的进步，往往来自那些需要多想一步的细节。',
    tags: ['工程思考', '协作与复盘'],
    caption: 'BEYOND THE CODE',
    direction: 'left',
    isCurrent: false,
  },
  {
    id: 'new-start',
    year: '2026',
    stage: '记录新的开始',
    title: '搭一个小院，安放这些经历。',
    content: '把学习过程、开发经验和还没想通的问题，慢慢整理成自己的知识库。知页从这里开始，也会继续生长。',
    tags: ['个人博客', '知识沉淀'],
    caption: 'STILL EXPLORING',
    direction: 'right',
    isCurrent: true,
  },
];

export const wishItems: readonly WishItem[] = [
  {
    id: 'playground',
    color: 'blue',
    icon: 'code',
    title: ['一个可以亲手试的', '功能演练场'],
    content: '把拖拽、文件处理和编辑器这些功能，做成可以体验、可以拆解的小模块。',
    status: '计划中',
    caption: 'LEARN BY PLAYING',
  },
  {
    id: 'learning-path',
    color: 'warm',
    icon: 'book',
    title: ['把分散的笔记', '串成学习路线'],
    content: '围绕一个问题，从基础原理走到完整实践。让每一篇文章，都能找到下一步。',
    status: '慢慢整理',
    caption: 'CONNECT THE DOTS',
  },
  {
    id: 'project-notes',
    color: 'green',
    icon: 'link',
    title: ['分享更多', '做项目的真实过程'],
    content: '讲方案，也讲踩过的坑。把权衡和复盘写下来，让经验不只停留在结果里。',
    status: '持续记录',
    caption: 'SHARE THE PROCESS',
  },
];

// 尚未填写的联系方式只展示占位内容，不生成无法使用的链接。
export const contactItems: readonly ContactItem[] = [
  { id: 'email', label: '邮箱', value: '待填写邮箱地址', status: '待补充' },
  { id: 'github', label: 'GitHub', value: '待填写个人主页', status: '待补充' },
];
