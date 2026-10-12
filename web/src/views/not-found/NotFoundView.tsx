import PageNotice from '../../components/PageNotice/PageNotice';

// 未知地址提供可返回的入口，不把路由错误直接暴露给读者。
export default function NotFoundView() {
  return (
    <PageNotice
      title="这一页还没有留下记录。"
      description="链接可能已变化，可以先回到首页继续浏览。"
    />
  );
}
