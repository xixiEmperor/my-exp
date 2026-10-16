import PageNotice from '../../components/PageNotice/PageNotice';

// 本轮只交付首页，知识库入口明确展示后续开发状态。
export default function KnowledgeView() {
    return (
        <PageNotice
            title="知识库正在准备中。"
            description="文章列表、阅读与编辑功能会在后续接入，这里暂不提供模拟内容。"
        />
    );
}
