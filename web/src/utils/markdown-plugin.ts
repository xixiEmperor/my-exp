import { defaultUrlTransform } from 'react-markdown';
import { SPLIT_FLAG } from '@/constants/articles';
import styles from '@/components/MarkdownReadonly/MarkdownReadonly.module.scss';

// 只描述转换分隔标记时需要的节点字段，代码块中的文本不参与转换。
interface MarkdownNode {
    type: string;
    value?: string;
    children?: MarkdownNode[];
    data?: {
        hName?: string;
        hProperties?: Record<string, string>;
    };
}

// 预览中的本地图片保留 blob 地址，其余链接沿用默认过滤规则。
export function urlTransform(url: string) {
    if (url.startsWith('blob:')) {
        return url;
    }

    return defaultUrlTransform(url);
}

// 在 Markdown 解析后替换独立的分隔标记，保留正文的正常解析流程。
export function remarkArticleSeparator() {
    return (tree: MarkdownNode) => {
        const transform = (node: MarkdownNode) => {
            if (node.type === 'html' && node.value?.trim() === SPLIT_FLAG.trim()) {
                node.type = 'paragraph';
                delete node.value;

                node.children = [{ type: 'text', value: '登录后继续查看完整内容' }];

                node.data = {
                    hName: 'div',
                    hProperties: { className: styles.separator },
                };

                return;
            }

            // HTML 标记和代码节点类型不同，不会误改示例代码。
            node.children?.forEach(transform);
        };

        transform(tree);
    };
}
