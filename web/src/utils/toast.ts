import { useToastStore, type ToastType } from '@/stores/toast';

// 默认停留 3 秒，和 antd message 的手感保持一致，迁移时不用逐处改时长。
const DEFAULT_DURATION = 3000;

// 调用方大多是请求封装、事件回调这类普通函数，拿不到 hooks，
// 所以这里直接读 store 的命令式接口，跟 antd 的 message.xxx 用法一样。
const show = (type: ToastType, content: string, duration: number = DEFAULT_DURATION) =>
    useToastStore.getState().pushToast(type, content, duration);

export const toast = {
    success: (content: string, duration?: number) => show('success', content, duration),
    error: (content: string, duration?: number) => show('error', content, duration),
    warning: (content: string, duration?: number) => show('warning', content, duration),
    info: (content: string, duration?: number) => show('info', content, duration),
};
