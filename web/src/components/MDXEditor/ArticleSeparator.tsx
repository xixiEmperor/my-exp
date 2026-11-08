// 和后端 SplitFlag 保持一致，不包含换行，文章首尾也能正常分割。
import { SPLIT_FLAG } from '@/constants/articles';

// 编辑器需要不带首尾换行的标记，统一从文章常量取得。
export const ARTICLE_SEPARATOR = SPLIT_FLAG.trim();

// 全文只保留最后一个分隔符。
export function normalizeArticleSeparator(content: string) {
    const last = content.lastIndexOf(ARTICLE_SEPARATOR);

    if (last < 0) return content;

    return content.slice(0, last).replaceAll(ARTICLE_SEPARATOR, '') + content.slice(last);
}
