import { useCallback, useState } from 'react';
import { handleError } from '@/utils/errorHandler';

/**
 * 请求状态管理 hook。
 *
 * 只负责 loading、data、error 这三个状态，
 * 业务 hook 和 UI 组件调用 run 即可，不用每次手写 try/catch。
 */
export function useRequest<T, P extends unknown[]>(service: (...params: P) => Promise<T>) {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(undefined);

    /** 执行请求，成功返回数据，失败统一提示并返回 undefined */
    const run = useCallback(
        async (...params: P) => {
            setLoading(true);
            setError(undefined);

            try {
                const res = await service(...params);

                setData(res);

                return res;
            } catch (err) {
                setError(err);
                handleError(err);

                return undefined;
            } finally {
                setLoading(false);
            }
        },
        [service],
    );

    /** 清空状态，适合关闭弹窗或切换页面时调用 */
    const reset = useCallback(() => {
        setData(undefined);
        setError(undefined);
        setLoading(false);
    }, []);

    return {
        data,
        loading,
        error,
        run,
        reset,
    };
}
