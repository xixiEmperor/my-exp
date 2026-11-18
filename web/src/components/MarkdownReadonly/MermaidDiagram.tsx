import { useEffect, useId, useState } from 'react';
import styles from './MarkdownReadonly.module.scss';

// 图表按需加载，避免普通文章也下载 Mermaid。
export default function MermaidDiagram({ source }: { source: string }) {
    const id = useId().replace(/[^a-zA-Z0-9]/g, '');
    const [result, setResult] = useState<{ source: string; svg?: string; error?: string }>();

    useEffect(() => {
        let cancelled = false;

        // 使用临时容器承接 Mermaid 生成的节点，失败时也会清理。
        async function renderDiagram() {
            const container = document.createElement('div');
            container.style.visibility = 'hidden';
            document.body.append(container);

            try {
                const { default: mermaid } = await import('mermaid');

                if (cancelled) return;

                // 严格模式禁止图表执行脚本和交互链接。
                mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
                const { svg } = await mermaid.render(`mermaid-${id}`, source, container);

                if (!cancelled) setResult({ source, svg });
            } catch (error) {
                if (!cancelled) {
                    setResult({
                        source,
                        error: error instanceof Error ? error.message : '未知错误',
                    });
                }
            } finally {
                container.remove();
            }
        }

        void renderDiagram();

        // 内容切换或组件卸载后，丢弃旧任务的结果。
        return () => {
            cancelled = true;
        };
    }, [id, source]);

    const currentResult = result?.source === source ? result : undefined;

    if (currentResult?.svg) {
        return (
            <div
                className={styles.mermaid}
                dangerouslySetInnerHTML={{ __html: currentResult.svg }}
            />
        );
    }

    // 加载和语法出错时保留源码，方便阅读和修正。
    return (
        <div>
            <p role="status">
                {currentResult?.error
                    ? `Mermaid 图表渲染失败：${currentResult.error}`
                    : '正在渲染 Mermaid 图表…'}
            </p>
            <pre>
                <code className="language-mermaid">{source}</code>
            </pre>
        </div>
    );
}
