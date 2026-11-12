import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ClipboardEventHandler,
    type RefObject,
} from 'react';
import { CDN_BASE_URL } from '@/constants/articles';
import { EditorView } from '@codemirror/view';
import { addCache, getByHash, type DBValue } from '@/utils/idb';
import { useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';

interface Props {
    viewRef: RefObject<EditorView | null>;
}

// 复制成功后的提示保留时长。
const resetDelay = 2000;

// 复制状态只用于按钮上的短暂反馈，过期后自动复位。
export function useClipboard({ viewRef }: Props) {
    const { id } = useParams<{ id: string }>();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef(0);

    useEffect(
        () => () => {
            window.clearTimeout(timerRef.current);
        },
        [],
    );

    const copy = useCallback(async (text: string) => {
        if (!text) {
            return false;
        }

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.clearTimeout(timerRef.current);

            timerRef.current = window.setTimeout(() => {
                setCopied(false);
            }, resetDelay);

            return true;
        } catch {
            // 浏览器拒绝剪贴板权限时保持原样，由调用方决定怎么提示。
            return false;
        }
    }, []);

    const hashBlob = async (blob: Blob) => {
        const buffer = await blob.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    };

    /** 创建 md 格式的图片预览 url，如果是本地，则传blob url，否则为 CDN URL */
    const normalizedImageUrl = (url: string, preview?: boolean) => {
        return preview ? `![图片](${url})` : `![图片](${CDN_BASE_URL}/${url}.webp)`;
    };

    const handldPaste: ClipboardEventHandler = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 从剪贴板中拿到读取数据及其类型
        const data = (await navigator.clipboard.read())[0];
        const type = data.types[0];

        // 如果不是图片，不做其他特殊处理
        if (!type.startsWith('image')) {
            console.warn('粘贴的不是图片，走正常流程，不额外处理');
            return;
        }

        // 拿到图片 blob 并计算 hash
        const blob = await data.getType(type);
        const hash = await hashBlob(blob);
        const imageId = nanoid();
        let cdnURL = normalizedImageUrl(`${id}/${imageId}`);

        const tar = await getByHash(hash);

        // 如果 DB 中没有 hash，缓存到 DB
        if (!tar) {
            const value: DBValue = {
                id: `${id}:${imageId}`,
                imageId,
                imageData: blob,
                hash,
                cdnURL,
            };
            addCache(value);
        } else {
            cdnURL = tar.cdnURL;
        }

        const view = viewRef.current;
        if (!view || view.state.readOnly) return;

        const pos = view.state.selection.main.head;

        view.dispatch({
            changes: { from: pos, insert: cdnURL },
            selection: { anchor: pos + cdnURL.length }, // 光标落到插入内容之后
            scrollIntoView: true,
        });
        view.focus();
    };

    return { copied, copy, handldPaste };
}
