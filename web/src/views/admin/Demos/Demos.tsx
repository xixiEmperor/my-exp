import { useEffect, useState } from 'react';
import { getDemoResources } from '@/api/demos';
import { useRequest } from '@/hooks/useRequest';
import DemoResourceDialog from '@/components/DemoResourceForm/DemoResourceDialog';
import styles from './Demos.module.scss';

export default function Demos() {
    const { data, loading, error, run } = useRequest(getDemoResources);
    const resources = data ?? [];
    const errorMessage = error instanceof Error ? error.message : '';
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        // 页面初始加载资源表，目录查询只在打开新增表单后进行。
        void run();
    }, [run]);

    return (
        <section className={styles.page} aria-labelledby="demo-heading">
            <header className={styles.header}>
                <div>
                    <p>DEMO / 管理</p>
                    <h1 id="demo-heading">demo 管理</h1>
                    <span>管理已上传的 demo 资源、实现目录和版本。</span>
                </div>
                <button
                    type="button"
                    className={styles.primary}
                    disabled={loading || showForm}
                    onClick={() => setShowForm(true)}
                >
                    ＋ 新增 demo
                </button>
            </header>
            {/* 查询尚未接入时明确提示，不伪装成数据库没有记录。 */}
            {errorMessage ? (
                <div className={styles.notice} role="status">
                    {errorMessage}{' '}
                    <button
                        type="button"
                        onClick={() => {
                            void run();
                        }}
                    >
                        重新加载
                    </button>
                </div>
            ) : null}
            <div className={styles.tableWrap} aria-busy={loading}>
                <table>
                    <caption>demo 资源列表</caption>
                    <thead>
                        <tr>
                            <th>资源 ID / demo ID</th>
                            <th>实现目录</th>
                            <th>版本</th>
                            <th>R2 资源前缀</th>
                            <th>源码 / 排除规则</th>
                            <th>创建 / 更新时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resources.map((resource) => (
                            <tr key={resource.id}>
                                <td>
                                    {resource.id}
                                    <small>{resource.demo_entry_id}</small>
                                </td>
                                <td>{resource.implementation}</td>
                                <td>{resource.verison}</td>
                                <td>{resource.r2_prefix}</td>
                                <td>
                                    <details>
                                        <summary>{resource.file_paths.length} 个文件</summary>
                                        {resource.file_paths.map((path) => (
                                            <code key={path}>{path}</code>
                                        ))}
                                    </details>
                                    <small>
                                        排除：{resource.exclude_paths?.join('、') || '无'}
                                    </small>
                                </td>
                                <td>
                                    {resource.created_at}
                                    <small>{resource.updated_at}</small>
                                </td>
                            </tr>
                        ))}
                        {!resources.length ? (
                            <tr>
                                <td colSpan={6} className={styles.empty}>
                                    {loading ? '正在加载资源…' : '暂无可展示的资源记录'}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
            {/* 关闭表单即卸载，下一次新增从未选择状态重新开始。 */}
            {showForm ? (
                <>
                    {/* 模态框负责焦点、遮罩和 Esc，表单保留自己的取消按钮。 */}
                    <DemoResourceDialog onClose={() => setShowForm(false)} />
                </>
            ) : null}
        </section>
    );
}
