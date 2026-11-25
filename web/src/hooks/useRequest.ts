import { useCallback, useRef, useState } from 'react';
import { handleError } from '@/utils/errorHandler';

interface PendingRequest {
    service: (...params: any[]) => Promise<any>;
    params: unknown[];
    promise: Promise<unknown>;
}

// 模块级进行中请求表，支持跨组件对同一 service + 相同参数的并发请求去重。
const globalPendingRequests: PendingRequest[] = [];

/**
 * 请求状态管理 hook。
 *
 * 负责 loading、data、error 状态管理，并对相同 service 与参数的进行中请求自动去重。
 */
export function useRequest<T, P extends unknown[]>(service: (...params: P) => Promise<T>) {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(undefined);
    const activeCountRef = useRef(0);

    /** 执行请求，成功返回数据，失败统一提示并返回 undefined */
    const run = useCallback(
        async (...params: P) => {
            // 参数逐项比较，基础类型按值去重，对象参数按引用去重。
            const pending = globalPendingRequests.find(
                (request) =>
                    request.service === service &&
                    request.params.length === params.length &&
                    request.params.every((param, index) => Object.is(param, params[index])),
            );

            activeCountRef.current += 1;
            setLoading(true);
            setError(undefined);

            if (pending) {
                try {
                    const res = (await pending.promise) as T | undefined;
                    setData(res);
                    return res;
                } catch (err) {
                    setError(err);
                    return undefined;
                } finally {
                    activeCountRef.current -= 1;
                    if (activeCountRef.current === 0) {
                        setLoading(false);
                    }
                }
            }

            // 先登记请求再执行 service，确保同步异常和同步重入也能正确处理。
            const request: PendingRequest = {
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
                    // 成功和失败都移除记录，只有当前组件全部请求结束才关闭 loading。
                    const index = globalPendingRequests.indexOf(request);
                    if (index !== -1) {
                        globalPendingRequests.splice(index, 1);
                    }

                    activeCountRef.current -= 1;
                    if (activeCountRef.current === 0) {
                        setLoading(false);
                    }
                }
            };

            request.promise = execute();
            globalPendingRequests.push(request);

            return (await request.promise) as T | undefined;
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
