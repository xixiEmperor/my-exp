import { useCallback, useRef, useState } from 'react';
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

    // 用 ref 保存进行中的请求，避免连续调用时依赖尚未更新的 loading。
    const pendingRequests = useRef<
        { service: typeof service; params: P; promise: Promise<T | undefined> }[]
    >([]);

    /** 执行请求，成功返回数据，失败统一提示并返回 undefined */
    const run = useCallback(
        async (...params: P) => {
            // 参数逐项比较，基础类型按值去重，对象参数按引用去重。
            const pending = pendingRequests.current.find(
                (request) =>
                    request.service === service &&
                    request.params.length === params.length &&
                    request.params.every((param, index) => Object.is(param, params[index])),
            );

            if (pending) {
                return await pending.promise;
            }

            setLoading(true);
            setError(undefined);

            // 先登记请求再执行 service，确保同步异常和同步重入也能正确处理。
            const request: (typeof pendingRequests.current)[number] = {
                service,
                params,
                promise: Promise.resolve(undefined),
            };

            const execute = async () => {
                try {
                    await Promise.resolve();

                    const res = await service(...params);

                    setData(res);

                    return res;
                } catch (err) {
                    setError(err);
                    handleError(err);

                    return undefined;
                } finally {
                    // 成功和失败都移除记录，只有全部请求结束才关闭 loading。
                    pendingRequests.current = pendingRequests.current.filter(
                        (item) => item !== request,
                    );

                    setLoading(pendingRequests.current.length > 0);
                }
            };

            request.promise = execute();
            pendingRequests.current.push(request);

            return await request.promise;
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
