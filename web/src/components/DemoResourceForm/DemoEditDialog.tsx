import { useEffect, useRef } from 'react';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Select from 'antd/es/select';
import { useDemos } from '@/hooks/useDemos';
import type { DemoEditFormValues, DemoResource } from '@/types/demos';
import { formatDate } from '@/utils/date';
import { toast } from '@/utils/toast';
import styles from './DemoResourceForm.module.scss';

interface DemoEditDialogProps {
    /** 当前正在编辑的 demo 记录 */
    demo: DemoResource;
    /** 关闭编辑弹窗回调 */
    onClose: () => void;
}

export default function DemoEditDialog({ demo, onClose }: DemoEditDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [form] = Form.useForm<DemoEditFormValues>();
    const { updateResourceRequest } = useDemos();
    const { loading: updating, run: editDemoResource } = updateResourceRequest;

    // 挂载时以原生模态框打开并锁定背景页面滚动。
    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) return;

        const root = document.documentElement;
        const previousOverflow = root.style.overflow;
        const previousGutter = root.style.scrollbarGutter;

        if (window.innerWidth > root.clientWidth) {
            root.style.scrollbarGutter = 'stable';
        }

        root.style.overflow = 'hidden';
        dialog.showModal();

        return () => {
            dialog.close();
            root.style.overflow = previousOverflow;
            root.style.scrollbarGutter = previousGutter;
        };
    }, []);

    async function handleSubmit(values: DemoEditFormValues) {
        if (updating) return;

        // 1. 整理说明与标签：空字符串转为 null，过滤空白标签。
        const trimmedDesc = values.description?.trim() ?? '';
        const tags =
            values.tags?.map((item) => item.trim()).filter(Boolean) ?? [];

        // 2. 提交更新请求，成功后提示并关闭模态框。
        const updated = await editDemoResource(demo.id, {
            name: values.name.trim(),
            description: trimmedDesc || null,
            tags: tags.length ? tags : null,
            status: values.status,
        });

        if (updated) {
            toast.success('demo 展示信息已更新');
            onClose();
        }
    }

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby="edit-demo-heading"
            onCancel={(event) => {
                event.preventDefault();

                if (!updating) onClose();
            }}
            onClick={(event) => {
                if (event.target !== event.currentTarget || updating) return;

                const bounds = event.currentTarget.getBoundingClientRect();

                if (
                    event.clientX < bounds.left ||
                    event.clientX > bounds.right ||
                    event.clientY < bounds.top ||
                    event.clientY > bounds.bottom
                ) {
                    onClose();
                }
            }}
        >
            <Form
                form={form}
                layout="vertical"
                size="large"
                className={styles.form}
                initialValues={{
                    name: demo.name,
                    description: demo.description ?? '',
                    tags: demo.tags ?? [],
                    status: demo.status,
                }}
                onFinish={handleSubmit}
                aria-labelledby="edit-demo-heading"
            >
                <div className={styles.heading}>
                    <div>
                        <p>
                            {demo.slug} · v{demo.verison}
                        </p>
                        <h2 id="edit-demo-heading">编辑 demo 展示信息</h2>
                    </div>
                    <button type="button" onClick={onClose} disabled={updating}>
                        关闭
                    </button>
                </div>

                <Form.Item
                    name="name"
                    label="展示名称"
                    rules={[
                        { required: true, whitespace: true, message: '请输入展示名称' },
                        { max: 255, message: '展示名称不能超过 255 个字符' },
                    ]}
                >
                    <Input placeholder="请输入用于前台展示的 demo 名称" />
                </Form.Item>

                <Form.Item name="description" label="demo 说明 · 可选">
                    <Input.TextArea placeholder="简要说明该 demo 的实现效果与要点" rows={3} />
                </Form.Item>

                <Form.Item name="tags" label="检索标签 · 可选">
                    <Select
                        mode="tags"
                        className={styles.select}
                        classNames={{ popup: { root: styles.dropdown } }}
                        placeholder="输入标签后按回车添加"
                        tokenSeparators={[',', '，']}
                        getPopupContainer={(trigger) => trigger.parentElement!}
                    />
                </Form.Item>

                <Form.Item
                    name="status"
                    label="发布状态"
                    rules={[{ required: true, message: '请选择发布状态' }]}
                >
                    <Select
                        className={styles.select}
                        classNames={{ popup: { root: styles.dropdown } }}
                        options={[
                            { value: 'draft', label: '草稿 (draft)' },
                            { value: 'published', label: '已发布 (published)' },
                        ]}
                        getPopupContainer={(trigger) => trigger.parentElement!}
                    />
                </Form.Item>

                <section className={styles.readonlySection} aria-label="只读资源信息">
                    <h3 className={styles.sectionTitle}>资源信息（只读）</h3>

                    <div className={styles.selectors}>
                        <Form.Item label="记录 ID">
                            <Input value={demo.id} readOnly />
                        </Form.Item>

                        <Form.Item label="目录标识 (slug)">
                            <Input value={demo.slug} readOnly />
                        </Form.Item>

                        <Form.Item label="实现目录">
                            <Input value={demo.implementation} readOnly />
                        </Form.Item>

                        <Form.Item label="版本号">
                            <Input value={demo.verison} readOnly />
                        </Form.Item>
                    </div>

                    <Form.Item label="创建时间">
                        <Input value={formatDate(demo.created_at)} readOnly />
                    </Form.Item>

                    <Form.Item label="排除规则">
                        <Input.TextArea
                            value={demo.exclude_paths?.length ? demo.exclude_paths.join('\n') : '无'}
                            readOnly
                            autoSize={{ minRows: 2, maxRows: 5 }}
                        />
                    </Form.Item>

                    <Form.Item label={`源码文件（${demo.file_paths.length} 个）`}>
                        <div className={styles.files}>
                            {demo.file_paths.length ? (
                                <ul>
                                    {demo.file_paths.map((path) => (
                                        <li key={path}>
                                            <code>{path}</code>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>暂无源码文件</p>
                            )}
                        </div>
                    </Form.Item>
                </section>

                <div className={styles.actions}>
                    <button type="button" onClick={onClose} disabled={updating}>
                        取消
                    </button>
                    <button type="submit" className={styles.primary} disabled={updating}>
                        {updating ? '保存中…' : '保存'}
                    </button>
                </div>
            </Form>
        </dialog>
    );
}
