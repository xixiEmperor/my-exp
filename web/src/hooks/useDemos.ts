import { useCallback } from 'react';
import {
    createDemoResource,
    deleteDemoResource,
    getDemoResourceByID,
    getDemoResources,
    updateDemoResource,
} from '@/api/demos';
import { useRequest } from '@/hooks/useRequest';
import { useDemosStore } from '@/stores/demos';
import type {
    CreateDemoResourceReq,
    GetDemoResourcesReq,
    UpdateDemoResourceReq,
} from '@/types/demos';

export function useDemos() {
    const { setResources, appendResource, updateResource, removeResource } =
        useDemosStore.getState();

    // 1. 拉取全部 demo 列表并同步写入 Zustand Store。
    const fetchResources = useCallback(
        async (params?: GetDemoResourcesReq) => {
            const list = await getDemoResources(params);
            setResources(list);

            return list;
        },
        [setResources],
    );

    // 2. 上传资源并入库后，将新记录追加到 Store 列表顶部。
    const fetchCreateResource = useCallback(
        async (body: CreateDemoResourceReq) => {
            const created = await createDemoResource(body);
            appendResource(created);

            return created;
        },
        [appendResource],
    );

    // 3. 更新展示信息成功后，原地替换 Store 中对应的 demo 记录。
    const fetchUpdateResource = useCallback(
        async (id: string, body: UpdateDemoResourceReq) => {
            const updated = await updateDemoResource(id, body);
            updateResource(updated);

            return updated;
        },
        [updateResource],
    );

    // 4. 删除成功后从 Store 中移除对应记录，避免额外刷新列表。
    const fetchDeleteResource = useCallback(
        async (id: string) => {
            await deleteDemoResource(id);
            removeResource(id);

            return true;
        },
        [removeResource],
    );

    const resourcesRequest = useRequest(fetchResources);
    const resourceDetailRequest = useRequest(getDemoResourceByID);
    const createResourceRequest = useRequest(fetchCreateResource);
    const updateResourceRequest = useRequest(fetchUpdateResource);
    const deleteResourceRequest = useRequest(fetchDeleteResource);

    return {
        resourcesRequest,
        resourceDetailRequest,
        createResourceRequest,
        updateResourceRequest,
        deleteResourceRequest,
    };
}
