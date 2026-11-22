import { useEffect, useState, useMemo } from 'react';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Select from 'antd/es/select';
import { getDemoNames, getDemoVariants, getDemoVersion, getDemoSourcePaths } from '@/api/demos';
import { useRequest } from '@/hooks/useRequest';
import type { DemoResourceFormValues } from '@/types/demos';
import { toast } from '@/utils/toast';
import styles from './DemoResourceForm.module.scss';

// 上传源码、构建产物和写入资源表的确认逻辑预留在这里。
function confirmDemoResource() {}

// 源码字段由 Form 管理，保留接口返回的实现目录相对路径。
function SourcePaths({ value }: { value?: string[] }) {
    return (
        <div className={styles.files}>
            <p>{value?.length ?? 0} 个文件，路径相对于所选实现目录</p>
            <ul>
                {value?.map((path) => (
                    <li key={path}>
                        <code>{path}</code>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// 每次选择新变体都重新挂载此区域，旧查询无法把结果写入当前表单。
function ImplementationFields({ demo, variant }: { demo: string; variant: string }) {
    const form = Form.useFormInstance<DemoResourceFormValues>();

    const version = useRequest(getDemoVersion);
    const sources = useRequest(getDemoSourcePaths);

    const { run: runVersion, data: versionData } = version;
    const { run: runSources, data: sourceData } = sources;

    const params = useMemo(() => ({ demo_name: demo, vary_name: variant }), [demo, variant]);

    useEffect(() => {
        // 版本和路径互不依赖，各自加载，失败时可分别重试。
        void runVersion(params);
        void runSources(params);
    }, [params, runVersion, runSources]);

    useEffect(() => {
        if (versionData !== undefined) form.setFieldValue('verison', versionData);
    }, [form, versionData]);

    useEffect(() => {
        if (sourceData !== undefined) form.setFieldValue('file_paths', sourceData);
    }, [form, sourceData]);

    return (
        <>
            {/* 请求失败时保留选择器，允许直接重试当前查询。 */}
            {[version, sources].map((query, index) =>
                query.error ? (
                    <p key={index} className={styles.error} role="alert">
                        {query.error instanceof Error ? query.error.message : '加载失败'}
                        <button
                            type="button"
                            onClick={() => {
                                void query.run(params);
                            }}
                        >
                            重试
                        </button>
                    </p>
                ) : null,
            )}
            <Form.Item
                name="verison"
                label="3. 当前版本"
                rules={[
                    { required: true, message: '请等待版本读取完成' },
                    { pattern: /^\d+\.\d+\.\d+$/, message: '版本号需为 x.x.x 格式' },
                ]}
            >
                <Input
                    readOnly
                    placeholder={version.loading ? '正在解析版本…' : '自动读取当前变体版本'}
                />
            </Form.Item>
            {/* 文件路径保持接口返回值，资源入库时的路径转换留给真实逻辑。 */}
            <Form.Item
                name="file_paths"
                label="4. 源码文件"
                rules={[
                    { required: true, type: 'array', min: 1, message: '当前变体下暂无源码文件' },
                ]}
            >
                <SourcePaths />
            </Form.Item>
            {sources.loading ? (
                <p role="status" className={styles.hint}>
                    正在读取文件列表…
                </p>
            ) : null}
        </>
    );
}

// demo 变化时重建变体选择区，请求状态仍全部由 useRequest 管理。
function VariantField({ demo, onChange }: { demo: string; onChange: () => void }) {
    const { data, loading, error, run } = useRequest(getDemoVariants);
    const params = useMemo(() => ({ demo_name: demo }), [demo]);

    useEffect(() => {
        if (demo) void run(params);
    }, [demo, params, run]);

    return (
        <div>
            <Form.Item
                name="implementation"
                label="2. 选择变体"
                rules={[{ required: true, message: '请选择变体' }]}
            >
                <Select
                    className={styles.select}
                    classNames={{ popup: { root: styles.dropdown } }}
                    showSearch
                    optionFilterProp="label"
                    placeholder={demo ? '请选择变体' : '请先选择 demo'}
                    loading={loading}
                    disabled={!demo || loading || Boolean(error)}
                    options={data?.map((name) => ({ value: name, label: name }))}
                    notFoundContent="暂无变体"
                    getPopupContainer={(trigger) => trigger.parentElement!}
                    onChange={onChange}
                />
            </Form.Item>
            {error ? (
                <p className={styles.error} role="alert">
                    {error instanceof Error ? error.message : '加载失败'}{' '}
                    <button
                        type="button"
                        onClick={() => {
                            void run(params);
                        }}
                    >
                        重试
                    </button>
                </p>
            ) : null}
        </div>
    );
}

export default function DemoResourceForm({ onCancel }: { onCancel: () => void }) {
    const [form] = Form.useForm<DemoResourceFormValues>();
    const [submitted, setSubmitted] = useState(false);
    const demo = Form.useWatch('demo', form) || '';
    const variant = Form.useWatch('implementation', form) || '';
    const verison = Form.useWatch('verison', form);
    const paths = Form.useWatch('file_paths', form);
    const names = useRequest(getDemoNames);
    const { run: runNames } = names;
    const ready = Boolean(
        demo && variant && /^\d+\.\d+\.\d+$/.test(verison || '') && paths?.length,
    );

    useEffect(() => {
        void runNames();
    }, [runNames]);

    function handleSubmit() {
        if (!ready) return;

        confirmDemoResource();
        setSubmitted(true);
        toast.info('当前未接入真实逻辑，尚未上传到 Cloudflare R2，也未写入数据库。');
    }

    return (
        <Form
            form={form}
            layout="vertical"
            size="large"
            className={styles.form}
            onFinish={handleSubmit}
            onValuesChange={() => setSubmitted(false)}
            aria-labelledby="new-demo-heading"
        >
            <div className={styles.heading}>
                <div>
                    <p>新增资源</p>
                    <h2 id="new-demo-heading">新增 demo</h2>
                </div>
                <button type="button" onClick={onCancel}>
                    关闭
                </button>
            </div>
            <div className={styles.selectors}>
                <div>
                    <Form.Item
                        name="demo"
                        label="1. 选择 demo"
                        rules={[{ required: true, message: '请选择 demo' }]}
                    >
                        <Select
                            className={styles.select}
                            classNames={{ popup: { root: styles.dropdown } }}
                            showSearch
                            optionFilterProp="label"
                            placeholder="请选择 demo"
                            loading={names.loading}
                            disabled={names.loading || Boolean(names.error)}
                            notFoundContent="暂无 demo"
                            options={names.data?.map((name) => ({ value: name, label: name }))}
                            getPopupContainer={(trigger) => trigger.parentElement!}
                            onChange={() => {
                                // 更换 demo 时清空旧变体，后续请求跟随新的选择。
                                form.setFieldsValue({
                                    implementation: undefined,
                                    verison: undefined,
                                    file_paths: undefined,
                                });
                            }}
                        />
                    </Form.Item>
                    {names.error ? (
                        <p className={styles.error} role="alert">
                            {names.error instanceof Error ? names.error.message : '加载失败'}{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    void runNames();
                                }}
                            >
                                重试
                            </button>
                        </p>
                    ) : null}
                </div>
                <VariantField
                    key={demo}
                    demo={demo}
                    onChange={() => {
                        form.setFieldsValue({ verison: undefined, file_paths: undefined });
                    }}
                />
            </div>
            {demo && variant ? (
                <ImplementationFields key={`${demo}/${variant}`} demo={demo} variant={variant} />
            ) : (
                <p className={styles.hint}>选择变体后自动读取版本和源码文件。</p>
            )}
            <Form.Item name="exclude_paths" label="排除规则 · 可选">
                <Input.TextArea placeholder="每行一条，相对于所选实现目录" rows={3} />
            </Form.Item>
            <p className={styles.hint}>确认逻辑暂未接入，当前不会上传资源或写入数据库。</p>
            {submitted ? (
                <p role="status" className={styles.hint}>
                    当前未接入真实逻辑，资源尚未保存。
                </p>
            ) : null}
            <div className={styles.actions}>
                <button type="button" onClick={onCancel}>
                    取消
                </button>
                <button type="submit" className={styles.primary} disabled={!ready}>
                    确认
                </button>
            </div>
        </Form>
    );
}
