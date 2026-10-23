import GithubSlugger from 'github-slugger';

export interface TocHeading {
    /** 标题层级，从 1 到 6 */
    depth: number;
    /** 展示用的纯文字，已经去掉 markdown 标记 */
    text: string;
    /** 锚点 id，要和 rehype-slug 渲染出来的标题 id 保持一致 */
    id: string;
}

// 标题里常见的行内标记，按顺序替换成纯文字
const inlineRules: Array<[RegExp, string]> = [
    // 图片和链接统一取方括号里的显示文字
    [/!\[([^\]]*)\]\([^)]*\)/g, '$1'],
    [/\[([^\]]*)\]\([^)]*\)/g, '$1'],

    // 行内代码去掉两边的反引号
    [/`([^`]*)`/g, '$1'],

    // 粗体、斜体和删除线的成对标记全部去掉
    [/(\*\*|__|~~|\*|_)/g, ''],
];

/** 去掉标题里的行内 markdown 标记，只留下能直接显示的文字 */
function stripInlineMarkdown(text: string): string {
    return inlineRules
        .reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)
        .replace(/\s+#+\s*$/, '')
        .trim();
}

/**
 * 从 markdown 源码里提取标题，生成右侧目录需要的数据。
 * 用和 rehype-slug 同一个 slug 库，重复标题的 -1、-2 后缀也会和正文里的 id 对上。
 */
export function extractToc(content: string): TocHeading[] {
    const slugger = new GithubSlugger();

    // 代码块里的 # 不是标题，用这个开关跳过围栏内部的每一行
    let inFence = false;

    return content.split(/\r?\n/).reduce<TocHeading[]>((headings, line) => {
        // 围栏代码块的开头和结尾都用三个反引号或波浪线，遇到就翻转状态
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;

            return headings;
        }

        if (inFence) {
            return headings;
        }

        // 匹配 ATX 标题，允许标题前后有空格
        const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
        const text = match ? stripInlineMarkdown(match[2]) : '';

        // 没有匹配到标题，或者标题里全是标记符号，都跳过
        if (!match || !text) {
            return headings;
        }

        headings.push({
            depth: match[1].length,
            text,
            id: slugger.slug(text),
        });

        return headings;
    }, []);
}
