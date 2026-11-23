import { useEffect, useState } from 'react';
import { useDemos } from '@/hooks/useDemos';
import { useDemosStore } from '@/stores/demos';
import type { DemoResource } from '@/types/demos';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog';
import DemoEditDialog from '@/components/DemoResourceForm/DemoEditDialog';
import DemoResourceDialog from '@/components/DemoResourceForm/DemoResourceDialog';
import { formatDate } from '@/utils/date';
import { toast } from '@/utils/toast';
import styles from './Demos.module.scss';

export default function Demos() {
    const resources = useDemosStore((state) => state.resources);
    const { resourcesRequest, deleteResourceRequest } = useDemos();
    const { loading, error, run: loadResources } = resourcesRequest;
    const { loading: deleting, run: removeDemoResource } = deleteResourceRequest;
    const errorMessage = error instanceof Error ? error.message : '';
    const [showForm, setShowForm] = useState(false);
    const [editingDemo, setEditingDemo] = useState<DemoResource | null>(null);
    const [deletingDemo, setDeletingDemo] = useState<DemoResource | null>(null);

    useEffect(() => {
        // 进入页面默认查询 demos 表中全部已记录的 demo 信息。
        void loadResources();
    }, [loadResources]);

    async function handleConfirmDelete() {
        if (!deletingDemo || deleting) return;

        const ok = await removeDemoResource(deletingDemo.id);

        if (ok) {
            toast.success('demo 已删除');
        }

        setDeletingDemo(null);
    }

    return (
        <section className={styles.page} aria-labelledby="demo-heading">
            <header className={styles.header}>
                <div>
                    <p>DEMO / 管理</p>
                    <h1 id="demo-heading">demo 管理</h1>
                    <span>管理已上传的 demo 展示信息、实现目录和版本。</span>
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
            {errorMessage ? (
                <div className={styles.notice} role="status">
                    {errorMessage}{' '}
                    <button
                        type="button"
                        onClick={() => {
                            void loadResources();
                        }}
                    >
                        重新加载
                    </button>
                </div>
            ) : null}
            <div className={styles.tableWrap} aria-busy={loading}>
                <table>
                    <caption>demo 列表</caption>
                    <thead>
                        <tr>
                            <th>名称 / slug</th>
                            <th>状态</th>
                            <th>实现目录</th>
                            <th>版本</th>
                            <th>创建时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resources.map((resource) => (
                            <tr key={resource.id}>
                                <td>{resource.name}</td>
                                <td className={styles.nowrap}>
                                    {resource.status === 'published' ? '已发布' : '草稿'}
                                </td>
                                <td>{resource.implementation}</td>
                                <td className={styles.nowrap}>{resource.verison}</td>
                                <td className={styles.nowrap}>{formatDate(resource.created_at)}</td>
                                <td>
                                    <div className={styles.rowActions}>
                                        <button
                                            type="button"
                                            className={styles.editBtn}
                                            onClick={() => setEditingDemo(resource)}
                                            disabled={deleting}
                                        >
                                            编辑
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.deleteBtn}
                                            onClick={() => setDeletingDemo(resource)}
                                            disabled={deleting}
                                        >
                                            删除
                                        </button>
                                    </div>
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
            {showForm ? <DemoResourceDialog onClose={() => setShowForm(false)} /> : null}
            {editingDemo ? (
                <DemoEditDialog demo={editingDemo} onClose={() => setEditingDemo(null)} />
            ) : null}
            <ConfirmDialog
                open={Boolean(deletingDemo)}
                title="删除 demo"
                description={
                    deletingDemo
                        ? `确认删除「${deletingDemo.name}」(v${deletingDemo.verison}) 吗？对应数据库记录和 R2 资源将被清理。`
                        : undefined
                }
                confirmText={deleting ? '删除中…' : '确认删除'}
                danger
                onConfirm={() => {
                    void handleConfirmDelete();
                }}
                onClose={() => {
                    if (!deleting) setDeletingDemo(null);
                }}
            />
        </section>
    );
}
