import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/** IndexedDB 中的值类型 */
export interface DBValue {
    /** articleId:imageId，作为主键，后面跟一个:imageId，防止键名重复 */
    id: string;
    /** 图片id，是nanoid，主要用于拼接 CDN URL */
    imageId: string;
    /** 图片二进制，请求时携带 */
    imageData: Blob;
    /** 二进制对应的hash，用于去重 */
    hash: string;
    /** 图片对应的 CDN URL */
    cdnURL: string;
}

interface MyDB extends DBSchema {
    images: {
        key: string;
        value: DBValue;
        indexes: {
            'by-hash': string;
            'by-imageId': string;
        };
    };
}

let db: IDBPDatabase<MyDB> | null = null;

/** IndexedDB 初始化，全局单例 */
export const initDB = async () => {
    if (!db) {
        db = await openDB<MyDB>('my-app', 1, {
            upgrade(db) {
                const store = db.createObjectStore('images', {
                    keyPath: 'id',
                });

                store.createIndex('by-hash', 'hash');
                store.createIndex('by-imageId', 'imageId');
            },
        });
    }
    return db;
};

/** 添加缓存 */
export const addCache = (value: DBValue) => {
    if (!db) {
        console.warn('IndexedDB 没有初始化，不做处理');
        return; // 这里返回 true ，外界不处理
    }
    const tx = db?.transaction('images', 'readwrite');
    const store = tx.store;
    store.add(value);
};

/** 清理缓存 */
export const deleteCache = (id: string) => {
    if (!db) {
        console.warn('IndexedDB 没有初始化，不做处理');
        return; // 这里返回 true ，外界不处理
    }
    const tx = db?.transaction('images', 'readwrite');
    const store = tx.store;
    store.delete(id);
};

/** 通过 ImageId 进行查找 */
export const getByImageId = (imageId: string) => {
    if (!db) {
        console.warn('IndexedDB 没有初始化，不做处理');
        return; // 这里返回 true ，外界不处理
    }
    return db.getFromIndex('images', 'by-imageId', imageId);
};

/** 通过 hash 进行查找 */
export const getByHash = (hash: string) => {
    if (!db) {
        console.warn('IndexedDB 没有初始化，不做处理');
        return; // 这里返回 true ，外界不处理
    }
    return db.getFromIndex('images', 'by-hash', hash);
};

/** 通过 articleId 进行查找 */
export const getByArticleId = async (articleId: string) => {
    if (!db) {
        console.warn('IndexedDB 没有初始化，不做处理');
        return; // 这里返回 true ，外界不处理
    }

    // 先查询所有结果，再过滤出所有以传入文章id开头的value
    return (await db.getAll('images')).filter((item) => {
        return item.id.startsWith(articleId);
    });
};
