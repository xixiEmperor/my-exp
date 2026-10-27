import type { MDXEditorMethods } from '@mdxeditor/editor';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useDraftStore } from '@/stores/draft';

/** 本地缓存写入的节流间隔。整篇文章序列化进 localStorage 不便宜，连续输入时不必每次按键都写 */
const DRAFT_THROTTLE = 800;

interface Options {
    // 当前编辑的文章 id，本地草稿按它分开存放
    articleId: string;
    // 外部传进来的基准内容，换文章时用它重置编辑器
    content: string;
    // 编辑器实例。同步外部内容、取即时文本都要经过它
    mdRef: RefObject<MDXEditorMethods | null>;
}

/**
 * 文章本地草稿的读写。
 * 文本状态、编辑器同步、节流写盘和平滑兜底都收在这里，
 * 组件只拿当前文本、输入回调和立即落盘三个口子。
 */
export function useDraft({ articleId, content, mdRef }: Options) {
    const [draft, setDraft] = useState(content); // 编辑器当前文本自己留一份。内容不再回传父组件，预览和本地缓存都靠它

    const latestContentRef = useRef(content); // 编辑器最新文本。节流写入和销毁兜底都读这里，避免拿到闭包里的旧值
    const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 节流定时器，同一时间只挂一个，重复输入共用同一次写盘
    const isDirtyRef = useRef(false); // 有没有还没写进本地缓存的改动。没改过就不必在销毁时凭空造一条草稿

    // MDXEditor 只在初始化时读一次 markdown，外部内容后到时必须手动同步进去
    useEffect(() => {
        // 先把基准内容记下来，setMarkdown 触发的回调就不会被误判成用户输入
        latestContentRef.current = content;
        isDirtyRef.current = false;

        const current = mdRef.current?.getMarkdown();

        // 编辑器里的内容已经一致就不要再设置，否则会把用户正在输入的光标位置冲掉
        if (current !== undefined && current !== content) {
            mdRef.current?.setMarkdown(content);
        }

        // 外部换了一篇文章时，预览和本地缓存状态也要跟着重置
        setDraft(content);
    }, [content, mdRef]);

    // 把最新内容同步写进本地缓存。这里不改组件状态，组件销毁过程中也能安全调用
    const flushDraft = useCallback(() => {
        // 定时器还没到点就直接取消，写盘统一走下面的逻辑，避免重复写入
        if (draftTimerRef.current !== null) {
            clearTimeout(draftTimerRef.current);
            draftTimerRef.current = null;
        }

        // 内容没有实际变化，不写缓存，避免看一眼文章就多出一条草稿
        if (!isDirtyRef.current) {
            return null;
        }

        isDirtyRef.current = false;
        useDraftStore.getState().setDraft({ id: articleId, content: latestContentRef.current });
    }, [articleId]);

    // 节流写入：窗口期内只安排一次写盘，期间的新输入由定时器到点后统一带上
    const scheduleDraftSave = useCallback(() => {
        if (draftTimerRef.current !== null) {
            return;
        }

        draftTimerRef.current = setTimeout(() => {
            draftTimerRef.current = null;
            flushDraft();
        }, DRAFT_THROTTLE);
    }, [flushDraft]);

    // 页面刷新、关闭标签页和组件卸载都跳过节流，把最后一次编辑同步写进本地
    useEffect(() => {
        window.addEventListener('beforeunload', flushDraft);

        return () => {
            window.removeEventListener('beforeunload', flushDraft);
            flushDraft(); // 切换文章或离开编辑页时同样立即保存，兜住节流窗口里的最后一次输入
        };
    }, [flushDraft]);

    // 输入时先更新文本，再按节流把内容落到本地缓存
    const handleChange = useCallback(
        (next: string) => {
            // 编辑器初始化时也会回调一次，内容没变就不算用户改动
            if (next === latestContentRef.current) {
                return;
            }

            latestContentRef.current = next;
            isDirtyRef.current = true;
            setDraft(next);
            scheduleDraftSave();
        },
        [scheduleDraftSave],
    );

    // 立即落盘，跳过等待中的节流窗口。
    // 确认保存时以编辑器里的即时文本为准，防止还有最后一次输入没被回调带进来
    const saveNow = useCallback(() => {
        latestContentRef.current = mdRef.current?.getMarkdown() ?? latestContentRef.current;
        isDirtyRef.current = true;
        flushDraft();
    }, [flushDraft, mdRef]);

    return { draft, handleChange, saveNow };
}
