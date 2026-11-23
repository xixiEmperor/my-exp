// 固定使用中文日期格式，避免不同浏览器拿到不同顺序的日期
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    // 创建和修改时间精确到秒，统一按 24 小时制展示。
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

/** 把接口时间统一转成可展示的日期，缺失或非法值返回占位符 */
export function formatDate(value: Date | string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return dateFormatter.format(date);
}
